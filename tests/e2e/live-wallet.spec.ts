import {test,expect,type Page} from '@playwright/test';
import type {EIP1193Provider} from 'viem';
import {createSiweMessage} from 'viem/siwe';
import {makePreview,marketIdentity,type PlanInput} from '../../src/domain/plan';
import {offlineContext} from '../../src/integrations/offline';
import metadata from '../../evidence/read-only-m4-2026-10-20.json' with {type:'json'};
const OWNER='0x0000000000000000000000000000000000000001',HASH=`0x${'11'.repeat(32)}`;
const planId='10000000-0000-4000-8000-000000000001',versionId='20000000-0000-4000-8000-000000000001',previewId='30000000-0000-4000-8000-000000000001',attemptId='40000000-0000-4000-8000-000000000001';
type Scenario='open'|'reject'|'timeout'|'switch-before'|'switch-after'|'connect-reject'|'auth';
async function provider(page:Page,scenario:Scenario) {
  await page.addInitScript(({owner,hash,scenario})=>{
    let account=owner;const calls:string[]=[],listeners=new Map<string,Set<()=>void>>();
    const switchOwner=()=>{account='0x0000000000000000000000000000000000000002';listeners.get('accountsChanged')?.forEach(fn=>fn());};
    Object.assign(window,{__syntheticWalletCalls:calls,__syntheticSwitch:switchOwner});
    window.ethereum={request:async({method}:{method:string})=>{
      calls.push(method);if(method==='eth_requestAccounts'&&scenario==='connect-reject')throw Object.assign(new Error('SYNTHETIC_SECRET_CANARY'),{code:4001});if(method==='eth_accounts'||method==='eth_requestAccounts')return [account];if(method==='eth_chainId')return '0xc4cf';
      if(method==='eth_sendTransaction'){if(scenario==='reject')throw Object.assign(new Error('SYNTHETIC_SECRET_CANARY'),{code:4001});if(scenario==='timeout')throw Object.assign(new Error('SYNTHETIC_SECRET_CANARY'),{code:-32000});if(scenario==='switch-after')switchOwner();return hash;}
      if(method==='personal_sign'&&scenario==='auth')return `0x${'ab'.repeat(65)}`;
      throw new Error('Unsupported synthetic wallet method');
    },on:(event:string,fn:()=>void)=>{if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event)!.add(fn);},removeListener:(event:string,fn:()=>void)=>listeners.get(event)?.delete(fn)} as unknown as EIP1193Provider;
  },{owner:OWNER,hash:HASH,scenario});
}
test('testnet UI keeps all wallet calls disabled when session permission is absent',async({page})=>{
  await provider(page,'open');await page.route('**/api/session',route=>route.fulfill({json:{mode:'testnet',session:null,authEnabled:false,executionEnabled:false,disabledReason:'Session permission disabled'}}));
  await page.goto('/');await expect(page.getByRole('button',{name:'Connect permitted wallet'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Load synthetic example'})).toHaveCount(0);await expect(page.getByLabel('Offline outcome scenario')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as unknown as {__syntheticWalletCalls:string[]}).__syntheticWalletCalls)).toEqual([]);
});
test('rejected wallet connection preserves the unsaved draft and does not request a signature',async({page})=>{
  await provider(page,'connect-reject');await page.route('**/api/session',route=>route.fulfill({json:{mode:'testnet',session:null,authEnabled:true,executionEnabled:false,disabledReason:'Order session disabled'}}));
  await page.goto('/');await page.getByLabel('Thesis title').fill('Unsaved synthetic draft');await page.getByRole('button',{name:'Connect permitted wallet'}).click();
  await expect(page.getByRole('alert').filter({hasText:'declined/unavailable'})).toBeVisible();await expect(page.getByLabel('Thesis title')).toHaveValue('Unsaved synthetic draft');
  expect(await page.evaluate(()=>(window as unknown as {__syntheticWalletCalls:string[]}).__syntheticWalletCalls)).toEqual(['eth_requestAccounts']);await expect(page.getByText('SYNTHETIC_SECRET_CANARY')).toHaveCount(0);
});

test('missing injected wallet explains which browser window to use without requesting authentication',async({page})=>{
  let challenges=0;
  await page.route('**/api/session',route=>route.fulfill({json:{mode:'testnet',session:null,authEnabled:true,executionEnabled:false}}));
  await page.route('**/api/auth/challenge',route=>{challenges++;return route.fulfill({status:503,json:{error:'Unexpected synthetic request'}});});
  await page.goto('/');await page.getByLabel('Thesis title').fill('Unsaved synthetic intent');await page.getByRole('button',{name:'Connect permitted wallet'}).click();
  await expect(page.getByRole('alert').filter({hasText:'No supported wallet is available in this browser'})).toBeVisible();
  await expect(page.getByLabel('Thesis title')).toHaveValue('Unsaved synthetic intent');expect(challenges).toBe(0);
});
test('mobile synthetic ownership challenge is reviewed separately from trading',async({page})=>{
  await page.setViewportSize({width:360,height:800});await provider(page,'auth');
  const expiresAt=Date.now()+300000,nonce='syntheticnonce1234567890';
  const message=createSiweMessage({address:OWNER,chainId:50383,domain:'127.0.0.1:3000',uri:'http://127.0.0.1:3000',version:'1',nonce,issuedAt:new Date(),expirationTime:new Date(expiresAt),statement:'SYNTHETIC browser contract test. No transaction authority.'});
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/session')return route.fulfill({json:{mode:'readonly',session:null,authEnabled:true,executionEnabled:false,disabledReason:'Read-only fixture'}});
    if(path==='/api/auth/challenge')return route.fulfill({json:{nonce,message,expiresAt}});
    if(path==='/api/auth/verify')return route.fulfill({json:{owner:OWNER,csrf:'synthetic-csrf',expiresAt}});
    if(path==='/api/plans')return route.fulfill({json:[]});
    return route.fulfill({status:503,json:{error:'No actual backend in synthetic ownership test'}});
  });
  await page.goto('/');await page.getByLabel('Thesis title').fill('Unsaved synthetic intent');await page.getByRole('button',{name:'Connect permitted wallet'}).click();
  await expect(page.getByText('Review exact challenge')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  expect(await page.evaluate(()=>(window as unknown as {__syntheticWalletCalls:string[]}).__syntheticWalletCalls.filter(m=>m==='personal_sign'))).toEqual([]);
  await page.getByRole('button',{name:'Sign ownership challenge'}).click();await expect(page.getByRole('heading',{name:'Authenticated owner'})).toBeVisible();
  await expect(page.getByLabel('Thesis title')).toHaveValue('Unsaved synthetic intent');
  const methods=await page.evaluate(()=>(window as unknown as {__syntheticWalletCalls:string[]}).__syntheticWalletCalls);expect(methods.filter(m=>m==='personal_sign')).toHaveLength(1);expect(methods.filter(m=>m==='eth_sendTransaction')).toHaveLength(0);
});
async function mockFlow(page:Page,scenario:Scenario) {
  await provider(page,scenario);let saved:PlanInput|null=null,hasAttempt=false;const reports:{kind:string}[]=[];let claims=0;
  const context={...offlineContext(OWNER),mode:'testnet' as const,chainId:50383,network:'SYNTHETIC browser wallet contract test - no real transaction',pool:metadata.market.poolAddress,marginBank:metadata.market.marginBank,collateral:metadata.market.quoteToken,
    source:'Explicit synthetic Playwright route fixture',risk:{requiredMargin:'1000000000000000000',feeReserve:'0',initialMarginPortion:'1000000000000000000',adverseGapPortion:'0',leverageSurcharge:'0',equity:'1000000000000000000000',lockedCollateral:'0',accountStateHash:'synthetic',walletPull:'0',mainWalletPull:'0',autoFundingPrevented:true},
    transaction:{gas:'10000000',maxFeePerGas:'2',maxPriorityFeePerGas:'1',nativeBalance:'1000000000',nativeDecimals:18,nativeSymbol:'STT'}};
  const execution={mode:'testnet',owner:OWNER,pool:context.pool,chainId:50383,quantity:'20000',tx:'unknown',order:'unknown',filled:'0',remaining:'20000',hash:null,orderId:null,observedAt:Date.now(),block:null,source:'SYNTHETIC browser test only',coverage:'unavailable',reason:'Synthetic adapter result; never live execution evidence',baseDecimals:8};
  const plan=()=>({id:planId,mode:'testnet',currentVersion:1,rootId:planId,sourceVersion:null,depth:0,versions:[{id:versionId,planId,version:1,input:saved,market:marketIdentity(context),hash:'synthetic-content-hash',createdAt:Date.now()}],attempts:hasAttempt?[{id:attemptId,versionId,previewId,createdAt:Date.now(),candidateHash:null,execution}]:[],publications:[],source:null});
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname.replace('/api/',''),body=route.request().postDataJSON();
    if(path==='session')return route.fulfill({json:{mode:'testnet',session:{owner:OWNER,csrf:'synthetic-csrf-only',expiresAt:Date.now()+600000},authEnabled:true,executionEnabled:true,disabledReason:null}});
    if(path==='plans'&&route.request().method()==='GET')return route.fulfill({json:saved?[{id:planId,title:saved.title,depth:0,currentVersion:1}]:[]});
    if(path==='plans'){saved=body.input;return route.fulfill({status:201,json:plan()});}
    if(path===`plans/${planId}`)return route.fulfill({json:plan()});
    if(path===`plans/${planId}/preview`){const preview=makePreview(saved!,{...context,observedAt:Date.now()},Date.now(),'123');return route.fulfill({json:{id:previewId,versionId,...preview}});}
    if(path===`plans/${planId}/approve`){claims++;hasAttempt=true;if(scenario==='switch-before')await page.evaluate(()=>(window as unknown as {__syntheticSwitch:()=>void}).__syntheticSwitch());return route.fulfill({json:{claimed:claims===1,attemptId,payload:makePreview(saved!,{...context,observedAt:Date.now()},Date.now(),'123').payload}});}
    if(path===`attempts/${attemptId}/report`){reports.push(body);return route.fulfill({json:{id:attemptId,execution}});}
    if(path===`attempts/${attemptId}/refresh`)return route.fulfill({json:{id:attemptId,execution}});
    return route.fulfill({status:503,json:{error:'Unconfigured synthetic test route; no real backend access'}});
  });
  await page.goto('/');await page.getByRole('button',{name:'Reattach / change wallet'}).click();
  await page.getByLabel('Thesis title').fill('SYNTHETIC browser wallet contract test');await page.getByLabel('The reasoning').fill('Explicit automated test fixture, no actual trade');await page.getByLabel('What would change your mind?').fill('Synthetic condition');await page.getByLabel('Limit price',{exact:true}).fill('82000');await page.getByLabel('Quantity',{exact:true}).fill('0.0002');
  await page.getByRole('button',{name:'Save private thesis'}).click();await expect(page.getByText('Version 1 saved privately.',{exact:false})).toBeVisible();
  return {reports,claims:()=>claims};
}
for(const scenario of ['open','reject','timeout','switch-before','switch-after'] as Scenario[])test(`synthetic browser wallet: ${scenario} preserves one approved request`,async({page})=>{
  if(scenario==='timeout')await page.setViewportSize({width:360,height:800});
  const state=await mockFlow(page,scenario);await page.getByRole('button',{name:'Review and approve testnet order'}).click();const dialog=page.getByRole('dialog');
  await expect(dialog.getByText('SYNTHETIC browser wallet contract test - no real transaction',{exact:false})).toBeVisible();
  if(scenario==='timeout')expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Approve exact testnet order'}).click();
  await expect(page.getByRole('region',{name:'Execution receipt'})).toBeVisible();
  const methods=await page.evaluate(()=>(window as unknown as {__syntheticWalletCalls:string[]}).__syntheticWalletCalls);
  expect(methods.filter(m=>m==='eth_sendTransaction')).toHaveLength(scenario==='switch-before'?0:1);expect(state.claims()).toBe(1);
  expect(state.reports[0].kind).toBe(scenario==='reject'?'rejected':scenario==='timeout'?'interrupted':scenario==='switch-before'?'context_changed':'hash');
  await expect(page.getByText('SYNTHETIC_SECRET_CANARY')).toHaveCount(0);await expect(page.getByRole('button',{name:'Review and approve testnet order'})).toBeDisabled();
  if(scenario==='timeout') {
    await page.reload();await page.getByLabel('Saved private plans').selectOption(planId);await expect(page.getByRole('region',{name:'Execution receipt'})).toBeVisible();
    expect(await page.evaluate(()=>(window as unknown as {__syntheticWalletCalls:string[]}).__syntheticWalletCalls.filter(m=>m==='eth_sendTransaction'))).toEqual([]);
  }
});
