# LakeTown Butchery — documentation hub

This folder holds **LakeTown Butchery**–specific documentation: how the **multi-branch** model works, **branch types**, and how **staff** (including **general butchery** vs **pork** outlets) map onto the system.

## PDF (client / staff — no technical setup)

- **[Userguide.pdf](Userguide.pdf)** — plain step-by-step guide for **end users** when LakeTown is already on the web: sign in, check your branch, cashier day flow, what to ask an admin, and first-time admin setup order.  
- Source: [Userguide.md](Userguide.md)

Regenerate after editing:

```bash
python3 scripts/build-laketown-pdf.py docs/laketown/Userguide.md docs/laketown/Userguide.pdf "LakeTown Butchery — User Guide"
```

## PDF (technical end-to-end)

- **[LakeTown-End-to-End-Guide.pdf](LakeTown-End-to-End-Guide.pdf)** — run the stack locally, verify health, first login, **admin setup in order**, full **cashier day**, admin oversight, and production deployment summary.

**Regenerate the PDF** after editing the Markdown source (uses **Google Chrome** headless; default binary: `/usr/bin/google-chrome-stable`). On macOS or custom installs, point to Chrome explicitly:

```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" python3 scripts/build-laketown-pdf.py
```

Default (Linux):

```bash
python3 scripts/build-laketown-pdf.py
```

Source: [LakeTown-End-to-End-Guide.md](LakeTown-End-to-End-Guide.md)

## Other docs

- **[LakeTown Butchery — overview & operations](laketown-butchery.md)** — multibranch, branch types, staff, branch register template.

For step-by-step training (login, daily flows, setup order), use the **[user manual](../manual/index.md)**.
