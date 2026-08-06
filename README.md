# Patch Roulette

REST API and web interface for managing Paper updates.

> [!NOTE]  
> This project is intended for internal use and does not guarantee stability, compatibility, support, or follow semantic versioning.

## Overview

### REST API

Powered by Spring Boot, backend for the web interface and `paperweight`. Routes are under `/api`.

### paperweight

`paperweight` has tasks to interface with the REST API during the update process.

### Web Interface

SvelteKit frontend using Kumo Svelte and Tailwind CSS for styling. Hosted as static files by the Spring Boot server.

#### Pages

- [`/`](https://patch-roulette.papermc.io/): Management dashboard
- [`/login`](https://patch-roulette.papermc.io/login) : Login page

## Development

### Setup

- Install [Bun](https://bun.sh/) and execute `bun install` in `/web` to install the required dependencies for the frontend.
- Install a JVM 25 or newer for the Gradle runtime (prefer a JDK to avoid extra downloads for a compiler).

### Running Locally

- Run the frontend with `bun run devLocalServer` or `bun run devProdServer` in `/web`. `devLocalServer` will use localhost as the API, while `devProdServer` will use the production API at https://patch-roulette.papermc.io/api.
- Run the backend with `./gradlew bootRun` in the project root.

### Checks

- Run the frontend checks with `bun run lint`, `bun run check`, and `bun run build` in `/web`.
- Run the backend checks and tests with `./gradlew build` in the project root.

### Code Style

- The frontend uses ESLint and Prettier for code style. Run `bun run format` to reformat and `bun run lint` to check style.
- The backend uses Immaculate with Palantir Java Format. Run `./gradlew immaculateApply` to reformat and `./gradlew immaculateCheck` to check style.

### Deployment

- Published to the GitHub Container Registry after successful pushes to `master` through the `publish` job in the CI workflow.
