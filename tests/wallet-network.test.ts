import {describe,it,expect,vi} from 'vitest';
import type {EIP1193Provider} from 'viem';
import {prepareWalletNetwork} from '../src/integrations/browser-wallet';
import {RPC,EXPLORER} from '../src/integrations/network';
function fixture({unknown=false,reject=false,selectOnAdd=false,stuck=false}={}) {
  let chain='0x1',added=!unknown;
  const request=vi.fn(async(args:{method:string;params?:unknown})=>{
    if(args.method==='eth_chainId')return chain;
    if(args.method==='wallet_switchEthereumChain'){
      if(reject)throw {code:4001};
      if(!added)throw {cause:{code:4902}};
      if(!stuck)chain='0xc4cf';return null;
    }
    if(args.method==='wallet_addEthereumChain'){added=true;if(selectOnAdd)chain='0xc4cf';return null;}
    throw new Error('Unexpected signing/account RPC in network setup');
  });
  return {provider:{request} as unknown as EIP1193Provider,request,setCorrect:()=>{chain='0xc4cf';}};
}
describe('explicit supported-wallet network setup (synthetic provider only)',()=>{
  it('does nothing without permission/provider and only reads an already-selected chain',async()=>{
    const w=fixture();await expect(prepareWalletNetwork(w.provider,false)).rejects.toThrow(/disabled/);expect(w.request).not.toHaveBeenCalled();
    await expect(prepareWalletNetwork(undefined,true)).rejects.toThrow(/No supported/);w.setCorrect();await prepareWalletNetwork(w.provider,true);expect(w.request.mock.calls.map(([a])=>a.method)).toEqual(['eth_chainId']);
  });
  it('switches to the exact chain without requesting accounts, signatures or orders',async()=>{
    const w=fixture();await prepareWalletNetwork(w.provider,true);expect(w.request.mock.calls.map(([a])=>a.method)).toEqual(['eth_chainId','wallet_switchEthereumChain','eth_chainId']);expect(w.request).toHaveBeenCalledWith({method:'wallet_switchEthereumChain',params:[{chainId:'0xc4cf'}]});
  });
  it('adds only the verified chain after 4902 and then explicitly selects it if needed',async()=>{
    const w=fixture({unknown:true});await prepareWalletNetwork(w.provider,true);expect(w.request).toHaveBeenCalledWith({method:'wallet_addEthereumChain',params:[expect.objectContaining({chainId:'0xc4cf',rpcUrls:[RPC],blockExplorerUrls:[EXPLORER],nativeCurrency:expect.objectContaining({symbol:'STT',decimals:18})})]});expect(w.request.mock.calls.filter(([a])=>a.method==='wallet_switchEthereumChain')).toHaveLength(2);
  });
  it('accepts a wallet that selects the newly added network without an extra switch',async()=>{
    const w=fixture({unknown:true,selectOnAdd:true});await prepareWalletNetwork(w.provider,true);expect(w.request.mock.calls.filter(([a])=>a.method==='wallet_switchEthereumChain')).toHaveLength(1);
  });
  it('stops on wallet denial instead of adding a chain or falling through to signing',async()=>{
    const w=fixture({reject:true});await expect(prepareWalletNetwork(w.provider,true)).rejects.toMatchObject({code:4001});expect(w.request.mock.calls.map(([a])=>a.method)).toEqual(['eth_chainId','wallet_switchEthereumChain']);
  });
  it('rechecks the selected chain and rejects a wallet that claims success without switching',async()=>{
    const w=fixture({stuck:true});await expect(prepareWalletNetwork(w.provider,true)).rejects.toThrow(/still on another network/);
  });
});
