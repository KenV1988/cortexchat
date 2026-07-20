# Running cortexchat 24/7 with access from your phone anywhere

The goal: cortexchat always online, using every free model (local + cloud),
picking the best one per message automatically, reachable from your Android
from anywhere — for €0.

## The model side (one-time, 5 minutes)

1. **Free OpenRouter key — this is the important one for a 24/7 server.**
   Create a free account at https://openrouter.ai, make a key at
   https://openrouter.ai/keys (no payment method needed), and put it in
   the `.env` file in the install folder
   (`%LOCALAPPDATA%\cortexchat\.env` on Windows):

   ```
   OPENROUTER_API_KEY=sk-or-v1-...
   ```

   This unlocks the whole free open-source cloud ladder — Llama 3.3 70B,
   Qwen 2.5 72B, Mistral Small, DeepSeek R1, DeepSeek V3 — and the router
   automatically picks the smallest one capable of each message. Free
   models are rate-limited (fine for personal use).

2. **Ollama (optional).** If the server machine has ≥8GB RAM, install
   https://ollama.com and `ollama pull qwen2.5:0.5b` (+ `llama3.1:8b` if
   it fits). Greetings and easy questions then cost zero cloud calls. The
   router detects live whether Ollama is running and which models are
   pulled — if it's absent, cloud models transparently take over.

Restart cortexchat after editing `.env`. Sanity check: open
`http://localhost:3000/api/health` — it shows exactly what's available.

## The always-on side (Windows PC as your server)

1. Run `enable-autostart.bat` (in
   `%LOCALAPPDATA%\cortexchat\installers\windows\`). cortexchat now starts
   hidden in the background at every login — no console window. Companion
   scripts: `stop-cortexchat.bat`, `disable-autostart.bat`.
2. **Stop the PC from sleeping** (otherwise the server dies when the
   screen does): Settings → System → Power → *Make my device sleep
   after* → **Never** (when plugged in).
3. Windows Firewall will ask once to allow Node.js — click Allow.

## Access from Android, anywhere: Tailscale (free, private, no port-forwarding)

Tailscale creates a private network between your devices — the server is
reachable from your phone on any network (mobile data included), but not
by anyone else on the internet. Free for personal use (up to 100 devices).

1. On the PC: install https://tailscale.com/download, sign in
   (Google/Microsoft/GitHub account works).
2. On the Android: install the Tailscale app from Play Store, sign in with
   the **same** account, toggle the VPN on.
3. Find the PC's Tailscale name or IP (Tailscale tray icon → it looks like
   `100.x.y.z` or `yourpc.tailnet-name.ts.net`).
4. On the phone, open Chrome → `http://100.x.y.z:3000` → menu ⋮ →
   **Add to Home screen**. Done: a cortexchat icon on your phone that
   works from anywhere, 24/7, as long as the PC is on.

Same conversations, memory, and history on every device — it's one server.

## If you don't want your PC running 24/7

Honest options, in order of practicality:

- **An old laptop or Raspberry Pi at home** running the server (Docker:
  `docker compose up -d`) + Tailscale. Uses a few watts. This is the
  cheapest genuinely-always-on setup.
- **Oracle Cloud "Always Free" VM** — a genuinely free forever
  4-core/24GB ARM server that runs `docker compose up -d` comfortably.
  One caveat to know upfront: Oracle requires a payment card at signup
  for identity verification (it is not charged on the Always Free tier).
- Most other "free tier" hosts (Render, Fly.io, Railway) either sleep
  your app, limit hours, or also require a card — read the current terms
  before choosing one.

On any Linux server the whole setup is:

```bash
git clone https://github.com/KenV1988/cortexchat.git && cd cortexchat
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env
docker compose up -d --build
# + install Tailscale on the server and your phone, then use http://<tailscale-ip>:3000
```

(The compose file includes an Ollama container; on a small VM without the
RAM for local models, just leave it — the live availability probe means
the router only uses the free cloud tier. Or delete the `ollama:` service
from `docker-compose.yml`.)

## Security note

Don't expose port 3000 to the open internet (no router port-forwarding,
no public `0.0.0.0` on a VM without a firewall): cortexchat has no login
system yet (see PRD §4). Tailscale sidesteps this entirely — the app is
only reachable from your own devices.
