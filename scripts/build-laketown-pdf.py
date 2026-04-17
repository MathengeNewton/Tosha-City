#!/usr/bin/env python3
"""Build LakeTown PDF from Markdown using system Chrome headless (no Puppeteer download)."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import markdown


def strip_yaml_frontmatter(text: str) -> str:
    if not text.startswith("---\n"):
        return text
    end = text.find("\n---\n", 4)
    if end == -1:
        return text
    return text[end + 5 :].lstrip("\n")


def md_to_html(md_text: str) -> str:
    return markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "nl2br", "sane_lists"],
    )


CSS = """
@page { size: A4; margin: 15mm 15mm 18mm 15mm; }
body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 11pt;
  line-height: 1.45;
  color: #222;
  max-width: 100%;
}
h1 { font-size: 20pt; margin-top: 0; page-break-before: always; }
h1:first-of-type { page-break-before: avoid; }
h2 { font-size: 14pt; margin-top: 1.2em; page-break-after: avoid; }
h3 { font-size: 12pt; margin-top: 1em; }
table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 10pt; }
th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
th { background: #f5f5f5; }
code, pre { font-family: ui-monospace, "Cascadia Code", monospace; font-size: 9.5pt; }
pre {
  background: #f6f8fa;
  padding: 10px 12px;
  overflow-x: auto;
  border-radius: 4px;
  white-space: pre-wrap;
}
hr { border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }
ul, ol { padding-left: 1.4em; }
li { margin: 0.25em 0; }
"""


def build_pdf(
    md_path: Path,
    out_pdf: Path,
    html_title: str,
) -> int:
    tmp_html = out_pdf.parent / f".{out_pdf.stem}.tmp.html"

    if not md_path.is_file():
        print(f"Missing source: {md_path}", file=sys.stderr)
        return 1

    raw = md_path.read_text(encoding="utf-8")
    body = strip_yaml_frontmatter(raw)
    inner = md_to_html(body)
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{html_title}</title>
<style>{CSS}</style>
</head>
<body>
{inner}
</body>
</html>
"""
    tmp_html.write_text(html, encoding="utf-8")
    html_url = tmp_html.as_uri()

    chrome = os.environ.get(
        "CHROME_PATH",
        "/usr/bin/google-chrome-stable",
    )
    if not Path(chrome).is_file():
        print(
            "Set CHROME_PATH to your Chrome or Chromium binary "
            f"(not found: {chrome})",
            file=sys.stderr,
        )
        return 1
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={out_pdf}",
        html_url,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr or r.stdout, file=sys.stderr)
        return r.returncode

    print(f"Wrote {out_pdf}")
    tmp_html.unlink(missing_ok=True)
    return 0


def main() -> int:
    repo = Path(__file__).resolve().parents[1]
    argv = sys.argv[1:]

    if len(argv) == 0:
        return build_pdf(
            repo / "docs" / "laketown" / "LakeTown-End-to-End-Guide.md",
            repo / "docs" / "laketown" / "LakeTown-End-to-End-Guide.pdf",
            "LakeTown Butchery — End-to-End Guide",
        )

    if len(argv) < 2:
        print(
            "Usage: build-laketown-pdf.py [INPUT.md OUTPUT.pdf [HTML_TITLE]]",
            file=sys.stderr,
        )
        print(
            "  (no args) → LakeTown-End-to-End-Guide.md → .pdf",
            file=sys.stderr,
        )
        return 2

    md_path = Path(argv[0])
    out_pdf = Path(argv[1])
    if not md_path.is_absolute():
        md_path = repo / md_path
    if not out_pdf.is_absolute():
        out_pdf = repo / out_pdf
    html_title = (
        argv[2] if len(argv) > 2 else md_path.stem.replace("-", " ")
    )
    return build_pdf(md_path, out_pdf, html_title)


if __name__ == "__main__":
    raise SystemExit(main())
