import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {ApprovalWindow} from '../../../tools/local-wallet/approval';
import {installLocalWalletProvider} from '../../../tools/local-wallet/provider';

// Launched through Node + tsx, exactly like wallet:testnet. All pages, owners,
// decisions and RPC results are synthetic; no keystore, signer or network.
const origin='http://127.0.0.1:3000',owner='0x0000000000000000000000000000000000000001';
const browser=await chromium.launch({headless:true});
try {
  const appContext=await browser.newContext(),walletContext=await browser.newContext();
  await appContext.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<p>SYNTHETIC wallet runtime test</p><iframe srcdoc="SYNTHETIC child frame"></iframe>'}));
  const page=await appContext.newPage(),walletPage=await walletContext.newPage(),approval=new ApprovalWindow(walletPage,true);
  await approval.initialize();
  const errors:string[]=[],calls:string[]=[];let connected=false;
  page.on('pageerror',error=>errors.push(error.message));
  await installLocalWalletProvider(page,origin,async(method,params)=>{
    calls.push(method);
    if(method==='eth_chainId')return '0xc4cf';
    if(method==='eth_accounts')return connected?[owner]:[];
    if(method==='eth_requestAccounts'){
      assert.equal(params,undefined);
      const accepted=await approval.request({title:'SYNTHETIC connect',rows:[['Owner',owner]],expiresAt:Date.now()+10000,note:'Synthetic runtime only; no key or signing.'});
      assert.ok(accepted);connected=true;return [owner];
    }
    if(method==='synthetic_uncertain')throw Object.assign(new Error('SYNTHETIC_SECRET_CANARY'),{walletCode:-32000});
    throw new Error('SYNTHETIC_SECRET_CANARY');
  });
  await page.goto(origin);
  assert.equal(await page.evaluate('typeof window.ethereum'), 'object');
  assert.deepEqual(await page.evaluate("window.ethereum.request({method:'eth_accounts'})"),[]);
  const connection=page.evaluate("window.ethereum.request({method:'eth_requestAccounts'})");
  await walletPage.getByRole('button',{name:'Approve this exact request'}).click();
  assert.deepEqual(await connection,[owner]);
  assert.deepEqual(await page.evaluate("Promise.all([window.ethereum.request({method:'eth_accounts'}),window.ethereum.request({method:'eth_chainId'})])"),[[owner],'0xc4cf']);
  const failure="window.ethereum.request({method:'UNSUPPORTED'}).then(()=>null,error=>({code:error.code,message:error.message}))";
  const rejected=await page.evaluate(failure) as {code:number;message:string};
  assert.equal(rejected.code,4001);assert.ok(!rejected.message.includes('SYNTHETIC_SECRET_CANARY'));
  assert.equal(await page.evaluate("window.ethereum.request({method:'synthetic_uncertain'}).catch(error=>error.code)"),-32000);
  const before=calls.length;
  const child=page.frames().find(frame=>frame!==page.mainFrame());assert.ok(child);
  assert.equal((await child.evaluate(failure) as {code:number}).code,4001);
  await page.goto('http://127.0.0.1:3001');
  assert.equal((await page.evaluate(failure) as {code:number}).code,4001);
  assert.equal(calls.length,before);
  assert.deepEqual(errors,[]);assert.ok(!calls.includes('personal_sign')&&!calls.includes('eth_sendTransaction'));
  console.log('SYNTHETIC tsx wallet runtime passed: injection, explicit connect, RPC, redaction, uncertainty and origin/frame denial; no key or signer.');
} finally {await browser.close();}
