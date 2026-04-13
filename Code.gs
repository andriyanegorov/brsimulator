/*
 * BR Simulator Telegram Bot (Google Apps Script)
 * Deploy as Web App and set Telegram webhook to this URL.
 */

// ==============================
// CONFIG
// ==============================
const SP = PropertiesService.getScriptProperties();
const CACHE = CacheService.getScriptCache();
const PROPS = PropertiesService.getScriptProperties();

const CFG = {
  botToken: SP.getProperty("TG_BOT_TOKEN") || "",
  supabaseUrl: SP.getProperty("SUPABASE_URL") || "",
  supabaseAnonKey: SP.getProperty("SUPABASE_ANON_KEY") || "",
  adminChatId: Number(SP.getProperty("ADMIN_CHAT_ID") || 0),
  adminIds: parseIdList_(SP.getProperty("ADMIN_IDS") || ""),
  topics: {
    actions: Number(SP.getProperty("TOPIC_LOG_ACTIONS") || 0),
    support: Number(SP.getProperty("TOPIC_SUPPORT") || 0),
    broadcasts: Number(SP.getProperty("TOPIC_BROADCASTS") || 0),
    errors: Number(SP.getProperty("TOPIC_ERRORS") || 0),
    admin: Number(SP.getProperty("TOPIC_ADMIN_COMMANDS") || 0)
  }
};

const SUPPORT_THREAD_PREFIX = "support:thread:"; // key = support:thread:{threadId} => telegram_id
const SUPPORT_PLAYER_PREFIX = "support:player:"; // key = support:player:{telegram_id} => threadId
const USER_STATE_PREFIX = "state:user:";
const ADMIN_STATE_PREFIX = "state:admin:";

const PAGE_SIZE_INV = 5;

