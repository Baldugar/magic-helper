## AI Agents Guide

This file is for AI agents contributing code. Keep edits small, typed, documented, and aligned with this structure.

### Project Structure (where to look)

-   server/ (Go, gqlgen)
    -   arango/: DB bootstrap, collections, indexes
    -   graph/: resolvers and domain logic under graph/mtg
    -   daemons/: Scryfall fetchers, index builders
    -   util/: logging, mux, search index, helpers
    -   settings/: configuration loader
    -   main.go: server bootstrap
-   client/ (React + Vite + TS + MUI)
    -   src/context/MTGA/\*: domain providers and hooks
    -   src/graphql/MTGA/: queries, mutations, functions.ts wrappers
    -   src/pages/: routes (Dashboard, DeckCreator)
    -   src/components/: reusable UI (cards, images, selectors)
-   graphql/: shared SDL (types, inputs, enums, root schema)

### Coding Guidelines

-   General

    -   Do not reformat unrelated code. Preserve indentation and style.
    -   Add documentation with each change (GoDoc/JSDoc/SDL descriptions).
    -   Prefer small, focused edits; keep diffs minimal and clear.

-   Go (server)

    -   Use early returns, meaningful errors; avoid deep nesting.
    -   Keep AQL in helpers; use bind variables and index-aware queries.
    -   Document exported and non-trivial functions.

-   TypeScript/React (client)

    -   Write strict, typed code; side-effects in hooks/providers.
    -   Add JSDoc for components, hooks, and contexts; include brief usage when useful.
    -   Annotate complex JSX with inline comments explaining structure and styles.

-   GraphQL SDL
    -   Use triple-quoted descriptions for types/fields.
    -   Keep SDL, server models, and client types in sync.

### Implementation Workflow

1. Update SDL in graphql/ (types/inputs/enums + descriptions).
2. Server: regenerate gqlgen using the regenerate.sh script on the server root folder; implement domain logic under server/graph/mtg.
3. Client: regenerate with npm run generate; add query/mutation and wrapper in client/src/graphql/MTGA/.
4. Wire provider/hook in client/src/context/MTGA/\*; update UI.
5. Document changes (GoDoc/JSDoc/SDL) and align types.
