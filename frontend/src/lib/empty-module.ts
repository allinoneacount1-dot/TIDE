/**
 * Stub for the unresolvable `@x402/*` specifiers pulled in transitively by
 * `wagmi/connectors` (see next.config.ts). Turbopack's resolveAlias needs a real
 * module to point at, where webpack accepts `false`.
 *
 * Nothing imports this directly and nothing should. If a stack trace ever
 * reaches here, an x402 code path became reachable and the alias is wrong.
 */
const emptyModule = {};
export default emptyModule;
