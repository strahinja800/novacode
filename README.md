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

### Locally

Two terminals, with `API_URL="http://localhost:3000"` in `.env`:

```bash
bun run dev:server
bun run dev:cli
```

Then `/login` in the CLI, and `/upgrade` to get credits. In the Polar sandbox
the test card is `4242 4242 4242 4242` with any future date.

### Against a deployed server

Once the server is hosted, only the CLI runs on your machine. Point `API_URL`
at the deployment and start the CLI alone:

```bash
bun run dev:cli
```

### Switching between the two

Change `API_URL`, then:

1. **Restart the CLI.** Bun reads `.env` at process start; `--watch` only
   reacts to code changes, so a running CLI keeps the old value and sends the
   wrong `redirect_uri` on login.
2. **Sign in again.** The token belongs to whichever backend issued it.

Keep both callback URLs registered in Clerk so no dashboard change is needed
when you switch:

```
http://localhost:3000/oauth/callback
https://<your-deployment>/oauth/callback
```

### As a command, from any directory

Tools operate on the directory the CLI was started in, not on the repo. To use
it the way it is meant to be used, install the launcher once:

```bash
cd packages/cli
bun link
```

Then, from any project:

```bash
cd ~/some-other-project
novacode
```

The launcher lives at `packages/cli/bin/novacode`. It resolves `.env` relative
to its own location rather than to the working directory, so configuration
still comes from this repo no matter where you run it. `bun link` symlinks back
to the repo, so the command always runs the current code — no rebuild after
editing.

Ask it what is in the directory. It should describe that project, not this one.
That is the architecture working.

## Deploying the server

The server is the only thing that gets hosted. On [Railway](https://railway.com),
pointing at the GitHub repository:

1. Railway detects the monorepo and creates a service per package. **Only the
   `server` service matters** — `cli` and `database` will fail to build, which
   is expected. Delete them.
2. In the server service, **Variables → raw editor**, paste the contents of
   `.env`. Set `PUBLIC_APP_ORIGIN` to the deployment URL, or the redirect after
   checkout will point at an address only the proxy can reach.
3. **Settings → Networking → Generate Domain.** Port 3000 is detected
   automatically.
4. Add `https://<your-deployment>/oauth/callback` to the Clerk OAuth
   application's redirect URLs.

To check it is up, request `/sessions`. A `401` with
`{"error":"Sign in with /login"}` is the healthy answer — the route exists and
Clerk initialised. `/` returns 404 by design; nothing is mounted there.

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
novacode              # the linked CLI, runnable from anywhere
```

## Notes

- The Sentry DSN is currently hardcoded in `packages/server/src/index.ts`.
  Anyone with the repo can send events to that project; move it to an
  environment variable before making the repository public.
- `JWT_SECRET` in `.env` is unused. Clerk verifies tokens with
  `CLERK_SECRET_KEY`.
- `CLERK_OAUTH_CLIENT_SECRET` is also unused: the CLI is a public OAuth client
  and uses PKCE instead.
