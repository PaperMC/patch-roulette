# Patch Roulette

Patch Roulette manages Paper update work through a Cloudflare Worker, a Durable Object SQLite database, and a SvelteKit web interface.

> [!NOTE]
> This project is intended for internal use and does not guarantee stability, compatibility, support, or semantic versioning.

## Architecture

- The Cloudflare Worker serves both the SvelteKit UI and the API.
- API routes are under `/api` and are used directly by browser and CLI clients; see [docs/api.md](docs/api.md).
- A single Durable Object owns the SQLite database and serializes patch claims.
- Drizzle ORM manages the Durable Object schema and migrations.
- Cloudflare Access protects every deployed hostname and every route, including `/api`.
- Managed OAuth supplies CLI authentication. The application has no custom API-token system.

The Worker trusts Cloudflare Access as the authentication boundary. It extracts the `iss` and `sub` claims from `Cf-Access-Jwt-Assertion` and maps that external identity to an internal user. The deployed `workers.dev` or custom hostname must therefore be protected by the Access application; do not leave an alternate hostname unprotected.

## Development

Install the dependencies:

```sh
bun install
```

Run the Vite frontend and local Worker together:

```sh
bun run dev
```

The local Worker uses a fixed development identity and local Durable Object SQLite state. Wrangler's normal local persistence is left enabled. Reset it with:

```sh
bun run db:reset
```

Generate Drizzle migrations after changing `src/lib/db/schema.ts`:

```sh
bun run db:generate
```

## Checks

```sh
bun run check
bun run format:check
bun run lint
bun run test
bunx wrangler deploy --config wrangler.jsonc --dry-run
```

## Migration

The temporary Spring-to-Worker migration procedure is documented in [docs/legacy.md](docs/legacy.md).

## Deployment

Build and deploy the Worker:

```sh
bun run deploy
```

Configure Cloudflare Access separately for the actual hostname used by the deployment. Protect the entire hostname, including `/api/*` and the Managed OAuth discovery endpoints. If both a `workers.dev` hostname and a custom hostname are reachable, protect both or disable the unused hostname.
