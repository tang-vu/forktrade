// A temporary, main-frame-only EIP-1193 transport. Keys stay in the separate
// local wallet process. CDP carries requests to an owner-restricted file inbox;
// no HTTP signing listener, extension installation or app/server key exists.
export function edgeProviderScript(owner:string,origin:string,scopeId:string,expiresAt:number) {
  return String.raw`(() => {
    const owner = ${JSON.stringify(owner)}, origin = ${JSON.stringify(origin)}, scope = ${JSON.stringify(scopeId)}, expires = ${expiresAt};
    if (window !== window.top || location.origin !== origin || window.ethereum !== undefined) return;
    let connected = false, stopped = false;
    const pending = new Map(), listeners = new Map();
    const error = (message, code = 4001) => Object.assign(new Error(message), {code});
    const provider = {
      isForkTradeEdgeAcceptanceWallet: true,
      request: async (args) => {
        if (Date.now() >= expires) {window.forktradeEdgeStop?.(); throw error('Local wallet session expired', 4100);}
        if (stopped || !args || typeof args.method !== 'string') throw error('Local wallet unavailable');
        if (args.method === 'eth_chainId') return '0xc4cf';
        if (args.method === 'eth_accounts') return connected ? [owner] : [];
        if (args.method === 'eth_requestAccounts') {connected = true; return [owner];}
        if (!connected || !['personal_sign', 'eth_sendTransaction', 'eth_getBlockByNumber'].includes(args.method)) throw error('Unsupported wallet method', 4200);
        if (pending.size) throw error('An existing local wallet request must finish first', -32000);
        const id = crypto.randomUUID();
        return new Promise((resolve, reject) => {
          pending.set(id, {resolve, reject});
          window.forktradeEdgeDispatch(JSON.stringify({id, scopeId: scope, method: args.method, params: args.params}));
        });
      },
      on: (event, fn) => {if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn);},
      removeListener: (event, fn) => listeners.get(event)?.delete(fn)
    };
    Object.defineProperty(window, 'ethereum', {value: provider, configurable: true, writable: false});
    Object.defineProperty(window, 'forktradeEdgeDeliver', {configurable: true, value: (reply) => {
      if (reply.scopeId !== scope || !pending.has(reply.id)) return;
      const task = pending.get(reply.id); pending.delete(reply.id);
      if (reply.ok === true) task.resolve(reply.value);
      else task.reject(error('Local wallet safety check declined or the existing result is uncertain', reply.code));
    }});
    Object.defineProperty(window, 'forktradeEdgeStop', {configurable: true, value: () => {
      stopped = true; connected = false;
      listeners.get('disconnect')?.forEach(fn => fn());
      for (const task of pending.values()) task.reject(error('Existing request interrupted; reconcile without resending', -32000));
      pending.clear();
      if (window.ethereum === provider) delete window.ethereum;
      delete window.forktradeEdgeDeliver; delete window.forktradeEdgeStop;
    }});
  })();`;
}