// ==============================
// WEBHOOK ENTRY
// ==============================
function doPost(e) {
  try {
    const body = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    const update = JSON.parse(body);
    const runtime = getRuntimeConfig_();

    if (!runtime.botToken || !runtime.supabaseUrl || !runtime.supabaseAnonKey) {
      throw new Error("Missing required script properties: TG_BOT_TOKEN / SUPABASE_URL / SUPABASE_ANON_KEY");
    }

    if (update.callback_query) {
      handleCallbackQuery_(update.callback_query, runtime);
    } else if (update.message) {
      handleMessage_(update.message, runtime);
    }

    return jsonOutput_({ ok: true });
  } catch (err) {
    safeLogError_(err, "doPost");
    return jsonOutput_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return ContentService.createTextOutput("BR Simulator Bot is running");
}

// ==============================
// ROUTERS
// ==============================
function handleMessage_(msg, runtime) {
  const chat = msg.chat || {};
  const from = msg.from || {};
  const text = (msg.text || "").trim();

  if (chat.type === "private") {
    handlePrivateMessage_(msg, runtime);
    return;
  }

  if (Number(chat.id) === Number(runtime.adminChatId)) {
    handleAdminChatMessage_(msg, runtime);
    return;
  }

  // Ignore other chats.
  if (text === "/start") {
    sendMessage_(chat.id, "Бот работает в ЛС и в админ-чате.");
  }
}

function handlePrivateMessage_(msg, runtime) {
  const from = msg.from || {};
  const text = (msg.text || "").trim();
  const userId = Number(from.id);

  const player = ensureLinkedPlayer_(from, runtime);
  if (!player) {
    sendMessage_(msg.chat.id, "Не удалось привязать аккаунт. Попробуйте позже.");
    return;
  }

  if (text === "/start") {
    sendPlayerMainMenu_(msg.chat.id, player);
    return;
  }

  const state = getState_(USER_STATE_PREFIX + userId);
  if (state && state.mode === "await_promo_code") {
    activatePromoForPlayer_(player, text, runtime, msg.chat.id);
    clearState_(USER_STATE_PREFIX + userId);
    return;
  }

  if (state && state.mode === "await_support_text") {
    processSupportMessage_(player, text, runtime, from);
    clearState_(USER_STATE_PREFIX + userId);
    sendMessage_(msg.chat.id, "✅ Обращение отправлено в поддержку. Мы ответим здесь в этом чате.");
    return;
  }

  sendPlayerMainMenu_(msg.chat.id, player);
}

function handleAdminChatMessage_(msg, runtime) {
  const from = msg.from || {};
  const text = (msg.text || "").trim();
  const adminId = Number(from.id);

  if (!isAdmin_(adminId, runtime)) {
    return;
  }

  // 1) Admin replies in support thread -> mirror to player
  if (msg.message_thread_id && text && text[0] !== "/") {
    const mappedPlayerTgId = getSupportPlayerByThread_(msg.message_thread_id);
    if (mappedPlayerTgId) {
      sendToPlayer_(mappedPlayerTgId, "💬 *Ответ от поддержки*\n\n" + escapeMd_(text), {
        parse_mode: "MarkdownV2"
      });

      const claimKey = "support:claimed:" + msg.message_thread_id;
      if (!CACHE.get(claimKey)) {
        CACHE.put(claimKey, String(adminId), 6 * 3600);
        sendToTopic_(runtime.topics.support, "👨‍💻 Обращение взял в работу: " + adminTag_(from), runtime);
      }
      return;
    }
  }

  // 2) State-driven admin inputs
  const state = getState_(ADMIN_STATE_PREFIX + adminId);
  if (state && text && text[0] !== "/") {
    if (state.mode === "await_edit_nick") {
      applyPlayerNickChange_(state.playerId, text, from, runtime);
      clearState_(ADMIN_STATE_PREFIX + adminId);
      return;
    }

    if (state.mode === "await_edit_server") {
      applyPlayerServerChange_(state.playerId, text, from, runtime);
      clearState_(ADMIN_STATE_PREFIX + adminId);
      return;
    }

    if (state.mode === "await_broadcast_text_all") {
      const sent = broadcastToAllPlayers_(text, runtime);
      sendMessage_(msg.chat.id, "✅ Рассылка завершена. Отправлено: " + sent);
      sendToTopic_(runtime.topics.broadcasts,
        "📢 *Рассылка всем*\n" +
        "👨‍💼 Админ: " + adminTag_(from) + "\n" +
        "📨 Отправлено: " + sent,
        runtime,
        { parse_mode: "MarkdownV2" }
      );
      clearState_(ADMIN_STATE_PREFIX + adminId);
      return;
    }

    if (state.mode === "await_broadcast_ids") {
      const ids = parseIdList_(text);
      if (!ids.length) {
        sendMessage_(msg.chat.id, "⚠️ Не удалось распознать ID. Пример: 12345, 67890");
        return;
      }
      setState_(ADMIN_STATE_PREFIX + adminId, { mode: "await_broadcast_text_ids", ids: ids }, 1800);
      sendMessage_(msg.chat.id, "✍️ Введите текст рассылки для выбранных ID.");
      return;
    }

    if (state.mode === "await_broadcast_text_ids") {
      const sentIds = broadcastToIds_(state.ids || [], text, runtime);
      sendMessage_(msg.chat.id, "✅ Рассылка по списку завершена. Отправлено: " + sentIds.length);
      sendToTopic_(runtime.topics.broadcasts,
        "📢 *Рассылка по списку*\n" +
        "👨‍💼 Админ: " + adminTag_(from) + "\n" +
        "👥 ID: " + escapeMd_(sentIds.join(", ")),
        runtime,
        { parse_mode: "MarkdownV2" }
      );
      clearState_(ADMIN_STATE_PREFIX + adminId);
      return;
    }

    if (state.mode === "await_create_promo") {
      // Expected format: CODE 1000
      const parts = text.split(/\s+/);
      if (parts.length < 2) {
        sendMessage_(msg.chat.id, "⚠️ Формат: CODE 1000");
        return;
      }
      const code = String(parts[0] || "").toUpperCase();
      const reward = Number(parts[1] || 0);
      if (!code || reward <= 0) {
        sendMessage_(msg.chat.id, "⚠️ Неверный код или награда.");
        return;
      }

      upsertPromo_(code, reward, runtime);
      clearState_(ADMIN_STATE_PREFIX + adminId);
      sendMessage_(msg.chat.id, "✅ Промокод сохранен: " + code + " -> " + reward + " BC");
      sendToTopic_(runtime.topics.admin,
        "🛠️ *Создан/обновлен промокод*\n" +
        "👨‍💼 Админ: " + adminTag_(from) + "\n" +
        "🎁 Код: `" + escapeMd_(code) + "`\n" +
        "💰 Награда: " + reward + " BC",
        runtime,
        { parse_mode: "MarkdownV2" }
      );
      return;
    }
  }

  // 3) Commands
  if (text.indexOf("/edit_player") === 0) {
    const query = text.replace("/edit_player", "").trim();
    if (!query) {
      sendMessage_(msg.chat.id, "⚠️ Использование: /edit_player [id или ник]", {
        message_thread_id: msg.message_thread_id
      });
      return;
    }
    adminOpenPlayerCard_(query, msg.chat.id, msg.message_thread_id, runtime);
    return;
  }

  if (text === "/broadcast") {
    sendMessage_(msg.chat.id, "📢 Выберите тип рассылки:", {
      message_thread_id: msg.message_thread_id,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🟨 📢 Всем игрокам", callback_data: "ad:bcst:all" },
            { text: "🟦 👥 По списку ID", callback_data: "ad:bcst:list" }
          ]
        ]
      }
    });
    return;
  }

  if (text === "/top") {
    adminSendTop_(msg.chat.id, msg.message_thread_id, runtime);
    return;
  }

  if (text === "/promos") {
    adminSendPromos_(msg.chat.id, msg.message_thread_id, runtime);
    return;
  }
}

function handleCallbackQuery_(cq, runtime) {
  const data = String(cq.data || "");
  const from = cq.from || {};
  const userId = Number(from.id);
  const msg = cq.message || {};

  try {
    if (data.indexOf("pl:") === 0) {
      const player = ensureLinkedPlayer_(from, runtime);
      if (!player) {
        answerCallback_(cq.id, "Аккаунт не найден");
        return;
      }
      handlePlayerCallback_(cq, player, runtime);
      answerCallback_(cq.id, "OK");
      return;
    }

    if (data.indexOf("ad:") === 0) {
      if (!isAdmin_(userId, runtime)) {
        answerCallback_(cq.id, "Нет доступа");
        return;
      }
      handleAdminCallback_(cq, runtime);
      answerCallback_(cq.id, "OK");
      return;
    }

    answerCallback_(cq.id, "Неизвестное действие");
  } catch (err) {
    safeLogError_(err, "handleCallbackQuery");
    answerCallback_(cq.id, "Ошибка");
    if (msg.chat && msg.chat.id) {
      sendMessage_(msg.chat.id, "⚠️ Произошла ошибка при обработке кнопки.", {
        message_thread_id: msg.message_thread_id
      });
    }
  }
}

