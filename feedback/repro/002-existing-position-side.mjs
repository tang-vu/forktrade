// OFFLINE SYNTHETIC TEST. Fetch two pinned public source files, then execute
// their unchanged logic with test doubles. No wallet, RPC, signing or trading.
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

if (!vm.SourceTextModule) throw new Error('Run with Node 24 and --experimental-vm-modules');
let outputPath;
if (process.argv.length > 2) {
  if (process.argv.length !== 4 || process.argv[2] !== '--out') throw new Error('Optional usage: --out feedback/evidence/<new-file>.json');
  const root = resolve('feedback/evidence');
  outputPath = resolve(process.argv[3]);
  const offset = relative(root, outputPath);
  if (!offset || offset.startsWith('..') || isAbsolute(offset) || !outputPath.endsWith('.json')) {
    throw new Error('Evidence output must be a JSON file inside feedback/evidence');
  }
}

const revision = '25798660bbe4674a6f83a960b202852896e2fed4';
const origin = 'https://raw.githubusercontent.com';
const files = [
  { path: 'strategies/perp-starter/src/index.ts', sha256: '3e0158ab088489fbd63ff4a0e1a38174d6c5be6a3fee1fd85c4ea19065f731b1' },
  { path: 'packages/perp-core/src/stops.ts', sha256: '25fad946e4510d135091f8dca24e19e4347814bc8b415b89141dea67be514a25' },
];
const sources = [];
for (const file of files) {
  const url = `${origin}/somnia-chain/dreamdex-bot-kit/${revision}/${file.path}`;
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Public source fetch failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > 512000 || createHash('sha256').update(bytes).digest('hex') !== file.sha256) {
    throw new Error('Pinned upstream source size/hash mismatch; stopped before execution');
  }
  sources.push(stripTypeScriptTypes(new TextDecoder().decode(bytes), { mode: 'strip' }));
}

// Zero is an explicit test sentinel, not a created wallet or real account.
const account = '0x0000000000000000000000000000000000000000';
const market = {
  symbol: 'OFFLINE-BTC-PERP', display: 'OFFLINE TEST BTC',
  info: { baseSymbol: 'OFFLINE-BTC', baseDecimals: 8, quoteDecimals: 18,
    tickSize: '100000000000000000', marginBank: account },
};

async function run(configuredSide, existingSide) {
  const logs = [], bracketRequests = [], boundaries = [];
  let finish;
  const finished = new Promise(resolve => { finish = resolve; });
  const rejectWrite = () => { throw new Error('OFFLINE TEST: unexpected write/control path'); };
  const context = vm.createContext({
    console: { log: (...args) => logs.push(args.join(' ')), error: (...args) => logs.push(args.join(' ')) },
    process: { env: { DRY_RUN: 'true', PERP_SIDE: configuredSide }, exit: code => finish(code) },
  });
  const alignment = new vm.SyntheticModule(['alignPrice'], function () {
    this.setExport('alignPrice', price => price / BigInt(market.info.tickSize) * BigInt(market.info.tickSize));
  }, { context });
  const stops = new vm.SourceTextModule(sources[1], { context, identifier: 'pinned-upstream-stops' });
  await stops.link(name => {
    if (name !== './markets.js') throw new Error(`Unexpected upstream import: ${name}`);
    return alignment;
  });
  await stops.evaluate({ timeout: 1000 });
  const core = {
    ORDER_TYPE: { MARKET: 1 }, loadEnv() {}, envNum: (_name, fallback) => fallback,
    createExchange: options => {
      if (options.withSigner !== false) throw new Error('Unexpected signer request');
      boundaries.push('withSigner:false');
      return { config: { dryRun: true }, exchange: { walletAddress: account,
        trader: new Proxy({}, { get: () => rejectWrite }) } };
    },
    onStop: () => () => false, requireMarket: async () => market,
    tradingKeyCheck: async () => ({ ok: true }),
    preflight: async () => ({ ok: true, message: 'OFFLINE TEST: synthetic preflight only' }),
    somiPerStop: async () => 150000000000000000n,
    ensureLeverage: async () => ({ dryRun: true }),
    positionIn: async () => ({ side: existingSide, contracts: 1 }), pendingStops: async () => [],
    liveMark: async () => 100, markOf: () => 100,
    armBracket: async args => {
      bracketRequests.push({ position: args.position, dryRun: args.ctx.config.dryRun });
      return stops.namespace.armBracket(args);
    },
    shutdown: async () => boundaries.push('shutdown'),
    cancelStops: rejectWrite, closePosition: rejectWrite, placePerp: rejectWrite,
    sizeForNotional: rejectWrite, sizeOrder: rejectWrite, sleep: rejectWrite,
  };
  const exports = Object.keys(core);
  const coreModule = new vm.SyntheticModule(exports, function () {
    for (const name of exports) this.setExport(name, core[name]);
  }, { context });
  const strategy = new vm.SourceTextModule(sources[0], { context, identifier: 'pinned-upstream-perp-starter' });
  await strategy.link(name => {
    if (name !== '@dreamdex-bot-kit/perp-core') throw new Error(`Unexpected upstream import: ${name}`);
    return coreModule;
  });
  await strategy.evaluate({ timeout: 1000 });
  let timer;
  try {
    const exitCode = await Promise.race([finished, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Offline fixture timed out')), 3000);
    })]);
    if (exitCode !== 0) throw new Error(`Strategy failed: ${logs.join('; ')}`);
    if (bracketRequests.length !== 1 || !boundaries.includes('withSigner:false') || !boundaries.includes('shutdown')) {
      throw new Error('Expected existing-position dry-run path was not exercised');
    }
    return { configuredSide, syntheticExistingSide: existingSide,
      requestedBracketSide: bracketRequests[0].position,
      mismatch: bracketRequests[0].position !== existingSide, exitCode, logs, boundaries };
  } finally { clearTimeout(timer); }
}

const cases = [];
for (const configured of ['long', 'short']) for (const existing of ['long', 'short']) {
  cases.push(await run(configured, existing));
}
if (cases.filter(c => c.mismatch).length !== 2) throw new Error('Expected mismatch did not reproduce');
const record = {
  kind: 'OFFLINE SYNTHETIC CODE-PATH TEST — NOT LIVE EVIDENCE', observedAt: new Date().toISOString(),
  upstreamRevision: revision, sourceFiles: files, nodeVersion: process.version,
  sourceRetrieval: { authenticated: false, publicGETs: files.length, origin },
  execution: { mode: 'offline-synthetic', network: false, signing: false, transactions: false,
    privateKey: false, account: 'zero-address test sentinel, not a real wallet' },
  limitations: ['Synthetic positions and helper responses, not real account/fill/stop evidence',
    'Unmodified upstream strategy and armBracket bodies; TypeScript types stripped with Node builtin',
    'Exchange/preflight/position/mark/tick-alignment imports are test doubles',
    'Actual contract acceptance/rejection and financial impact are untested'], cases,
};
const output = JSON.stringify(record, null, 2) + '\n';
if (outputPath) await writeFile(outputPath, output, { flag: 'wx' });
process.stdout.write(output);
