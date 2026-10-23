import {randomUUID} from 'node:crypto';
import type {Page} from '@playwright/test';

const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export type Approval={title:string;rows:[string,string][];expiresAt:number;note:string};
export class ApprovalWindow {
  private pending:{id:string;resolve:(value:boolean)=>void;timer:ReturnType<typeof setTimeout>}|undefined;
  constructor(private page:Page,private synthetic=false,private role:'local'|'original'|'remix'='local'){}
  async initialize(){
    await this.page.context().route('**/*',route=>route.abort());
    await this.page.exposeBinding('walletDecision',({page,frame},value:unknown)=>{
      if(page!==this.page||frame!==this.page.mainFrame()||!value||typeof value!=='object')return;
      const choice=value as {id?:string;approved?:boolean};
      if(!this.pending||this.pending.id!==choice.id||typeof choice.approved!=='boolean')return;
      const pending=this.pending;this.pending=undefined;clearTimeout(pending.timer);pending.resolve(choice.approved===true);
    });
    this.page.on('close',()=>this.cancel());
    await this.idle('No signature or transaction is requested.');
  }
  cancel(){if(this.pending){clearTimeout(this.pending.timer);this.pending.resolve(false);this.pending=undefined;}}
  async idle(message:string){if(!this.page.isClosed()){await this.page.goto('about:blank');await this.page.setContent(this.document('Your local testnet wallet',`<p>${escape(message)}</p><p>Keep this separate window open. The app/server never receives the key. Closing this wallet stops the session.</p>`));}}
  private document(title:string,body:string){return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'"><title>ForkTrade ${this.role} testnet wallet</title><style>body{background:#f5f7ef;color:#172a23;font:16px system-ui;margin:0;padding:28px}main{max-width:620px;margin:auto;background:white;border:1px solid #dce2d4;border-radius:16px;padding:24px}h1{font-size:26px}small{color:#536854}dl>div{padding:11px 0;border-bottom:1px solid #dce2d4}dt{font-size:13px;color:#536854}dd{margin:4px 0 0;overflow-wrap:anywhere;white-space:pre-wrap}button{padding:14px 18px;border-radius:8px;border:1px solid #bdcaa5;margin:12px 8px 0 0;cursor:pointer}button.primary{background:#d7ef85}button:disabled{opacity:.45;cursor:not-allowed}.notice{background:#eef3df;padding:12px;border-radius:8px}</style><main><small>${this.synthetic?'SYNTHETIC WALLET TEST — NO REAL KEY OR NETWORK':`${this.role.toUpperCase()} TESTNET WALLET · CHAIN 50383 · PAPER FUNDS`}</small><h1>${escape(title)}</h1>${body}</main></html>`;}
  async request(review:Approval){
    if(this.pending||review.expiresAt<=Date.now()||this.page.isClosed())return false;
    const id=randomUUID();
    let finish!:(value:boolean)=>void;
    const answer=new Promise<boolean>(resolve=>{finish=resolve;});
    this.pending={id,resolve:finish,timer:setTimeout(()=>this.cancel(),Math.max(1,review.expiresAt-Date.now()))};
    const rows=review.rows.map(([label,value])=>`<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('');
    // A fresh document clears prior review timers and top-level script bindings.
    await this.page.goto('about:blank');
    await this.page.setContent(this.document(review.title,`<p class="notice">${escape(review.note)}</p><dl>${rows}</dl><p id="expiry" role="status"></p><button class="primary" id="approve">Approve this exact request</button><button id="reject">Reject</button><script>const id=${JSON.stringify(id)},expires=${review.expiresAt};const approve=document.getElementById('approve'),reject=document.getElementById('reject');function decide(approved){approve.disabled=true;reject.disabled=true;window.walletDecision({id,approved});}approve.addEventListener('click',event=>{if(event.isTrusted&&Date.now()<expires)decide(true)});reject.addEventListener('click',event=>{if(event.isTrusted)decide(false)});setInterval(()=>{const seconds=Math.max(0,Math.ceil((expires-Date.now())/1000));document.getElementById('expiry').textContent=seconds?'Expires in '+seconds+'s':'Expired — return to the app for a fresh review';if(!seconds)approve.disabled=true},200);</script>`));
    await this.page.bringToFront();
    const approved=await answer;
    await this.idle(approved?'Checking fresh context before signing…':'Declined or expired. Nothing was signed by this request.');
    return approved&&Date.now()<review.expiresAt;
  }
}
