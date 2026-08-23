# Deployment records

`forge script` writes `<chainId>.json` here on every broadcast.

`frontend/pnpm sync:contracts` reads them into `src/lib/deployments.generated.ts`,
so a local devnet needs no address pasted anywhere.

The JSON files are gitignored: they are per-environment build artifacts, and
committing a devnet record would ship Anvil's deterministic addresses as though
they were a real deployment. For a hosted frontend, set
`NEXT_PUBLIC_TIDE_REGISTRY_<chainId>` instead — env always takes precedence.
