require('dotenv').config();

const createServer = require('./src/server');
const createBot = require('./src/bot');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API_ROOT = process.env.TELEGRAM_API_ROOT || null;

if (!BOT_TOKEN) {
  console.error('ERROR: BOT_TOKEN is missing in .env file');
  process.exit(1);
}

const app = createServer();

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

createBot(BOT_TOKEN, TELEGRAM_API_ROOT);
if (TELEGRAM_API_ROOT) {
  console.log(`Telegram bot running via Local Bot API server: ${TELEGRAM_API_ROOT}`);
} else {
  console.log('Telegram bot is running (polling mode, official cloud API, 20MB download limit)...');
}
