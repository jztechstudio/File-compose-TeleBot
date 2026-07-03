# File Converter / Compressor Bot

Compresses and converts images, videos, and PDFs via Telegram.

## Features
- **Images**: Compress, Resize (50%), Convert (JPG/PNG/WEBP), Convert to PDF
- **Videos**: Compress (Low/Medium/High), Extract Audio (MP3)
- **PDFs**: Compress (best-effort, structural re-save)

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and set `BOT_TOKEN`
3. `npm start`

## Notes
- Uses `sharp` (images), `fluent-ffmpeg` + `ffmpeg-static` (video/audio), `pdf-lib` (PDF).
- Temp files are deleted automatically after each job.
- `ffmpeg-static` downloads a prebuilt ffmpeg binary on `npm install` — make sure your host allows this during build.

## File Size Limit — Unlimited-ish (up to 2GB)

Telegram's official cloud Bot API caps downloads at 20MB — that's a server-side Telegram limit, not something any code can bypass.

This project ships a **combined docker-compose stack** that runs the bot together with Telegram's official **Local Bot API Server** on the same Docker network, raising the limit to **2000MB (2GB)**.

### Setup
1. Get `api_id` and `api_hash` from https://my.telegram.org → API Development Tools
2. Create a `.env` file in the project root:
   ```
   BOT_TOKEN=your_bot_token
   TELEGRAM_API_ID=your_api_id
   TELEGRAM_API_HASH=your_api_hash
   ```
   (`TELEGRAM_API_ROOT` is already wired to `http://telegram-bot-api:8081` inside `docker-compose.yml` — no need to set it yourself.)
3. Run:
   ```
   docker compose up -d --build
   ```
4. Check it's working:
   ```
   docker compose logs -f app
   ```
   You should see `Telegram bot running via Local Bot API server: http://telegram-bot-api:8081` with no `EFATAL` errors.

### Where to deploy this
Run `docker compose up -d --build` on any host with Docker installed. A small VPS (DigitalOcean, Hetzner, Contabo — around $5/month) is the simplest option, because both containers share one private Docker network automatically.

**Important:** plain Render/Railway "web service" deployments do **not** support this out of the box — each service runs in its own isolated container with no shared `localhost`, which is exactly what caused the original `EFATAL: AggregateError`. If you were pointing `TELEGRAM_API_ROOT` at `http://localhost:8081` on Render/Railway, that's why it failed: there was no local API server actually running next to the bot. Deploy the whole `docker-compose.yml` stack together (VPS, or a host that supports docker-compose natively) instead.

### Don't need 2GB?
Just deploy `Dockerfile`/`index.js` alone (no compose, no `TELEGRAM_API_ID`/`HASH`) on Render/Railway as before — the bot falls back to the official API automatically and stays capped at 20MB, which is fine for most files.

## Deploy (Render/Railway) — 20MB limit, simple
- Build command: `npm install`
- Start command: `npm start`
- Environment variables: `BOT_TOKEN`, `PORT` (auto-set by host)
- Recommended: at least 512MB RAM for video compression jobs.
- Do NOT set `TELEGRAM_API_ROOT` here unless you're also running the Local Bot API server in the same private network — otherwise you'll get `EFATAL: AggregateError`.

## Deploy on a VPS — 2GB limit, full setup
See "File Size Limit" section above. In short:
```
git clone <your-repo>
cd file-converter-bot
# create .env with BOT_TOKEN, TELEGRAM_API_ID, TELEGRAM_API_HASH
docker compose up -d --build
```
