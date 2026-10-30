import {mode} from './database';
export function capabilities() {
  const authEnabled=mode()!=='offline'&&process.env.FORKTRADE_AUTH_ENABLED==='true';
  const environmentConfirmed=process.env.FORKTRADE_ENVIRONMENT_CONFIRMED==='true';
  const executionEnabled=mode()==='testnet'&&authEnabled&&environmentConfirmed&&process.env.FORKTRADE_EXECUTION_ENABLED==='true';
  return {authEnabled,environmentConfirmed,executionEnabled,hosted:Boolean(process.env.VERCEL),
    disabledReason:executionEnabled?null:mode()==='offline'?'Offline synthetic mode':!authEnabled?'Wallet authentication/session permission is disabled':!environmentConfirmed?'Accepted testnet environment has not been confirmed':mode()==='readonly'?'Read-only mode cannot send an order':'Live order session permission is disabled'};
}
