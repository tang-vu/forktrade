import {afterEach,describe,it,expect} from 'vitest';
import {database,openDatabase,postgresUrl} from '../src/server/database';
import {origin,sameOrigin,cookie} from '../src/server/auth';
const keys=['VERCEL','DATABASE_URL','POSTGRES_URL','FORKTRADE_ORIGIN'] as const;
const original=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
afterEach(()=>{for(const key of keys)if(original[key]===undefined)delete process.env[key];else process.env[key]=original[key];});
describe('hosted configuration boundaries',()=>{
  it('refuses all local file fallback on Vercel instead of creating disposable state',async()=>{
    process.env.VERCEL='1';delete process.env.DATABASE_URL;delete process.env.POSTGRES_URL;
    await expect(openDatabase()).rejects.toThrow(/fallback is disabled/);
    await expect(database()).rejects.toThrow(/Configure Neon DATABASE_URL/);
  });
  it('uses only a canonical HTTPS origin and rejects spoofed mutation origins',()=>{
    process.env.VERCEL='1';delete process.env.FORKTRADE_ORIGIN;
    expect(()=>origin()).toThrow(/canonical HTTPS/);
    for(const value of ['http://forktrade.example','https://forktrade.example/path','https://user:password@forktrade.example']){
      process.env.FORKTRADE_ORIGIN=value;expect(()=>origin()).toThrow();
    }
    process.env.FORKTRADE_ORIGIN='https://forktrade.example';expect(origin()).toBe('https://forktrade.example');
    expect(cookie('synthetic')).toContain('; Secure');
    expect(()=>sameOrigin(new Request('https://forktrade.example/api/plans',{headers:{origin:'https://other.example'}}))).toThrow(/Same-origin/);
  });
  it('rejects malformed database configuration without echoing connection material',()=>{
    const canary='SYNTHETIC_CONFIG_CANARY';
    for(const value of [canary,`https://test:${canary}@invalid.example/db`]){
      let message='';try{postgresUrl(value);}catch(error){message=(error as Error).message;}
      expect(message).not.toContain(canary);expect(message).not.toBe('');
    }
  });
});
