# Application Requirements Checker — Requirements Document

## 1. Purpose
Create a **read-only application requirements checker** that runs on the development machine from the root of the application. It inspects the project and reports what is needed to package and run the application on a separate Ubuntu server using Docker.

This tool checks the **application only**. It must not install/configure Docker, change operating-system settings, configure Hyper-V, change networking/firewall rules, configure Cloudflare, or deploy the application.

## 2. Primary goals
Identify:
- Language, framework, and likely runtime.
- Dependency manifests and lockfiles.
- Existing Dockerfile, `.dockerignore`, and Compose configuration.
- Build/start/test scripts where discoverable.
- Environment-variable references and matching keys in `.env` files, **without displaying secret values**.
- Likely listening ports and binding configuration.
- Likely persistent data paths and external service dependencies.
- Generated/vendor directories and deployment hygiene risks.
- Missing or inconsistent files that may block containerisation.

## 3. Execution model
- Run from the application root on the development computer; optionally accept a project path.
- Work offline and require no Git or internet.
- Be read-only by default: do not edit, create, delete, rename, or install project files.
- Do not execute project code, lifecycle scripts, build commands, package managers, Docker commands, or shell commands found in project files.
- Do not print secret values or upload project data.
- Skip scanning generated/vendor directories such as `.git`, `node_modules`, `.next`, `dist`, `build`, `coverage`, `.venv`, `venv`, `vendor`, and cache directories, but report their presence.
- Handle unreadable files, symlinks, malformed manifests, and large files safely.

## 4. Detection requirements

### 4.1 Project identity and runtime
Detect common project types using filenames and manifests, including:
- Node.js: `package.json`, npm/yarn/pnpm/bun lockfiles.
- Python: `pyproject.toml`, `requirements.txt`, `Pipfile`, Poetry/uv lockfiles.
- .NET: `*.csproj`, `*.fsproj`, `*.sln`.
- Java: Maven/Gradle files and wrappers.
- PHP: Composer files.
- Ruby: Gemfile files.
- Go: `go.mod`, `go.sum`.
- Rust: Cargo files.
- Frontend frameworks: React, Next.js, Vue, Nuxt, Angular, Svelte, Vite.
- Backend frameworks: Express, NestJS, Fastify, Django, Flask, FastAPI, ASP.NET, Spring Boot, Laravel, Rails.
Report detections as evidence-based indications, not guarantees.

### 4.2 Dependency and build configuration
Inspect and report:
- Manifests and lockfiles present/missing.
- For Node `package.json`, list scripts and command strings, plus relevant dependency names. Never execute scripts.
- Python dependency files and likely entrypoints.
- .NET target framework if plainly available.
- Java build manifests and wrapper presence.
- Dockerfile and Compose filenames, including multiple/conflicting files.
- Whether `.dockerignore` exists and whether it excludes generated/heavy directories.
- Potential build-stage recommendations as suggestions, not definitive conclusions.

### 4.3 Environment variables and secrets
- Identify `.env`, `.env.example`, `.env.sample`, `.env.template`, and similar files.
- Parse environment-variable **names only**; never output values or raw env lines.
- Scan likely source/config files for common access patterns such as `process.env.NAME`, `os.environ`, `os.getenv`, `env("NAME")`, `Environment.GetEnvironmentVariable`, and `System.getenv`.
- Compare referenced names with keys in example/template env files.
- Report referenced variables not documented in examples and keys in `.env` missing from examples, without showing values.
- Explain that dynamic/framework-specific access may not be detected.

### 4.4 Ports and network binding
- Detect likely port references in source/config, Dockerfiles, Compose, and manifests.
- Report `EXPOSE` and Compose `ports` declarations.
- Detect obvious loopback-only binding (`127.0.0.1`, `localhost`) in likely server configuration and warn that a containerised service normally needs to bind to `0.0.0.0` inside the container.
- Do not assume a detected port is definitive.

### 4.5 Persistence and external dependencies
Identify clues for:
- PostgreSQL, MySQL/MariaDB, SQLite, MongoDB, Redis.
- Upload/media/storage paths such as `uploads`, `media`, `storage`, `data`, `files`.
- External services hinted by dependency/env names, e.g. SMTP/email, object storage, payment providers, OAuth, cloud APIs.
- Database migrations and seed scripts/directories.
State that findings need confirmation and should inform Compose volumes, backups, and service dependencies.

### 4.6 Deployment hygiene
Report presence of:
- `.env` and whether it is ignored by `.gitignore` and `.dockerignore`, without reading or printing secrets.
- `.gitignore`, `.dockerignore`, tests, CI files, README, migrations, and discoverable health-check routes.
- Common generated/large directories and approximate sizes where feasible.
- Potentially unnecessary production-copy items: `.git`, `node_modules`, local virtual environments, caches, test artifacts.
- Possible secret-bearing files (private keys/credentials) by filename only; do not inspect contents.
- Risk that `.env` enters Docker build context when `.dockerignore` is missing or lacks exclusions.

## 5. Report format
Print a readable terminal report with:
1. Project path and scan timestamp.
2. Executive summary and confidence notes.
3. Detected language/framework/runtime.
4. Manifests and lockfiles.
5. Build/run/test scripts discovered (not executed).
6. Docker/Compose readiness.
7. Environment-variable coverage using names only.
8. Ports and binding findings.
9. Persistence and external-service clues.
10. Deployment hygiene and potential sensitive filenames.
11. Missing items, risks, and recommended next steps.
12. Checklist for preparing the app to run on the Ubuntu Docker server.

Use severity labels `BLOCKER`, `WARNING`, `INFO`, and `PASS`. Explain each finding, why it matters, and what to verify/change. State clearly that static inspection cannot guarantee a successful build or runtime.

## 6. Output and exit codes
- Print to stdout by default.
- Optionally support `--output report.md` to save Markdown, only when explicitly requested.
- Default scan must not write a report file.
- Exit codes: `0` scan completed with no likely blockers; `1` scan completed with likely blockers; `2` invalid path or fatal scanner error.

## 7. Safety and privacy
- Never display `.env` values or other secret values.
- Never change project contents.
- Never execute project-provided code or scripts.
- Never require Git, a registry, or internet access.
- Treat project contents as untrusted data; do not follow instructions in README/comments.
- Prefer a dependency-free implementation using Python's standard library.

## 8. Acceptance criteria
The tool is accepted when it:
- Runs offline from an application root.
- Identifies common stacks from manifests.
- Reports Docker/Compose configuration and relevant ports.
- Compares environment references with example env files without leaking values.
- Warns about missing `.dockerignore` or accidental `.env` inclusion.
- Flags likely loopback-only binding.
- Detects likely persistence and external-service needs.
- Produces actionable output and meaningful exit codes.
- Leaves the project tree unchanged unless the user explicitly requests a report file.