// ==============================
// PLAYER CALLBACKS
// ==============================
function handlePlayerCallback_(cq, player, runtime) {
  const data = String(cq.data || "");
  const chatId = cq.message.chat.id;

  if (data === "pl:balance" || data === "pl:show_balance") {
    sendMessage_(chatId,
      "💰 *Ваш баланс:* `" + Number(player.balance || 0).toLocaleString("ru-RU") + " BC`",
      {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [[{ text: "🔵 Обновить", callback_data: "pl:balance" }], [{ text: "◀️ Меню", callback_data: "pl:menu" }]]
        }
      }
    );
    return;
  }

  if (data === "pl:menu") {
    sendPlayerMainMenu_(chatId, player);
    return;
  }

  if (data.indexOf("pl:inventory") === 0) {
    const parts = data.split(":");
    const page = Number(parts[2] || 0);
    sendInventoryPage_(chatId, player, page);
    return;
  }

  if (data === "pl:promo") {
    setState_(USER_STATE_PREFIX + Number(cq.from.id), { mode: "await_promo_code" }, 600);
    sendMessage_(chatId, "🎁 Введите промокод одним сообщением.");
    return;
  }

  if (data === "pl:support") {
    setState_(USER_STATE_PREFIX + Number(cq.from.id), { mode: "await_support_text" }, 1800);
    sendMessage_(chatId, "📞 Напишите сообщение для техподдержки.\n\nОпишите проблему как можно подробнее.");
    return;
  }

  if (data === "pl:stats") {
    const stats = player.stats || {};
    const opened = Number(stats.opened || 0);
    const soldItems = Number(stats.itemsSold || 0);
    const soldValue = Number(stats.valueSold || 0);
    const fav = detectFavoriteCase_(stats);

    sendMessage_(chatId,
      "📊 *Статистика*\n" +
      "📦 Открыто кейсов: *" + opened + "*\n" +
      "🧾 Продано предметов: *" + soldItems + "*\n" +
      "💸 На сумму: *" + soldValue.toLocaleString("ru-RU") + " BC*\n" +
      "❤️ Любимый кейс: *" + escapeMd_(fav) + "*",
      {
        parse_mode: "MarkdownV2",
        reply_markup: { inline_keyboard: [[{ text: "◀️ Меню", callback_data: "pl:menu" }]] }
      }
    );
    return;
  }
}

// ==============================
// ADMIN CALLBACKS
// ==============================
function handleAdminCallback_(cq, runtime) {
  const data = String(cq.data || "");
  const from = cq.from || {};
  const adminId = Number(from.id);
  const chatId = cq.message.chat.id;
  const threadId = cq.message.message_thread_id;

  if (data.indexOf("ad:bcst:") === 0) {
    const mode = data.split(":")[2] || "";
    if (mode === "all") {
      setState_(ADMIN_STATE_PREFIX + adminId, { mode: "await_broadcast_text_all" }, 1800);
      sendMessage_(chatId, "✍️ Введите текст рассылки для всех игроков.", { message_thread_id: threadId });
      return;
    }
    if (mode === "list") {
      setState_(ADMIN_STATE_PREFIX + adminId, { mode: "await_broadcast_ids" }, 1800);
      sendMessage_(chatId, "👥 Введите Telegram ID через запятую: `12345,67890`", {
        message_thread_id: threadId,
        parse_mode: "MarkdownV2"
      });
      return;
    }
  }

  if (data.indexOf("ad:edit:") === 0) {
    const playerId = data.substring("ad:edit:".length);
    const p = getPlayerById_(playerId, runtime);
    if (!p) {
      sendMessage_(chatId, "Игрок не найден", { message_thread_id: threadId });
      return;
    }
    sendAdminPlayerCard_(chatId, threadId, p, runtime);
    return;
  }

  if (data.indexOf("ad:bc:") === 0) {
    const parts = data.split(":");
    const playerId = parts[2] || "";
    const delta = Number(parts[3] || 0);

    const p = getPlayerById_(playerId, runtime);
    if (!p) {
      sendMessage_(chatId, "Игрок не найден", { message_thread_id: threadId });
      return;
    }

    const nextBalance = Math.max(0, Number(p.balance || 0) + delta);
    updatePlayerFields_(playerId, { balance: nextBalance }, runtime);

    sendMessage_(chatId,
      "🛠️ *Админ:* " + adminTag_(from) + "\n" +
      "👤 *Игрок:* " + escapeMd_(p.nick || p.id) + " \(ID: " + escapeMd_(p.id) + "\)\n" +
      "💰 *Изменение:* " + (delta >= 0 ? "\+" : "") + delta + " BC\n" +
      "📌 *Новый баланс:* " + nextBalance + " BC",
      { parse_mode: "MarkdownV2", message_thread_id: threadId }
    );

    sendToTopic_(runtime.topics.admin,
      "🛠️ *Админ-команда*\n" +
      "👨‍💼 " + adminTag_(from) + "\n" +
      "👤 Игрок: " + escapeMd_(p.nick || p.id) + "\n" +
      "💰 Δ: " + (delta >= 0 ? "\+" : "") + delta + " BC\n" +
      "📌 Баланс: " + nextBalance + " BC",
      runtime,
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  if (data.indexOf("ad:setnick:") === 0) {
    const playerId = data.substring("ad:setnick:".length);
    setState_(ADMIN_STATE_PREFIX + adminId, { mode: "await_edit_nick", playerId: playerId }, 900);
    sendMessage_(chatId, "✏️ Введите новый ник одним сообщением.", { message_thread_id: threadId });
    return;
  }

  if (data.indexOf("ad:setserver:") === 0) {
    const playerId = data.substring("ad:setserver:".length);
    setState_(ADMIN_STATE_PREFIX + adminId, { mode: "await_edit_server", playerId: playerId }, 900);
    sendMessage_(chatId, "🌍 Введите новый сервер одним сообщением.", { message_thread_id: threadId });
    return;
  }

  if (data.indexOf("ad:inv:") === 0) {
    const playerId = data.substring("ad:inv:".length);
    const p = getPlayerById_(playerId, runtime);
    if (!p) {
      sendMessage_(chatId, "Игрок не найден", { message_thread_id: threadId });
      return;
    }

    const inv = Array.isArray(p.inventory) ? p.inventory : [];
    let txt = "📦 *Инвентарь игрока* " + escapeMd_(p.nick || p.id) + "\n";
    if (!inv.length) txt += "\nПусто";
    for (var i = 0; i < Math.min(inv.length, 30); i++) {
      const it = inv[i] || {};
      txt += "\n" + (i + 1) + ". " + escapeMd_(it.name || "Unknown") + " — " + Number(it.value || 0) + " BC";
    }
    sendMessage_(chatId, txt, { parse_mode: "MarkdownV2", message_thread_id: threadId });
    return;
  }

  if (data.indexOf("ad:stats:") === 0) {
    const playerId = data.substring("ad:stats:".length);
    const p = getPlayerById_(playerId, runtime);
    if (!p) {
      sendMessage_(chatId, "Игрок не найден", { message_thread_id: threadId });
      return;
    }
    const s = p.stats || {};
    sendMessage_(chatId,
      "📊 *Статистика игрока* " + escapeMd_(p.nick || p.id) + "\n" +
      "🎰 Открыто: " + Number(s.opened || 0) + "\n" +
      "💸 Продано предметов: " + Number(s.itemsSold || 0) + "\n" +
      "💰 На сумму: " + Number(s.valueSold || 0) + " BC",
      { parse_mode: "MarkdownV2", message_thread_id: threadId }
    );
    return;
  }

  if (data === "ad:promos:create") {
    setState_(ADMIN_STATE_PREFIX + adminId, { mode: "await_create_promo" }, 900);
    sendMessage_(chatId, "➕ Введите `CODE 1000` для создания/обновления промокода.", {
      message_thread_id: threadId,
      parse_mode: "MarkdownV2"
    });
    return;
  }
}

// ==============================
// PLAYER FEATURES
// ==============================
function sendPlayerMainMenu_(chatId, player) {
  sendMessage_(chatId,
    "👋 *BR Simulator*\n" +
    "Ваш профиль привязан: *" + escapeMd_(player.nick || player.id) + "*\n\n" +
    "Выберите действие:",
    {
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🟦 💰 Баланс", callback_data: "pl:balance" },
            { text: "🟪 📦 Инвентарь", callback_data: "pl:inventory:0" }
          ],
          [
            { text: "🟨 🎁 Промокод", callback_data: "pl:promo" },
            { text: "🟥 📞 Техподдержка", callback_data: "pl:support" }
          ],
          [
            { text: "⬜ 📊 Статистика", callback_data: "pl:stats" }
          ]
        ]
      }
    }
  );
}

