const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const { downloadTelegramFile, cleanupFile, fileSizeMB } = require('./fileUtils');
const { compressImage, convertImage, resizeImage } = require('./processors/image');
const { compressVideo, extractAudio } = require('./processors/video');
const { imageToPdf, compressPdf } = require('./processors/pdf');

const sessions = new Map();

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { busy: false, pendingFile: null });
  }
  return sessions.get(chatId);
}

const mainMenuKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📥 How to Use', callback_data: 'menu_howto' }],
      [
        { text: '🖼️ Image Tools', callback_data: 'menu_image_info' },
        { text: '🎬 Video Tools', callback_data: 'menu_video_info' },
      ],
      [
        { text: '📄 PDF Tools', callback_data: 'menu_pdf_info' },
        { text: 'ℹ️ Help', callback_data: 'menu_help' },
      ],
    ],
  },
};

const backKeyboard = {
  reply_markup: {
    inline_keyboard: [[{ text: '⬅️ Back to Menu', callback_data: 'menu_back' }]],
  },
};

const persistentKeyboard = {
  reply_markup: {
    keyboard: [[{ text: '🏠 Menu' }, { text: 'ℹ️ Help' }]],
    resize_keyboard: true,
  },
};

function imageActionsKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🗜️ Compress', callback_data: 'img_compress' },
          { text: '📏 Resize 50%', callback_data: 'img_resize' },
        ],
        [
          { text: '➡️ To JPG', callback_data: 'img_to_jpg' },
          { text: '➡️ To PNG', callback_data: 'img_to_png' },
          { text: '➡️ To WEBP', callback_data: 'img_to_webp' },
        ],
        [{ text: '📄 To PDF', callback_data: 'img_to_pdf' }],
        [{ text: '❌ Cancel', callback_data: 'file_cancel' }],
      ],
    },
  };
}

function videoActionsKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🗜️ Compress Low', callback_data: 'vid_compress_low' },
          { text: '🗜️ Compress Med', callback_data: 'vid_compress_medium' },
        ],
        [{ text: '🗜️ Compress High Quality', callback_data: 'vid_compress_high' }],
        [{ text: '🎧 Extract Audio', callback_data: 'vid_extract_audio' }],
        [{ text: '❌ Cancel', callback_data: 'file_cancel' }],
      ],
    },
  };
}

function pdfActionsKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🗜️ Compress PDF', callback_data: 'pdf_compress' }],
        [{ text: '❌ Cancel', callback_data: 'file_cancel' }],
      ],
    },
  };
}

async function handleAction(bot, chatId, session, statusMessageId, action) {
  const file = session.pendingFile;
  if (!file) {
    return bot.editMessageText('⚠️ ফাইল পাওয়া যায়নি, আবার পাঠান।', {
      chat_id: chatId,
      message_id: statusMessageId,
      ...mainMenuKeyboard,
    });
  }

  session.busy = true;
  const editStatus = (text) =>
    bot.editMessageText(text, { chat_id: chatId, message_id: statusMessageId }).catch(() => {});

  let outputPath = null;
  try {
    await editStatus('⏳ প্রসেসিং হচ্ছে...');

    switch (action) {
      case 'img_compress':
        outputPath = await compressImage(file.path, 'medium');
        break;
      case 'img_resize':
        outputPath = await resizeImage(file.path, 50);
        break;
      case 'img_to_jpg':
        outputPath = await convertImage(file.path, 'jpg');
        break;
      case 'img_to_png':
        outputPath = await convertImage(file.path, 'png');
        break;
      case 'img_to_webp':
        outputPath = await convertImage(file.path, 'webp');
        break;
      case 'img_to_pdf':
        outputPath = await imageToPdf(file.path);
        break;
      case 'vid_compress_low':
        outputPath = await compressVideo(file.path, 'low');
        break;
      case 'vid_compress_medium':
        outputPath = await compressVideo(file.path, 'medium');
        break;
      case 'vid_compress_high':
        outputPath = await compressVideo(file.path, 'high');
        break;
      case 'vid_extract_audio':
        outputPath = await extractAudio(file.path);
        break;
      case 'pdf_compress':
        outputPath = await compressPdf(file.path);
        break;
      default:
        throw new Error('Unknown action');
    }

    const sizeMB = fileSizeMB(outputPath);
    const ext = path.extname(outputPath).toLowerCase();

    const caption = `✅ Done!\n📦 Size: ${sizeMB}MB`;

    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      await bot.sendDocument(chatId, outputPath, { caption, ...backKeyboard });
    } else if (ext === '.mp4') {
      await bot.sendVideo(chatId, outputPath, { caption, ...backKeyboard });
    } else if (ext === '.mp3') {
      await bot.sendAudio(chatId, outputPath, { caption, ...backKeyboard });
    } else if (ext === '.pdf') {
      await bot.sendDocument(chatId, outputPath, { caption, ...backKeyboard });
    } else {
      await bot.sendDocument(chatId, outputPath, { caption, ...backKeyboard });
    }

    bot.deleteMessage(chatId, statusMessageId).catch(() => {});
  } catch (err) {
    console.error('Processing error:', err.message);
    await editStatus('❌ প্রসেসিং এ সমস্যা হয়েছে। ফাইলটি সাপোর্টেড কিনা এবং সাইজ ঠিক আছে কিনা চেক করুন।');
  } finally {
    cleanupFile(file.path);
    if (outputPath) cleanupFile(outputPath);
    session.busy = false;
    session.pendingFile = null;
  }
}

