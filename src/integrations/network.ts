// Bootstrap endpoints are pinned to the current official Hideki testnet guide.
// Contract/market identity is re-read and checked before each live preview.
export const RPC='https://api.hideki2.infra.testnet.somnia.network';
export const INDEXER='https://hideki-dev.smk.somnia.host/v1/graphql';
export const EXPECTED_CHAIN=50383;
export const NETWORK_LABEL='Hideki testnet / DreamDEX app region';
export const EXPLORER='https://explorer.testnet.somnia.network/tokyo';
export const ORDER_GAS_LIMIT='10000000';
export const GTC_EXPIRY_NS=((1n<<64n)-1n).toString();