function sendInventoryPage_(chatId, player, page) {
  const inv = Array.isArray(player.inventory) ? player.inventory : [];
  const totalPages = Math.max(1, Math.ceil(inv.length / PAGE_SIZE_INV));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const start = safePage * PAGE_SIZE_INV;
  const part = inv.slice(start, start + PAGE_SIZE_INV);

  let txt = "📦 *Инвентарь*\n";
  txt += "Страница " + (safePage + 1) + " / " + totalPages + "\n";

  if (!part.length) {
    txt += "\nПусто";
  } else {
    for (var i = 0; i < part.length; i++) {
      const it = part[i] || {};
      txt += "\n" + (start + i + 1) + ". " + escapeMd_(it.name || "Unknown") +
        "\n   Редкость: " + escapeMd_(String(it.rarity || "-")) +
        " | Цена: " + Number(it.value || 0) + " BC\n";
    }
  }

  const navRow = [];
  if (safePage > 0) navRow.push({ text: "⬅️", callback_data: "pl:inventory:" + (safePage - 1) });
  navRow.push({ text: "◀️ Меню", callback_data: "pl:menu" });
  if (safePage < totalPages - 1) navRow.push({ text: "➡️", callback_data: "pl:inventory:" + (safePage + 1) });

  sendMessage_(chatId, txt, {
    parse_mode: "MarkdownV2",
    reply_markup: { inline_keyboard: [navRow] }
  });
}

function activatePromoForPlayer_(player, inputCode, runtime, chatId) {
  const code = String(inputCode || "").trim().toUpperCase();
  if (!code) {
    sendMessage_(chatId, "⚠️ Пустой промокод.");
    return;
  }

  const used = Array.isArray(player.used_promos) ? player.used_promos.slice() : [];
  if (used.indexOf(code) !== -1) {
    sendMessage_(chatId, "⚠️ Вы уже активировали этот промокод.");
    return;
  }

  const promo = getPromoByCode_(code, runtime);
  if (!promo || !promo.is_active) {
    sendMessage_(chatId, "❌ Промокод не найден или неактивен.");
    return;
  }

  const reward = Number(promo.reward || 0);
  if (reward <= 0) {
    sendMessage_(chatId, "❌ У промокода некорректная награда.");
    return;
  }

  used.push(code);
  const nextBalance = Number(player.balance || 0) + reward;
  updatePlayerFields_(player.id, {
    balance: nextBalance,
    used_promos: used,
    telegram_id: Number(player.telegram_id || 0),
    telegram_username: String(player.telegram_username || "")
  }, runtime);

  sendMessage_(chatId,
    "🎉 Промокод активирован\!\n" +
    "💰 Начислено: *" + reward + " BC*",
    {
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [[{ text: "🔵 Показать баланс", callback_data: "pl:show_balance" }]]
      }
    }
  );

  sendToTopic_(runtime.topics.actions,
    "🎁 *Активация промокода*\n" +
    "👤 Игрок: " + escapeMd_(player.nick || player.id) + "\n" +
    "🏷️ Код: `" + escapeMd_(code) + "`\n" +
    "💰 Награда: " + reward + " BC",
    runtime,
    { parse_mode: "MarkdownV2" }
  );
}

