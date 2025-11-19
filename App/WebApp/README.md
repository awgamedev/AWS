# WebApp — Node.js Example Application

This repository contains a sample Node.js web application (located in this folder) along with helper configuration and scripts used for development, local testing, and containerized deployment.

This README explains the app's concepts, folder structure, how to run it locally and in Docker, and describes auxiliary files such as `nodemon.json`, `docker-compose.yml`, `Dockerfile`, and various supporting configuration files that aren't part of the application code itself but are important for development and deployment.

## Quick overview

- Language / runtime: Node.js (see `package.json` for exact engine and dependencies).
- Purpose: sample web application demonstrating routes, middleware, localization and authentication hooks.
- Main entry points: `index.js`, `app.js`, or `server.js` (this project includes `app.js`, `index.js` and `server.js` — see "How it's wired" below).

## How it's wired (conceptual)

- The Node process boots from `index.js` or `server.js` which configures and starts an Express application (defined in `app.js`).
- Requests pass through middleware defined in `middleware/` (authentication, request timing, 404 handling).
- Routes are defined under `routes/` and call into controllers in `controllers/` which use models in `models/`.
- `utils/` contains small helpers used across views/controllers (layout/menu helpers, etc.).
- `public/` holds static assets (CSS/JS) served by Express.
- `locales/` contains translation files used by the app's i18n layer.

## Project layout (what to look at)

- `app.js` — Express app setup: view engine, middleware, routes mounting and error handling.
- `index.js` / `server.js` — process bootstrap and listen; environment and ports are read here.
- `package.json` — dependency list and useful scripts such as `start`, `dev`, `docker-start`.
- `Dockerfile` — containerization instructions to build an image for the app.
- `docker-compose.yml` — compose stacks that can bring up the app along with other services (reverse proxy, logging, etc.).
- `nodemon.json` — nodemon configuration for development auto-reload behavior.
- `start.sh` / `stop.sh` — convenience scripts to start/stop the app (useful for local Linux/macOS shells and may be adapted for Windows).

Folder structure (top-level notable files and directories):

- `public/` — static assets; served directly by Express.
  - `css/` — stylesheet(s)
  - `js/` — client JavaScript
- `src/` (or top-level `controllers`, `models`, `routes`, `middleware`, `utils`) — server-side code:
  - `controllers/` — request handlers and business logic
  - `models/` — data models and database integration
  - `routes/` — path -> controller wiring
  - `middleware/` — Express middleware (auth, request timer, 404 handling)
  - `utils/` — helper utilities used by controllers/views
- `locales/` — translation JSON files (for i18n)

## Environment and configuration

The app reads configuration from environment variables and/or configuration files. Common variables:

- `PORT` — TCP port the HTTP server listens on (default in code or `3000`).
- `NODE_ENV` — `development` or `production` (affects logging, error pages, and caching).
- Any DB connection strings, API keys, or other 3rd-party credentials used by `models/` or services.

For local development, you can create a `.env` file (if the app uses `dotenv`) or set environment variables in your shell.

Example (.env)

```text
PORT=3000
NODE_ENV=development
# DATABASE_URL=postgres://user:pass@localhost:5432/dbname
```

## Run locally (development)

Install dependencies and run with live reload using nodemon (PowerShell example):

```powershell
cd c:\Users\andre\Desktop\AWS\App\WebApp
npm install
npm run dev   # commonly mapped to nodemon or a script that runs `nodemon`/`node` with env
```

If `package.json` has a `dev` script it likely uses `nodemon`. `nodemon.json` controls file-watch behavior; see the section below.

How to run directly with node (production-like):

```powershell
npm install --production
npm start
```

## nodemon and `nodemon.json`

- Purpose: `nodemon` restarts the Node process when files change — convenient for development.
- The `nodemon.json` file defines what files to watch/ignore and how to restart. Typical examples in this project:
  - watch `src/`, `routes/`, `controllers/` and reload on server-side file changes
  - ignore build or log directories

