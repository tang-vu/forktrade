import {test,expect} from '@playwright/test';
import {ApprovalWindow} from '../../tools/local-wallet/approval';
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