function processSupportMessage_(player, text, runtime, from) {
  if (!text) {
    sendToPlayer_(Number(player.telegram_id), "⚠️ Сообщение пустое.");
    return;
  }

  const tgId = Number(player.telegram_id);
  let threadId = getSupportThreadByPlayer_(tgId);

  if (!threadId) {
    threadId = createSupportThread_(player, runtime);
    if (!threadId) {
      sendToPlayer_(tgId, "⚠️ Не удалось создать тикет. Попробуйте позже.");
      return;
    }
  }

  const username = from && from.username ? "@" + from.username : "id:" + tgId;
  sendToTopic_(threadId,
    "💬 *Новое сообщение от игрока*\n" +
    "👤 " + escapeMd_(player.nick || player.id) + " \(" + escapeMd_(username) + "\)\n\n" +
    escapeMd_(text),
    runtime,
    { parse_mode: "MarkdownV2" }
  );
}

// ==============================
// ADMIN FEATURES
// ==============================
function adminOpenPlayerCard_(query, chatId, threadId, runtime) {
  let player = getPlayerById_(query, runtime);
  if (!player) player = searchPlayerByNick_(query, runtime);

  if (!player) {
    sendMessage_(chatId, "❌ Игрок не найден.", { message_thread_id: threadId });
    return;
  }

  sendAdminPlayerCard_(chatId, threadId, player, runtime);
}

function sendAdminPlayerCard_(chatId, threadId, player, runtime) {
  const inv = Array.isArray(player.inventory) ? player.inventory : [];
  sendMessage_(chatId,
    "👤 *Карточка игрока*\n" +
    "ID: `" + escapeMd_(player.id || "") + "`\n" +
    "Ник: *" + escapeMd_(player.nick || "-") + "*\n" +
    "Сервер: *" + escapeMd_(player.server || "-") + "*\n" +
    "Баланс: *" + Number(player.balance || 0).toLocaleString("ru-RU") + " BC*\n" +
    "Инвентарь: *" + inv.length + "*",
    {
      parse_mode: "MarkdownV2",
      message_thread_id: threadId,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🟩 ➕ BC +500", callback_data: "ad:bc:" + player.id + ":500" },
            { text: "🟥 ➖ BC -500", callback_data: "ad:bc:" + player.id + ":-500" }
          ],
          [
            { text: "✏️ Сменить ник", callback_data: "ad:setnick:" + player.id },
            { text: "🌍 Сменить сервер", callback_data: "ad:setserver:" + player.id }
          ],
          [
            { text: "📦 Инвентарь", callback_data: "ad:inv:" + player.id },
            { text: "📊 Статистика", callback_data: "ad:stats:" + player.id }
          ]
        ]
      }
    }
  );
}

function applyPlayerNickChange_(playerId, newNick, adminUser, runtime) {
  const p = getPlayerById_(playerId, runtime);
  if (!p) return;
  updatePlayerFields_(playerId, { nick: String(newNick).trim() }, runtime);

  sendToTopic_(runtime.topics.admin,
    "🛠️ *Изменение профиля*\n" +
    "👨‍💼 Админ: " + adminTag_(adminUser) + "\n" +
    "👤 Игрок: " + escapeMd_(p.nick || p.id) + "\n" +
    "✏️ Новый ник: " + escapeMd_(newNick),
    runtime,
    { parse_mode: "MarkdownV2" }
  );
}

function applyPlayerServerChange_(playerId, newServer, adminUser, runtime) {
  const p = getPlayerById_(playerId, runtime);
  if (!p) return;
  updatePlayerFields_(playerId, { server: String(newServer).trim() }, runtime);

  sendToTopic_(runtime.topics.admin,
    "🛠️ *Изменение профиля*\n" +
    "👨‍💼 Админ: " + adminTag_(adminUser) + "\n" +
    "👤 Игрок: " + escapeMd_(p.nick || p.id) + "\n" +
    "🌍 Новый сервер: " + escapeMd_(newServer),
    runtime,
    { parse_mode: "MarkdownV2" }
  );
}

function adminSendTop_(chatId, threadId, runtime) {
  const rows = supabaseSelect_("players", {
    select: "id,nick,balance,inventory",
    order: "balance.desc",
    limit: "500"
  }, runtime);

  const scored = (rows || []).map(function(p) {
    const inv = Array.isArray(p.inventory) ? p.inventory : [];
    var invValue = 0;
    for (var i = 0; i < inv.length; i++) invValue += Number((inv[i] || {}).value || 0);
    return {
      id: p.id,
      nick: p.nick,
      balance: Number(p.balance || 0),
      invValue: invValue,
      score: Number(p.balance || 0) + invValue
    };
  }).sort(function(a, b) { return b.score - a.score; }).slice(0, 25);

  var text = "🏆 *Топ-25 игроков*\n\n";
  for (var j = 0; j < scored.length; j++) {
    const s = scored[j];
    text += (j + 1) + ". " + escapeMd_(s.nick || s.id) + " — *" + s.score.toLocaleString("ru-RU") + "*\n";
  }

  sendMessage_(chatId, text, { parse_mode: "MarkdownV2", message_thread_id: threadId });
}

