# Repository Guidelines

## Project Structure & Module Organization
- `server/`: Go API bootstrapped by `main.go`; resolvers live in `graph/mtg`, Arango setup in `arango/`, background fetchers in `daemons/`. Shared helpers stay in `util/`, environment JSON in `settings/`.
- `client/`: React + Vite front end. State providers in `src/context/MTGA/`, GraphQL ops and generated hooks in `src/graphql/MTGA/`, routed pages under `src/pages/`, reusable UI in `src/components/`.
- `graphql/`: Authoritative SDL (`*.graphqls`). Update here first so server and client codegen aligns.
- `docs/`, `arangodb/`, `nginx/`: Deployment notes, database fixtures, and proxy templates referenced during releases.

## Build, Test, and Development Commands
- `cd server && bash regenerate.sh`: Refreshes gqlgen bindings after SDL or model edits.
- `cd server && go test ./...`: Executes Go unit tests; keep suites focused and package-local.
- `cd server && go run . -settings settings.development.json`: Launches the API with dev config.
- `cd client && npm install && npm run dev`: Installs dependencies and starts the Vite dev server.
- `cd client && npm run generate`: Produces TypeScript types from the current schema.
- `cd client && npm run lint`: ESLint plus strict TypeScript checks before committing.

## Coding Style & Naming Conventions
- Go code stays `gofmt`/`goimports` clean, prefers early returns, and documents exported or non-trivial functions with GoDoc.
- TypeScript uses Prettier defaults (`tabWidth: 4`, `singleQuote: true`, no semicolons) and ESLint; components use PascalCase, hooks and utilities use camelCase.
- GraphQL SDL needs triple-quoted descriptions and consistent enum casing; mirror schema names across server and client types.

## Testing Guidelines
- Place `_test.go` files beside the code they cover; table-driven cases suit resolvers and helpers.
- Frontend validation hinges on `npm run lint`; add Vitest or React Testing Library specs under `client/src/**/__tests__` for interactive pieces.
- Note manual QA steps in PRs when automation is insufficient.

## Commit & Pull Request Guidelines
- Write imperative, concise commit messages (`Add deck search resolver`, `Fix MTGA package filter`) and cross-link issues with `(#NN)` when relevant.
- Keep PRs narrow, include a short summary, test results, and screenshots or sample queries for UI or API changes.
- Explain regenerated artifacts and avoid drive-by formatting; leave files better documented than you found them.

## Agent Workflow Tips
- Move in the SDL -> server -> client order to keep generated code coherent.
- Before handing off, rerun the commands above and call out any skipped steps for the next contributor.

## Editing Notes
- Prefer small Python helpers for file edits; PowerShell quoting breaks easily on multi-line updates.
- Use `python - <<'PY'` style blocks or temporary scripts, then remove them.
- Reserve raw PowerShell replacements for simple one-liners (e.g. `Set-Content` with static content).

