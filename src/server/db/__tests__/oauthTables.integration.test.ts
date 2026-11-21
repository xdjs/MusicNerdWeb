/** @jest-environment node */
import {readFileSync} from 'node:fs';
const {PGlite}=process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');

const user='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const client='00000000-0000-4000-8000-0000000000c1';
const grant='00000000-0000-4000-8000-0000000000a1',grant2='00000000-0000-4000-8000-0000000000a2';
const h=(c:string)=>c.repeat(64);

async function setup(){
 const pg=new PGlite();
 await pg.exec(`create role mnweb;create role anon;create role authenticated;
 create table users(id uuid primary key,email text);insert into users values('${user}','a@example.test'),('${other}',null);`);
 await pg.exec(readFileSync('drizzle/0067_oauth.sql','utf8'));
 await pg.exec(`insert into oauth_clients(id,name,redirect_uris) values('${client}','Claude','{https://claude.ai/api/mcp/auth_callback}');
 insert into oauth_grants(id,client_id,user_id) values('${grant}','${client}','${user}'),('${grant2}','${client}','${other}');`);
 return pg;
}
const token=(hash:string,kind:string,grantId=grant)=>kind==='code'
 ?`insert into oauth_tokens(hash,kind,grant_id,expires_at,code_challenge,redirect_uri) values('${hash}','code','${grantId}',now()+interval '60 seconds','challenge','https://claude.ai/api/mcp/auth_callback')`
 :`insert into oauth_tokens(hash,kind,grant_id,expires_at) values('${hash}','${kind}','${grantId}',${kind==='refresh'?'null':"now()+interval '5 minutes'"})`;

it('stores tokens only as SHA-256 hex, with an expiry for codes and access tokens and none for refresh tokens',async()=>{
 const pg=await setup();try{
  await pg.exec([token(h('1'),'code'),token(h('2'),'access'),token(h('3'),'refresh')].join(';'));
  await expect(pg.exec(token('raw-token-value','access'))).rejects.toThrow(/oauth_tokens_hash/);
  await expect(pg.exec(token(h('4'),'id_token'))).rejects.toThrow(/oauth_tokens_kind/);
  await expect(pg.exec(`insert into oauth_tokens(hash,kind,grant_id) values('${h('5')}','access','${grant}')`)).rejects.toThrow(/oauth_tokens_expiry/);
  await expect(pg.exec(`insert into oauth_tokens(hash,kind,grant_id,expires_at) values('${h('6')}','refresh','${grant}',now())`)).rejects.toThrow(/oauth_tokens_expiry/);
  await expect(pg.exec(`insert into oauth_tokens(hash,kind,grant_id,expires_at) values('${h('7')}','code','${grant}',now())`)).rejects.toThrow(/oauth_tokens_code/);
 }finally{await pg.close();}
},30000);

it('consumes a code or refresh token once',async()=>{
 const pg=await setup();try{
  await pg.exec(token(h('3'),'refresh'));
  const consume=`update oauth_tokens set used_at=now() where hash='${h('3')}' and kind='refresh' and used_at is null and (expires_at is null or expires_at>now()) returning grant_id`;
  expect((await pg.query(consume)).rows).toEqual([{grant_id:grant}]);
  expect((await pg.query(consume)).rows).toEqual([]);
 }finally{await pg.close();}
},30000);

it('lists a member\'s connections and revokes one with all its tokens',async()=>{
 const pg=await setup();try{
  await pg.exec([token(h('2'),'access'),token(h('3'),'refresh'),token(h('8'),'refresh',grant2)].join(';'));
  const listed=await pg.query(`select g.id,c.name,u.email from oauth_grants g join oauth_clients c on c.id=g.client_id join users u on u.id=g.user_id where g.user_id='${user}' order by g.created_at desc`);
  expect(listed.rows).toEqual([{id:grant,name:'Claude',email:'a@example.test'}]);
  await pg.exec(`delete from oauth_grants where id='${grant}' and user_id='${user}'`);
  expect((await pg.query('select hash from oauth_tokens')).rows).toEqual([{hash:h('8')}]);
  await expect(pg.exec(token(h('9'),'access'))).rejects.toThrow(/foreign key/);
 }finally{await pg.close();}
},30000);

it('removes a deleted user\'s or client\'s connections',async()=>{
 const pg=await setup();try{
  await pg.exec(token(h('3'),'refresh'));
  await pg.exec(`delete from users where id='${user}'`);
  expect((await pg.query('select id from oauth_grants')).rows).toEqual([{id:grant2}]);
  expect((await pg.query('select hash from oauth_tokens')).rows).toEqual([]);
  await pg.exec(`delete from oauth_clients where id='${client}'`);
  expect((await pg.query('select id from oauth_grants')).rows).toEqual([]);
 }finally{await pg.close();}
},30000);

it('lets only the app role read and write',async()=>{
 const pg=await setup();try{
  await pg.exec('set role mnweb');
  await pg.exec(`insert into oauth_clients(name,redirect_uris) values('Cursor','{http://127.0.0.1:3000/callback}')`);
  await pg.exec(`update oauth_grants set last_used_at=now() where id='${grant}'`);
  await pg.exec(token(h('2'),'access'));
  await pg.exec(`delete from oauth_tokens;delete from oauth_grants where id='${grant2}'`);
  await expect(pg.exec(`delete from oauth_clients`)).rejects.toThrow(/permission denied/);
  await pg.exec('reset role');
  for(const role of ['anon','authenticated'])for(const table of ['oauth_clients','oauth_grants','oauth_tokens']){
   await pg.exec(`set role ${role}`);
   await expect(pg.exec(`select * from ${table}`)).rejects.toThrow(/permission denied/);
   await pg.exec('reset role');
  }
  expect((await pg.query("select relname,relrowsecurity from pg_class where relname like 'oauth_%' and relkind='r' order by relname")).rows)
   .toEqual(['oauth_clients','oauth_grants','oauth_tokens'].map(relname=>({relname,relrowsecurity:true})));
 }finally{await pg.close();}
},30000);