Open `nodemon.json` to see which extensions and paths are watched. If you need to exclude large folders (e.g., `node_modules`) make sure they are listed in the `ignore` array to speed up restarts.

Example (common fields):

```json
{
  "watch": ["src", "routes", "controllers"],
  "ext": "js,json",
  "ignore": ["node_modules", "public"]
}
```

## Dockerfile and container notes

The `Dockerfile` is used to build a Docker image for the app. Typical steps you will find:

- Use an official Node base image.
- Copy `package.json` and `package-lock.json`, install dependencies.
- Copy the application source and set the container's startup command (usually `node index.js` or `npm start`).
- Expose the configured `PORT` and set a default `NODE_ENV`.

You can build and run a container locally (PowerShell):

```powershell
# from the WebApp directory
docker build -t webapp:local .
docker run -p 3000:3000 --env NODE_ENV=development webapp:local
```

## docker-compose.yml

`docker-compose.yml` orchestrates multiple services. In this repo it may be used to run:

- The Node app service
- A reverse proxy (Nginx) using `nginx.conf`
- Logging/monitoring services (Loki/Promtail) using `loki-config.yml` and `promtail-config.yml`

Key points when using `docker-compose`:

- Volumes: in development the source directory is often mounted into the container so code changes are reflected immediately.
- Environment: compose file can inject environment variables or point at an `.env` file.
- Networking: other services (database, logging) are referenced by service name defined in `docker-compose.yml`.

Bring the stack up (PowerShell):

```powershell
docker-compose up --build
# or to detach
docker-compose up -d --build
```

To stop and remove containers:

```powershell
docker-compose down
```

If you only need the app container for development and want to mount the source folder:

```powershell
# Ensure docker-compose has a volume mapping for the app service
docker-compose up
```

## nginx.conf

`nginx.conf` is present in the project; when used, Nginx typically acts as a reverse proxy in front of the Node process:

- Terminates TLS (if configured)
- Routes incoming requests to the Node service on the internal Docker network
- Serves static assets directly in some setups

When running with docker-compose, Nginx is often a separate service that points to the app service by name.

## Logging and observability files

- `loki-config.yml` — configuration for Loki (log aggregation) if the repo includes a logging stack.
- `promtail-config.yml` — Promtail configuration to push container logs to Loki.

These files are not part of the Node app itself but are used in the `docker-compose.yml` stack when you want local logging aggregation.

## start.sh / stop.sh / commands.txt

- These scripts provide convenience for starting/stopping the app in environments where shell scripts are appropriate (usually Linux/macOS). On Windows you may use Powershell equivalents or run the `npm` scripts directly.
- `commands.txt` typically documents common commands for fast reference.

## scripts in `package.json`

Open `package.json` to see declared scripts. Common scripts you may find or want to add:

- `npm start` — start the app in production mode
- `npm run dev` — start the app with `nodemon` for development
- `npm test` — run tests

Use these scripts rather than calling `node` directly where possible; they may set up environment variables or pre-run build steps.

## Localization (i18n)

`locales/` contains JSON translation files (for example `en.json`, `fr.json`, `de.json`). The app reads and uses the correct file depending on the request locale. Controllers or view helpers call a translation function to produce localized strings.

## Security & secrets

- Never commit production secrets or private keys.
- Use environment variables, a secrets manager, or mount secrets at runtime in containers.

### Persistent Login (Remember Me)

The application supports an optional "Remember Me" checkbox on the login page:

- If checked: a JWT (`auth_token`) httpOnly, sameSite=strict (and secure in production) cookie is issued with a 30 day lifetime and the Express session `maxAge` is extended to the same period.
- If not checked: only a session cookie (no `maxAge`) is used; closing the browser clears authentication and no persistent JWT cookie is stored.
- Logging out always removes the `auth_token` and destroys the session.

Environment requirements:

- `JWT_SECRET` for signing the JWT.
- `SESSION_SECRET` for the Express session.
- Set `COOKIE_SECURE=true` (and serve via HTTPS) in production so cookies are only sent over TLS.

