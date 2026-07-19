# Running cortexchat on every platform

cortexchat is one codebase — a web app that installs as an app (PWA) on
desktop, Android, and iOS. There are no separate native builds; that's the
honest current state (native wrappers via Tauri/Expo are on the roadmap).
The server runs on one machine (your PC, a home server, or a cloud box) and
every device connects to it.

## 0. Prerequisites (server machine)

1. **Node.js 20+** — https://nodejs.org (check: `node --version`)
2. **pnpm 9+** — `npm install -g pnpm` (check: `pnpm --version`)
3. **Ollama** (optional but strongly recommended — it's what makes local,
   free, offline answers possible): install from https://ollama.com, then:

   ```bash
   ollama pull qwen2.5:0.5b     # tiny tier — greetings, small talk (~400MB)
   ollama pull llama3.1:8b      # medium tier — code, math, writing (~4.7GB, needs ~8GB RAM)
   ollama pull nomic-embed-text # embeddings for semantic memory (~275MB)
   ```

   Pull only what your hardware fits; the router skips models that aren't
   there. With no Ollama at all, cortexchat still works — it just routes
   everything to whichever cloud provider you give it a key for.

## 1. Web (this is the base — every other platform builds on it)

```bash
git clone https://github.com/KenV1988/cortexchat.git
cd cortexchat
pnpm install
cp .env.example .env    # optional: add a FREE OpenRouter key — see below

pnpm build              # compiles the workspace packages
pnpm dev                # starts the app at http://localhost:3000
```

**Everything is free.** With Ollama running you need no keys at all. To
also unlock the strongest free open-source cloud models (Llama 3.3 70B,
DeepSeek R1, Qwen 72B — used automatically for hard questions), create a
free account at https://openrouter.ai, generate a key at
https://openrouter.ai/keys (no payment method required), and put it in
`.env` as `OPENROUTER_API_KEY`. The default model registry only ever uses
OpenRouter's `:free` models, so there is nothing to be billed for. Free
models are rate-limited; if one is retired, pick a replacement at
https://openrouter.ai/models?max_price=0 and edit `config/models.yaml`.

Open **http://localhost:3000** and chat. The badge under each answer shows
which model handled it and why.

For a production server instead of dev mode:

```bash
pnpm --filter @cortexchat/web exec next build
pnpm --filter @cortexchat/web exec next start -p 3000
```

Or with Docker (bundles an Ollama sidecar automatically):

```bash
docker compose up --build
# then: docker exec -it cortexchat-ollama-1 ollama pull qwen2.5:0.5b
```

## 2. Desktop app (Windows / macOS / Linux)

With the server running (step 1):

1. Open **http://localhost:3000** in **Chrome** or **Edge**.
2. Click the **install icon** in the address bar (a monitor-with-arrow
   glyph, right end of the URL bar), or menu → *Cast, save and share* →
   *Install page as app…* (Chrome) / *Apps → Install this site as an app*
   (Edge).
3. cortexchat opens in its own window, gets its own icon in your
   Start menu / Dock / app launcher, and launches like any desktop app.

Firefox and Safari on desktop don't support PWA install; just bookmark it,
or use Chrome/Edge for the install experience.

## 3. Android

Your phone needs to reach the server, so both must be on the same Wi-Fi
network (or connected via a VPN like Tailscale).

1. Start the server so it listens on your network, not just localhost:

   ```bash
   pnpm --filter @cortexchat/web exec next start -p 3000 -H 0.0.0.0
   ```

2. Find the server machine's LAN address: `ip addr` (Linux),
   `ipconfig` (Windows), or System Settings → Wi-Fi (macOS). It looks like
   `192.168.1.23`.
3. On the phone, open **Chrome** and go to `http://192.168.1.23:3000`.
4. Menu (⋮) → **Add to Home screen** → **Add**. cortexchat appears on your
   home screen with its icon and opens standalone (no browser chrome).

> Note: over plain-HTTP LAN addresses, Android installs this as a
> home-screen shortcut rather than a "full" PWA — visually identical in
> use. If you want the full install prompt (or access from outside your
> home), put the server behind HTTPS: the easiest paths are
> [Tailscale](https://tailscale.com) (`tailscale serve 3000` gives you a
> private HTTPS URL on every device) or a Cloudflare Tunnel.

## 4. iOS / iPadOS

Same network setup as Android (steps 3.1–3.2), then:

1. On the iPhone/iPad, open **Safari** (must be Safari — other iOS browsers
   can't add PWAs) and go to `http://192.168.1.23:3000`.
2. Tap the **Share** button (square with up-arrow).
3. Scroll down, tap **Add to Home Screen**, then **Add**.
4. cortexchat is now on your home screen and opens full-screen as an app.

The same Tailscale/HTTPS note as Android applies if you want it working
away from home.

## 5. Checking that routing is actually saving you money

- Open **Settings** (bottom of the sidebar): every provider's
  configured/unconfigured status and every model's availability is listed.
- Say "hi" — the badge should show a `tiny · local` model.
- Paste a code snippet with an error — the badge should show a
  `medium · local` model (or an escalation, with the reason, if that tier
  isn't available on your machine).
- Click any badge to see the full routing reasoning for that reply.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Reply shows "fetch failed" | The routed model's provider is unreachable — usually Ollama isn't running (`ollama serve`) or the model isn't pulled (`ollama pull <id>`). |
| "No configured provider has a model capable of…" | The request classified into a category none of your configured models cover (e.g. image/OCR/audio — not wired up yet, see README Known gaps) — or you have neither Ollama nor any API key set up. |
| Phone can't reach the server | Server not started with `-H 0.0.0.0`, or the OS firewall is blocking port 3000, or phone and server are on different networks. |
| Semantic memory seems dumb | Without `nomic-embed-text` pulled (or an OpenAI key), memory falls back to keyword matching — Settings → Memory still shows everything stored. |
