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

## File Size Limit — Important

Telegram's **official cloud Bot API has a hard 20MB download / 50MB upload limit**, enforced by Telegram's servers — this cannot be bypassed in code, no matter what library you use.

To go higher (up to **2000MB / 2GB**), you must run your own **Local Bot API Server** (Telegram provides this officially) and point the bot to it:

1. Get `api_id` and `api_hash` from https://my.telegram.org → API Development Tools
2. Create `.env.docker` in this project:
   ```
   TELEGRAM_API_ID=your_api_id
   TELEGRAM_API_HASH=your_api_hash
   ```
3. Start the local server: `docker compose up -d`
4. In your bot's `.env`, set:
   ```
   TELEGRAM_API_ROOT=http://localhost:8081
   ```
5. Restart the bot (`npm start`) — it will now use the local server automatically (see `docker-compose.yml`).

Without this setup, the bot runs against Telegram's official API and stays capped at 20MB downloads.

## Deploy (Render/Railway)
- Build command: `npm install`
- Start command: `npm start`
- Environment variables: `BOT_TOKEN`, `PORT` (auto-set by host), optionally `TELEGRAM_API_ROOT`
- Recommended: at least 512MB RAM for video compression jobs.
- Note: the Local Bot API server (docker-compose.yml) needs a host that supports Docker/persistent services — plain Render/Railway web services work, but you'd run it as a separate service alongside the bot.
