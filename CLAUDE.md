# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DigitalHome.Cloud Portal — a Gatsby 5 / React 18 web app serving as the launchpad for the DigitalHome ecosystem. It provides tile-based navigation to smart home design and operation tools, user authentication, profile management, and multilingual support.

## Commands

- `yarn develop` — Start local dev server (localhost:8000)
- `yarn build` — Production build (outputs to `public/`)
- `yarn clean` — Clear Gatsby cache (`.cache/` and `public/`)
- `yarn format` — Prettier formatting across all source files
- `yarn edit:translations` — Interactive CLI for editing i18n translation keys
- No test suite is configured yet

## Local Dev Setup

This app is a **frontend-only consumer**. The Amplify Gen 2 backend lives in the umbrella repo (`digitalhome-cloud-darkfactory/amplify/`). The connection details (Cognito + AppSync + S3 IDs) are committed to this repo as `src/amplify_outputs.json` and imported in `gatsby-browser.js` / `gatsby-ssr.js`.

After a backend change in the umbrella, copy the regenerated outputs into this repo:

```bash
cp ~/digitalhomeCloud/digitalhome-cloud-darkfactory/amplify_outputs.json src/
```

Then `yarn develop` (port 8000). For backend authoring see the umbrella's `dhc-amplify-gen2` skill.

`.env.development` (gitignored) is reserved for cross-app URL overrides only (`GATSBY_DESIGNER_URL`, etc.) — backend connection no longer flows through env vars.

**Files that must never be committed:** `.env.development`, `.amplify/`. (Note: `src/amplify_outputs.json` IS committed — it holds public IDs.)

## Architecture

### Backend: AWS Amplify Gen 2

The frontend talks to a Gen 2 backend (defined in TypeScript in the umbrella repo) via Amplify JS v6 (`aws-amplify/auth`, `aws-amplify/api`, `aws-amplify/storage`). Backend resources: Cognito User Pool + Identity Pool, AppSync GraphQL API, DynamoDB tables (UserProfile, LibraryItem, SmartHome, SmartHomeDesign with PITR enabled), S3 storage, plus Lambda functions (`postConfirmation` Cognito trigger, `dhcDesignStorageProxy` for tenant signed-URL access).

Amplify is initialized in `gatsby-browser.js` (and SSR mirror) via:
```js
import outputs from "./src/amplify_outputs.json";
Amplify.configure(outputs);
```

### Authentication Flow

`AuthContext` (`src/context/AuthContext.js`) wraps the entire app via `gatsby-browser.js`. It exposes:
- `authState`: `"loading"` | `"demo"` | `"authenticated"`
- `user`, `groups`, `hasGroup(name)`, `signOut()`, `reloadSession()`

