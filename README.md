# open-wonder-next

Next.js 15 frontend for Open Wonder (React 19, TypeScript).

## Prerequisites

- **Node.js** 20+ (recommended)

## Setup with npm (simplest)

Install and run:

```bash
npm install
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

`predev` / `prebuild` run the token build via Node only, so you **do not** need Yarn on your PATH for `npm run dev` or `npm run build`.

## Setup with Yarn 4 (optional)

This repo pins **Yarn 4.6.0** in `packageManager` for teams that use Yarn.

```bash
corepack enable
yarn install
yarn dev
```

If `yarn` still reports **1.22.22** after `corepack enable`, another Yarn (often **Homebrew**: `/opt/homebrew/bin/yarn`) is earlier on your `PATH` than Corepack’s shim.

**Fix one of these:**

1. **Call Corepack explicitly** (no PATH fight):

   ```bash
   corepack yarn install
   corepack yarn dev
   ```

2. **Remove classic Yarn** so Corepack’s shim wins, e.g. `brew uninstall yarn` (only if you don’t need Yarn 1 for other projects).

3. **Check what runs:**

   ```bash
   which yarn
   which node
   ```

   Corepack’s `yarn` should live next to `node` (same directory as the `node` binary you use).

## Scripts

| Command | Description |
| -------- | ----------- |
| `npm run dev` / `yarn dev` | Build design tokens, then start Next.js dev server |
| `npm run build` / `yarn build` | Production build |
| `npm run start` / `yarn start` | Run production server |
| `npm run lint` / `yarn lint` | ESLint |
| `npm run tokens:build` | Regenerate tokens only (`scripts/build-tokens.mjs`) |

## Lockfile note

The repo may contain both `yarn.lock` and `package-lock.json`. Prefer **one** tool per clone (`npm` *or* `yarn`) so dependencies stay consistent. If `yarn install` refuses to update the lockfile locally:

```bash
YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install
```
