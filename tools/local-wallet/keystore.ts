import {readFileSync,realpathSync,statSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {spawnSync} from 'node:child_process';
import {getAddress,type Hex} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {invariant} from '../../src/domain/errors';

export function walletLocation(value:string) {
  const directory=realpathSync(resolve(value)),offset=relative(process.cwd(),directory);
  invariant(offset&&!offset.startsWith('..')&&!isAbsolute(offset),'Wallet must be inside this project');
  invariant(spawnSync('git',['check-ignore','--quiet','--',directory],{windowsHide:true}).status===0,'Wallet directory must be Git-ignored');
  const localFile=(name:string)=>{const file=realpathSync(resolve(directory,name)),offset=relative(directory,file);invariant(offset&&!offset.startsWith('..')&&!isAbsolute(offset)&&statSync(file).size<=8192,'Wallet file is outside the wallet directory or too large');return file;};
  const metadata=JSON.parse(readFileSync(localFile('wallet.dpapi.json'),'utf8')) as {format:string;address:string;chainId:number;protection:{provider:string;scope:string;entropyLabel:string};protectedPrivateKey:string};
  const owner=getAddress(readFileSync(localFile('address.txt'),'utf8').trim());
  invariant(metadata.format==='forktrade-local-testnet-wallet/v1'&&metadata.chainId===50383&&getAddress(metadata.address)===owner&&metadata.protection.provider==='Windows DPAPI'&&metadata.protection.scope==='CurrentUser'&&metadata.protection.entropyLabel==='ForkTrade/testnet/50383/wallet/v1','Unsupported local keystore');
  return {directory,owner,metadata};
}
// CLI wallet process only. Next/app/server code must never import this module.
export function unlockLocalWallet(location:ReturnType<typeof walletLocation>) {
  invariant(process.platform==='win32','This keystore requires its original Windows user profile');
  const command=String.raw`$ErrorActionPreference='Stop';try{Add-Type -AssemblyName System.Security;$record=[Console]::In.ReadToEnd()|ConvertFrom-Json;$encrypted=[Convert]::FromBase64String($record.protectedPrivateKey);$entropy=[Text.Encoding]::UTF8.GetBytes($record.protection.entropyLabel);$plain=[Security.Cryptography.ProtectedData]::Unprotect($encrypted,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Text.Encoding]::UTF8.GetString($plain));[Array]::Clear($plain,0,$plain.Length)}catch{[Console]::Error.Write('Local wallet unavailable');exit 1}`;
  const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{input:JSON.stringify(location.metadata),encoding:'utf8',windowsHide:true,maxBuffer:4096});
  invariant(result.status===0&&/^0x[0-9a-fA-F]{64}$/.test(result.stdout),'Local wallet could not be unlocked');
  const account=privateKeyToAccount(result.stdout as Hex);
  invariant(account.address===location.owner,'Local key/address mismatch');
  return account;
}
