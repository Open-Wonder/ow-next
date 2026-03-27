# open-wonder-next

Next.js 15 frontend for Open Wonder (React 19, TypeScript).

## Prerequisites

- **Node.js** 20+ (recommended)
- **Yarn 4** via Corepack (pinned in `packageManager`)

## Setup

Enable Corepack once so the repo’s Yarn version is used (not global Yarn 1.x):

```bash
corepack enable
```

Install and run:

```bash
yarn install
yarn dev
```

App: [http://localhost:3000](http://localhost:3000)

## Scripts

| Command        | Description                                      |
| -------------- | ------------------------------------------------ |
| `yarn dev`     | Build design tokens, then start Next.js dev server |
| `yarn build`   | Production build                                 |
| `yarn start`   | Run production server                            |
| `yarn lint`    | ESLint                                           |
| `yarn tokens:build` | Regenerate tokens only (`scripts/build-tokens.mjs`) |

## Lockfile / install issues

If `yarn install` refuses to change the lockfile locally, run once:

```bash
YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install
```

Prefer **Yarn** for this repo (`yarn.lock` + `packageManager`); mixing with `npm install` can desync dependencies.
