import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {sql} from 'drizzle-orm';
import {openDatabase} from '../src/server/database';
import {migrateDatabase} from '../db/migrate';

vi.mock('node:fs',async importOriginal=>{
  const actual=await importOriginal<typeof import('node:fs')>();
  return {...actual,readFileSync:vi.fn(actual.readFileSync)};
});

describe('PostgreSQL migration identity',()=>{
  it('accepts identical SQL from Windows/Linux checkouts and rejects changed SQL before applying it',async()=>{
    const originalRead=await vi.importActual<typeof import('node:fs')>('node:fs');
    const opened=await openDatabase();
    try{
      vi.mocked(readFileSync).mockImplementation(((...args:Parameters<typeof readFileSync>)=>{
        const content=originalRead.readFileSync(...args);
        return typeof content==='string'&&String(args[0]).startsWith('db/postgres/')?content.replace(/\r?\n/g,'\r\n'):content;
      }) as typeof readFileSync);
      await expect(migrateDatabase(opened.db)).resolves.toBeUndefined();
      vi.mocked(readFileSync).mockImplementation(((...args:Parameters<typeof readFileSync>)=>{
        const content=originalRead.readFileSync(...args);
        return typeof content==='string'&&String(args[0]).startsWith('db/postgres/')?content+'\nCREATE TABLE unexpected_migration_mutation(id integer);':content;
      }) as typeof readFileSync);
      await expect(migrateDatabase(opened.db)).rejects.toThrow(/checksum changed/);
      const [result]=await opened.db.select({unexpected:sql<string|null>`to_regclass('unexpected_migration_mutation')`}).from(sql`(SELECT 1) AS singleton`);
      expect(result).toEqual({unexpected:null});
    }finally{vi.mocked(readFileSync).mockReset();vi.mocked(readFileSync).mockImplementation(originalRead.readFileSync);await opened.close();}
  });
});
