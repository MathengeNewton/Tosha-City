#!/usr/bin/env python3
"""Read-only application deployment readiness checker. Standard library only."""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
from pathlib import Path

SKIP_DIRS = {
    ".git", "node_modules", ".next", "dist", "build", "coverage",
    ".venv", "venv", "vendor", "__pycache__", ".pytest_cache",
    ".mypy_cache", ".ruff_cache", ".cache", "target", "bin", "obj"
}
MAX_FILE_BYTES = 1_500_000
ENV_FILE_NAMES = {".env", ".env.local", ".env.production", ".env.development"}
ENV_EXAMPLE_NAMES = {".env.example", ".env.sample", ".env.template", ".env.example.local"}
TEXT_SUFFIXES = {
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".cs", ".fs",
    ".java", ".kt", ".go", ".rs", ".php", ".rb", ".json", ".yaml", ".yml",
    ".toml", ".ini", ".conf", ".config", ".xml", ".html", ".md", ".sh",
    ".dockerfile", ".sql", ".env", ".properties"
}
ENV_PATTERNS = [
    re.compile(r"\bprocess\.env\.([A-Za-z_][A-Za-z0-9_]*)"),
    re.compile(r"\bos\.environ(?:\.get)?\s*\[\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]\s*\]"),
    re.compile(r"\bos\.getenv\s*\(\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]"),
    re.compile(r"\benv\s*\(\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]"),
    re.compile(r"\bEnvironment\.GetEnvironmentVariable\s*\(\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]"),
    re.compile(r"\bSystem\.getenv\s*\(\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]"),
]
SECRET_NAME_RE = re.compile(r"(secret|password|passwd|token|api[_-]?key|private[_-]?key|credential|\.pem$|\.key$)", re.I)
PORT_RE = re.compile(r"(?i)\b(?:port|listen|expose)\b.{0,30}\b(\d{2,5})\b|(?:localhost|127\.0\.0\.1):(\d{2,5})")
FRAMEWORK_HINTS = {
    "Next.js": ["next"],
    "React": ["react"],
    "Vue": ["vue"],
    "Nuxt": ["nuxt"],
    "Angular": ["@angular/core"],
    "Svelte": ["svelte"],
    "Vite": ["vite"],
    "Express": ["express"],
    "NestJS": ["@nestjs/core"],
    "Fastify": ["fastify"],
    "Django": ["django"],
    "Flask": ["flask"],
    "FastAPI": ["fastapi"],
    "ASP.NET": [],
    "Spring Boot": ["spring-boot"],
    "Laravel": [],
    "Rails": ["rails"],
}

class Report:
    def __init__(self):
        self.findings = []
    def add(self, severity, title, detail):
        self.findings.append((severity, title, detail))
    def show(self):
        order = {"BLOCKER": 0, "WARNING": 1, "INFO": 2, "PASS": 3}
        print("\n=== Findings ===")
        for sev, title, detail in sorted(self.findings, key=lambda x: (order.get(x[0], 9), x[1].lower())):
            print(f"[{sev}] {title}\n  {detail}")
        counts = {s: sum(1 for x in self.findings if x[0] == s) for s in order}
        print("\n=== Summary ===")
        print("  " + " | ".join(f"{s}: {counts[s]}" for s in ("BLOCKER", "WARNING", "INFO", "PASS")))

def read_text(path: Path):
    try:
        if path.stat().st_size > MAX_FILE_BYTES:
            return None
        return path.read_text(encoding="utf-8", errors="replace")
    except (OSError, ValueError):
        return None

def walk_files(root: Path):
    for current, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not (Path(current) / d).is_symlink()]
        for name in files:
            p = Path(current) / name
            try:
                if p.is_symlink() or not p.is_file():
                    continue
                yield p
            except OSError:
                continue

def rel(p, root):
    try:
        return str(p.relative_to(root))
    except ValueError:
        return str(p)

def env_keys(path: Path):
    text = read_text(path)
    if text is None:
        return set()
    keys = set()
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        m = re.match(r"([A-Za-z_][A-Za-z0-9_]*)\s*=", line)
        if m:
            keys.add(m.group(1))
    return keys