To disable persistence entirely remove the token issuance block in `src/features/login/login.routes.js` and/or the `jwtCookieAuth` middleware.

### Token Rotation & Device Management

The app now uses two tokens when "Remember Me" is selected:

- Access Token: JWT (`auth_token`) valid for 15 minutes.
- Refresh Token: Opaque random value (`refresh_token`) valid for 30 days; stored as `userId.randomHex` in a cookie and hashed server-side.

Rotation flow:

- On each request if the access token is missing/expired but a valid refresh token cookie exists, `jwtCookieAuth` rotates both tokens (issues new access + refresh) and replaces the old hashed entry.
- Failed validation clears the refresh cookie.

Logout:

- Removes current device's refresh token hash and clears both cookies.

Forget All Devices:

- POST `/account/forget-devices` (authenticated) clears every stored refresh token (logs out all devices) and removes cookies.

Security notes:

- Refresh tokens are stored hashed (`sha256`) in `user.refreshTokens`.
- Cookies are httpOnly, sameSite=strict and should be `secure` in production.
- Consider adding IP/device metadata and limiting number of stored refresh tokens for stricter control.

### Persistent Authentication (JWT Cookie)

The login flow now issues a signed JWT (`auth_token`) stored in a secure HTTP-only cookie (30 day lifetime) in addition to the session cookie.

Details:

- Cookie attributes: `httpOnly`, `sameSite=strict`, `secure` (only in production), `maxAge=30d`.
- On each request, middleware `jwtCookieAuth` (in `src/middleware/`) restores the user if the session has expired but the JWT is still valid.
- Logout clears both the session and the `auth_token` cookie.

Environment requirements:

- `JWT_SECRET` must be set; otherwise the JWT cookie is skipped.
- Set `COOKIE_SECURE=true` in production behind HTTPS to enforce secure cookies.

To disable persistence temporarily, remove or comment out the `jwtCookieAuth` middleware and the JWT creation block in `login.routes.js`.

## Troubleshooting

- App doesn't start: check `node` version, install dependencies, and inspect `npm start` output.
- Port already in use: ensure `PORT` isn't conflicting with another service.
- Docker permission issues on Windows: run Docker Desktop as admin and ensure files mounted into containers have correct line endings and permissions.
- Nodemon not reloading: confirm `nodemon.json` watches the correct folders and that your editor saves files with the expected extension.

If you need help, check the logs (console, container logs `docker logs <id>`) and search for stack traces.

## Development checklist / common commands

PowerShell (from `App/WebApp`):

```powershell
# install dependencies
npm install

# start development with nodemon
npm run dev

# build and run with docker-compose
docker-compose up --build

# build a local image and run
docker build -t webapp:local .
docker run -p 3000:3000 --env NODE_ENV=development webapp:local
```

## Notes about files that aren't direct app code

- `nodemon.json` — development convenience; safe to ignore for production.
- `docker-compose.yml` — helpful for local stacks, CI, or demo environments.
- `Dockerfile` — necessary to produce a reproducible container image.
- `loki-config.yml` / `promtail-config.yml` — only used if you run the logging stack.
- `nginx.conf` — used when the app is fronted by Nginx.

## Contributing

If you'd like to make changes:

1. Fork or branch the repo.
2. Run `npm install` and `npm run dev` to validate your changes locally.
3. Add tests for new behavior and run them with `npm test` (if available).
4. Open a PR with a clear description of your changes.

## Further improvements (suggested)

- Add a small `Makefile` or `psake` tasks for common workflows on Windows.
- Add a `docker-compose.override.yml` for development volume mounts so production compose file remains clean.
- Add typed definitions (TypeScript) or at least linting rules and a CI job to run tests.

---

If you'd like, I can also:

- Expand any section into more detail (for example, show the `Dockerfile` explained line-by-line).
- Add a short `CONTRIBUTING.md` or a `dev-setup` script for Windows-specific steps.

Let me know which additions you'd like next.
