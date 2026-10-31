import {test,expect} from '@playwright/test';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {ApprovalWindow} from '../../tools/local-wallet/approval';
import {recoverDiagnosticRoot} from '../../tools/local-wallet/resume';
import {edgeProviderScript} from '../../tools/local-wallet/edge-provider';

test('SYNTHETIC temporary Edge provider correlates replies, blocks unsupported methods and cleans up without a key',async({page})=>{
  const owner='0x0000000000000000000000000000000000000001',scope='10000000-0000-4000-8000-000000000001',origin='http://127.0.0.1:3000';
  const requests:{id:string;scopeId:string;method:string}[]=[];
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<h1>SYNTHETIC transport only; no key or network</h1>'}));
  await page.exposeBinding('forktradeEdgeDispatch',({frame},raw:string)=>{expect(frame).toBe(page.mainFrame());requests.push(JSON.parse(raw));});
  await page.addInitScript({content:edgeProviderScript(owner,origin,scope,Date.now()+60000)});await page.goto(origin);
  const initial=await page.evaluate(async()=>{const w=window as unknown as {ethereum:{request:(p:unknown)=>Promise<unknown>}};return {before:await w.ethereum.request({method:'eth_accounts'}),connected:await w.ethereum.request({method:'eth_requestAccounts'}),chain:await w.ethereum.request({method:'eth_chainId'})};});
  expect(initial).toEqual({before:[],connected:[owner],chain:'0xc4cf'});
  const pending=page.evaluate(async()=>{const w=window as unknown as {ethereum:{request:(p:unknown)=>Promise<unknown>}};return w.ethereum.request({method:'personal_sign',params:['SYNTHETIC message only','SYNTHETIC owner only']});});
  await expect.poll(()=>requests.length).toBe(1);
  await page.evaluate(({id,scope})=>{const w=window as unknown as {forktradeEdgeDeliver:(p:unknown)=>void};w.forktradeEdgeDeliver({id,scopeId:'wrong-synthetic-scope',ok:true,value:'SYNTHETIC-WRONG'});w.forktradeEdgeDeliver({id,scopeId:scope,ok:true,value:'SYNTHETIC-NOT-A-SIGNATURE'});},{id:requests[0].id,scope});
  expect(await pending).toBe('SYNTHETIC-NOT-A-SIGNATURE');
  const rejected=await page.evaluate(async()=>{const w=window as unknown as {ethereum:{request:(p:unknown)=>Promise<unknown>}};try{await w.ethereum.request({method:'eth_sign'});}catch(error){return (error as {code:number}).code;}});expect(rejected).toBe(4200);expect(requests).toHaveLength(1);
  const networkRead=page.evaluate(async()=>{const w=window as unknown as {ethereum:{request:(p:unknown)=>Promise<unknown>}};return w.ethereum.request({method:'eth_getBlockByNumber',params:['0x0',false]});});
  await expect.poll(()=>requests.length).toBe(2);expect(requests[1].method).toBe('eth_getBlockByNumber');
  await page.evaluate(({id,scope})=>{const w=window as unknown as {forktradeEdgeDeliver:(p:unknown)=>void};w.forktradeEdgeDeliver({id,scopeId:scope,ok:true,value:{hash:'SYNTHETIC_NETWORK_FINGERPRINT'}});},{id:requests[1].id,scope});
  expect(await networkRead).toEqual({hash:'SYNTHETIC_NETWORK_FINGERPRINT'});
  expect(await page.evaluate(()=>{const w=window as unknown as {forktradeEdgeStop:()=>void;ethereum?:unknown};w.forktradeEdgeStop();return w.ethereum===undefined;})).toBe(true);
});
test('SYNTHETIC Edge provider preserves existing wallets and never installs in a child frame or wrong origin',async({browser})=>{
  const context=await browser.newContext(),page=await context.newPage(),origin='http://127.0.0.1:3000',script=edgeProviderScript('0x0000000000000000000000000000000000000001',origin,'10000000-0000-4000-8000-000000000001',Date.now()+60000);
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<h1>SYNTHETIC boundary test</h1><iframe srcdoc="SYNTHETIC child frame"></iframe>'}));
  await page.addInitScript({content:script});await page.goto(origin);
  const child=page.frames().find(f=>f!==page.mainFrame())!;expect(await child.evaluate(()=>window.ethereum===undefined)).toBe(true);
  await page.goto('http://unapproved-synthetic.invalid');expect(await page.evaluate(()=>window.ethereum===undefined)).toBe(true);
  const protectedPage=await context.newPage();await protectedPage.addInitScript({content:`Object.defineProperty(window,'ethereum',{value:{syntheticExisting:true},configurable:true});${script}`});await protectedPage.route('**/*',route=>route.fulfill({contentType:'text/html',body:'SYNTHETIC existing provider'}));await protectedPage.goto(origin);
  expect(await protectedPage.evaluate(()=>(window.ethereum as unknown as {syntheticExisting:boolean}).syntheticExisting)).toBe(true);await context.close();
});