function createBot(token, apiRoot) {
  const botOptions = {
    polling: true,
    request: {
      agentOptions: { family: 4 }, // avoids IPv6 connection failures on some hosts
    },
  };
  if (apiRoot) {
    botOptions.baseApiUrl = apiRoot;
  }
  const bot = new TelegramBot(token, botOptions);

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      '👋 স্বাগতম File Converter/Compressor Bot এ!\n\n📎 যেকোনো Image, Video বা PDF ফাইল পাঠান — বট automatically সঠিক অপশন বাটন দেখাবে।',
      mainMenuKeyboard
    );
    bot.sendMessage(chatId, 'Quick access:', persistentKeyboard);
  });

  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      'ℹ️ ব্যবহার:\n1️⃣ ফাইল পাঠান (Image/Video/PDF) — Photo হিসেবে না, "File" হিসেবে পাঠালে সেরা কোয়ালিটি থাকে\n2️⃣ বাটন থেকে কাজ বেছে নিন (Compress/Convert/Resize)\n3️⃣ প্রসেস করা ফাইল পেয়ে যাবেন\n\n⚠️ Default limit: ~20MB (Telegram cloud API)। Local Bot API server সেটআপ করলে limit বেড়ে 2GB পর্যন্ত হয় — README দেখো।',
      mainMenuKeyboard
    );
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);

    if (msg.text === '🏠 Menu') {
      return bot.sendMessage(chatId, 'মেইন মেনু 👇', mainMenuKeyboard);
    }
    if (msg.text === 'ℹ️ Help') {
      return bot.sendMessage(
        chatId,
        'ℹ️ ফাইল পাঠান (Image/Video/PDF), তারপর বাটন থেকে কাজ বেছে নিন।',
        backKeyboard
      );
    }
    if (msg.text && msg.text.startsWith('/')) return;

    if (session.busy) {
      const hasFile = msg.photo || msg.document || msg.video;
      if (hasFile) {
        return bot.sendMessage(chatId, '⏳ আগের ফাইলটা এখনো প্রসেস হচ্ছে, একটু অপেক্ষা করুন।');
      }
      return;
    }

    try {
      // Photo (compressed by Telegram)
      if (msg.photo && msg.photo.length > 0) {
        const largest = msg.photo[msg.photo.length - 1];
        const filePath = await downloadTelegramFile(bot, largest.file_id, 'jpg');
        session.pendingFile = { path: filePath, type: 'image' };
        return bot.sendMessage(chatId, '🖼️ ছবি পেয়েছি! কী করতে চাও?', imageActionsKeyboard());
      }

      // Document (image/video/pdf sent as file)
      if (msg.document) {
        const mime = msg.document.mime_type || '';
        const ext = path.extname(msg.document.file_name || '').replace('.', '');

        if (mime.startsWith('image/')) {
          const filePath = await downloadTelegramFile(bot, msg.document.file_id, ext || 'jpg');
          session.pendingFile = { path: filePath, type: 'image' };
          return bot.sendMessage(chatId, '🖼️ ছবি পেয়েছি! কী করতে চাও?', imageActionsKeyboard());
        }

        if (mime.startsWith('video/')) {
          const filePath = await downloadTelegramFile(bot, msg.document.file_id, ext || 'mp4');
          session.pendingFile = { path: filePath, type: 'video' };
          return bot.sendMessage(chatId, '🎬 ভিডিও পেয়েছি! কী করতে চাও?', videoActionsKeyboard());
        }

        if (mime === 'application/pdf') {
          const filePath = await downloadTelegramFile(bot, msg.document.file_id, 'pdf');
          session.pendingFile = { path: filePath, type: 'pdf' };
          return bot.sendMessage(chatId, '📄 PDF পেয়েছি! কী করতে চাও?', pdfActionsKeyboard());
        }

        return bot.sendMessage(
          chatId,
          '❌ এই ফাইল টাইপ সাপোর্টেড না। Image, Video বা PDF পাঠান।',
          mainMenuKeyboard
        );
      }

      // Video sent directly (not as document)
      if (msg.video) {
        const filePath = await downloadTelegramFile(bot, msg.video.file_id, 'mp4');
        session.pendingFile = { path: filePath, type: 'video' };
        return bot.sendMessage(chatId, '🎬 ভিডিও পেয়েছি! কী করতে চাও?', videoActionsKeyboard());
      }

      // Plain text with no file attached
      if (msg.text) {
        return bot.sendMessage(
          chatId,
          '📎 একটা Image, Video বা PDF ফাইল পাঠান।',
          mainMenuKeyboard
        );
      }
    } catch (err) {
      console.error('File receive error:', err.message);
      bot.sendMessage(chatId, '❌ ফাইল ডাউনলোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    }
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;
    const session = getSession(chatId);

    const edit = (text, keyboard) =>
      bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...keyboard });

    try {
      if (data === 'file_cancel') {
        if (session.pendingFile) cleanupFile(session.pendingFile.path);
        session.pendingFile = null;
        await edit('❌ বাতিল করা হয়েছে।', mainMenuKeyboard);
        bot.answerCallbackQuery(query.id);
        return;
      }

      if (
        data.startsWith('img_') ||
        data.startsWith('vid_') ||
        data.startsWith('pdf_')
      ) {
        if (session.busy) {
          bot.answerCallbackQuery(query.id, { text: '⏳ আগের কাজ এখনো চলছে...' });
          return;
        }
        await edit('⏳ শুরু হচ্ছে...');
        handleAction(bot, chatId, session, messageId, data);
        bot.answerCallbackQuery(query.id);
        return;
      }

      switch (data) {
        case 'menu_back':
          await edit('মেইন মেনু 👇', mainMenuKeyboard);
          break;

        case 'menu_howto':
          await edit(
            '📥 কীভাবে ব্যবহার করবেন:\n\n1️⃣ Image/Video/PDF ফাইল পাঠান\n2️⃣ বাটন থেকে কাজ বেছে নিন\n3️⃣ প্রসেস করা ফাইল পেয়ে যাবেন',
            backKeyboard
          );
          break;

        case 'menu_image_info':
          await edit(
            '🖼️ Image Tools:\n• Compress (size কমানো)\n• Resize 50%\n• Convert (JPG/PNG/WEBP)\n• Convert to PDF\n\n📎 একটা ছবি পাঠাও শুরু করতে',
            backKeyboard
          );
          break;

        case 'menu_video_info':
          await edit(
            '🎬 Video Tools:\n• Compress (Low/Medium/High quality)\n• Extract Audio (MP3)\n\n📎 একটা ভিডিও পাঠাও শুরু করতে',
            backKeyboard
          );
          break;

        case 'menu_pdf_info':
          await edit(
            '📄 PDF Tools:\n• Compress PDF\n\n📎 একটা PDF পাঠাও শুরু করতে',
            backKeyboard
          );
          break;

        case 'menu_help':
          await edit(
            'ℹ️ Image, Video বা PDF ফাইল পাঠান — বট automatically relevant বাটন দেখাবে।\n\n⚠️ Default limit: ~20MB। Local Bot API সেটআপ করলে 2GB পর্যন্ত সাপোর্ট করবে (README দেখো)।',
            backKeyboard
          );
          break;

        default:
          break;
      }
    } catch (err) {
      console.error('Callback error:', err.message);
    }

    bot.answerCallbackQuery(query.id).catch(() => {});
  });

  bot.on('polling_error', (err) => {
    console.error('Polling error:', err.message);
  });

  return bot;
}

module.exports = createBot;