def main():
    parser = argparse.ArgumentParser(description="Read-only application deployment readiness checker")
    parser.add_argument("project", nargs="?", default=".", help="Application root folder (default: current directory)")
    parser.add_argument("--output", help="Optional Markdown report path; no report file is written by default")
    args = parser.parse_args()

    root = Path(args.project).expanduser().resolve()
    if not root.exists() or not root.is_dir():
        print(f"ERROR: project path is not a directory: {root}", file=sys.stderr)
        return 2

    report = Report()
    files = list(walk_files(root))
    by_name = {}
    for p in files:
        by_name.setdefault(p.name.lower(), []).append(p)
    names = set(by_name)
    relnames = {rel(p, root) for p in files}

    print("APPLICATION DEPLOYMENT READINESS CHECK")
    print(f"Project: {root}")
    print(f"Scanned: {dt.datetime.now().astimezone().isoformat(timespec='seconds')}")
    print("Mode: read-only static inspection; no project code or build scripts executed.")
    print("Note: static checks cannot guarantee the app will build or run successfully.")

    # Stack / manifest detection
    stack = []
    manifest_candidates = [
        "package.json", "pyproject.toml", "requirements.txt", "pipfile", "go.mod",
        "cargo.toml", "pom.xml", "build.gradle", "build.gradle.kts", "composer.json",
        "gemfile"
    ]
    manifest_found = [n for n in manifest_candidates if n in names]
    if "package.json" in names:
        stack.append("Node.js")
        pkg_path = by_name["package.json"][0]
        pkg = {}
        raw = read_text(pkg_path)
        try:
            pkg = json.loads(raw or "{}")
        except json.JSONDecodeError:
            report.add("BLOCKER", "Invalid package.json", "The JSON manifest could not be parsed.")
        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})} if isinstance(pkg, dict) else {}
        frameworks = []
        for fw, hints in FRAMEWORK_HINTS.items():
            if hints and any(h in deps for h in hints):
                frameworks.append(fw)
        if frameworks:
            report.add("INFO", "Detected frontend/backend frameworks", ", ".join(frameworks))
        scripts = pkg.get("scripts", {}) if isinstance(pkg, dict) else {}
        if scripts:
            lines = [f"{k}: {v}" for k, v in scripts.items()]
            report.add("INFO", "package.json scripts (not executed)", "; ".join(lines))
        else:
            report.add("WARNING", "No package scripts found", "Check how the app is built and started.")
        lockfiles = [x for x in ("package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb") if x in names]
        if not lockfiles:
            report.add("WARNING", "No Node lockfile found", "A lockfile improves reproducible dependency installs.")
        else:
            report.add("PASS", "Node lockfile found", ", ".join(lockfiles))
    if "pyproject.toml" in names or "requirements.txt" in names or "pipfile" in names:
        stack.append("Python")
        if not any(x in names for x in ("requirements.txt", "poetry.lock", "uv.lock", "pipfile.lock")) and "pyproject.toml" in names:
            report.add("INFO", "Python dependency lockfile not obvious", "Check the project's chosen packaging tool and lockfile policy.")
    if any(p.suffix.lower() in {".csproj", ".fsproj", ".sln"} for p in files):
        stack.append(".NET")
    if "pom.xml" in names or "build.gradle" in names or "build.gradle.kts" in names:
        stack.append("Java/JVM")
    if "composer.json" in names:
        stack.append("PHP")
    if "gemfile" in names:
        stack.append("Ruby")
    if "go.mod" in names:
        stack.append("Go")
    if "cargo.toml" in names:
        stack.append("Rust")
    if stack:
        report.add("PASS", "Likely application stack", ", ".join(dict.fromkeys(stack)))
    else:
        report.add("WARNING", "Stack not confidently detected", "No common language manifest was found; inspect project structure manually.")

    if manifest_found:
        report.add("INFO", "Dependency manifests found", ", ".join(manifest_found))
    else:
        report.add("WARNING", "No common dependency manifest found", "Confirm this folder is the application root.")

    # Docker files
    dockerfiles = [p for p in files if p.name.lower() == "dockerfile" or p.name.lower().startswith("dockerfile.")]
    compose = [p for p in files if p.name.lower() in {"compose.yaml", "compose.yml", "docker-compose.yaml", "docker-compose.yml"}]
    dockerignore = root / ".dockerignore"
    if dockerfiles:
        report.add("PASS", "Dockerfile found", ", ".join(rel(p, root) for p in dockerfiles))
    else:
        report.add("WARNING", "No Dockerfile found", "A Dockerfile may need to be created unless you use a supported buildpack or another image build approach.")
    if compose:
        report.add("PASS", "Compose file found", ", ".join(rel(p, root) for p in compose))
    else:
        report.add("INFO", "No Compose file found", "Compose is useful when the app needs multiple services or repeatable run settings.")
    if len(dockerfiles) > 1 or len(compose) > 1:
        report.add("WARNING", "Multiple Docker/Compose files", "Confirm which file is intended for the server deployment.")
    if dockerignore.exists():
        ignore_text = read_text(dockerignore) or ""
        missing_patterns = [x for x in (".env", ".git", "node_modules", ".venv") if x not in ignore_text]
        if missing_patterns:
            report.add("WARNING", ".dockerignore may be incomplete", "Common exclusions not visibly listed: " + ", ".join(missing_patterns) + ". Review carefully; use appropriate exceptions if needed.")
        else:
            report.add("PASS", ".dockerignore present", "Common secret/generated directories appear to be excluded.")
    else:
        report.add("WARNING", "Missing .dockerignore", "The Docker build context may include secrets, Git history, dependencies, or build output. Add exclusions before building an image.")

    # Env files / references
    env_files = [p for p in files if p.name in ENV_FILE_NAMES or p.name in ENV_EXAMPLE_NAMES or p.name.startswith(".env.")]
    actual_env = [p for p in env_files if p.name in ENV_FILE_NAMES]
    example_env = [p for p in env_files if p.name in ENV_EXAMPLE_NAMES or p.name.endswith(".example")]
    actual_keys = set().union(*(env_keys(p) for p in actual_env)) if actual_env else set()
    example_keys = set().union(*(env_keys(p) for p in example_env)) if example_env else set()
    if actual_env:
        report.add("INFO", "Environment files found", ", ".join(rel(p, root) for p in actual_env) + " (values intentionally hidden)")
    else:
        report.add("INFO", "No common .env file found", "The app may use injected environment variables or another configuration method.")
    if example_env:
        report.add("PASS", "Environment template found", ", ".join(rel(p, root) for p in example_env))
    elif actual_env:
        report.add("WARNING", "No environment template found", "Consider documenting required variable names in .env.example without real values.")

    refs = set()
    for p in files:
        if p.name in ENV_FILE_NAMES or p.name in ENV_EXAMPLE_NAMES or p.suffix.lower() not in TEXT_SUFFIXES:
            continue
        text = read_text(p)
        if text is None:
            continue
        for pattern in ENV_PATTERNS:
            refs.update(pattern.findall(text))
    if refs:
        report.add("INFO", "Environment variable references detected", ", ".join(sorted(refs)))
        if example_env:
            undocumented = refs - example_keys
            if undocumented:
                report.add("WARNING", "Variables not documented in env template", ", ".join(sorted(undocumented)))
            else:
                report.add("PASS", "Detected variables documented", "All statically detected names appear in the example env file(s).")
    if actual_env and example_env:
        undocumented_actual = actual_keys - example_keys
        if undocumented_actual:
            report.add("WARNING", "Keys in .env missing from template", ", ".join(sorted(undocumented_actual)) + " (names only)")
    gitignore = read_text(root / ".gitignore") if (root / ".gitignore").exists() else ""
    dockerignore_text = read_text(dockerignore) if dockerignore.exists() else ""
    if actual_env:
        if gitignore and re.search(r"(?m)^\s*\.env(?:\*|(?:\s|$))", gitignore):
            report.add("PASS", ".env appears in .gitignore", "Verify any intended exceptions.")
        else:
            report.add("WARNING", ".env may not be ignored by Git", "Check .gitignore; do not commit real credentials.")
        if dockerignore_text and re.search(r"(?m)^\s*\.env(?:\*|(?:\s|$))", dockerignore_text):
            report.add("PASS", ".env appears in .dockerignore", "This helps prevent secrets entering the image build context.")
        else:
            report.add("BLOCKER", ".env may enter Docker build context", "Add an appropriate .env exclusion to .dockerignore before building; pass required values at runtime instead.")

    # Ports / bindings
    ports = set()
    loopback_hits = []
    for p in files:
        if p.suffix.lower() not in TEXT_SUFFIXES and p.name.lower() not in {"dockerfile", "compose.yaml", "compose.yml", "docker-compose.yml", "docker-compose.yaml"}:
            continue
        text = read_text(p)
        if text is None:
            continue
        for match in PORT_RE.finditer(text):
            port = match.group(1) or match.group(2)
            if port and 1 <= int(port) <= 65535:
                ports.add(port)
        if re.search(r"\b(127\.0\.0\.1|localhost)\b", text) and any(k in text.lower() for k in ("listen", "host", "bind", "server", "port")):
            loopback_hits.append(rel(p, root))
    if ports:
        report.add("INFO", "Possible ports found", ", ".join(sorted(ports, key=int)) + " (verify against actual app configuration)")
    if loopback_hits:
        report.add("WARNING", "Possible loopback-only binding", ", ".join(sorted(set(loopback_hits))) + ". For container access from the LAN, the server process often needs to bind to 0.0.0.0 inside the container.")
    if not ports:
        report.add("INFO", "No likely port found statically", "Confirm the app's runtime port and container binding.")

    # Persistence / dependencies / hygiene
    all_text = "\n".join((read_text(p) or "") for p in files if p.suffix.lower() in TEXT_SUFFIXES and p.stat().st_size <= MAX_FILE_BYTES)
    clues = []
    for db in ("postgres", "postgresql", "mysql", "mariadb", "sqlite", "mongodb", "redis"):
        if re.search(rf"\b{db}\b", all_text, re.I):
            clues.append(db)
    if clues:
        report.add("INFO", "Possible database/cache dependencies", ", ".join(clues) + ". Confirm whether these are external services or containers and plan persistence/backups.")
    data_dirs = [p for p in files if any(part.lower() in {"uploads", "upload", "media", "storage", "data", "files"} for part in p.relative_to(root).parts[:-1])]
    if data_dirs:
        report.add("INFO", "Potential persistent-data directories", ", ".join(sorted({str(p.parent.relative_to(root)) for p in data_dirs})[:20]) + ". Confirm which data must survive container replacement.")
    else:
        report.add("INFO", "No obvious upload/data directory detected", "Confirm whether the app writes uploads, generated files, or SQLite data at runtime.")

    sensitive_names = [rel(p, root) for p in files if SECRET_NAME_RE.search(p.name) and p.name not in ENV_FILE_NAMES | ENV_EXAMPLE_NAMES]
    if sensitive_names:
        report.add("WARNING", "Potentially sensitive filenames found", ", ".join(sensitive_names[:30]) + ". Names only; contents were not inspected.")
    generated = []
    for d in SKIP_DIRS:
        candidate = root / d
        if candidate.exists() and candidate.is_dir():
            generated.append(d)
    if generated:
        report.add("INFO", "Generated/vendor directories present", ", ".join(sorted(generated)) + ". Usually exclude these from transfer/build context unless required.")
    if (root / "README.md").exists() or (root / "readme.md").exists():
        report.add("PASS", "README found", "Check it for setup and deployment instructions.")
    else:
        report.add("INFO", "No README found", "Document the build/start process and required configuration for future deployments.")
    if any(p.name.lower() in {"test", "tests", "__tests__"} for p in files) or any(p.name.lower() in {"tests", "__tests__"} for p in root.iterdir() if p.is_dir()):
        report.add("PASS", "Test files/directories detected", "Tests were not run.")
    else:
        report.add("INFO", "Tests not obvious", "Tests were not executed; verify the app on the development machine.")

    report.show()
    blockers = sum(1 for x in report.findings if x[0] == "BLOCKER")
    warnings = sum(1 for x in report.findings if x[0] == "WARNING")
    next_steps = [
        "Review every BLOCKER and WARNING before packaging the app.",
        "Confirm the production build/start commands; this scanner does not execute them.",
        "Confirm the intended app port and that the app binds to 0.0.0.0 inside its container.",
        "Review .dockerignore so .env and other secrets are not copied into the image.",
        "Identify database/upload data that needs persistent volumes and backups.",
        "Build and test the container on the development machine before transferring it to the server."
    ]
    print("\n=== Recommended next steps ===")
    for i, step in enumerate(next_steps, 1):
        print(f"{i}. {step}")

    if args.output:
        lines = [
            "# Application Deployment Readiness Report",
            "",
            f"- Project: `{root}`",
            f"- Scanned: {dt.datetime.now().astimezone().isoformat(timespec='seconds')}",
            "- Mode: read-only static inspection; project code was not executed.",
            "",
            "## Findings",
            ""
        ]
        for sev, title, detail in sorted(report.findings):
            lines += [f"### [{sev}] {title}", "", detail, ""]
        lines += ["## Recommended next steps", ""] + [f"{i}. {step}" for i, step in enumerate(next_steps, 1)]
        try:
            Path(args.output).expanduser().write_text("\n".join(lines) + "\n", encoding="utf-8")
            print(f"\nMarkdown report saved to: {Path(args.output).expanduser()}")
        except OSError as exc:
            print(f"Could not write report: {exc}", file=sys.stderr)
            return 2

    return 1 if blockers else 0

if __name__ == "__main__":
    raise SystemExit(main())