test('synthetic companion recovery selects an existing root without writes and preserves drafts/ambiguous owners plans',async({page})=>{
  const id='10000000-0000-4000-8000-000000000001',owner='0x0000000000000000000000000000000000000001';
  const saved={id,title:'BTC testnet integration check',depth:0,currentVersion:1};
  const input={title:saved.title,rationale:'SYNTHETIC recovery fixture; no wallet or order',invalidation:'Synthetic condition',riskNotes:'',side:'buy',price:'82000',quantity:'0.00013',quantityCap:'0.00013',notionalCap:'20'};
  let writes=0,reads=0;
  await page.route('**/api/**',route=>{
    if(route.request().method()!=='GET'){writes++;return route.fulfill({status:503,json:{error:'No synthetic mutation permitted'}});}
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/session')return route.fulfill({json:{mode:'readonly',session:{owner,csrf:'synthetic-csrf',expiresAt:Date.now()+600000},authEnabled:false,executionEnabled:false}});
    if(path==='/api/plans')return route.fulfill({json:[saved]});
    if(path===`/api/plans/${id}`){reads++;return route.fulfill({json:{...saved,rootId:id,mode:'testnet',source:null,versions:[{id:'20000000-0000-4000-8000-000000000001',planId:id,version:1,input,hash:'synthetic',createdAt:Date.now()}],attempts:[],publications:[]}});}
    return route.fulfill({status:503,json:{error:'No actual API access in recovery test'}});
  });
  await page.goto('/');await expect(page.getByRole('heading',{name:'Authenticated owner'})).toBeVisible();
  await page.getByLabel('Thesis title').fill('Unsaved synthetic intent');
  expect(await recoverDiagnosticRoot(page,[saved])).toBe(false);await expect(page.getByLabel('Thesis title')).toHaveValue('Unsaved synthetic intent');expect(reads).toBe(0);
  await page.getByLabel('Thesis title').fill('');
  expect(await recoverDiagnosticRoot(page,[saved,{...saved,id:'ambiguous-synthetic-root'}])).toBe(false);
  expect(await recoverDiagnosticRoot(page,[{...saved,depth:1}])).toBe(false);
  expect(await recoverDiagnosticRoot(page,[{...saved,title:'Other private thesis'}])).toBe(false);expect(reads).toBe(0);
  expect(await recoverDiagnosticRoot(page,[saved])).toBe(true);await expect(page.getByLabel('Thesis title')).toHaveValue(saved.title);
  await expect(page.getByLabel('Limit price',{exact:true})).toHaveValue('82000');expect(reads).toBe(1);expect(writes).toBe(0);
  await expect(page.getByRole('region',{name:'Execution receipt'})).toHaveCount(0);
});

test('local provider survives the actual tsx CLI runtime and enforces caller boundaries without a key',()=>{
  const result=spawnSync(process.execPath,['--import','tsx',resolve('tests/e2e/fixtures/local-wallet-runtime.ts')],{cwd:process.cwd(),encoding:'utf8',timeout:25000,windowsHide:true,maxBuffer:16384});
  expect(result.error).toBeUndefined();expect(result.status,result.stderr).toBe(0);
  expect(result.stdout).toContain('SYNTHETIC tsx wallet runtime passed');
  for(const flags of [['--remix'],['--remix','not-a-uuid'],['--prepare-root','--remix','10000000-0000-4000-8000-000000000001']]){
    const rejected=spawnSync(process.execPath,['--import','tsx',resolve('tools/local-wallet/run.ts'),'--wallet-dir','.local/nonexistent-synthetic-wallet',...flags],{cwd:process.cwd(),encoding:'utf8',timeout:25000,windowsHide:true,maxBuffer:4096});
    expect(rejected.status).toBe(1);expect(rejected.stderr).toContain('Use --remix with one visible publication UUID');
  }
});
test('synthetic local wallet UI requires a real click, escapes content, rejects and expires without a signer',async({browser})=>{
  const context=await browser.newContext({viewport:{width:360,height:800}}),page=await context.newPage(),wallet=new ApprovalWindow(page,true);await wallet.initialize();
  const pageErrors:string[]=[];page.on('pageerror',error=>pageErrors.push(error.message));
  const rejected=wallet.request({title:'SYNTHETIC review',rows:[['Untrusted text','<img src=x onerror=alert(1)>']],expiresAt:Date.now()+10000,note:'SYNTHETIC only. No real key, signer or network.'});
  await expect(page.getByRole('button',{name:'Approve this exact request'})).toBeVisible();await expect(page.locator('img')).toHaveCount(0);await expect(page.getByText('<img src=x onerror=alert(1)>',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.getByRole('button',{name:'Reject',exact:true}).click();expect(await rejected).toBe(false);
  const allowed=wallet.request({title:'SYNTHETIC deliberate click',rows:[],expiresAt:Date.now()+10000,note:'Synthetic UI decision only, no signer.'});
  await page.getByRole('button',{name:'Approve this exact request'}).click();expect(await allowed).toBe(true);
  const expired=wallet.request({title:'SYNTHETIC expiry',rows:[],expiresAt:Date.now()+700,note:'No automatic approval.'});expect(await expired).toBe(false);
  await expect(page.getByText('Declined or expired. Nothing was signed by this request.',{exact:true})).toBeVisible();expect(pageErrors).toEqual([]);await context.close();
});
