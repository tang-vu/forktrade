'use client';
import {useState} from 'react';
import {LockKeyhole,ArrowUpRight} from 'lucide-react';
import {api} from './client-api';
import {connectWallet,signOwnership,type WalletProvider} from '../integrations/browser-wallet';
export type OwnerSession={owner:string;csrf:string;expiresAt:number};
declare global {interface Window {ethereum?:WalletProvider}}
export function WalletSession({session,enabled,busy,onSession,onProvider,onEnd,onError}:{
  session:OwnerSession|null;enabled:boolean;busy:boolean;
  onSession:(session:OwnerSession,provider:WalletProvider)=>Promise<void>;
  onProvider:(provider:WalletProvider,owner:string)=>void;onEnd:()=>void;onError:(message:string)=>void;
}) {
  const [challenge,setChallenge]=useState<{owner:string;nonce:string;message:string;expiresAt:number}|null>(null),[working,setWorking]=useState(false);
  async function connect() {
    if(working||busy)return;setWorking(true);
    try {
      const provider=window.ethereum,context=await connectWallet(provider,enabled);onProvider(provider!,context.owner);
      if(session?.owner.toLowerCase()===context.owner.toLowerCase()){setChallenge(null);return;}
      const result=await api<{nonce:string;message:string;expiresAt:number}>('auth/challenge',{address:context.owner});
      setChallenge({...result,owner:context.owner});
    } catch {onError('Wallet connection or ownership challenge was declined/unavailable. No session or order was created.');}
    finally{setWorking(false);}
  }
  async function authenticate() {
    if(!challenge||!window.ethereum||working||busy)return;setWorking(true);
    try {
      const provider=window.ethereum,signature=await signOwnership(provider,challenge.owner,challenge.message,enabled,window.location.origin);
      const result=await api<OwnerSession>('auth/verify',{nonce:challenge.nonce,address:challenge.owner,signature});
      setChallenge(null);await onSession(result,provider);
    } catch {setChallenge(null);onError('Ownership signing was declined, changed or expired. No new session was created; request a fresh challenge.');}
    finally{setWorking(false);}
  }
  return <section className="session-card"><span className="eyebrow">YOUR WALLET. YOUR AUTHORITY.</span><h3>{session?'Authenticated owner':'Ownership first.'}</h3>{session?<><p className="mono wrap">{session.owner}</p><p>Session expires {new Date(session.expiresAt).toLocaleTimeString()}. An ownership signature grants no order authority.</p></>:<p>Connect an existing supported EOA, review the domain-bound challenge, then sign it yourself. No wallet is created or imported.</p>}{!enabled&&<p className="alert notice">Wallet actions disabled. A separately authorized session is required.</p>}<button className="button primary full" disabled={!enabled||working||busy} onClick={connect}>{working?'Waiting for wallet…':session?'Reattach / change wallet':'Connect permitted wallet'}<ArrowUpRight size={14}/></button>{challenge&&<div className="ownership-challenge"><p><LockKeyhole size={13}/>Ownership only · expires {new Date(challenge.expiresAt).toLocaleTimeString()}</p><details open><summary>Review exact challenge</summary><pre className="wrap">{challenge.message}</pre></details><button className="button dark full" disabled={working||busy} onClick={authenticate}>Sign ownership challenge</button></div>}{session&&<button className="text-button" disabled={working||busy} onClick={onEnd}>End app session</button>}<p className="fine-print">No funding, allowance, delegation or order is included in authentication.</p></section>;
}