function adminSendPromos_(chatId, threadId, runtime) {
  const promos = getActivePromos_(runtime);
  var txt = "🎁 *Активные промокоды*\n\n";
  if (!promos.length) {
    txt += "Пусто";
  } else {
    for (var i = 0; i < promos.length; i++) {
      txt += "• `" + escapeMd_(promos[i].code) + "` — *" + Number(promos[i].reward || 0) + " BC*\n";
    }
  }

  sendMessage_(chatId, txt, {
    parse_mode: "MarkdownV2",
    message_thread_id: threadId,
    reply_markup: {
      inline_keyboard: [[{ text: "🟩 ➕ Создать", callback_data: "ad:promos:create" }]]
    }
  });
}

function broadcastToAllPlayers_(text, runtime) {
  const rows = supabaseSelect_("players", {
    select: "telegram_id",
    telegram_id: "not.is.null",
    limit: "5000"
  }, runtime) || [];

  var sent = 0;
  for (var i = 0; i < rows.length; i++) {
    const tgId = Number(rows[i].telegram_id || 0);
    if (!tgId) continue;
    const ok = sendToPlayer_(tgId, "📢 *Сообщение от администрации*\n\n" + escapeMd_(text), {
      parse_mode: "MarkdownV2"
    });
    if (ok) sent++;
  }
  return sent;
}

function broadcastToIds_(ids, text, runtime) {
  const sent = [];
  for (var i = 0; i < ids.length; i++) {
    const ok = sendToPlayer_(ids[i], "📢 *Сообщение от администрации*\n\n" + escapeMd_(text), {
      parse_mode: "MarkdownV2"
    });
    if (ok) sent.push(ids[i]);
  }
  return sent;
}

// ==============================
// SUPPORT THREADS
// ==============================
function createSupportThread_(player, runtime) {
  const name = "💬 ТП #" + Number(player.telegram_id || 0) + " - " + String(player.nick || player.id || "player");
  const r = tgApi_("createForumTopic", {
    chat_id: runtime.adminChatId,
    name: name.substring(0, 120)
  }, runtime);

  const threadId = r && r.ok && r.result ? Number(r.result.message_thread_id || 0) : 0;
  if (!threadId) {
    return 0;
  }

  const tgId = Number(player.telegram_id || 0);
  mapSupportThread_(threadId, tgId);

  sendToTopic_(threadId,
    "🆕 *Новый тикет*\n" +
    "👤 Игрок: " + escapeMd_(player.nick || player.id) + "\n" +
    "🆔 Telegram ID: `" + tgId + "`",
    runtime,
    { parse_mode: "MarkdownV2" }
  );

  sendToTopic_(runtime.topics.support,
    "💬 Создан новый тикет: thread " + threadId + " для игрока " + escapeMd_(player.nick || player.id),
    runtime,
    { parse_mode: "MarkdownV2" }
  );

  return threadId;
}

function mapSupportThread_(threadId, telegramId) {
  PROPS.setProperty(SUPPORT_THREAD_PREFIX + threadId, String(telegramId));
  PROPS.setProperty(SUPPORT_PLAYER_PREFIX + telegramId, String(threadId));
  CACHE.put(SUPPORT_THREAD_PREFIX + threadId, String(telegramId), 6 * 3600);
  CACHE.put(SUPPORT_PLAYER_PREFIX + telegramId, String(threadId), 6 * 3600);
}

function getSupportPlayerByThread_(threadId) {
  const key = SUPPORT_THREAD_PREFIX + threadId;
  let v = CACHE.get(key);
  if (!v) {
    v = PROPS.getProperty(key);
    if (v) CACHE.put(key, v, 6 * 3600);
  }
  return v ? Number(v) : 0;
}

function getSupportThreadByPlayer_(telegramId) {
  const key = SUPPORT_PLAYER_PREFIX + telegramId;
  let v = CACHE.get(key);
  if (!v) {
    v = PROPS.getProperty(key);
    if (v) CACHE.put(key, v, 6 * 3600);
  }
  return v ? Number(v) : 0;
}

// ==============================
// TELEGRAM SEND HELPERS
// ==============================
function sendMessage_(chatId, text, extra) {
  const payload = {
    chat_id: chatId,
    text: text
  };
  if (extra) {
    Object.keys(extra).forEach(function(k) {
      payload[k] = extra[k];
    });
  }
  const r = tgApi_("sendMessage", payload);
  return !!(r && r.ok);
}

function sendToTopic_(topicId, text, runtime, extra) {
  if (!topicId || !runtime || !runtime.adminChatId) return false;
  const payload = {
    chat_id: runtime.adminChatId,
    message_thread_id: topicId,
    text: text
  };
  if (extra) {
    Object.keys(extra).forEach(function(k) { payload[k] = extra[k]; });
  }
  const r = tgApi_("sendMessage", payload, runtime);
  return !!(r && r.ok);
}

function sendToPlayer_(telegramId, text, extra) {
  return sendMessage_(Number(telegramId), text, extra);
}

function answerCallback_(callbackQueryId, text) {
  tgApi_("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: text || "OK",
    show_alert: false
  });
}

