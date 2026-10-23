import type {Page} from '@playwright/test';

export type SavedPlan={id:string;title:string;depth:number;currentVersion:number};

// Selection is read-only. Preserve entered drafts and ambiguous/unrelated plans.
export async function recoverDiagnosticRoot(page:Page,plans:SavedPlan[]) {
  if(await page.getByLabel('Thesis title').inputValue())return false;
  const roots=plans.filter(plan=>plan.depth===0&&plan.title==='BTC testnet integration check');
  if(roots.length!==1)return false;
  const saved=page.getByRole('button',{name:new RegExp(`^BTC testnet integration check\\s*Original\\s*·\\s*v${roots[0].currentVersion}$`)});
  if(await saved.count()!==1)return false;
  await saved.click();
  return true;
}
