# NovaCode

A terminal coding assistant. You talk to a model in your terminal, and it reads,
searches, writes and runs things in whatever directory you started it from.

Two modes: **plan** reads only, **build** can change files and run commands.
Press `Tab` to switch.

---

## How it fits together

The CLI is the client, and the server never touches your files.

```
┌──────────────────────┐         ┌──────────────────────┐
│  CLI  (your machine) │         │  Server  (anywhere)  │
│                      │  POST   │                      │
│  terminal UI         │ ──────► │  auth, credits       │
│  tool execution      │         │  prompt, tool specs  │
│  ~/.novacode/*.json  │ ◄────── │  model call          │
└──────────────────────┘  stream └──────────┬───────────┘
                                            │
                                   Postgres ─┘
```

The server declares which tools exist and streams the model's requests back.
The CLI runs them against your working directory and returns the output. That
split is the point: the server can be deployed anywhere without ever seeing
your code.

## Packages

| Package              | What it holds                                       |
| -------------------- | --------------------------------------------------- |
| `@novacode/cli`      | Terminal UI, tool execution, auth token storage     |
| `@novacode/server`   | Hono API, chat streaming, billing, auth middleware  |
| `@novacode/shared`   | Model list and pricing, tool contracts, mode schema |
| `@novacode/database` | Prisma schema and client                            |

Built with [Bun](https://bun.com), [OpenTUI](https://github.com/sst/opentui),
[Hono](https://hono.dev), [Prisma](https://prisma.io) and the
[AI SDK](https://ai-sdk.dev).

## Setup

You need Bun and four accounts. All four have a free tier.

| Service                                                | Used for             | Free tier    |
| ------------------------------------------------------ | -------------------- | ------------ |
| [Neon](https://neon.com)                               | Postgres             | yes          |
| [Google AI Studio](https://aistudio.google.com/apikey) | Gemini models        | yes, no card |
| [Clerk](https://clerk.com)                             | Sign-in              | yes          |
| [Polar](https://polar.sh)                              | Credits and checkout | sandbox      |

### 1. Install

```bash
bun install
```

### 2. Environment

```bash
cp .env.example .env
```

Fill it in. `.env` is gitignored.

**Clerk** needs an OAuth application under _Configure → Developers → OAuth
Applications_, set to **public**, with scopes `openid profile email
offline_access` and this redirect URL:

```
http://localhost:3000/oauth/callback
```

**Polar** needs three objects created in **sandbox**, in this order:

1. A meter named however you like, filtering `name` equals `novacode_usage`,
   aggregating **sum** over the property `credits`
2. A benefit of type _meter credits_ granting some number of units
3. A one-time product that grants that benefit

The strings `novacode_usage` and `credits` must match exactly, or events will
arrive and the meter will stay at zero.

### 3. Database

```bash
cd packages/database
bunx prisma db push
```

## Running

Two terminals:

```bash
bun run dev:server
bun run dev:cli
```

Then `/login` in the CLI, and `/upgrade` to get credits. In the Polar sandbox
the test card is `4242 4242 4242 4242` with any future date.

To prove tools really run locally, start the CLI from a different directory and
ask it what is in there:

```bash
cd ~/some-other-project
bun run --watch /path/to/novacode/packages/cli/src/index.tsx
```

## Using it

Type to talk. `Tab` switches between build and plan. `Escape` interrupts a
reply and keeps what was already written. `@` opens a file picker — filter with
more typing, `Enter` on a folder goes deeper, `Enter` on a file inserts its
path.

| Command              |                                          |
| -------------------- | ---------------------------------------- |
| `/new`               | Back to a fresh conversation             |
| `/session`           | Browse and reopen past sessions          |
| `/agents`            | Switch between build and plan            |
| `/models`            | Switch model                             |
| `/theme`             | Night Console, Ember, Moss, Orchid       |
| `/login`, `/logout`  | Sign in through the browser, or sign out |
| `/upgrade`, `/usage` | Buy credits, or open the billing portal  |
| `/exit`              | Quit                                     |

### Tools

| Tool                                          | Plan | Build |
| --------------------------------------------- | ---- | ----- |
| `read_file`, `list_directory`, `glob`, `grep` | yes  | yes   |
| `write_file`, `edit_file`, `bash`             | no   | yes   |

Plan mode is read-only by construction: the tools that change things are not
offered to the model, and the CLI refuses them a second time even if asked.

File tools resolve paths through `realpath` and refuse anything outside the
directory you started in, symlinks included. **`bash` is deliberately outside
that guard** — a shell command can go anywhere on your machine. It has a
timeout and a capped output, and nothing else.

### Models and credits

Three Gemini models and three Claude models ship in
`packages/shared/src/models.ts`. Usage is priced from that list at one credit
per cent and reported to Polar after each turn; interrupted replies are billed
too, because the tokens were already spent.

Gemini's free tier caps requests **per day per model**, and one agentic turn
spends a request per step. When one model runs out, `/models` to another —
each has its own budget.

## Scripts

```bash
bun run dev:cli       # CLI in watch mode
bun run dev:server    # server in hot-reload mode
bun run typecheck     # all four packages
bun run lint          # eslint across all four packages
```

## Notes

- The Sentry DSN is currently hardcoded in `packages/server/src/index.ts`.
  Anyone with the repo can send events to that project; move it to an
  environment variable before making the repository public.
- `JWT_SECRET` in `.env` is unused. Clerk verifies tokens with
  `CLERK_SECRET_KEY`.
- `CLERK_OAUTH_CLIENT_SECRET` is also unused: the CLI is a public OAuth client
  and uses PKCE instead.