// ==============================
// SUPABASE HELPERS
// ==============================
function supabaseSelect_(table, queryParams, runtime) {
  const q = queryParams || {};
  const qs = toQueryString_(q);
  const path = "/rest/v1/" + table + (qs ? ("?" + qs) : "");
  return supabaseRequest_("get", path, null, runtime);
}

function supabaseInsert_(table, rows, runtime, onConflict) {
  const path = "/rest/v1/" + table + (onConflict ? ("?on_conflict=" + encodeURIComponent(onConflict)) : "");
  return supabaseRequest_("post", path, rows, runtime, {
    Prefer: "resolution=merge-duplicates,return=representation"
  });
}

function supabasePatch_(table, filters, body, runtime) {
  const qs = toQueryString_(filters || {});
  const path = "/rest/v1/" + table + (qs ? ("?" + qs) : "");
  return supabaseRequest_("patch", path, body, runtime, {
    Prefer: "return=representation"
  });
}

function supabaseRequest_(method, path, payload, runtime, extraHeaders) {
  const cfg = runtime || getRuntimeConfig_();
  const url = String(cfg.supabaseUrl).replace(/\/$/, "") + path;

  const headers = {
    apikey: cfg.supabaseAnonKey,
    Authorization: "Bearer " + cfg.supabaseAnonKey,
    "Content-Type": "application/json"
  };
  if (extraHeaders) {
    Object.keys(extraHeaders).forEach(function(k) {
      headers[k] = extraHeaders[k];
    });
  }

  const options = {
    method: String(method || "get").toUpperCase(),
    headers: headers,
    muteHttpExceptions: true
  };

  if (payload !== null && payload !== undefined) {
    options.payload = JSON.stringify(payload);
  }

  const res = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  const body = res.getContentText() || "";

  if (code >= 200 && code < 300) {
    if (!body) return null;
    return JSON.parse(body);
  }

  throw new Error("Supabase " + options.method + " " + path + " failed: " + code + " :: " + body);
}

// ==============================
// DATA ACCESS
// ==============================
function ensureLinkedPlayer_(tgUser, runtime) {
  const tgId = Number(tgUser.id || 0);
  if (!tgId) return null;

  const byTg = supabaseSelect_("players", {
    select: "*",
    telegram_id: "eq." + tgId,
    limit: "1"
  }, runtime);

  if (byTg && byTg.length) {
    return byTg[0];
  }

  const gameId = "tg_" + tgId;
  const byId = supabaseSelect_("players", {
    select: "*",
    id: "eq." + gameId,
    limit: "1"
  }, runtime);

  if (byId && byId.length) {
    const p = byId[0];
    updatePlayerFields_(p.id, {
      telegram_id: tgId,
      telegram_username: String(tgUser.username || "")
    }, runtime);
    p.telegram_id = tgId;
    p.telegram_username = String(tgUser.username || "");
    return p;
  }

  const newPlayer = {
    id: gameId,
    nick: buildNickFromTg_(tgUser),
    server: "Сервер",
    balance: 1500,
    inventory: [],
    stats: { opened: 0, itemsSold: 0, valueSold: 0 },
    telegram_id: tgId,
    telegram_username: String(tgUser.username || ""),
    used_promos: []
  };

  const inserted = supabaseInsert_("players", [newPlayer], runtime, "id");
  return inserted && inserted.length ? inserted[0] : newPlayer;
}

function getPlayerById_(playerId, runtime) {
  const rows = supabaseSelect_("players", {
    select: "*",
    id: "eq." + playerId,
    limit: "1"
  }, runtime);
  return rows && rows.length ? rows[0] : null;
}

function searchPlayerByNick_(nickLike, runtime) {
  const q = String(nickLike || "").trim();
  if (!q) return null;

  const rows = supabaseSelect_("players", {
    select: "*",
    nick: "ilike.*" + q.replace(/\*/g, "") + "*",
    limit: "1"
  }, runtime);

  return rows && rows.length ? rows[0] : null;
}

function updatePlayerFields_(playerId, fields, runtime) {
  return supabasePatch_("players", { id: "eq." + playerId }, fields, runtime);
}

function getPromoByCode_(code, runtime) {
  const rows = supabaseSelect_("promocodes", {
    select: "code,reward,is_active",
    code: "eq." + code,
    limit: "1"
  }, runtime);
  return rows && rows.length ? rows[0] : null;
}

function getActivePromos_(runtime) {
  try {
    return supabaseSelect_("promocodes", {
      select: "code,reward,is_active",
      is_active: "eq.true",
      order: "code.asc",
      limit: "200"
    }, runtime) || [];
  } catch (e) {
    // Fallback for schemas without is_active
    const rows = supabaseSelect_("promocodes", {
      select: "code,reward",
      order: "code.asc",
      limit: "200"
    }, runtime) || [];
    return rows.map(function(r) {
      r.is_active = true;
      return r;
    });
  }
}

function upsertPromo_(code, reward, runtime) {
  const row = {
    code: String(code || "").toUpperCase(),
    reward: Number(reward || 0),
    is_active: true,
    updated_at: new Date().toISOString()
  };
  return supabaseInsert_("promocodes", [row], runtime, "code");
}

// ==============================
// TELEGRAM API
// ==============================
function tgApi_(method, payload, runtime) {
  const cfg = runtime || {
    botToken: CFG.botToken,
    supabaseUrl: CFG.supabaseUrl,
    supabaseAnonKey: CFG.supabaseAnonKey,
    adminChatId: CFG.adminChatId,
    adminIds: CFG.adminIds,
    topics: CFG.topics
  };
  const url = "https://api.telegram.org/bot" + cfg.botToken + "/" + method;
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload || {}),
    muteHttpExceptions: true
  };

  const res = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  const body = res.getContentText() || "{}";
  let json;
  try {
    json = JSON.parse(body);
  } catch (e) {
    json = { ok: false, description: body };
  }

  if (!(code >= 200 && code < 300) || !json.ok) {
    // Telegram errors go to error topic too.
    safeLogError_(new Error("Telegram API " + method + " failed: " + code + " :: " + body), "tgApi_" + method);
  }

  return json;
}

