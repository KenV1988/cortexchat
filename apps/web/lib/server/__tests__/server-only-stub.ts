// no-op stand-in for the 'server-only' package under Vitest.
// Next's webpack build swaps 'server-only' for a no-op in server bundles and
// leaves the real (throwing) implementation only in client bundles; outside
// Next there's no such swap, so we alias it ourselves in vitest.config.ts.
export {};
