# cortexchat — agent instructions

The repository rules, layout and commands are in [`CLAUDE.md`](CLAUDE.md).
Read that file first and follow it; it is kept as the single source so the
two files cannot drift apart.

Summary of what it requires:

- Read `README.md` and `docs/ARCHITECTURE.md` before non-trivial work.
- Use pnpm from the repo root: `pnpm install`, `pnpm build`, `pnpm test`,
  `pnpm typecheck`, `pnpm lint`. Build packages before running the web app.
- Keep the default model registry (`config/models.yaml`) 100% free; do not
  relax the test that enforces it.
- Keep `packages/core` free of dependencies on other workspace packages.
- Tests must not call live APIs. Secrets stay in `.env` only.
- Make the smallest correct change, do not weaken tests, and report only
  verification that was actually run.