Groups come from the Cognito ID token claim `cognito:groups`. The platform groups (defined in the umbrella's `amplify/auth/resource.ts`) are:
- `dhc-admins` — full admin (Modeler editing, library writes)
- `dhc-modelers` — Modeler editing access
- `dhc-professional` — paid Designer tier
- `dhc-standard` — standard Designer tier
- `dhc-welcome` — auto-assigned to new sign-ups by the `postConfirmation` Lambda trigger

The sign-in page (`src/pages/signin.js`) uses the `@aws-amplify/ui-react` `<Authenticator>` component (email-based; Google federation is not currently enabled).

### Routing & Pages

Gatsby file-based routing in `src/pages/`. Each page must export a GraphQL query for i18n:
```js
export const query = graphql`
  query PageNameQuery($language: String!) {
    locales: allLocale(filter: { language: { eq: $language } }) {
      edges { node { ns data language } }
    }
  }
`;
```

### Internationalization

Three languages: `en` (default), `de`, `fr`. Translation files live in `src/locales/<lang>/common.json`. Components use `useTranslation()` from `gatsby-plugin-react-i18next`.

### GraphQL & UI Components

- `src/graphql/` — Generated queries, mutations, subscriptions (regenerate with `npx ampx generate graphql-client-code` from the umbrella; do not hand-edit)
- `src/ui-components/` — Auto-generated Amplify form components (do not hand-edit)

Schema lives in the umbrella's `amplify/data/resource.ts`. Models:
- `UserProfile` — `allow.owner()` + admin read-only
- `SmartHome` — `allow.ownersDefinedIn("owners")` (multi-owner) + admin
- `SmartHomeDesign` — `allow.ownersDefinedIn("owners")` (multi-owner) + admin, edit-locking via `lockedBy` / `lockedAt`
- `LibraryItem` — admin writes, all-authenticated reads, capability flags (`hasActorCapability`, `hasSensorCapability`, `hasControllerCapability`)
- Custom mutations: `requestDesignReadUrl`, `requestDesignWriteUrl` — Lambda-mediated signed-URL access to tenant S3 paths (DH-SPEC-203)

### Styling

Plain CSS in `src/styles/global.css` and `src/styles/layout.css`. Dark-mode theme with a slate/blue palette. No CSS framework.

### SmartHome Context

`SmartHomeContext` (`src/context/SmartHomeContext.js`) manages the active SmartHome selection. SmartHome IDs are the top-level tenant/partition key across the entire platform (like a SAP client). Format: `{country}-{zip}-{street3letter}{housenumber}-{nn}` (e.g. `DE-80331-MAR12-01`).

Three demo SmartHomes are always available: `DE-DEMO`, `FR-DEMO`, `BE-DEMO`. The active selection is persisted to `localStorage`. When the backend SmartHome model is added, user-linked homes will be fetched via GraphQL.

The context exposes: `smartHomes`, `activeHome`, `setActiveHome(id)`, `isDemo`, `demoHomes`, `userHomes`.

### Authentication Resilience

`AuthContext` calls `getCurrentUser()` before `fetchAuthSession()`. If the Identity Pool ever errors, authentication still works — the user stays authenticated and only group/token-payload data may be missing. The Identity Pool is only needed for direct AWS credential access (S3 client uploads, etc.), not for User Pool auth.

## Dependencies & Licenses

All dependencies are open source. Key libraries:

| Package | License | Notes |
|---------|---------|-------|
| react, react-dom | MIT | UI framework |
| gatsby | MIT | Static site generator |
| aws-amplify | Apache-2.0 | AWS Amplify JS SDK v6 |
| @aws-amplify/ui-react | Apache-2.0 | Pre-built auth UI components |
| i18next, react-i18next | MIT | Internationalization |
| gatsby-plugin-react-i18next | MIT | Gatsby i18n integration |

No copyleft (GPL/LGPL/AGPL) dependencies. Apache-2.0 requires preserving copyright notices and license text in distributions but has no source-sharing obligations. MIT has no obligations beyond including the license.

## Multi-Repo Ecosystem

The DigitalHome.Cloud platform spans multiple repos sharing one Amplify Gen 2 backend (defined in the umbrella):

| App | Repo | Port | URL |
|-----|------|------|-----|
| Portal | `digitalhome-cloud-portal` | 8000 | `portal.digitalhome.cloud` |
| Designer | `digitalhome-cloud-designer` | 8001 | `designer.digitalhome.cloud` |
| Modeler | `digitalhome-cloud-modeler` | 8002 | `modeler.digitalhome.cloud` |

The semantic-core ontology files (TTL, JSON-LD context, SHACL shapes) live in the `core` repo under `src/ontology/`.

**The umbrella repo (`digitalhome-cloud-darkfactory`) owns the `amplify/` directory**. Each app commits its own `src/amplify_outputs.json` (the deploy-stack public IDs). All apps consume the same Cognito User Pool, AppSync API, and S3 bucket.

Cross-app navigation uses env-var-driven URLs: `GATSBY_DESIGNER_URL` defaults to `https://designer.digitalhome.cloud` in production, overridden to `http://localhost:8001` in `.env.development`. The SmartHome ID is passed via `?home=` query parameter.

All repos use `stage` branch for staging work before merging to `main`.

## Deployment

Amplify Hosting with branch-to-environment mapping:
- `main` → production (`portal.digitalhome.cloud`)
- `stage` → staging

Build spec is in `amplify.yml`. The build runs `npm ci && npm run build` and deploys `public/`. Backend deploys (`npx ampx pipeline-deploy`) run from the umbrella repo's Hosting build, not this app's.
