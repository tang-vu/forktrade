import type {Page} from '@playwright/test';
import {z} from 'zod';
import {invariant} from '../../src/domain/errors';

type Reply={ok:true;value:unknown}|{ok:false;error:{code:number;message:string}};
type WalletRequest=(method:string,params:unknown)=>Promise<unknown>;

// Literal browser JavaScript: tsx may add Node-only __name helpers to serialized
// functions. Keep the injected program independent of the CLI transpiler.
const providerScript=String.raw`(() => {
  const listeners = new Map();
  Object.defineProperty(window, 'ethereum', {
    value: {
      isForkTradeLocalTestWallet: true,
      request: async (args) => {
        const reply = await window.forktradeLocalWalletRpc(args);
        if (!reply.ok) throw Object.assign(new Error(reply.error.message), {code: reply.error.code});
        return reply.value;
      },
      on: (event, listener) => {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event).add(listener);
      },
      removeListener: (event, listener) => listeners.get(event)?.delete(listener)
    },
    writable: false,
    configurable: false
  });
})();`;

export async function installLocalWalletProvider(page:Page,origin:string,request:WalletRequest) {
  await page.exposeBinding('forktradeLocalWalletRpc',async(caller,input:unknown):Promise<Reply>=>{
    try {
      invariant(caller.page===page&&caller.frame===page.mainFrame()&&new URL(caller.frame.url()).origin===origin,'Wallet caller origin/frame rejected');
      const args=z.object({method:z.string(),params:z.unknown().optional()}).strict().parse(input);
      return {ok:true,value:await request(args.method,args.params)};
    } catch(error) {
      const code=error&&typeof error==='object'&&'walletCode' in error&&error.walletCode===-32000?-32000:4001;
      return {ok:false,error:{code,message:'Local wallet declined, expired or failed its safety checks. No automatic retry; inspect the existing request.'}};
    }
  });
  await page.addInitScript({content:providerScript});
}
