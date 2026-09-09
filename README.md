# MusicNerdWeb

Music Nerd is a community-built artist directory: discover artists, explore their links and
source-backed profiles, and read social updates and interview answers.

Built with Next.js 15, TypeScript, Drizzle/Postgres on Supabase, Privy + NextAuth,
Tailwind CSS, and Radix UI. Catalog data comes from multiple music platforms; research and
interviews use Gemini, with OpenAI retained for legacy paths.

## Develop

New to the project? Start with the [engineering reading path](docs/README.md).

Use npm and the runtime versions declared in [package.json](package.json).
Install the lockfile with `npm ci`, configure a **dev** database and credentials, then run:

```bash
npm run dev
```

Open [https://localhost:3000](https://localhost:3000). The dev server uses a local certificate.

See [Development](docs/development.md) for setup, environment requirements and verification.
Coding assistants start with [AGENTS.md](AGENTS.md); current work is in [MEMORY.md](MEMORY.md).

## Verify

```bash
npm run ci
```

This runs TypeScript, lint, Jest with coverage, and a production build.
Live/browser checks are separate; see the development reference for their environment and
side-effect requirements. A mocked unit suite is not proof of working production services.

## Further reading

- [API reference](ApiReadMe.md)
- [MCP reference](docs/mcp.md)
- [R&D decisions and public documentation](docs/rnd/README.md)
- [Artist Latest experiment](docs/artist-latest.md)
- [Account bookmarks](docs/account-bookmarks.md)

## License

[MIT](LICENSE).
