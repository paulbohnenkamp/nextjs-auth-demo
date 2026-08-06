# Next.js authentication demo documentation

Use this portal as the starting point for understanding, running, and extending the repository.

## Start here

- [Development workflows](development-workflows.md) — setup, Docker, Prisma Studio, migrations, tests, resets, and troubleshooting.
- [Authentication flow](auth-flow.md) — the client state machine and browser/API/database request sequence.
- [Repository file guide](file-guide.md) — the purpose, runtime, and important imports of each maintained file.
- [Security notes](security.md) — implemented controls, trust boundaries, limitations, and deployment checklist.
- [Generated TSDoc reference](reference/README.md) — module and symbol documentation generated directly from source comments.

## Regenerate the API reference

When source TSDoc changes, run:

```bash
npm run docs
```

The browser portal reads the resulting Markdown from `docs/reference`. Refresh the page after generation; the Next.js docs route is dynamic during local development.
