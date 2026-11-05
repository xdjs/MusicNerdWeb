import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { userInfo } from 'node:os';
import { randomUUID } from 'node:crypto';
// Optional native mode accepts only the runner's marked, socket-only disposable cluster.
export async function namespaceDatabase(){
 const socket=process.env.MN_NAMESPACE_SOCKET;
 if(!socket)return new PGlite();
 assert.match(socket,/^\/tmp\/mn1655-namespace-[A-Za-z0-9]+$/);
 const {default:postgres}=await import('postgres');
 const options={host:socket,port:55467,user:userInfo().username,max:1,prepare:false,connection:{statement_timeout:5000}};
 const admin=postgres({...options,database:'postgres'});
 const [meta]=await admin`select current_setting('listen_addresses') as addresses,current_setting('data_directory') as directory,current_setting('server_version_num') as version`;
 assert.equal(meta.addresses,'');assert.equal(meta.directory,`${socket}/data`);assert.match(meta.version,/^17\d{4}$/);
 const name='namespace_'+randomUUID().replaceAll('-','');
 await admin.unsafe(`create database ${name}`);
 const sql=postgres({...options,database:name});
 const wrap=connection=>({exec:text=>connection.unsafe(text),query:async text=>({rows:[...await connection.unsafe(text)]})});
 return {...wrap(sql),transaction:fn=>sql.begin(tx=>fn(wrap(tx))),close:async()=>{
  await sql.end();await admin.unsafe(`drop database ${name}`);
  for(const role of ['mnweb','anon','authenticated','unexpected_reader','inherited_reader'])await admin.unsafe(`drop role if exists ${role}`);
  await admin.end();
 }};
}
