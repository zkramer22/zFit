---
name: single_pocketbase_instance
description: zFit uses a single PocketBase database for both local dev and production — no separate environments
type: project
---

zFit runs against one PocketBase instance for everything (local dev and production).

**Why:** It's a personal project, not a multi-environment setup.

**How to apply:** Don't reference "production" vs "dev" databases. Scripts can be run directly from the project root. The `.env` file's `PUBLIC_POCKETBASE_URL` points to the one and only instance.
