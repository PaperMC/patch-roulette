# Patch Roulette

REST API and web interface for managing Paper updates and dealing with patches.

## Overview

### REST API

Powered by Spring Boot, backend for the web interface and `paperweight`. Routes are under `/api`.

### paperweight

`paperweight` has tasks to interface with the REST API during the update process.

### Web Interface

SvelteKit frontend using tailwindcss for styling. Hosted as static files by the Spring Boot server.

#### Authenticated Pages

- `/login`: Login page
- `/`: Dashboard

#### Public Pages

- `/diff-viewer/multi-file`: Multi-file concise diff viewer

## Development

Note that Bun can be substituted with the package manager of your choice.

### Setup

Install [Bun](https://bun.sh/) and execute `bun install` in `/web` to install the required dependencies for the frontend.

### Testing

- The frontend can be tested with `bun run devLocalServer` or `bun run devProdServer` in `/web`. `devLocalServer` will use localhost as the API, `devProdServer` will use the production API at https://patch-roulette.papermc.io/api.
- The backend can be tested with `./gradlew bootRun` in the project root.

### Code Style

- The frontend uses ESLint and Prettier for code style. Run `bun run format` to reformat and `bun run lint` to check style.
- The backend simply has a `.editorconfig` file for code style.
