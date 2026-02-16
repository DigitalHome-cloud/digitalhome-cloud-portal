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

After `amplify pull` generates `src/aws-exports.js` (hardcoded values, gitignored), run:

```bash
node scripts/generate-aws-config-from-master.js
```

This produces two files:
- `src/aws-exports.deployment.js` — env-var-driven config, **safe to commit**
- `.env.development` — actual values as `GATSBY_*` env vars, **gitignored, never commit**

Gatsby automatically loads `.env.development` during `yarn develop` — no manual sourcing needed. In Amplify Hosting, the same `GATSBY_*` env vars are configured in the Amplify console, so `aws-exports.deployment.js` works in both environments.

**Files that must never be committed:** `src/aws-exports.js`, `.env.development` (both gitignored).

## Architecture

### Backend: AWS Amplify Gen1

The app uses an **Amplify Gen1 backend** (Cognito, AppSync/GraphQL, DynamoDB, Lambda, S3) but the frontend uses **Amplify JS v6** (Gen2-style imports like `aws-amplify/auth`). The backend is configured in `amplify/backend/`.

Amplify is initialized in `gatsby-browser.js`, which imports `src/aws-exports.deployment.js` — an environment-variable-driven config (all `GATSBY_*` env vars). The original `src/aws-exports.js` is the Amplify-generated version with hardcoded values; `aws-exports.deployment.js` is the deployment-safe wrapper.

### Authentication Flow

`AuthContext` (`src/context/AuthContext.js`) wraps the entire app via `gatsby-browser.js`. It exposes:
- `authState`: `"loading"` | `"demo"` | `"authenticated"`
- `user`, `groups`, `hasGroup(name)`, `signOut()`, `reloadSession()`

Groups come from the Cognito ID token claim `cognito:groups`. Two key groups control feature access:
- `dhc-users` — access to SmartHome Designer
- `dhc-operators` — access to SmartHome Operator

The sign-in page (`src/pages/signin.js`) uses the `@aws-amplify/ui-react` `<Authenticator>` component with Google OAuth.

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

- `src/graphql/` — Auto-generated queries, mutations, subscriptions (do not hand-edit)
- `src/ui-components/` — Auto-generated Amplify Studio form components (do not hand-edit)

### Styling

Plain CSS in `src/styles/global.css` and `src/styles/layout.css`. Dark-mode theme with a slate/blue palette. No CSS framework.

## Deployment

Amplify Hosting with branch-to-environment mapping:
- `main` → production (`portal.digitalhome.cloud`)
- `stage` → staging

Build spec is in `amplify.yml`. The build runs `npm run build` and deploys `public/`.