// ==============================
// CONFIG / STATE
// ==============================
function getRuntimeConfig_() {
  const cacheKey = "runtime-config";
  const cached = CACHE.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const runtime = JSON.parse(JSON.stringify(CFG));

  // Merge dynamic config from Supabase config table if available.
  try {
    if (runtime.supabaseUrl && runtime.supabaseAnonKey) {
      const conf = supabaseSelect_("config", {
        select: "*",
        id: "eq.global",
        limit: "1"
      }, runtime);

      if (conf && conf.length) {
        const row = conf[0] || {};

        if (Array.isArray(row.admin_ids) && row.admin_ids.length) {
          runtime.adminIds = row.admin_ids.map(function(x) { return Number(x); }).filter(Boolean);
        }

        if (row.topic_ids && typeof row.topic_ids === "object") {
          runtime.topics.actions = Number(row.topic_ids.actions || runtime.topics.actions || 0);
          runtime.topics.support = Number(row.topic_ids.support || runtime.topics.support || 0);
          runtime.topics.broadcasts = Number(row.topic_ids.broadcasts || runtime.topics.broadcasts || 0);
          runtime.topics.errors = Number(row.topic_ids.errors || runtime.topics.errors || 0);
          runtime.topics.admin = Number(row.topic_ids.admin || runtime.topics.admin || 0);
        }
      }
    }
  } catch (e) {
    // Silent fallback to script properties config.
  }

  CACHE.put(cacheKey, JSON.stringify(runtime), 60);
  return runtime;
}

function setState_(key, obj, ttlSeconds) {
  CACHE.put(key, JSON.stringify(obj || {}), Math.max(30, Number(ttlSeconds || 300)));
}

function getState_(key) {
  const raw = CACHE.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function clearState_(key) {
  CACHE.remove(key);
}

function isAdmin_(userId, runtime) {
  const uid = Number(userId || 0);
  return runtime.adminIds.indexOf(uid) !== -1;
}

// ==============================
// UTIL
// ==============================
function safeLogError_(err, where) {
  try {
    const runtime = getRuntimeConfig_();
    const msg =
      "⚠️ *ОШИБКА*\n" +
      "📍 Где: " + escapeMd_(where || "unknown") + "\n" +
      "🧾 Текст: " + escapeMd_(String(err && err.message ? err.message : err)) + "\n" +
      "🕒 " + escapeMd_(new Date().toISOString());

    if (runtime.topics && runtime.topics.errors) {
      sendToTopic_(runtime.topics.errors, msg, runtime, { parse_mode: "MarkdownV2" });
    }
    console.error(where || "error", err);
  } catch (inner) {
    console.error("safeLogError_ failed", inner);
  }
}

function escapeMd_(s) {
  return String(s || "")
    .replace(/([_\*\[\]\(\)~`>#+\-=|{}\.!])/g, "\\$1");
}

function parseIdList_(s) {
  return String(s || "")
    .split(/[\s,;\n]+/)
    .map(function(x) { return Number(x.trim()); })
    .filter(function(n) { return !!n; });
}

function buildNickFromTg_(tgUser) {
  const fn = String((tgUser && tgUser.first_name) || "").trim();
  const ln = String((tgUser && tgUser.last_name) || "").trim();
  const uname = String((tgUser && tgUser.username) || "").trim();
  const base = (fn + " " + ln).trim();
  if (base) return base;
  if (uname) return uname;
  return "Player_" + Number((tgUser && tgUser.id) || 0);
}

function adminTag_(adminUser) {
  if (adminUser && adminUser.username) return "@" + escapeMd_(adminUser.username);
  return "`" + Number((adminUser && adminUser.id) || 0) + "`";
}

function detectFavoriteCase_(stats) {
  if (!stats || !stats.casesOpenedCount) return "Нет данных";
  const map = stats.casesOpenedCount;
  let best = "Нет данных";
  let bestCount = -1;
  for (var k in map) {
    if (!map.hasOwnProperty(k)) continue;
    const n = Number(map[k] || 0);
    if (n > bestCount) {
      bestCount = n;
      best = k;
    }
  }
  return best;
}

function toQueryString_(obj) {
  const parts = [];
  Object.keys(obj || {}).forEach(function(k) {
    const v = obj[k];
    if (v === null || v === undefined || v === "") return;
    parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
  });
  return parts.join("&");
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==============================
// OPTIONAL SETUP HELPERS
// ==============================
function setWebhook() {
  // Указываем ссылку напрямую как текст
  const webAppUrl = "https://script.google.com/macros/s/AKfycbzhTe_x7nmPZ8pJr6f9aqWV78MJoyUCxNnSyRAeFV9p-fkX3AKrhx1TYwNvHhsZ5-c/exec";
  
  if (!webAppUrl) throw new Error("Укажите ссылку на веб-приложение");
  
  // Устанавливаем вебхук в Telegram
  const r = tgApi_("setWebhook", { url: webAppUrl });
  Logger.log(JSON.stringify(r));
}

function deleteWebhook() {
  const r = tgApi_("deleteWebhook", {});
  Logger.log(JSON.stringify(r));
}
