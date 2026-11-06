/** Local PG17 only; no URL/password/provider and no existing database accepted. */
import {mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const bin=process.env.PG17_BIN;
assert.ok(bin?.startsWith('/'),'Set PG17_BIN to an existing official local runtime');
assert.match(execFileSync(`${bin}/postgres`,['--version'],{encoding:'utf8'}),/PostgreSQL\) 17\./);
const dir=mkdtempSync('/tmp/mn1655-namespace-');
const env={PATH:process.env.PATH,HOME:dir,LANG:'C',MN_NAMESPACE_SOCKET:dir};
let started=false;
const run=(exe,args)=>execFileSync(`${bin}/${exe}`,args,{env,stdio:'pipe'});
try{
 run('initdb',['-D',`${dir}/data`,'--auth-local=trust','--auth-host=reject','--no-locale']);
 run('pg_ctl',['-D',`${dir}/data`,'-l',`${dir}/server.log`,'-o',`-c listen_addresses='' -c unix_socket_directories='${dir}' -c unix_socket_permissions=0700 -p 55467`,'-w','start']);started=true;
 execFileSync(process.execPath,['--test',fileURLToPath(new URL('./about-namespace.test.mjs',import.meta.url))],{env,stdio:'inherit'});
}finally{
 if(started)run('pg_ctl',['-D',`${dir}/data`,'-m','immediate','-w','stop']);
 rmSync(dir,{recursive:true,force:true});
}
