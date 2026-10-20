import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import publicSnapshot from '../../evidence/read-only-m4-2026-10-20.json' with {type:'json'};
async function createPlan(page:Page) {
  await page.goto('/');await page.getByRole('button',{name:'Start offline session'}).click();
  await page.getByRole('button',{name:'Load synthetic example'}).click();
  await page.getByRole('button',{name:'Save private thesis'}).click();
  await expect(page.getByText('Version 1 saved privately.',{exact:false})).toBeVisible();
}
async function approve(page:Page) {
  await page.getByRole('button',{name:'Review and approve testnet order'}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Offline synthetic network · 0')).toBeVisible();
  await expect(dialog.getByText('0.0002 BTC / 16.4 USDso')).toBeVisible();
  await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Approve offline simulation'}).click();
  await expect(page.getByRole('region',{name:'Execution receipt'})).toBeVisible();
}
async function publish(page:Page) {
  await page.getByRole('button',{name:'Choose public fields'}).click();
  await page.getByRole('checkbox',{name:'Make these selected fields available',exact:false}).check();
  await page.getByRole('button',{name:'Publish local demo card'}).click();
  const link=page.getByRole('link',{name:'Open local demo card'});await expect(link).toBeVisible();return (await link.getAttribute('href'))!;
}
test('public market check is read-only, labels provenance, and handles unavailable data',async({page})=>{
  let reads=0;
  await page.route('**/api/market',async route=>{
    reads++;
    if(reads===1)await route.fulfill({json:publicSnapshot});
    else await route.fulfill({status:503,json:{error:'Synthetic transport unavailable for this browser test'}});
  });
  await page.goto('/market');
  await expect(page.getByText('Public read only.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Start offline session'})).toHaveCount(0);
  await page.getByRole('button',{name:'Refresh public market'}).click();
  await expect(page.getByRole('heading',{name:'BTC / USDso'})).toBeVisible();
  await expect(page.getByText('8 / 18 decimals')).toBeVisible();
  await page.getByRole('button',{name:'Refresh public market'}).click();
  await expect(page.getByRole('alert').filter({hasText:'Synthetic transport unavailable'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'BTC / USDso'})).toHaveCount(0);
});
test('desktop: version → complete review → synthetic receipt → private/public card → independent remix',async({page,browser})=>{
  const pageErrors:string[]=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await createPlan(page);await approve(page);
  await expect(page.getByRole('region',{name:'Execution receipt'}).getByText('open',{exact:true}).first()).toBeVisible();
  const share=await publish(page);mkdirSync('evidence',{recursive:true});
  await page.screenshot({path:'evidence/offline-desktop.png',fullPage:true});
  const viewer=await browser.newContext({viewport:{width:1280,height:900}}),remix=await viewer.newPage();
  await remix.goto(share);await expect(remix.getByText('SYNTHETIC · confirmed / open')).toBeVisible();
  await expect(remix.getByText('Private offline note.',{exact:false})).toHaveCount(0);
  await remix.getByRole('link',{name:'Create independent remix'}).click();
  await remix.getByRole('button',{name:'Start offline session'}).click();
  await remix.getByLabel('The reasoning').fill('Independent synthetic rationale. No copied authority.');
  await remix.getByLabel('What would change your mind?').fill('A separate synthetic invalidation.');
  await remix.getByLabel('Limit price',{exact:true}).fill('81500');
  await remix.getByRole('button',{name:'Save private thesis'}).click();
  await expect(remix.getByRole('heading',{name:'What changed in the remix?'})).toBeVisible();
  await expect(remix.getByText('81500',{exact:true}).first()).toBeVisible();
  // The independent remix needs its own review. Original plan evidence is not inherited.
  await expect(remix.getByRole('region',{name:'Execution receipt'})).toHaveCount(0);
  await remix.getByRole('button',{name:'Review and approve testnet order'}).click();
  await remix.getByRole('dialog').getByRole('checkbox').check();
  await remix.getByRole('button',{name:'Approve offline simulation'}).click();
  await expect(remix.getByRole('region',{name:'Execution receipt'})).toBeVisible();
  await remix.screenshot({path:'evidence/offline-remix-desktop.png',fullPage:true});
  const childShare=await publish(remix);await remix.goto(childShare);
  await expect(remix.getByRole('heading',{name:'Original plan → Remix plan'})).toBeVisible();
  await page.getByRole('button',{name:'Unpublish',exact:true}).click();
  await remix.reload();await expect(remix.getByRole('heading',{name:'Original plan → Remix plan'})).toHaveCount(0);
  await remix.goto('/');
  // Private owned child remains addressable through the saved-plan list after source withdrawal.
  await remix.getByRole('button',{name:'Remix:',exact:false}).first().click();
  await expect(remix.getByText('Source unavailable or withdrawn.',{exact:false})).toBeVisible();
  await viewer.close();expect(pageErrors).toEqual([]);
});
test('mobile: editor, keyboard review, card and comparison fit 360px',async({page})=>{
  await page.setViewportSize({width:360,height:800});await createPlan(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.getByRole('button',{name:'Review and approve testnet order'}).focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator(':focus')).toHaveCount(1);
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Review and approve testnet order'})).toBeFocused();
  await approve(page);const share=await publish(page);await page.goto(share);
  await expect(page.getByRole('heading',{name:'A patient entry, with a clear invalidation.'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.screenshot({path:'evidence/offline-card-mobile.png',fullPage:true});
  await page.getByRole('link',{name:'Create independent remix'}).click();
  await page.getByLabel('The reasoning').fill('Mobile independent synthetic remix');await page.getByLabel('What would change your mind?').fill('Synthetic invalidation');
  await page.getByLabel('Limit price',{exact:true}).fill('81500');await page.getByRole('button',{name:'Save private thesis'}).click();
  await expect(page.getByRole('heading',{name:'What changed in the remix?'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.screenshot({path:'evidence/offline-remix-mobile.png',fullPage:true});
});
for(const scenario of ['Wallet rejected','Protocol rejected','Chain reverted','Interrupted / unknown','Partial fill, remainder cancelled'])test(`failure/recovery: ${scenario}`,async({page})=>{
  await createPlan(page);await page.getByLabel('Offline outcome scenario').selectOption({label:scenario});await approve(page);
  const receipt=page.getByRole('region',{name:'Execution receipt'});
  await receipt.getByRole('button',{name:'Refresh status'}).click();
  await expect(receipt.getByText('Earlier event history unavailable',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Review and approve testnet order'})).toBeDisabled();
  if(scenario==='Interrupted / unknown') {
    await expect(receipt.getByText('unknown',{exact:true}).first()).toBeVisible();
    await page.getByLabel('Thesis title').fill('New edit after unknown');await page.getByRole('button',{name:'Save new version'}).click();
    await page.getByRole('button',{name:'Review and approve testnet order'}).click();
    await expect(page.getByRole('alert').filter({hasText:'existing request is unresolved'})).toBeVisible();
  }
});
test('preview expiry, edits and disconnect require a fresh review; entered draft survives error',async({page})=>{
  await createPlan(page);await page.clock.install();await page.getByRole('button',{name:'Review and approve testnet order'}).click();
  await page.clock.fastForward(16000);await expect(page.getByRole('dialog').getByRole('button',{name:'Approve offline simulation'})).toBeDisabled();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('expired');await page.keyboard.press('Escape');
  await page.getByLabel('Quantity',{exact:true}).fill('1e3');await page.getByRole('button',{name:'Save new version'}).click();
  await expect(page.getByRole('alert').filter({hasText:'plain decimal'})).toBeVisible();await expect(page.getByLabel('Quantity',{exact:true})).toHaveValue('1e3');
  await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await expect(page.getByRole('button',{name:'Save new version'})).toBeDisabled();
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));await expect(page.getByLabel('Quantity',{exact:true})).toHaveValue('1e3');
});
