import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
export function createLocalDB(path='.local-state/quota.sqlite'){
  if(path!==':memory:')mkdirSync(dirname(resolve(path)),{recursive:true});
  const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec('CREATE TABLE IF NOT EXISTS _wind_migrations (tag TEXT PRIMARY KEY)');
  const journal=new URL('../drizzle/meta/_journal.json',import.meta.url);
  if(existsSync(journal))for(const entry of JSON.parse(readFileSync(journal,'utf8')).entries){
    if(!db.prepare('SELECT tag FROM _wind_migrations WHERE tag = ?').get(entry.tag)){
      db.exec('BEGIN');try{db.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));db.prepare('INSERT INTO _wind_migrations (tag) VALUES (?)').run(entry.tag);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
    }
  }
  return {prepare(sql){return {bind(...params){return {async first(){return db.prepare(sql).get(...params)||null;}}}}},close(){db.close()}};
}
