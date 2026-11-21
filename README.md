# CollabDocs

A full-stack real-time collaborative code editor and whiteboard.

## Features

- JWT authentication, registration, profile updates, and password reset flow
- Owner, Editor, and Viewer document permissions
- Create, rename, duplicate, delete, share, and search documents
- Real-time code and whiteboard synchronization with Socket.IO
- Live cursors and presence, chat, and document restore
- Automatic snapshots every 30 seconds and after every 50 changes
- Redis Socket.IO adapter for multi-instance deployment
- Docker Compose deployment and JSON file persistence

## Run locally

```powershell
npm install
npm run dev:full
```

The client runs at `http://localhost:5173` and the API/WebSocket server at `http://localhost:4000`.

## Tests

```powershell
npm run build
cd server
npm test
```

## Load test

Install k6, start the server, then run:

```powershell
k6 run server/test/load.js
```

## Docker

```powershell
docker compose up --build
```

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
