// === Глобальное логирование ошибок (F12) ===
window.addEventListener('error', (event) => {
  console.group('%c🚨 Глобальная ошибка [BR Simulator]', 'color: white; background: red; padding: 4px 8px; border-radius: 4px;');
  console.error('Сообщение:', event.message);
  console.error('Файл:', event.filename);
  console.error('Строка:', event.lineno, 'Колонка:', event.colno);
  console.error('Стек:', event.error?.stack);
  console.groupEnd();
});

window.addEventListener('unhandledrejection', (event) => {
  console.group('%c⚠️ Необработанный Promise [BR Simulator]', 'color: black; background: orange; padding: 4px 8px; border-radius: 4px;');
  console.error('Причина:', event.reason);
  console.error('Стек:', event.reason?.stack);
  console.groupEnd();
});

// === Supabase Configuration ===
// Вставьте сюда ваши данные из настроек проекта Supabase (Project Settings -> API)
const SUPABASE_URL = "https://djntyykghnparlmomazu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbnR5eWtnaG5wYXJsbW9tYXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDI4MzUsImV4cCI6MjA5MDExODgzNX0.x4qqK0Bsn58kaL3RlxVu9Ruewm7F2jnV_tv24hhWlD8";

// Инициализация Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let globalState = null;
let syncTimeout = null;

const STORAGE_KEY = "brs_state_v2";

const rarityMeta = {
  gray: { label: "Серое", className: "gray", chanceKey: "gray" },
  green: { label: "Зеленое", className: "green", chanceKey: "green" },
  blue: { label: "Синее", className: "blue", chanceKey: "blue" },
  purple: { label: "Фиолетовое", className: "purple", chanceKey: "purple" },
  gold: { label: "Золотое", className: "gold", chanceKey: "gold" },
  yellow: { label: "Желтое", className: "yellow", chanceKey: "gold" },
  red: { label: "Красное", className: "red", chanceKey: "gold" },
  pink: { label: "Розовое", className: "pink", chanceKey: "purple" },
  common: { label: "Обычное", className: "gray", chanceKey: "gray" },
  legendary: { label: "Легендарное", className: "gold", chanceKey: "gold" },
  secret: { label: "Секретное", className: "gold", chanceKey: "gold" }
};

const fallbackImage = "img/placeholder-case.jpg";

const BADGE_TYPES = {
  verified: { label: "Верифицированный аккаунт",  cls: "badge-verified", title: "Верифицированный аккаунт",
    desc: "Этот аккаунт подтверждён администрацией сервера Black Russia как настоящий." },
  tiktoker: { label: "TikTok-блогер",       cls: "badge-tiktoker", title: "TikTok-блогер",
    desc: "Игрок ведёт TikTok-канал и снимает контент по Black Russia." },
  youtuber: { label: "YouTube-блогер",          cls: "badge-youtuber", title: "YouTube-блогер",
    desc: "Игрок ведёт YouTube-канал и снимает видео по Black Russia." },
  admin:    { label: "Администратор",   cls: "badge-admin",    title: "Администратор BR",
    desc: "Администратор сервера Black Russia. Следит за порядком и помогает игрокам." },
};

const BADGE_SVG = {
  verified: `<svg viewBox="0 0.72 22 20.56" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 2L13.39 4.34L16.68 3.68L17.66 6.84L20.63 8L19.68 11L20.63 14L17.66 15.16L16.68 18.32L13.39 17.66L11 20L8.61 17.66L5.32 18.32L4.34 15.16L1.37 14L2.32 11L1.37 8L4.34 6.84L5.32 3.68L8.61 4.34L11 2Z" fill="#1d9bf0"/><path d="M7.5 11L10 13.5L14.5 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  tiktoker: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="#010101"/><path d="M19.59 7.42a4.8 4.8 0 0 1-4.77-4.77h-2.98v12.66a2.18 2.18 0 1 1-2.39-2.17v-3.02a5.16 5.16 0 1 0 5.37 5.14V9.86a7.73 7.73 0 0 0 4.77 1.61V8.46a4.8 4.8 0 0 1-0-1.04z" fill="white"/><path d="M19.59 7.42a4.8 4.8 0 0 1-4.77-4.77h-2.98v12.66a2.18 2.18 0 1 1-2.39-2.17v-3.02a5.16 5.16 0 1 0 5.37 5.14V9.86a7.73 7.73 0 0 0 4.77 1.61V8.46a4.8 4.8 0 0 1-0-1.04z" fill="url(#tt_grad)" opacity="0.65"/><defs><linearGradient id="tt_grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#69C9D0"/><stop offset="100%" stop-color="#EE1D52"/></linearGradient></defs></svg>`,
  youtuber: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="#FF0000"/><path d="M21.8 8.2C21.6 7.4 20.9 6.8 20.1 6.6 18.6 6.2 12 6.2 12 6.2s-6.6 0-8.1.4C3.1 6.8 2.4 7.4 2.2 8.2 1.8 9.7 1.8 12 1.8 12s0 2.3.4 3.8c.2.8.9 1.4 1.7 1.6 1.5.4 8.1.4 8.1.4s6.6 0 8.1-.4c.8-.2 1.5-.8 1.7-1.6.4-1.5.4-3.8.4-3.8s0-2.3-.4-3.8z" fill="white"/><path d="M9.8 15.2V8.8l6.4 3.2-6.4 3.2z" fill="#FF0000"/></svg>`,
  admin: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="adm_g" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stop-color="#FFD700"/><stop offset="100%" stop-color="#FF6600"/></linearGradient></defs><path d="M12 2L14.4 8.8H21.6L15.6 13.2L18 20L12 15.6L6 20L8.4 13.2L2.4 8.8H9.6L12 2Z" fill="url(#adm_g)" stroke="rgba(255,160,0,0.4)" stroke-width="0.5"/></svg>`,
};

function getBadgesHtml(player) {
  const badges = Array.isArray(player && player.badges) ? player.badges : [];
  if (!badges.length) return "";
  return badges
    .filter((key) => BADGE_TYPES[key])
    .map((key) => {
      const b = BADGE_TYPES[key];
      return `<span class="player-badge ${b.cls}" data-badge-key="${key}">${BADGE_SVG[key]}</span>`;
    })
    .join("");
}

// ---- Badge info popup ----
(function initBadgePopup() {
  const popup = document.createElement("div");
  popup.id = "badgeInfoPopup";
  popup.className = "badge-info-popup";
  popup.innerHTML = `
    <div class="bip-icon"></div>
    <div class="bip-body">
      <div class="bip-label"></div>
      <div class="bip-desc"></div>
    </div>
  `;
  document.body.appendChild(popup);

  let hideTimer = null;

  function showBadgePopup(el) {
    const key = el.dataset.badgeKey;
    const b = BADGE_TYPES[key];
    if (!b) return;
    clearTimeout(hideTimer);

    popup.querySelector(".bip-icon").innerHTML = BADGE_SVG[key];
    popup.querySelector(".bip-label").textContent = b.label;
    popup.querySelector(".bip-desc").textContent = b.desc;
    popup.className = `badge-info-popup bip-${key} active`;

    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const popupW = 220;

    let left = rect.left + scrollX + rect.width / 2 - popupW / 2;
    left = Math.max(8, Math.min(left, document.documentElement.clientWidth - popupW - 8));
    const top = rect.top + scrollY - 4;

    popup.style.left = left + "px";
    popup.style.top = top + "px";
    popup.style.transform = "translateY(-100%)";

    hideTimer = setTimeout(hideBadgePopup, 3500);
  }

  function hideBadgePopup() {
    popup.classList.remove("active");
  }

  document.addEventListener("click", (e) => {
    const badge = e.target.closest(".player-badge[data-badge-key]");
    if (badge) {
      e.stopPropagation();
      if (popup.classList.contains("active") && popup.className.includes(`bip-${badge.dataset.badgeKey}`)) {
        hideBadgePopup();
      } else {
        showBadgePopup(badge);
      }
    } else if (!popup.contains(e.target)) {
      hideBadgePopup();
    }
  });
})();

// ---- Live Drop Bar ----
const LiveDrop = (function () {
  const MAX_ITEMS = 40;
  const queue = [];
  let hasSeededInitialData = false;
  let hasRealtimeSubscription = false;

  const RARITY_COLOR = {
    gray: "#9e9e9e", common: "#9e9e9e",
    green: "#4caf50",
    blue: "#4fc3f7",
    purple: "#ce93d8", pink: "#f48fb1",
    gold: "#ffc107", yellow: "#ffd54f", legendary: "#ffab40", secret: "#ff8a65",
    red: "#ef5350",
  };

  const RARITY_GEM = {
    gray: "◇", common: "◇",
    green: "◆",
    blue: "◈",
    purple: "✦", pink: "✦",
    gold: "★", yellow: "★", legendary: "♛", secret: "⬡",
    red: "◉",
  };

  const RARITY_LABEL = {
    gray: "Серый", common: "Обычный",
    green: "Зелёный",
    blue: "Синий",
    purple: "Фиолет.", pink: "Розовый",
    gold: "Золотой", yellow: "Жёлтый", legendary: "Легенда", secret: "Секрет",
    red: "Красный",
  };

  function rarityColor(r) {
    return RARITY_COLOR[(r || "gray").toLowerCase()] || "#9e9e9e";
  }
  function rarityGem(r) {
    return RARITY_GEM[(r || "gray").toLowerCase()] || "◆";
  }

  function buildItem(drop, isNew) {
    const color = rarityColor(drop.rarity);
    const gem   = rarityGem(drop.rarity);
    const rlabel = RARITY_LABEL[(drop.rarity || "gray").toLowerCase()] || drop.rarity || "";

    const wrap = document.createElement("div");
    wrap.className = "ldb-item" + (isNew ? " ldb-new" : "");
    wrap.style.borderLeftColor = color;
    wrap.style.boxShadow = `inset 3px 0 8px ${color}22`;

    // item image
    const imgWrap = document.createElement("div");
    imgWrap.className = "ldb-img-wrap";
    imgWrap.style.background = `${color}18`;
    if (drop.image) {
      const img = document.createElement("img");
      img.className = "ldb-img";
      img.src = drop.image;
      img.alt = "";
      img.onerror = function() { this.style.display="none"; imgWrap.textContent = gem; imgWrap.style.color = color; };
      imgWrap.appendChild(img);
    } else {
      imgWrap.textContent = gem;
      imgWrap.style.color = color;
      imgWrap.style.fontSize = "14px";
    }

    // text group
    const content = document.createElement("div");
    content.className = "ldb-content";

    // top row: nick + verb
    const topRow = document.createElement("div");
    topRow.className = "ldb-top-row";

    const nick = document.createElement("span");
    nick.className = "ldb-nick";
    nick.textContent = drop.nick || "Игрок";

    const verb = document.createElement("span");
    verb.className = "ldb-verb";
    verb.textContent = "выбил";

    topRow.append(nick, verb);

    // bottom row: item name (in rarity colour) + value
    const botRow = document.createElement("div");
    botRow.className = "ldb-bot-row";

    const name = document.createElement("span");
    name.className = "ldb-item-name";
    name.textContent = drop.name;
    name.style.color = color;
    name.style.textShadow = `0 0 8px ${color}55`;

    botRow.append(name);

    if (drop.value && drop.value > 0) {
      const val = document.createElement("span");
      val.className = "ldb-value";
      val.textContent = drop.value >= 1000
        ? (drop.value / 1000).toFixed(1).replace(/\.0$/, "") + "к BC"
        : drop.value + " BC";
      botRow.appendChild(val);
    }

    content.append(topRow, botRow);
    wrap.append(imgWrap, content);
    return wrap;
  }

  function buildDivider() {
    const d = document.createElement("div");
    d.className = "ldb-divider";
    return d;
  }

  function ensureFallbackQueue() {
    if (queue.length === 0) {
      queue.push({
        nick: "Black Russia",
        name: "LiveDrop активен",
        rarity: "gray",
        value: 0,
        image: null
      });
    }
  }

  function rebuild() {
    const track = document.getElementById("ldbTrack");
    if (!track) return;
    track.innerHTML = "";
    if (!queue.length) ensureFallbackQueue();
    if (!queue.length) return;

    const all = [...queue, ...queue];
    all.forEach((d, i) => {
      if (i > 0) track.appendChild(buildDivider());
      track.appendChild(buildItem(d, false));
    });

    track.style.animation = "none";
    track.offsetWidth;
    const duration = Math.max(22, queue.length * 2.8);
    track.style.animation = `ldb-scroll ${duration}s linear infinite`;

    // Switch island to live mode
    const island = document.getElementById("mainIsland");
    if (island) island.classList.add("is-live");
  }

  function push(nick, itemName, rarity, value, image) {
    queue.unshift({ nick, name: itemName, rarity, value: value || 0, image: image || null });
    if (queue.length > MAX_ITEMS) queue.length = MAX_ITEMS;
    rebuild();
  }

  function seed() {
    if (!hasSeededInitialData) {
      hasSeededInitialData = true;
      // Load last 40 drops from Supabase live_drops table once
      supabaseClient
        .from("live_drops")
        .select("nick, item_name, rarity, value, image, created_at")
        .order("created_at", { ascending: false })
        .limit(40)
        .then(({ data, error }) => {
          if (error) {
            console.warn("[LiveDrop] seed error:", error.message);
            _seedFromInventory();
            return;
          }
          if (data && data.length > 0) {
            // Reverse so newest is at front after unshift-based push
            const rows = [...data].reverse();
            rows.forEach((r) => queue.push({
              nick:  r.nick       || "Игрок",
              name:  r.item_name  || "Предмет",
              rarity: r.rarity    || "gray",
              value:  r.value     || 0,
              image:  r.image     || null,
            }));
            if (queue.length > MAX_ITEMS) queue.length = MAX_ITEMS;
            rebuild();
          } else {
            _seedFromInventory();
          }
        });
    }

    if (!hasRealtimeSubscription) {
      hasRealtimeSubscription = true;
      // Subscribe to new inserts once; renderAll can call seed many times
      supabaseClient
        .channel("live_drops_channel")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_drops" }, (payload) => {
          const r = payload.new;
          push(r.nick || "Игрок", r.item_name || "Предмет", r.rarity || "gray", r.value || 0, r.image || null);
        })
        .subscribe();
    }
  }

  function _seedFromInventory() {
    const sourceState = window.state || globalState || loadState();
    if (!sourceState || !Array.isArray(sourceState.players)) {
      ensureFallbackQueue();
      rebuild();
      return;
    }
    const players = sourceState.players.filter((p) => p.inventory && p.inventory.length);
    if (!players.length) {
      ensureFallbackQueue();
      rebuild();
      return;
    }
    const picks = [];
    for (let i = 0; i < Math.min(16, players.length * 3); i++) {
      const p = players[Math.floor(Math.random() * players.length)];
      const inv = p.inventory;
      const item = inv[Math.floor(Math.random() * inv.length)];
      if (item) picks.push({ nick: p.nick || "Игрок", name: item.name, rarity: item.rarity, value: item.value || 0, image: item.image || null });
    }
    picks.forEach((d) => queue.push(d));
    if (queue.length > MAX_ITEMS) queue.length = MAX_ITEMS;
    rebuild();
  }

  return { push, seed, rebuild };
})();
window.LiveDrop = LiveDrop;

const defaultState = {
  currentPlayerId: "player_1",
  rarityChances: {
    gray: 45,
    green: 28,
    blue: 17,
    purple: 8,
    gold: 2
  },
  players: [
    {
      id: "player_1",
      nick: "BR_Player",
      server: "Москва",
      balance: 1500,
      inventory: [],
      stats: { opened: 0 },
      totalSpent: 0,
      banned: false
    },
    {
      id: "bot_1",
      nick: "Legend_Maks",
      server: "Санкт-Петербург",
      balance: 8200,
      inventory: [],
      stats: { opened: 0 },
      totalSpent: 0,
      banned: false
    },
    {
      id: "bot_2",
      nick: "Vlad_Boss",
      server: "Казань",
      balance: 7600,
      inventory: [],
      stats: { opened: 0 },
      totalSpent: 0,
      banned: false
    },
    {
      id: "bot_3",
      nick: "Lime_Drive",
      server: "Самара",
      balance: 6900,
      inventory: [],
      stats: { opened: 0 },
      totalSpent: 0,
      banned: false
    }
  ],
  news: [
    "Каждую неделю топ игроков сбрасывается. Лидеры получат настоящую игровую валюту в Black Russia.",
    "Добавлены новые кейсы и обновленная система редкостей.",
    "Минимальный вес интерфейса: стабильная работа даже на слабых устройствах."
  ],
  cases: [],
  юcaseCategories: [
    { id: "cat_default", name: "Основное", description: "Основные кейсы", caseIds: [] }
  ],
  promocodes: [
    { code: "START", reward: 10000 }
  ],
  galleryEntries: []
};

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function loadState() {
  if (globalState) {
    const state = JSON.parse(JSON.stringify(globalState));
    window.state = state;
    return state;
  }
  const savedLocal = loadLocalState();
  if (savedLocal) {
    window.state = savedLocal;
    return savedLocal;
  }
  const state = cloneDefaultState();
  window.state = state;
  return state;
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem('br_sim_state');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.state) return null;
    return ensureStateShape(parsed.state);
  } catch (err) {
    return null;
  }
}

function showPageLoader() {
  const loader = document.getElementById("pageLoader");
  if (!loader) return;
  loader.classList.remove("hidden");
  document.body.classList.add("page-loading");
}

function hidePageLoader() {
  const loader = document.getElementById("pageLoader");
  if (!loader) return;
  loader.classList.add("hidden");
  document.body.classList.remove("page-loading");
}

function initPageLoader() {
  const loader = document.getElementById("pageLoader");
  if (!loader) return;

  if (document.readyState !== "loading") {
    hidePageLoader();
  } else {
    document.addEventListener("DOMContentLoaded", hidePageLoader);
  }
  window.addEventListener("pageshow", hidePageLoader);
  document.querySelectorAll("a.nav-btn[href]").forEach((link) => {
    link.addEventListener("click", () => {
      showPageLoader();
    });
  });

  const moreNavBtn = document.getElementById("moreNavBtn");
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  let activeFound = false;

  document.querySelectorAll("a.nav-btn[href]").forEach((link) => {
    const href = link.getAttribute("href") || "";
    const isActive = href.endsWith(currentPage) || (currentPage === "" && href.endsWith("index.html"));
    link.classList.toggle("active", isActive);
    if (isActive) activeFound = true;
  });

  document.querySelectorAll(".more-nav-item").forEach((link) => {
    const href = link.getAttribute("href") || "";
    const isActive = href.endsWith(currentPage) || (currentPage === "" && href.endsWith("index.html"));
    link.classList.toggle("active", isActive);
    if (isActive && moreNavBtn) {
      moreNavBtn.classList.add("active");
      activeFound = true;
    }
  });

  if (!activeFound && moreNavBtn) {
    moreNavBtn.classList.remove("active");
  }
}

function saveState(state) {
  // Persist immediately to localStorage, then sync to Supabase with debounce.
  try {
    localStorage.setItem('br_sim_state', JSON.stringify({ savedAt: Date.now(), state }));
  } catch (err) {
    // Ignore local storage failures.
  }

  globalState = JSON.parse(JSON.stringify(state));
  window.state = state;
  
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => syncStateToSupabase(state), 300);
}

async function syncStateToSupabase(state) {
  try {
    // 1. Конфиг
    try {
      await supabaseClient.from('config').upsert({
        id: 'global',
        rarity_chances: state.rarityChances,
        promocodes: state.promocodes,
        gallery_entries: state.galleryEntries,
        case_categories: state.caseCategories
      });
    } catch (configErr) {
      console.warn('[Supabase] Config sync failed:', configErr.message || configErr);
    }

    // 2. Игроки
    try {
      const playersPayload = state.players.map(p => ({
        id: p.id,
        nick: p.nick,
        server: p.server,
        balance: p.balance,
        inventory: p.inventory,
        stats: p.stats,
        total_spent: Math.max(0, Math.round(p.totalSpent || 0)),
        badges:        p.badges        || [],
        usedPromos:    p.usedPromos    || [],
        dailyBonus:    p.dailyBonus    || { lastClaim: 0, streak: 0 },
        wheelLastSpun: p.wheelLastSpun || 0,
        banned:        p.banned || false
      }));
      await supabaseClient.from('players').upsert(playersPayload);
    } catch (playersErr) {
      console.warn('[Supabase] Players sync failed:', playersErr.message || playersErr);
    }

    // 3. Кейсы
    try {
      const casesPayload = state.cases.map(c => ({
        id: c.id,
        name: c.name,
        price: c.price,
        image: c.image,
        items: c.items,
        category_id: c.categoryId || null
      }));
      const { error: casesErr } = await supabaseClient.from('cases').upsert(casesPayload);
      if (casesErr) {
        console.warn('[Supabase] Cases sync error:', casesErr.message || casesErr);
      }
    } catch (casesErr) {
      console.warn('[Supabase] Cases sync failed:', casesErr.message || casesErr);
    }

    // 4. Новости
    try {
      await supabaseClient.from('news').delete().neq('id', 0);
      const newsPayload = state.news.map((content) => ({ content }));
      if(newsPayload.length > 0) {
        await supabaseClient.from('news').insert(newsPayload);
      }
    } catch (newsErr) {
      console.warn('[Supabase] News sync failed (non-critical):', newsErr.message || newsErr);
    }
  } catch (err) {
    console.group('%c❌ Критическая ошибка: Синхронизация с Supabase', 'color: white; background: red; padding: 4px; border-radius: 4px;');
    console.error(err);
    console.groupEnd();
  }
}

window.addEventListener('beforeunload', () => {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
    syncStateToSupabase(window.state);
  }
});

async function fetchStateFromSupabase() {
  try {
    let state = cloneDefaultState();
    
    // Получаем глобальный конфиг
    const { data: configData } = await supabaseClient.from('config').select('*').eq('id', 'global').maybeSingle();
    if (configData && configData.rarity_chances) {
      state.rarityChances = configData.rarity_chances;
    }
    if (configData && configData.promocodes) {
      state.promocodes = configData.promocodes;
    }
    if (configData && configData.gallery_entries) {
      state.galleryEntries = configData.gallery_entries;
    }
    if (configData && configData.case_categories) {
      state.caseCategories = configData.case_categories;
    }

    // Получаем игроков
    const { data: playersData } = await supabaseClient.from('players').select('*');
    if (playersData && playersData.length > 0) {
      state.players = playersData.map(p => ({
        id: p.id,
        nick: p.nick,
        server: p.server,
        balance: p.balance,
        inventory: p.inventory || [],
        stats: p.stats || { opened: 0 },
        totalSpent: Number(p.total_spent ?? p.totalSpent ?? 0),
        badges:        p.badges        || [],
        usedPromos:    p.usedPromos    || [],
        dailyBonus:    p.dailyBonus    || { lastClaim: 0, streak: 0 },
        wheelLastSpun: p.wheelLastSpun || 0,
        banned:        Boolean(p.banned)
      }));
    }

    // Получаем кейсы
    const { data: casesData } = await supabaseClient.from('cases').select('*');
    if (casesData && casesData.length > 0) {
      state.cases = casesData.map(c => ({
        id: c.id,
        name: c.name,
        price: c.price,
        image: c.image,
        items: c.items || [],
        categoryId: c.category_id || c.categoryId || 'cat_default'
      }));
    }

    // Получаем новости
    const { data: newsData } = await supabaseClient.from('news').select('*').order('id', { ascending: true });
    if (newsData && newsData.length > 0) {
      state.news = newsData.map(n => n.content);
    }
    
    return ensureStateShape(state);
  } catch (err) {
    console.group('%c❌ Критическая ошибка: Загрузка из Supabase', 'color: white; background: red; padding: 4px; border-radius: 4px;');
    console.error(err);
    console.groupEnd();
    return cloneDefaultState();
  }
}

function ensureStateShape(state) {
  const base = cloneDefaultState();
  const safe = { ...base, ...state };

  safe.rarityChances = { ...base.rarityChances, ...(state.rarityChances || {}) };
  safe.players = (() => {
    const raw = (Array.isArray(state.players) && state.players.length > 0) ? state.players : base.players;
    return raw.map(p => ({
      ...p,
      dailyBonus:    p.dailyBonus    || { lastClaim: 0, streak: 0 },
      wheelLastSpun: p.wheelLastSpun != null ? p.wheelLastSpun : 0,
      totalSpent: Number(p.totalSpent || p.total_spent || 0),
      banned: Boolean(p.banned)
    }));
  })();
  safe.cases = Array.isArray(state.cases) ? state.cases : base.cases;
  safe.caseCategories = Array.isArray(state.caseCategories) ? state.caseCategories : base.caseCategories;
  safe.news = (Array.isArray(state.news) && state.news.length > 0) ? state.news : base.news;
  safe.promocodes = Array.isArray(state.promocodes) ? state.promocodes : base.promocodes;
  const nowTs = Date.now();
  safe.galleryEntries = Array.isArray(state.galleryEntries)
    ? state.galleryEntries
        .filter((entry) => entry && entry.ownerId)
        .map((entry, idx) => ({
          id: entry.id || `gallery_${idx}_${nowTs}`,
          ownerId: entry.ownerId,
          itemId: entry.itemId || `item_${idx}`,
          name: entry.name || "Без названия",
          image: entry.image || fallbackImage,
          rarity: entry.rarity || "gray",
          value: Number(entry.value || 0),
          likes: Number(entry.likes || 0),
          likedBy: Array.isArray(entry.likedBy) ? entry.likedBy : [],
          createdAt: entry.createdAt || nowTs,
          custom: (entry.custom && typeof entry.custom === 'object') ? entry.custom : {}
        }))
    : [];

  if (!safe.currentPlayerId && safe.players.length) {
    safe.currentPlayerId = safe.players[0].id;
  }

  // Migrate old placeholder image paths to real assets from /img.
  const imageMap = {
    "img/case-street.jpg": "img/standart_case.png",
    "img/case-business.jpg": "img/money_case.png",
    "img/case-night.jpg": "img/auto_case.png",
    "img/item-cap.jpg": "img/streetglass.png",
    "img/item-suit.jpg": "img/boxer.png",
    "img/item-helmet.jpg": "img/wrx.png",
    "img/item-jacket.jpg": "img/g63.png",
    "img/item-gold.jpg": "img/aventador.png",
    "img/item-briefcase.jpg": "img/packet.png",
    "img/item-watch.jpg": "img/senat.png",
    "img/item-jacket2.jpg": "img/maybach.png",
    "img/item-car.jpg": "img/Bentley.png",
    "img/item-elite.jpg": "img/spectre.png",
    "img/item-neon.jpg": "img/dedmaska.png",
    "img/item-drift.jpg": "img/gtr.png",
    "img/item-vinyl.jpg": "img/m5f90.png",
    "img/item-tuning.jpg": "img/huracan.png",
    "img/item-hyper.jpg": "img/chiron.png"
  };

  safe.cases = safe.cases.map((caseItem) => ({
    ...caseItem,
    image: imageMap[caseItem.image] || caseItem.image,
    items: (caseItem.items || []).filter(i => i).map((dropItem) => ({
      ...dropItem,
      image: imageMap[dropItem.image] || dropItem.image
    }))
  }));

  return safe;
}

function getCurrentPlayer(state = {}) {
  const players = Array.isArray(state.players) ? state.players : [];
  const currentId = state.currentPlayerId != null ? String(state.currentPlayerId) : null;
  return players.find((player) => String(player.id) === currentId) || players[0] || null;
}

function getPlayerBadgesById(playerId) {
  if (!globalState || !Array.isArray(globalState.players)) return [];
  const player = globalState.players.find(p => String(p.id) === String(playerId));
  return Array.isArray(player?.badges) ? player.badges : [];
}

function formatBC(value) {
  return `${Math.max(0, Math.round(value)).toLocaleString("ru-RU")} BC`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function rarityLabel(code) {
  return rarityMeta[code] ? rarityMeta[code].label : code;
}

function rarityClass(code) {
  return rarityMeta[code] ? rarityMeta[code].className : "gray";
}

function rarityColor(code) {
  const colors = { common: "#aaa", gray: "#aaa", rare: "#2ecc71", green: "#2ecc71", epic: "#3498db", blue: "#3498db", legendary: "#9b59b6", purple: "#9b59b6", secret: "#f1c40f", gold: "#f1c40f", yellow: "#f1c40f", red: "#e74c3c", pink: "#e84393" };
  return colors[code] || "#ffffff";
}

function pickRarity(chances) {
  const entries = Object.entries(chances);
  const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  if (total <= 0) return "gray";

  let threshold = Math.random() * total;
  for (const [rarity, chance] of entries) {
    threshold -= Number(chance || 0);
    if (threshold <= 0) {
      return rarity;
    }
  }

  return entries[0][0];
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function normalizeChances(chances) {
  const keys = Object.keys(rarityMeta);
  let total = keys.reduce((sum, key) => sum + Number(chances[key] || 0), 0);
  if (total <= 0) {
    return { ...defaultState.rarityChances };
  }

  const normalized = {};
  keys.forEach((key) => {
    normalized[key] = Number(((Number(chances[key] || 0) / total) * 100).toFixed(2));
  });

  return normalized;
}

function computeScore(player) {
  return Math.max(0, Number(player.totalSpent || 0));
}

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  // Remove all type classes
  toast.classList.remove("success", "error", "info", "warning");
  // Add the new type class
  toast.classList.add(type);
  
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function isCurrentPlayerBanned() {
  const player = getCurrentPlayer(state);
  return Boolean(player && player.banned);
}

function renderBanBanner() {
  const banner = document.getElementById("bannedBanner");
  const player = getCurrentPlayer(state);
  if (!banner) return;
  if (player && player.banned) {
    banner.style.display = "flex";
    banner.setAttribute("aria-hidden", "false");
  } else {
    banner.style.display = "none";
    banner.setAttribute("aria-hidden", "true");
  }
}

function renderBanControls() {
  const banned = isCurrentPlayerBanned();
  const disabledSelectors = [
    document.getElementById("donateBtn"),
    document.getElementById("sellAllBtn"),
    document.getElementById("activatePromoBtn"),
    document.getElementById("openGalleryModalBtn"),
    document.getElementById("spinWheelBtn"),
    document.getElementById("launchUpgradeBtn"),
    document.getElementById("launchContractBtn"),
    document.getElementById("editProfileBtn"),
  ];
  const openModeButtons = Array.from(document.querySelectorAll("[data-open-mode]"));
  const multiplierButtons = Array.from(document.querySelectorAll("[data-open-multiplier]"));

  openModeButtons.forEach((button) => {
    if (button) button.disabled = banned;
  });
  multiplierButtons.forEach((button) => {
    if (button) button.disabled = banned;
  });

  disabledSelectors.forEach((el) => {
    if (el) el.disabled = banned;
  });
}

function renderMainApp() {
  let state = loadState();
  window.state = state;

  // Pre-load item catalog for upgrade target picker & contract rewards
  if (!window._allItemsCatalog || !window._allItemsCatalog.length) {
    fetch("allitems.json").then(r => r.ok ? r.json() : []).then(data => {
      window._allItemsCatalog = data;
    }).catch(() => { window._allItemsCatalog = []; });
  }

  let currentPreviewedCaseId = null;
  let isSpinning = false;
  let selectedOpenMultiplier = 1;
  let activeOpenMode = "classic";
  const GALLERY_PAGE_SIZE = 6;
  let galleryPage = 1;
  let customizeEntryId = null;
  let currentItemDetailEntryId = null;
  let wheelCurrentDeg = 0;
  let isWheelSpinning = false;
  let upgradeSelection = [];
  let contractSelection = [];

  // ===== КАСТОМИЗАЦИЯ ЛОТОВ — ПРЕСЕТЫ =====
  const GALLERY_BG_PRESETS = [
    { id: "bg_dark",    label: "Тёмный",       emoji: "⬛", value: "linear-gradient(180deg,#0d0f1a,#040508)" },
    { id: "bg_night",   label: "Ночное небо",   emoji: "🌌", value: "linear-gradient(160deg,#090d1f,#0e1845)" },
    { id: "bg_crimson", label: "Кровавый",      emoji: "🔴", value: "linear-gradient(160deg,#1a0002,#2d0a0a)" },
    { id: "bg_forest",  label: "Лесной",        emoji: "🌲", value: "linear-gradient(160deg,#040e01,#0c1e09)" },
    { id: "bg_royale",  label: "Роялевый",      emoji: "💜", value: "linear-gradient(160deg,#0a0014,#14012a)" },
    { id: "bg_gold",    label: "Золотой",       emoji: "🌟", value: "linear-gradient(160deg,#120d00,#241800)" },
    { id: "bg_ice",     label: "Ледяной",       emoji: "❄️", value: "linear-gradient(160deg,#020c14,#04192a)" },
  ];
  const GALLERY_GLOW_PRESETS = [
    { id: "glow_cyan",   label: "Cyan",      value: "rgba(0,255,200,0.65)",   color: "#00ffc8" },
    { id: "glow_red",    label: "Красный",   value: "rgba(255,50,50,0.65)",   color: "#ff3232" },
    { id: "glow_gold",   label: "Золото",    value: "rgba(255,200,0,0.65)",   color: "#ffc800" },
    { id: "glow_purple", label: "Фиолетовый",value: "rgba(165,0,255,0.65)",  color: "#a500ff" },
    { id: "glow_white",  label: "Белый",     value: "rgba(255,255,255,0.45)", color: "#ffffff" },
    { id: "glow_pink",   label: "Розовый",   value: "rgba(255,100,180,0.65)", color: "#ff64b4" },
  ];
  const GALLERY_NAMECOLOR_PRESETS = [
    { id: "nc_white", label: "Белый",    value: "#d0d8e8", color: "#d0d8e8" },
    { id: "nc_gold",  label: "Золото",   value: "#ffd700", color: "#ffd700" },
    { id: "nc_cyan",  label: "Cyan",     value: "#00ffe0", color: "#00ffe0" },
    { id: "nc_pink",  label: "Розовый",  value: "#ff6fb4", color: "#ff6fb4" },
    { id: "nc_red",   label: "Красный",  value: "#ff5555", color: "#ff5555" },
    { id: "nc_green", label: "Зелёный",  value: "#44ff88", color: "#44ff88" },
  ];
  const GALLERY_STICKER_PRESETS = [
    { id: "sk_fire",    label: "Огонь",   value: "🔥" },
    { id: "sk_gem",     label: "Алмаз",   value: "💎" },
    { id: "sk_star",    label: "Звезда",  value: "⭐" },
    { id: "sk_crown",   label: "Корона",  value: "👑" },
    { id: "sk_thunder", label: "Молния",  value: "⚡" },
    { id: "sk_skull",   label: "Череп",   value: "💀" },
    { id: "sk_rocket",  label: "Ракета",  value: "🚀" },
  ];
  const GALLERY_CUSTOMIZE_COSTS = { bg: 1000, glow: 1500, nameColor: 600, sticker: 700, caption: 500, badge: 800, promoted: 2000 };

  // ===== ЕЖЕДНЕВНЫЙ БОНУС И КОЛЕСО УДАЧИ — КОНСТАНТЫ =====
  const DAILY_STREAK_REWARDS = [300, 500, 750, 1000, 1500, 2000, 5000];
  const DAILY_COOLDOWN_MS    = 20 * 60 * 60 * 1000; // 20ч между получениями
  const DAILY_STREAK_RESET_MS = 48 * 60 * 60 * 1000; // 48ч без входа — серия сбрасывается
  const WHEEL_COOLDOWN_MS    = 8 * 60 * 60 * 1000;  // 8ч между спинами
  const WHEEL_SEGMENTS = [
    { label: "150 BC",   reward: 150,  color: "#1e2838", textColor: "#88aacc", weight: 20 },
    { label: "500 BC",   reward: 500,  color: "#0e1e3a", textColor: "#44c8ff", weight: 14 },
    { label: "100 BC",   reward: 100,  color: "#161620", textColor: "#505880", weight: 22 },
    { label: "1 000 BC", reward: 1000, color: "#180c3a", textColor: "#cc88ff", weight: 8  },
    { label: "300 BC",   reward: 300,  color: "#0c2018", textColor: "#44dd88", weight: 18 },
    { label: "3 000 BC", reward: 3000, color: "#281600", textColor: "#ffd700", weight: 3  },
    { label: "200 BC",   reward: 200,  color: "#1c2835", textColor: "#88aacc", weight: 16 },
    { label: "750 BC",   reward: 750,  color: "#280c0c", textColor: "#ff7a7a", weight: 12 },
  ];

  function getRarityClassName(code) {
    const normalized = (code || "gray").toLowerCase();
    return Object.keys(rarityMeta).includes(normalized) ? normalized : "gray";
  }

  const balanceValue = document.getElementById("balanceValue");
  const casesGrid = document.getElementById("casesGrid");
  const caseCategoriesContainer = document.getElementById("caseCategoriesContainer");
  const topList = document.getElementById("topList");
  const playerProfileModal = document.getElementById("playerProfileModal");
  const closePlayerProfileModalBtn = document.getElementById("closePlayerProfileModal");
  const profileForm = document.getElementById("profileForm");
  const nickInput = document.getElementById("nickInput");
  const serverInput = document.getElementById("serverInput");
  const inventoryList = document.getElementById("inventoryList");
  const inventoryCount = document.getElementById("inventoryCount");
  const donateBtn = document.getElementById("donateBtn");
  const labUpgradeSlots = document.getElementById("labUpgradeSlots");
  const labContractSlots = document.getElementById("labContractSlots");
  const labUpgradeStats = document.getElementById("labUpgradeStats");
  const labContractStats = document.getElementById("labContractStats");
  const launchUpgradeBtn = document.getElementById("launchUpgradeBtn");
  const launchContractBtn = document.getElementById("launchContractBtn");

  const myGallerySlots = document.getElementById("myGallerySlots");
  const galleryFeed = document.getElementById("galleryFeed");
  const galleryHint = document.getElementById("galleryHint");
  const galleryMyCount = document.getElementById("galleryMyCount");
  const openGalleryModalBtn = document.getElementById("openGalleryModalBtn");
  const galleryModal = document.getElementById("galleryModal");
  const galleryInventoryList = document.getElementById("galleryInventoryList");
  const closeGalleryModalBtn = document.getElementById("closeGalleryModalBtn");
  const customizeModal = document.getElementById("customizeModal");
  const closeCustomizeModalBtn = document.getElementById("closeCustomizeModalBtn");
  const bonusDailyCard    = document.getElementById("dailyBonusCard");
  const bonusWheelCard    = document.getElementById("wheelTriggerCard");
  const wheelModal        = document.getElementById("wheelModal");
  const spinWheelBtn      = document.getElementById("spinWheelBtn");
  const closeWheelModalBtn = document.getElementById("closeWheelModalBtn");
  const wheelStatusText   = document.getElementById("wheelStatusText");
  const galleryPagination = document.getElementById("galleryPagination");
  const itemDetailModal = document.getElementById("itemDetailModal");
  const closeItemDetailModalBtn = document.getElementById("closeItemDetailModal");

  const previewCaseImg = document.getElementById("previewCaseImg");
  const previewCaseName = document.getElementById("previewCaseName");
  const openModeButtons = Array.from(document.querySelectorAll("[data-open-mode]"));
  const multiplierButtons = Array.from(document.querySelectorAll("[data-open-multiplier]"));
  const previewItemList = document.getElementById("previewItemList");
  const backToHomeBtn = document.getElementById("backToHomeBtn");
  const rouletteModal = document.getElementById("rouletteModal");
  const rouletteGrid = document.getElementById("rouletteGrid");

  const modal = document.getElementById("dropModal");
  const dropModalTitle = document.getElementById("dropModalTitle");
  const dropName = document.getElementById("dropName");
  const dropMeta = document.getElementById("dropMeta");
  const dropValueEl = document.getElementById("dropValue");
  const dropRarityBadge = document.getElementById("dropRarityBadge");
  const dropImgEl = document.getElementById("dropImg");
  const dropSingleView = document.getElementById("dropSingleView");
  const dropMultiView = document.getElementById("dropMultiView");
  const dropMultiList = document.getElementById("dropMultiList");
  const dropMultiSummary = document.getElementById("dropMultiSummary");
  const dropMultiTotal = document.getElementById("dropMultiTotal");
  const dropMultiBest = document.getElementById("dropMultiBest");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const sellDropBtn = document.getElementById("sellDropBtn");
  const openCostValue = document.getElementById("openCostValue");

  const views = Array.from(document.querySelectorAll(".view"));
  const navButtons = Array.from(document.querySelectorAll(".nav-btn[data-target]"));
  const moreNavBtn = document.getElementById("moreNavBtn");
  const moreNavMenu = document.getElementById("moreNavMenu");
  const moreNavTargets = new Set(["gallery", "top", "donate"]);

  function setMoreNavMenuOpen(open) {
    if (!moreNavBtn || !moreNavMenu) return;
    moreNavBtn.setAttribute("aria-expanded", open ? "true" : "false");
    moreNavMenu.setAttribute("aria-hidden", open ? "false" : "true");
    moreNavMenu.classList.toggle("open", open);
  }

  function switchView(target) {
    if (!target) return;
    views.forEach((view) => {
      view.classList.toggle("active", view.dataset.view === target);
    });
    navButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.target === target);
    });
    if (moreNavBtn) {
      moreNavBtn.classList.toggle("active", moreNavTargets.has(target));
    }
    if (!moreNavTargets.has(target)) {
      setMoreNavMenuOpen(false);
    }
    document.body.classList.toggle("modal-case-open", target === "case-preview");
  }

  function getPreviewedCase() {
    return state.cases.find((c) => c.id === currentPreviewedCaseId);
  }

  function updateOpenButtonsForCase(caseDetails = getPreviewedCase()) {
    const price = caseDetails ? Number(caseDetails.price || 0) : 0;
    const totalCost = price * selectedOpenMultiplier;

    if (openCostValue) {
      openCostValue.textContent = formatBC(totalCost);
    }

    openModeButtons.forEach((button) => {
      const priceEl = button.querySelector("[data-open-price]");
      if (priceEl) {
        priceEl.textContent = formatBC(totalCost);
      }
      button.classList.toggle("active", button.dataset.openMode === activeOpenMode);
    });
  }

  function setActiveMultiplierButton(multiplier) {
    multiplierButtons.forEach((btn) => {
      const btnValue = Number(btn.dataset.openMultiplier) || 1;
      btn.classList.toggle("active", btnValue === multiplier);
    });
  }

  function sellItem(invId, val) {
    const player = getCurrentPlayer(state);
    if (!player) return;
    const next = { ...state };
    const pIdx = next.players.findIndex(p => p.id === player.id);

    next.players[pIdx].inventory = next.players[pIdx].inventory.filter(i => i.id !== invId);
    next.players[pIdx].balance += Number(val);
    
    if (!next.players[pIdx].stats) next.players[pIdx].stats = { opened: 0 };
    next.players[pIdx].stats.itemsSold = (next.players[pIdx].stats.itemsSold || 0) + 1;
    next.players[pIdx].stats.valueSold = (next.players[pIdx].stats.valueSold || 0) + Number(val);

    next.galleryEntries = (next.galleryEntries || []).filter((entry) => !(entry.ownerId === player.id && entry.itemId === invId));

    state = next;
    saveState(state);
    renderAll();
    showToast(`Предмет продан за ${formatBC(val)}`);
  }

  function sellAllItems() {
    const player = getCurrentPlayer(state);
    if (!player || !player.inventory || !player.inventory.length) return;
    const next = { ...state };
    const pIdx = next.players.findIndex(p => p.id === player.id);

    let totalVal = 0;
    player.inventory.forEach(i => { totalVal += (Number(i.value) || 0); });
    
    next.players[pIdx].balance += totalVal;
    
    if (!next.players[pIdx].stats) next.players[pIdx].stats = { opened: 0 };
    next.players[pIdx].stats.itemsSold = (next.players[pIdx].stats.itemsSold || 0) + player.inventory.length;
    next.players[pIdx].stats.valueSold = (next.players[pIdx].stats.valueSold || 0) + totalVal;
    
    next.players[pIdx].inventory = [];
    next.galleryEntries = (next.galleryEntries || []).filter((entry) => entry.ownerId !== player.id);

    state = next;
    saveState(state);
    renderAll();
    showToast(`Все предметы проданы за ${formatBC(totalVal)}`);
  }

  function syncPlayerUI() {
    const player = getCurrentPlayer(state);
    if (!player) return;

    if (balanceValue) {
      balanceValue.textContent = Math.round(player.balance || 0).toLocaleString("ru-RU");
    }
    if (nickInput) {
      nickInput.value = player.nick || "";
    }
    if (serverInput) {
      serverInput.value = player.server || "";
    }

    const pNick = document.getElementById("profileNickDisplay");
    const pServer = document.getElementById("profileServerDisplay");
    if (pNick) {
      pNick.innerHTML = escapeHtml(player.nick || "User") + getBadgesHtml(player);
    }
    if (pServer) {
      pServer.textContent = player.server || "Server";
    }
    
    const pAvatar = document.getElementById("profileAvatar");
    if (pAvatar) {
      const photoUrl = (player.stats && player.stats.photo_url) ? player.stats.photo_url : "img/avatar_placeholder.png";
      pAvatar.style.backgroundImage = "url('" + photoUrl + "')";
    }

    const sInv = document.getElementById("statInvValue");
    const sItemsStr = document.getElementById("statItemsSold");
    const sValStr = document.getElementById("statValueSold");
    const sFav = document.getElementById("statFavCase");
    
    let totalInvValue = 0;
    const inventory = Array.isArray(player.inventory) ? player.inventory.slice().reverse() : [];
    inventory.forEach(i => totalInvValue += (Number(i.value) || 0));
    
    if (sInv) {
      sInv.textContent = formatBC(totalInvValue);
    }
    if (sItemsStr) {
      sItemsStr.textContent = (player.stats?.itemsSold || 0).toLocaleString("ru-RU");
    }
    if (sValStr) {
      sValStr.textContent = formatBC(player.stats?.valueSold || 0);
    }
    
    if (sFav) {
       let fav = "-";
       if (player.stats && player.stats.casesOpenedCount) {
         let max = 0;
         let bestCase = null;
         for (const [cId, count] of Object.entries(player.stats.casesOpenedCount)) {
            if (count > max) { max = count; bestCase = cId; }
         }
         if (bestCase) {
           const cObj = state.cases.find(c => c.id === bestCase);
           fav = cObj ? cObj.name : "Неизвестно";
         }
       }
       sFav.textContent = fav;
    }

    if (inventoryCount) {
      inventoryCount.textContent = `${inventory.length} предметов`;
    }

    renderBanBanner();
    renderBanControls();

    if (!inventoryList) {
      return;
    }

    if (!inventory.length) {
      inventoryList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #aaa; background: rgba(0,0,0,0.3); border-radius: 12px;">Инвентарь пуст</div>';
      return;
    }

    inventoryList.innerHTML = inventory
      .map((item) => {
        const rarity = (item.rarity || "gray").toLowerCase();
        const rarityClass = ["gray","green","blue","purple","red","pink","yellow","gold"].includes(rarity) ? rarity : "gray";

        return `
          <article class="inventory-card rarity-${rarityClass}">
            <div style="height: 50px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
              <img src="${item.image || 'img/standart_case.png'}" alt="" style="max-height: 100%; max-width: 100%; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.5));">
            </div>
            <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff;">${item.name}</div>
            <div style="font-size: 10px; color: #f1c40f; margin-bottom: 8px;">${formatBC(item.value || 0)}</div>
            <button class="btn btn-icon sell-item-btn" data-inv-id="${item.id}" data-value="${item.value || 0}" style="margin-top: auto; width: 100%; padding: 6px; font-size: 11px; background: rgba(231, 76, 60, 0.2); border: 1px solid #e74c3c; color: #e74c3c; border-radius: 6px;">Продать</button>
          </article>
        `;
      })
      .join("");

    const sellBtns = inventoryList.querySelectorAll('.sell-item-btn');
    sellBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
         const id = e.target.getAttribute('data-inv-id');
         const val = Number(e.target.getAttribute('data-value'));
         sellItem(id, val);
      });
    });
  }

  function renderCases() {
    const container = caseCategoriesContainer || casesGrid;
    if (!container) return;

    if (!state.cases.length) {
      container.innerHTML = '<p class="news-item">Кейсы не найдены. Добавьте их через admin.html</p>';
      return;
    }

    const categories = state.caseCategories || [];
    
    if (!categories.length) {
      // Fallback: если категорий нет, показываем все кейсы вместе
      container.innerHTML = state.cases
        .map((item) => {
          return `
            <article class="case-card" data-preview-case="${item.id}" style="cursor: pointer; transition: transform 0.2s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">
              <img class="case-image" src="${item.image || fallbackImage}" alt="${item.name}" loading="lazy" style="pointer-events: none;" />
              <div class="case-body" style="pointer-events: none;">
                <h3>${item.name}</h3>
                <p>Цена: <img src="img/symbols/bc.png" alt="BC" style="width: 16px; height: 16px; vertical-align: middle;"> ${formatBC(item.price)}</p>
              </div>
            </article>
          `;
        })
        .join("");
      return;
    }

    // Рендерим по категориям
    container.innerHTML = categories
      .map((category) => {
        const casesInCategory = state.cases.filter((caseItem) => caseItem.categoryId === category.id);
        
        if (!casesInCategory.length) return "";

        const casesHtml = casesInCategory
          .map((item) => {
            return `
              <article class="case-card" data-preview-case="${item.id}" style="cursor: pointer; transition: transform 0.2s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">
                <img class="case-image" src="${item.image || fallbackImage}" alt="${item.name}" loading="lazy" style="pointer-events: none;" />
                <div class="case-body" style="pointer-events: none;">
                  <h3>${item.name}</h3>
                  <p>Цена: <img src="img/symbols/bc.png" alt="BC" style="width: 16px; height: 16px; vertical-align: middle;"> ${formatBC(item.price)}</p>
                </div>
              </article>
            `;
          })
          .join("");

        return `
          <div class="case-category-section">
            <h4 class="case-category-title">${category.name}</h4>
            ${category.description ? `<p class="case-category-desc">${category.description}</p>` : ""}
            <div class="case-grid">${casesHtml}</div>
          </div>
        `;
      })
      .join("");
  }

  function renderNews() {
    const newsList = document.getElementById("newsList");
    if (!newsList) return;
    if (!state.news.length) {
      newsList.innerHTML = '<div style="color:rgba(255,255,255,0.3); padding:20px; text-align:center; font-size:13px;">Новостей пока нет</div>';
      return;
    }

    const TYPE_MAP = [
      { key: ['обновл', 'добавл', 'новый', 'новые', 'новых', 'версия'],  type: 'nc-update',  icon: '🔄', tag: 'Обновление' },
      { key: ['ивент', 'событи', 'турнир', 'конкурс', 'акци'],            type: 'nc-event',   icon: '🎉', tag: 'Ивент' },
      { key: ['приз', 'награда', 'топ', 'лидер', 'выдают', 'валют'],      type: 'nc-reward',  icon: '🏆', tag: 'Награды' },
      { key: ['внимани', 'важно', 'сбой', 'ошибк', 'технич'],             type: 'nc-alert',   icon: '⚠️', tag: 'Важно' },
    ];

    function detectType(text) {
      const lower = text.toLowerCase();
      for (const t of TYPE_MAP) {
        if (t.key.some(k => lower.includes(k))) return t;
      }
      return { type: 'nc-system', icon: '📢', tag: 'Система' };
    }

    // Fake relative dates for visual richness (newest = "Сегодня", others go back by 3d)
    const dateLabels = ['Сегодня', '3 дня назад', '1 неделю назад', '2 недели назад', 'Месяц назад'];

    newsList.innerHTML = state.news.map((text, i) => {
      const t = detectType(text);
      const date = dateLabels[Math.min(i, dateLabels.length - 1)];
      return `
        <div class="news-card ${t.type}">
          <div class="news-card-icon">${t.icon}</div>
          <div class="news-card-meta">
            <span class="news-card-tag">${t.tag}</span>
            <span class="news-card-dot"></span>
            <span class="news-card-date">${date}</span>
          </div>
          <div class="news-card-text">${escapeHtml(text)}</div>
        </div>`;
    }).join("");
  }

  function renderTop() {
    if (!topList) return;
    const allSorted = state.players
      .map((player) => ({ ...player, score: computeScore(player) }))
      .sort((a, b) => b.score - a.score);

    const players = allSorted.slice(0, 15);

    topList.innerHTML = players
      .map((player, idx) => {
        const rankClass = idx < 3 ? "rank top" : "rank";
        const photoUrl = (player.stats && player.stats.photo_url) ? player.stats.photo_url : "img/avatar_placeholder.png";

        let rewardText = "";
        if (idx === 0) rewardText = "<div style='font-size: 10px; color: #f1c40f; margin-top: 2px;'>Приз: 1.000.000 вирт</div>";
        if (idx === 1) rewardText = "<div style='font-size: 10px; color: #silver; margin-top: 2px;'>Приз: 750.000 вирт</div>";
        if (idx === 2) rewardText = "<div style='font-size: 10px; color: #cd7f32; margin-top: 2px;'>Приз: 500.000 вирт</div>";

        return `
          <article class="top-item" data-view-player="${player.id}" role="button" tabindex="0">
            <div class="inline">
              <div class="${rankClass}">${idx + 1}</div>
              <div style="width: 36px; height: 36px; border-radius: 50%; overflow: hidden; margin-right: 10px; border: 2px solid var(--primary, #f1c40f); flex-shrink: 0;">
                <img src="${photoUrl}" onerror="this.src='img/avatar_placeholder.png'" style="width: 100%; height: 100%; object-fit: cover; display: block;">
              </div>
              <div>
                <strong>${escapeHtml(player.nick)}${getBadgesHtml(player)}</strong>
                <p>${escapeHtml(player.server)}</p>
                ${rewardText}
              </div>
            </div>
            <strong title="Потрачено BC">${formatBC(player.score)}</strong>
          </article>
        `;
      })
      .join("");

    // Show current player's rank if they are outside top-25
    const myRankEl = document.getElementById("topMyRank");
    if (myRankEl) {
      const currentPlayer = getCurrentPlayer(state);
      if (!currentPlayer) { myRankEl.style.display = "none"; return; }
      const currentId = String(currentPlayer.id);
      const myIdx = allSorted.findIndex((p) => String(p.id) === currentId);
      if (myIdx === -1 || myIdx < 15) {
        myRankEl.style.display = "none";
      } else {
        const me = allSorted[myIdx];
        const photoUrl = (me.stats && me.stats.photo_url) ? me.stats.photo_url : "img/avatar_placeholder.png";
        myRankEl.style.display = "";
        myRankEl.innerHTML = `
          <div class="top-my-rank-label">Ваше место</div>
          <article class="top-item top-item-me" data-view-player="${me.id}" role="button" tabindex="0">
            <div class="inline">
              <div class="rank">${myIdx + 1}</div>
              <div style="width:36px;height:36px;border-radius:50%;overflow:hidden;margin-right:10px;border:2px solid var(--primary,#f1c40f);flex-shrink:0;">
                <img src="${photoUrl}" onerror="this.src='img/avatar_placeholder.png'" style="width:100%;height:100%;object-fit:cover;display:block;">
              </div>
              <div>
                <strong>${escapeHtml(me.nick)}${getBadgesHtml(me)}</strong>
                <p>${escapeHtml(me.server)}</p>
              </div>
            </div>
            <strong>${formatBC(me.score)}</strong>
          </article>`;
      }
    }
  }

  function getGalleryEntriesList() {
    if (!Array.isArray(state.galleryEntries)) {
      state.galleryEntries = [];
    }
    return state.galleryEntries;
  }

  function getEligibleGalleryItems(player, myEntries) {
    const postedIds = new Set(myEntries.map((entry) => entry.itemId));
    return (player.inventory || []).filter((item) => !postedIds.has(item.id));
  }

  function renderGallerySection() {
    if (!myGallerySlots) return;
    const player = getCurrentPlayer(state);
    if (!player) return;

    const entries = getGalleryEntriesList();
    const ownerEntries = entries.filter((entry) => entry.ownerId === player.id);
    const visibleEntries = ownerEntries.slice(0, 5);
    const placeholders = Math.max(0, 5 - visibleEntries.length);
    const usedSlots = Math.min(ownerEntries.length, 5);
    const freeSlots = Math.max(0, 5 - ownerEntries.length);

    const slotsHtml = [
      ...visibleEntries.map((entry) => {
        const rarity = rarityClass(entry.rarity || "gray");
        const custom = entry.custom || {};
        const inlineStyles = [];
        if (custom.bgValue) inlineStyles.push(`background: ${custom.bgValue}`);
        if (custom.glowValue) inlineStyles.push(`box-shadow: 0 0 28px ${custom.glowValue}, 0 20px 40px rgba(0,0,0,0.4)`);
        const styleAttr = inlineStyles.length ? ` style="${inlineStyles.join('; ')}"` : "";
        const titleStyle = custom.nameColorValue ? ` style="color: ${custom.nameColorValue}"` : "";
        const stickerHtml = custom.stickerValue ? `<span class="gallery-sticker">${escapeHtml(custom.stickerValue)}</span>` : "";
        const badgeHtml = custom.badge
          ? `<span class="gallery-rarity-pill gallery-custom-badge">${escapeHtml(custom.badge)}</span>`
          : `<span class="gallery-rarity-pill preview-rarity-pill rarity-${rarity}">${rarityLabel(entry.rarity)}</span>`;
        const captionHtml = custom.caption ? `<p class="gallery-slot-caption">${escapeHtml(custom.caption)}</p>` : "";

        return `
          <article class="gallery-slot rarity-${rarity}"${styleAttr}>
            ${stickerHtml}
            <div class="gallery-slot-badge-wrap">${badgeHtml}</div>
            <img src="${entry.image || fallbackImage}" alt="${entry.name}">
            <div class="slot-title"${titleStyle}>${escapeHtml(entry.name)}</div>
            ${captionHtml}
            <div class="slot-value">${formatBC(entry.value)}</div>
            <div class="slot-actions">
              <button class="btn btn-ghost" data-remove-entry="${entry.id}" type="button">Снять</button>
              <button class="slot-customize-btn" data-customize-entry="${entry.id}" type="button">✨ Оформить</button>
            </div>
          </article>
        `;
      }),
      ...Array.from({ length: placeholders }).map(() => `
          <article class="gallery-slot empty">
            Свободный слот<br>Выставите предмет
          </article>
        `)
    ].join("");

    myGallerySlots.innerHTML = slotsHtml;

    if (galleryMyCount) {
      galleryMyCount.textContent = `${usedSlots}/5`;
    }

    if (galleryHint) {
      galleryHint.textContent = ownerEntries.length >= 5
        ? "Лимит достигнут. Снимите предмет, чтобы добавить новый."
        : `Можно добавить еще ${freeSlots} предмет(а).`;
    }

    if (openGalleryModalBtn) {
      const availableItems = getEligibleGalleryItems(player, ownerEntries);
      const limitReached = ownerEntries.length >= 5;
      openGalleryModalBtn.disabled = limitReached || availableItems.length === 0;
      openGalleryModalBtn.textContent = limitReached ? "Лимит слотов" : "Выставить предмет";
    }

    renderGalleryFeedContent(entries, player);
  }

  // ===== АПГРЕЙД 2.0 / КОНТРАКТ 2.0 =====
  let upgradeTargetItem = null; // выбранный целевой предмет из allitems
  let isUpgradeAnimating = false;
  let isContractAnimating = false;
  let upgradePointerResetTimer = null;
  let upgradePointerAngle = 0;

  function scheduleUpgradePointerReset(delayMs = 2200) {
    if (upgradePointerResetTimer) {
      clearTimeout(upgradePointerResetTimer);
      upgradePointerResetTimer = null;
    }

    const runReset = (attempt = 0) => {
      if (isUpgradeAnimating) {
        upgradePointerResetTimer = setTimeout(() => runReset(attempt), 220);
        return;
      }

      const pointerEl = document.getElementById("upgPointer");
      const pointerWrapEl = document.querySelector(".upg2-circle-wrap");
      if (!pointerEl || !pointerWrapEl) {
        if (attempt < 8) {
          upgradePointerResetTimer = setTimeout(() => runReset(attempt + 1), 220);
          return;
        }
        upgradePointerAngle = 0;
        upgradePointerResetTimer = null;
        return;
      }

      const radius = (() => {
        const cssRadius = Number.parseFloat(getComputedStyle(pointerWrapEl).getPropertyValue("--upg-pointer-radius"));
        return Number.isFinite(cssRadius) ? cssRadius : 84;
      })();
      const toTransform = (angle) => `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px)`;

      let currentAngle = upgradePointerAngle;
      const computedTransform = getComputedStyle(pointerEl).transform;
      if (computedTransform && computedTransform !== "none") {
        try {
          const matrix = window.DOMMatrixReadOnly
            ? new DOMMatrixReadOnly(computedTransform)
            : new WebKitCSSMatrix(computedTransform);
          currentAngle = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
        } catch (e) {
          // Keep fallback angle from state if matrix parsing isn't available.
        }
      }

      if (pointerEl._upgSpinRaf) {
        cancelAnimationFrame(pointerEl._upgSpinRaf);
        pointerEl._upgSpinRaf = 0;
      }

      pointerEl.style.transition = "none";
      pointerEl.style.transform = toTransform(currentAngle);
      pointerEl.getBoundingClientRect();

      pointerEl.style.transition = "transform 960ms cubic-bezier(0.16, 0.84, 0.24, 1)";
      pointerEl.style.transform = toTransform(0);
      upgradePointerAngle = 0;

      upgradePointerResetTimer = setTimeout(() => {
        if (!isUpgradeAnimating) {
          pointerEl.style.transition = "none";
          pointerEl.style.transform = toTransform(0);
        }
        upgradePointerResetTimer = null;
      }, 1000);
    };

    upgradePointerResetTimer = setTimeout(() => runReset(0), delayMs);
  }

  function sanitizeLabSelections(player) {
    const invSet = new Set((player.inventory || []).map((item) => item.id));
    upgradeSelection = upgradeSelection.filter((id) => invSet.has(id));
    contractSelection = contractSelection
      .filter((id) => invSet.has(id))
      .filter((id) => !upgradeSelection.includes(id));
  }

  function labItemsFromSelection(selection, player) {
    return selection
      .map((id) => (player.inventory || []).find((item) => item.id === id))
      .filter(Boolean);
  }

  // Upgrade chance: linear ratio (input/target * 100)
  function calcUpgradeChance(inputValue, targetValue) {
    if (!targetValue || !inputValue) return 0;
    const chance = (Number(inputValue) / Number(targetValue)) * 100;
    return Math.max(0, Math.min(100, Math.round(chance)));
  }

  function calcContractStats(items) {
    const totalValue = items.reduce((sum, i) => sum + Number(i.value || 0), 0);
    return { totalValue, rangeMin: totalValue * 0.3, rangeMax: totalValue * 3.0 };
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  // Generate reward from real allitems.json for contract
  function generateContractReward(totalValue) {
    const minVal = totalValue * 0.3;
    const maxVal = totalValue * 3.0;
    const candidates = (window._allItemsCatalog || []).filter(
      (it) => Number(it.value) >= minVal && Number(it.value) <= maxVal
    );
    if (candidates.length) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      return {
        id: `ctr_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name: pick.name, rarity: pick.rarity || "green", value: Number(pick.value),
        image: pick.image || fallbackImage, type: pick.type || "",
        caseId: "lab_contract", caseName: "Контракт", droppedAt: Date.now()
      };
    }
    // fallback: generate generic
    const mult = randomRange(0.3, 3.0);
    const value = Math.max(50, Math.round(totalValue * mult));
    return {
      id: `ctr_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: "Контрактный трофей", rarity: value > 5000 ? "gold" : value > 2000 ? "purple" : value > 500 ? "blue" : "green",
      value, image: fallbackImage,
      caseId: "lab_contract", caseName: "Контракт", droppedAt: Date.now()
    };
  }

  function consumeInventoryItems(player, ids) {
    if (!Array.isArray(player.inventory) || !ids.length) return;
    const blacklist = new Set(ids);
    player.inventory = player.inventory.filter((item) => !blacklist.has(item.id));
  }

  // Ring helpers
  function setUpgradeRing(chance) {
    const fill = document.getElementById("upgradeRingFill");
    const pct = document.getElementById("upgradeChancePct");
    if (!fill || !pct) return;

    const circ = 2 * Math.PI * 90; // 565.487
    fill.style.strokeDasharray = circ;
    const drawn = (circ * chance) / 100;
    fill.style.strokeDashoffset = circ - drawn;
    pct.textContent = chance + "%";
  }

  // Helper to sort/filter inventory
  function filterAndSort(items, searchId, sortId) {
    const search = (document.getElementById(searchId)?.value || "").toLowerCase();
    const sort = document.getElementById(sortId)?.value || "value-desc";
    let filtered = items;
    if (search) {
      filtered = filtered.filter(i => (i.name || "").toLowerCase().includes(search));
    }
    if (sort === "value-desc") filtered.sort((a, b) => (b.value || 0) - (a.value || 0));
    else if (sort === "value-asc") filtered.sort((a, b) => (a.value || 0) - (b.value || 0));
    else if (sort === "name") filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return filtered;
  }

  function renderUpgradeView() {
    const player = getCurrentPlayer(state);
    if (!player) return;
    sanitizeLabSelections(player);
    const items = labItemsFromSelection(upgradeSelection, player);
    const inputValue = items.reduce((sum, i) => sum + Number(i.value || 0), 0);
    if (upgradeTargetItem && inputValue > 0 && Number(upgradeTargetItem.value || 0) < inputValue) {
      upgradeTargetItem = null;
    }
    const targetValue = upgradeTargetItem ? Number(upgradeTargetItem.value || 0) : 0;
    
    let addedBalance = 0;
    const slider = document.getElementById("upgBalanceSlider");
    const balAvailableEl = document.getElementById("upgBalanceAvailable");
    const balAddEl = document.getElementById("upgBalanceAdd");
    
    if (slider && balAvailableEl && balAddEl) {
      const currentBalance = player.balance || 0;
      balAvailableEl.textContent = formatBC(currentBalance);
      
      if (items.length === 0 || !upgradeTargetItem) {
        slider.value = 0;
        slider.max = 0;
        slider.disabled = true;
        addedBalance = 0;
      } else {
        slider.disabled = false;
        // Max useful balance now targets 100% chance
        let maxUseful = Math.ceil(targetValue - inputValue);
        if (maxUseful < 0) maxUseful = 0;
        
        slider.max = Math.min(currentBalance, maxUseful);
        addedBalance = Number(slider.value) || 0;
        if (addedBalance > slider.max) {
           addedBalance = Number(slider.max);
           slider.value = addedBalance;
        }
      }
      balAddEl.textContent = formatBC(addedBalance);
    }
    
    const totalInput = inputValue + addedBalance;
    const chance = calcUpgradeChance(totalInput, targetValue);

    // Ring
    setUpgradeRing(chance);

    // Sum display
    const sumEl = document.getElementById("upgSumValue");
    if (sumEl) sumEl.textContent = formatBC(totalInput);

    // Slots (only 1 now)
    if (labUpgradeSlots) {
      const filled = items.map((item) => {
        const r = rarityClass(item.rarity || "gray");
        return `<div class="upg2-slot filled rarity-${r}">
          <button class="upg2-slot-remove" data-remove-upgrade="${item.id}" type="button">✕</button>
          <img class="slot-img" src="${item.image || fallbackImage}" alt="">
          <span class="slot-name">${escapeHtml(item.name)}</span>
          <span class="slot-val">${formatBC(item.value || 0)}</span>
        </div>`;
      }).join("");
      const remaining = Math.max(0, 1 - items.length);
      const empty = Array.from({ length: remaining }).map(() =>
        '<div class="upg2-slot empty"><span class="slot-empty-text">+</span></div>'
      ).join("");
      labUpgradeSlots.innerHTML = filled + empty;
    }

    // Target box
    const tgtEmpty = document.getElementById("upgTargetEmpty");
    const tgtFilled = document.getElementById("upgTargetFilled");
    if (tgtEmpty && tgtFilled) {
      if (upgradeTargetItem) {
        tgtEmpty.style.display = "none";
        tgtFilled.style.display = "flex";
        document.getElementById("upgTargetImg").src = upgradeTargetItem.image || fallbackImage;
        document.getElementById("upgTargetName").textContent = upgradeTargetItem.name;
        document.getElementById("upgTargetVal").textContent = formatBC(upgradeTargetItem.value || 0);
      } else {
        tgtEmpty.style.display = "flex";
        tgtFilled.style.display = "none";
      }
    }

    // Stats
    if (labUpgradeStats) {
      labUpgradeStats.innerHTML = `
        <div class="upg2-stat-chip"><span class="stat-label">Предметов</span><span class="stat-value">${items.length}/1</span></div>
        <div class="upg2-stat-chip"><span class="stat-label">Ставка</span><span class="stat-value">${formatBC(totalInput)}</span></div>
        <div class="upg2-stat-chip"><span class="stat-label">Шанс</span><span class="stat-value">${chance}%</span></div>
        ${upgradeTargetItem ? `<div class="upg2-stat-chip"><span class="stat-label">Цель</span><span class="stat-value">${formatBC(targetValue)}</span></div>` : ""}
      `;
    }

    if (launchUpgradeBtn) launchUpgradeBtn.disabled = items.length === 0 || !upgradeTargetItem || isUpgradeAnimating;

    // Inventory
    const inv = document.getElementById("labUpgradeInventory");
    if (inv) {
      const inventory = filterAndSort(
        (player.inventory || []).slice(),
        "upgInvSearch", "upgInvSort"
      );
      if (!inventory.length) {
        inv.innerHTML = '<div class="upg2-inv-empty">Инвентарь пуст — откройте кейсы!</div>';
      } else {
        inv.innerHTML = inventory.map((item) => {
          const r = rarityClass(item.rarity || "gray");
          const sel = upgradeSelection.includes(item.id);
          const inContract = contractSelection.includes(item.id);
          if (inContract) return `<div class="upg2-inv-card" style="opacity:0.3;pointer-events:none"><img src="${item.image || fallbackImage}"><span class="inv-name">${escapeHtml(item.name)}</span><span class="inv-val">в контракте</span></div>`;
          return `<div class="upg2-inv-card ${sel ? 'selected' : ''} rarity-${r}" data-upg-item="${item.id}">
            <img src="${item.image || fallbackImage}">
            <span class="inv-name">${escapeHtml(item.name)}</span>
            <span class="inv-val">${formatBC(item.value || 0)}</span>
          </div>`;
        }).join("");
      }
    }

    // Safety: if pointer angle remains non-zero while idle, schedule return.
    if (!isUpgradeAnimating && Math.abs(upgradePointerAngle) > 0.01 && !upgradePointerResetTimer) {
      scheduleUpgradePointerReset(1200);
    }
  }

  function renderUpgradeTargetPicker() {
    const grid = document.getElementById("upgTargetGrid");
    if (!grid) return;
    const player = getCurrentPlayer(state);
    const catalog = window._allItemsCatalog || [];
    const search = (document.getElementById("upgTargetSearch")?.value || "").toLowerCase();
    const sort = document.getElementById("upgTargetSort")?.value || "value-desc";
    const categoryF = document.getElementById("upgTargetRarity")?.value || "";
    const minAllowedValue = player
      ? labItemsFromSelection(upgradeSelection, player).reduce((sum, i) => sum + Number(i.value || 0), 0)
      : 0;

    let items = catalog.map((it, idx) => ({ ...it, _idx: idx, value: Number(it.value || 0) }));
    if (search) items = items.filter(i => (i.name || "").toLowerCase().includes(search));
    if (minAllowedValue > 0) items = items.filter(i => i.value >= minAllowedValue);
    
    // Process Category filtering (car, skin, acc)
    if (categoryF) {
      items = items.filter(i => {
        const type = (i.type || "").toLowerCase();
        if (categoryF === "car" && type.includes("car")) return true;
        if (categoryF === "skin" && type.includes("skin")) return true;
        if (categoryF === "acc" && type.includes("acc")) return true;
        return false;
      });
    }

    if (sort === "value-desc") items.sort((a, b) => b.value - a.value);
    else if (sort === "value-asc") items.sort((a, b) => a.value - b.value);
    else if (sort === "name") items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    // Show max 100
    items = items.slice(0, 100);
    if (!items.length) {
      grid.innerHTML = `<div class="upg2-inv-empty">Нет целей дороже вашей ставки (${formatBC(minAllowedValue)}).</div>`;
      return;
    }

    const selected = upgradeTargetItem;
    grid.innerHTML = items.map((it) => {
      const r = rarityClass(it.rarity || "gray");
      const isSel = selected && selected.name === it.name && Number(selected.value) === it.value;
      return `<div class="upg2-target-item ${isSel ? 'selected' : ''} rarity-${r}" data-tgt-idx="${it._idx}">
        <img src="${it.image || fallbackImage}">
        <span class="tgt-name">${escapeHtml(it.name)}</span>
        <span class="tgt-val">${formatBC(it.value)}</span>
      </div>`;
    }).join("");
  }

  function renderContractView() {
    const player = getCurrentPlayer(state);
    if (!player) return;
    sanitizeLabSelections(player);
    const items = labItemsFromSelection(contractSelection, player);
    const stats = calcContractStats(items);

    // Slots — 2 rows of 5
    if (labContractSlots) {
      const filled = items.map((item) => {
        const r = rarityClass(item.rarity || "gray");
        return `<div class="ctr2-slot filled rarity-${r}">
          <button class="ctr2-slot-remove" data-remove-contract="${item.id}" type="button">✕</button>
          <img class="slot-img" src="${item.image || fallbackImage}" alt="">
          <span class="slot-name">${escapeHtml(item.name)}</span>
          <span class="slot-val">${formatBC(item.value || 0)}</span>
        </div>`;
      }).join("");
      const remaining = Math.max(0, 10 - items.length);
      const empty = Array.from({ length: remaining }).map(() =>
        '<div class="ctr2-slot empty"><span class="slot-empty-text">+</span></div>'
      ).join("");
      labContractSlots.innerHTML = filled + empty;
    }

    // Counter text
    const ctrCounter = document.getElementById("ctrCounter");
    if (ctrCounter) {
      const need = Math.max(0, 3 - items.length);
      ctrCounter.innerHTML = isContractAnimating
        ? `Контракт выполняется... <strong>подпись и проверка</strong>`
        : items.length >= 3
        ? `Выбрано <strong>${items.length}</strong>/10 предметов`
        : `Положите ещё минимум <strong>${need}</strong> предмет${need === 1 ? '' : need < 5 ? 'а' : 'ов'}`;
    }

    // Sum
    const sumEl = document.getElementById("ctrSumValue");
    if (sumEl) sumEl.textContent = formatBC(stats.totalValue);

    // Range
    const minEl = document.getElementById("ctrRangeMin");
    const maxEl = document.getElementById("ctrRangeMax");
    if (minEl) minEl.textContent = formatBC(Math.round(stats.rangeMin || 0));
    if (maxEl) maxEl.textContent = formatBC(Math.round(stats.rangeMax || 0));

    const targetLabel = document.getElementById("ctrTargetLabel");
    if (targetLabel) {
      targetLabel.textContent = isContractAnimating ? "ПОДПИСЫВАЕМ..." : "СЛУЧАЙНАЯ 0.3x-3x";
    }

    const contractPage = document.querySelector(".ctr2-page");
    if (contractPage) contractPage.classList.toggle("animating", isContractAnimating);

    if (launchContractBtn) launchContractBtn.disabled = items.length < 3 || isContractAnimating;
    if (launchContractBtn) {
      launchContractBtn.innerHTML = isContractAnimating
        ? '<span class="ctr2-sign-spark"></span>ПОДПИСЫВАЕМ...'
        : '<span class="ctr2-sign-spark"></span>ПОДПИСАТЬ!';
    }

    // Inventory
    const inv = document.getElementById("labContractInventory");
    if (inv) {
      const inventory = filterAndSort(
        (player.inventory || []).slice(),
        "ctrInvSearch", "ctrInvSort"
      );
      if (!inventory.length) {
        inv.innerHTML = '<div class="ctr2-inv-empty">Инвентарь пуст — откройте кейсы!</div>';
      } else {
        inv.innerHTML = inventory.map((item) => {
          const r = rarityClass(item.rarity || "gray");
          const sel = contractSelection.includes(item.id);
          const inUpgrade = upgradeSelection.includes(item.id);
          if (inUpgrade) return `<div class="ctr2-inv-card" style="opacity:0.3;pointer-events:none"><img src="${item.image || fallbackImage}"><span class="inv-name">${escapeHtml(item.name)}</span><span class="inv-val">в апгрейде</span></div>`;
          return `<div class="ctr2-inv-card ${sel ? 'selected' : ''} rarity-${r}" data-ctr-item="${item.id}">
            <img src="${item.image || fallbackImage}">
            <span class="inv-name">${escapeHtml(item.name)}</span>
            <span class="inv-val">${formatBC(item.value || 0)}</span>
          </div>`;
        }).join("");
      }
    }
  }

  function renderLabView() {
    renderUpgradeView();
    renderContractView();
  }

  function addItemToUpgrade(itemId) {
    const player = getCurrentPlayer(state);
    if (!player || isUpgradeAnimating) return;
    sanitizeLabSelections(player);
    if (upgradeSelection.includes(itemId)) {
      upgradeSelection = upgradeSelection.filter((id) => id !== itemId);
      renderUpgradeView();
      return;
    }
    // Limit to 1 item - overwrite if already selected
    if (!(player.inventory || []).some((item) => item.id === itemId)) return;
    contractSelection = contractSelection.filter((id) => id !== itemId);
    upgradeSelection = [itemId];
    renderUpgradeView();
  }

  function addItemToContract(itemId) {
    const player = getCurrentPlayer(state);
    if (!player || isContractAnimating) return;
    sanitizeLabSelections(player);
    if (contractSelection.includes(itemId)) {
      contractSelection = contractSelection.filter((id) => id !== itemId);
      renderContractView();
      return;
    }
    if (contractSelection.length >= 10) { showToast("Максимум 10 предметов", "warning"); return; }
    if (!(player.inventory || []).some((item) => item.id === itemId)) return;
    upgradeSelection = upgradeSelection.filter((id) => id !== itemId);
    contractSelection.push(itemId);
    renderContractView();
  }

  function removeFromUpgrade(itemId) {
    if (isUpgradeAnimating) return;
    upgradeSelection = upgradeSelection.filter((id) => id !== itemId);
    renderUpgradeView();
  }

  function removeFromContract(itemId) {
    if (isContractAnimating) return;
    contractSelection = contractSelection.filter((id) => id !== itemId);
    renderContractView();
  }

  function runLabUpgrade() {
    const player = getCurrentPlayer(state);
    if (!player || isUpgradeAnimating) return;
    if (player.banned) {
      showToast("Игрок заблокирован, апгрейд недоступен", "error");
      return;
    }
    sanitizeLabSelections(player);
    const items = labItemsFromSelection(upgradeSelection, player);
    if (!items.length) { showToast("Добавьте предмет", "warning"); return; }
    if (!upgradeTargetItem) { showToast("Выберите целевой предмет", "warning"); return; }

    const inputValue = items.reduce((sum, i) => sum + Number(i.value || 0), 0);
    const targetValue = Number(upgradeTargetItem.value || 0);
    
    // Process balance addition
    const slider = document.getElementById("upgBalanceSlider");
    const addedBalance = slider ? (Number(slider.value) || 0) : 0;
    if (addedBalance > player.balance) {
      showToast("Недостаточно средств", "error");
      return;
    }
    
    const totalInput = inputValue + addedBalance;
    const chance = calcUpgradeChance(totalInput, targetValue);
    const success = Math.random() * 100 <= chance;
    
    player.balance -= addedBalance; // deduct BC
    player.totalSpent = Math.max(0, Number(player.totalSpent || 0) + inputValue + addedBalance); // Учет трат в апгрейде: стоимость предметов + добавленный баланс

    // Calculate landing angle for the pointer.
    // We compute a target absolute angle first, then convert it to a delta from current pointer angle.
    const extraTurns = 4 + Math.floor(Math.random() * 2); // 4..5 turns to keep speed controlled
    const fullCircles = 360 * extraTurns;
    const greenZoneEnd = chance / 100 * 360;
    const normalizeAngle = (a) => ((a % 360) + 360) % 360;
    const startAngleNorm = normalizeAngle(upgradePointerAngle);
    const safeWinEnd = Math.max(0, Math.min(360, greenZoneEnd));

    let targetAngleNorm;
    if (success) {
      const winMin = 0;
      const winMax = Math.max(winMin, safeWinEnd - 2);
      targetAngleNorm = winMax > winMin ? winMin + Math.random() * (winMax - winMin) : safeWinEnd * 0.5;
    } else {
      const hasNearMiss = Math.random() < 0.65 && safeWinEnd < 356;
      if (hasNearMiss) {
        // On part of failed upgrades, stop right after the win-zone border to create tension.
        const nearMissOffset = 1 + Math.random() * Math.min(18, 360 - safeWinEnd - 1);
        targetAngleNorm = Math.min(359.5, safeWinEnd + nearMissOffset);
      } else {
        const loseStart = Math.min(359, Math.max(4, safeWinEnd + 2));
        const loseSpan = Math.max(1, 360 - loseStart - 0.5);
        targetAngleNorm = loseStart + Math.random() * loseSpan;
      }
    }
    const deltaToTarget = (targetAngleNorm - startAngleNorm + 360) % 360;
    const landingAngle = fullCircles + deltaToTarget;
    const spinDuration = 5600 + Math.floor(Math.random() * 1200); // 5.6..6.8s

    // Start animation
    isUpgradeAnimating = true;
    launchUpgradeBtn.disabled = true;
    const circleOuter = document.querySelector(".upg2-circle-outer");
    const pointer = document.getElementById("upgPointer");
    const pointerWrap = document.querySelector(".upg2-circle-wrap");
    const pointerRadius = (() => {
      if (!pointerWrap) return 84;
      const cssRadius = Number.parseFloat(getComputedStyle(pointerWrap).getPropertyValue("--upg-pointer-radius"));
      return Number.isFinite(cssRadius) ? cssRadius : 84;
    })();
    const pointerTransform = (angle) => `translate(-50%, -50%) rotate(${angle}deg) translateY(-${pointerRadius}px)`;
    if (upgradePointerResetTimer) {
      clearTimeout(upgradePointerResetTimer);
      upgradePointerResetTimer = null;
    }
    
    if (circleOuter) {
      circleOuter.classList.remove("result-win", "result-lose");
      // we remove the old "spinning" class that span the whole circle, and instead spin the pointer
    }
    if (pointer) {
      const easeInOutCubic = (t) => (
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      );
      const heavyInertiaEase = (t) => Math.pow(easeInOutCubic(t), 1.45);

      if (pointer._upgSpinRaf) {
        cancelAnimationFrame(pointer._upgSpinRaf);
        pointer._upgSpinRaf = 0;
      }

      const startAngle = upgradePointerAngle;
      const finalAngle = startAngle + landingAngle;
      pointer.style.transition = "none";
      pointer.style.transform = pointerTransform(startAngle);
      pointer.getBoundingClientRect();

      const startedAt = performance.now();
      const tick = (now) => {
        const elapsed = Math.max(0, now - startedAt);
        const normalized = Math.min(1, elapsed / spinDuration);
        const progress = heavyInertiaEase(normalized);
        const currentAngle = startAngle + landingAngle * progress;
        pointer.style.transform = pointerTransform(currentAngle);

        if (normalized < 1 && isUpgradeAnimating) {
          pointer._upgSpinRaf = requestAnimationFrame(tick);
        } else {
          pointer.style.transform = pointerTransform(finalAngle);
          upgradePointerAngle = ((finalAngle % 360) + 360) % 360;
          pointer._upgSpinRaf = 0;
        }
      };

      pointer._upgSpinRaf = requestAnimationFrame(tick);
    }

    setTimeout(() => {
      if (circleOuter) circleOuter.classList.remove("spinning");
      consumeInventoryItems(player, upgradeSelection);
      upgradeSelection = [];

      if (success) {
        const reward = {
          id: `upg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          name: upgradeTargetItem.name,
          rarity: upgradeTargetItem.rarity || "green",
          value: targetValue,
          image: upgradeTargetItem.image || fallbackImage,
          type: upgradeTargetItem.type || "",
          caseId: "lab_upgrade", caseName: "Апгрейд", droppedAt: Date.now()
        };
        player.inventory = player.inventory || [];
        player.inventory.push(reward);
        
        if (typeof LiveDrop !== "undefined" && LiveDrop.push) {
          LiveDrop.push(player.nick || "Игрок", reward.name, reward.rarity || "common", reward.value || 0, reward.image || fallbackImage);
        }
        
        if (circleOuter) circleOuter.classList.add("result-win");
        const profitLoss = targetValue - totalInput;
        const profitText = profitLoss > 0 ? `+${formatBC(profitLoss)} прибыль` : profitLoss < 0 ? `${formatBC(Math.abs(profitLoss))} убыток` : "без изменений";
        showToast(`✨ УСПЕХ! ${reward.name} • ${profitText}`, "success");
      } else {
        if (circleOuter) circleOuter.classList.add("result-lose");
        showToast(`💥 ПРОВАЛ! Потеря: ${formatBC(totalInput)}`, "error");
      }

      isUpgradeAnimating = false;
      saveState(state);
      scheduleUpgradePointerReset(2200);
      try {
        renderAll();
      } catch (e) {
        console.error("[Upgrade] renderAll failed after spin:", e);
      }
      
    }, spinDuration + 120);
  }

  function runLabContract() {
    const player = getCurrentPlayer(state);
    if (!player || isContractAnimating) return;
    if (player.banned) {
      showToast("Игрок заблокирован, контракт недоступен", "error");
      return;
    }
    sanitizeLabSelections(player);
    const items = labItemsFromSelection(contractSelection, player);
    if (items.length < 3) { showToast("Нужно минимум 3 предмета", "warning"); return; }
    const stats = calcContractStats(items);
    
    player.totalSpent = Math.max(0, Number(player.totalSpent || 0) + stats.totalValue); // Учет трат в контракте: сумма всех выброшенных предметов

    isContractAnimating = true;
    renderContractView();

    const contractDuration = 2300;
    setTimeout(() => {
      consumeInventoryItems(player, contractSelection);
      contractSelection = [];
      const reward = generateContractReward(stats.totalValue);
      const profitLoss = reward.value - stats.totalValue;
      player.inventory = player.inventory || [];
      player.inventory.push(reward);
      isContractAnimating = false;
      saveState(state);
      try {
        renderAll();
      } catch (e) {
        console.error("[Contract] renderAll failed after contract:", e);
      }
      openDropModalFromItems([reward], {
        title: "Контракт выполнен",
        singleMeta: "Награда по контракту",
      });
      // Показываем уведомление
      const profitText = profitLoss > 0 ? `+${formatBC(profitLoss)}` : profitLoss < 0 ? `${formatBC(Math.abs(profitLoss))}` : "0";
      const profitEmoji = profitLoss > 0 ? "📈" : profitLoss < 0 ? "📉" : "➡️";
      showToast(`🎁 ВЫИГРЫШ! ${reward.name} • ${profitEmoji} ${profitText}`, "success");
    }, contractDuration);
  }

  // --- Stats bar (online + total cases) ---
  function renderHomeStats() {
    const onlineEl = document.getElementById("statOnline");
    const totalEl = document.getElementById("statTotalCases");
    if (!onlineEl || !totalEl) return;
    // Simulated online = base + random jitter
    const base = Math.max(1, (state.players || []).length);
    const online = base + Math.floor(Math.random() * 15) + 3;
    onlineEl.textContent = online.toLocaleString("ru-RU");
    // Total cases opened across all players
    let total = 0;
    for (const p of (state.players || [])) {
      total += (p.stats && p.stats.opened) || 0;
    }
    totalEl.textContent = total.toLocaleString("ru-RU");
  }

  function renderGalleryFeedContent(entries, player) {
    if (!galleryFeed) return;
    if (!entries.length) {
      galleryFeed.innerHTML = '<div class="gallery-empty">Пока никто не выставил предметы. Будьте первым!</div>';
      renderGalleryPagination(0);
      galleryPage = 1;
      return;
    }

    const sorted = entries
      .slice()
      .sort((a, b) => {
        const now = Date.now();
        const aP = (a.custom && a.custom.promoted && a.custom.promotedUntil > now) ? 1 : 0;
        const bP = (b.custom && b.custom.promoted && b.custom.promotedUntil > now) ? 1 : 0;
        if (bP !== aP) return bP - aP;
        return (b.likes || 0) - (a.likes || 0) || (b.createdAt || 0) - (a.createdAt || 0);
      });

    const totalPages = Math.max(1, Math.ceil(sorted.length / GALLERY_PAGE_SIZE));
    galleryPage = Math.min(Math.max(1, galleryPage), totalPages);
    const start = (galleryPage - 1) * GALLERY_PAGE_SIZE;
    const visibleEntries = sorted.slice(start, start + GALLERY_PAGE_SIZE);

    galleryFeed.innerHTML = visibleEntries
      .map((entry) => {
        const owner = state.players.find((p) => p.id === entry.ownerId);
        const rarity = rarityClass(entry.rarity || "gray");
        const liked = Array.isArray(entry.likedBy) && entry.likedBy.includes(player.id);
        const isOwner = owner && owner.id === player.id;
        const ownerNick = owner ? owner.nick : "Игрок";
        const ownerServer = owner ? owner.server : "Black Russia";
        const ownerBadgesHtml = owner ? getBadgesHtml(owner) : "";

        // Кастомизация
        const custom = entry.custom || {};
        const now = Date.now();
        const isPromoted = custom.promoted && custom.promotedUntil > now;
        const inlineParts = [];
        if (custom.bgValue)   inlineParts.push(`background: ${custom.bgValue}`);
        if (custom.glowValue) inlineParts.push(`box-shadow: 0 0 28px ${custom.glowValue}, 0 22px 36px rgba(0,0,0,0.55)`);
        const styleAttr = inlineParts.length ? ` style="${inlineParts.join("; ")}"` : "";
        const promotedClass = isPromoted ? "is-promoted" : "";
        const promotedBadge = isPromoted ? `<span class="gallery-promoted-badge">🔝 ТОП</span>` : "";
        const stickerEmoji = custom.stickerValue || (custom.sticker ? (GALLERY_STICKER_PRESETS.find((x) => x.id === custom.sticker) || {}).value : null);
        const stickerHtml = stickerEmoji ? `<span class="gallery-sticker">${stickerEmoji}</span>` : "";
        const badgeHtml = custom.badge
          ? `<span class="gallery-rarity-pill gallery-custom-badge">${escapeHtml(custom.badge)}</span>`
          : `<span class="gallery-rarity-pill preview-rarity-pill rarity-${rarity}">${rarityLabel(entry.rarity)}</span>`;
        const nameStyle = custom.nameColorValue ? ` style="color: ${custom.nameColorValue}"` : "";
        const captionHtml = custom.caption
          ? `<p class="gallery-custom-caption">${escapeHtml(custom.caption)}</p>`
          : "";

        return `
          <article class="gallery-card rarity-${rarity} ${promotedClass}"${styleAttr} data-view-entry="${entry.id}">
            ${promotedBadge}
            ${stickerHtml}
            <div class="gallery-card-img-wrap">
              ${badgeHtml}
              <img src="${entry.image || fallbackImage}" alt="${escapeHtml(entry.name)}">
            </div>
            <div class="gallery-card-bottom">
              <div class="gallery-owner-row">
                <div class="gallery-owner-avatar">👤</div>
                <div class="gallery-owner-info">
                  <span class="gallery-owner-nick">${escapeHtml(ownerNick)}${ownerBadgesHtml}</span>
                  <span class="gallery-owner-server">${escapeHtml(ownerServer)}</span>
                </div>
              </div>
              <hr class="gallery-card-divider">
              <p class="gallery-item-name"${nameStyle}>${escapeHtml(entry.name)}</p>
              ${captionHtml}
              <div class="gallery-item-meta">
                <span class="gallery-item-price">${formatBC(entry.value)}</span>
                <button class="gallery-like-btn ${liked ? "is-liked" : ""}" data-like-entry="${entry.id}" type="button" ${isOwner ? "disabled" : ""}>
                  <span>${liked ? "❤" : "♡"}</span>
                  <strong>${entry.likes || 0}</strong>
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    renderGalleryPagination(totalPages);
  }

  function renderGalleryPagination(totalPages) {
    if (!galleryPagination) return;
    if (!totalPages || totalPages <= 1) {
      galleryPagination.innerHTML = "";
      galleryPagination.classList.add("is-hidden");
      return;
    }
    galleryPagination.classList.remove("is-hidden");
    galleryPagination.innerHTML = Array.from({ length: totalPages }).map((_, idx) => {
      const pageNumber = idx + 1;
      const isActive = pageNumber === galleryPage;
      return `<button class="gallery-page-btn ${isActive ? "active" : ""}" data-gallery-page="${pageNumber}">&gt;${pageNumber}</button>`;
    }).join("");
  }

  function openGalleryModal() {
    if (!galleryModal) return;
    const player = getCurrentPlayer(state);
    if (!player) return;
    const myEntries = getGalleryEntriesList().filter((entry) => entry.ownerId === player.id);
    const availableItems = getEligibleGalleryItems(player, myEntries);
    renderGalleryInventorySelection(availableItems);
    galleryModal.classList.add("open");
    galleryModal.setAttribute("aria-hidden", "false");
  }

  function closeGalleryModal() {
    if (!galleryModal) return;
    galleryModal.classList.remove("open");
    galleryModal.setAttribute("aria-hidden", "true");
  }

  // ===== КАСТОМИЗАЦИЯ ЛОТОВ =====

  function openCustomizeModal(entryId) {
    if (!customizeModal) return;
    const player = getCurrentPlayer(state);
    if (!player) return;
    const entry = getGalleryEntriesList().find((e) => e.id === entryId && e.ownerId === player.id);
    if (!entry) { showToast("Лот не найден", "error"); return; }
    customizeEntryId = entryId;
    renderCustomizeModal(entry, player);
    customizeModal.inert = false;
    customizeModal.classList.add("open");
    customizeModal.setAttribute("aria-hidden", "false");
    if (closeCustomizeModalBtn) closeCustomizeModalBtn.focus();
  }

  function closeCustomizeModal() {
    if (!customizeModal) return;
    const activeInside = document.activeElement && customizeModal.contains(document.activeElement);
    if (activeInside) {
      if (openGalleryModalBtn) {
        openGalleryModalBtn.focus();
      } else {
        const body = document.body;
        const prevTabIndex = body.getAttribute('tabindex');
        if (!body.hasAttribute('tabindex')) body.setAttribute('tabindex', '-1');
        body.focus();
        if (prevTabIndex === null) body.removeAttribute('tabindex');
      }
    }
    customizeModal.classList.remove("open");
    customizeModal.setAttribute("aria-hidden", "true");
    customizeModal.inert = true;
    customizeEntryId = null;
  }

  function renderCustomizeModal(entry, player) {
    const container = document.getElementById("customizeOptionsContainer");
    if (!container) return;

    const custom = entry.custom || {};
    const unlocked = Array.isArray(custom.unlocked) ? custom.unlocked : [];

    const balEl = document.getElementById("customizeBalance");
    if (balEl) balEl.textContent = formatBC(Math.round(player.balance || 0));
    const nameEl = document.getElementById("customizeEntryName");
    if (nameEl) nameEl.textContent = entry.name;

    const isOpen = (key) => unlocked.includes(key);
    const costLabel = (key) => isOpen(key) ? "🆓 Разблок." : formatBC(GALLERY_CUSTOMIZE_COSTS[key]);

    // Пресет-кнопки для цветовых / иконочных опций
    const mkPresets = (optionKey, currentId, presets, isColorDot) => {
      const cost = isOpen(optionKey) ? 0 : GALLERY_CUSTOMIZE_COSTS[optionKey];
      const btns = presets.map((p) => {
        const style = isColorDot ? `style="background:${p.color};"` : (p.value && p.value.includes("gradient") ? `style="background:${p.value};"` : "");
        const cls = isColorDot ? "customize-preset-color" : "customize-preset-btn";
        return `<button class="${cls} ${currentId === p.id ? "is-active" : ""}"
          ${style}
          data-cust-option="${optionKey}" data-cust-value="${p.id}" data-cust-cost="${cost}"
          title="${p.label}">${isColorDot ? "" : (p.emoji || p.value || "")}</button>`;
      }).join("");
      const resetBtn = currentId
        ? `<button class="customize-preset-btn customize-preset-reset"
            data-cust-option="${optionKey}" data-cust-value="" data-cust-cost="0" title="Сбросить">✕</button>`
        : "";
      const note = isOpen(optionKey)
        ? `<p class="customize-unlock-note is-free">✓ Разблокировано — смена бесплатна</p>`
        : `<p class="customize-unlock-note">💰 ${formatBC(GALLERY_CUSTOMIZE_COSTS[optionKey])} — после оплаты менять бесплатно</p>`;
      return `<div class="customize-presets">${btns}${resetBtn}</div>${note}`;
    };

    const mkText = (optionKey, currentVal, maxLen, placeholder) => {
      const cost = isOpen(optionKey) ? 0 : GALLERY_CUSTOMIZE_COSTS[optionKey];
      const resetBtn = currentVal
        ? `<button class="btn btn-ghost customize-text-reset"
            data-cust-option="${optionKey}" data-cust-value="" data-cust-cost="0">Удалить</button>`
        : "";
      const note = isOpen(optionKey)
        ? `<p class="customize-unlock-note is-free">✓ Разблокировано — смена бесплатна</p>`
        : `<p class="customize-unlock-note">💰 ${formatBC(GALLERY_CUSTOMIZE_COSTS[optionKey])} — после оплаты менять бесплатно</p>`;
      const btnLabel = isOpen(optionKey) ? "Изменить" : `Купить · ${formatBC(cost)}`;
      return `
        <div class="customize-text-row">
          <input id="custInput_${optionKey}" class="customize-text-input" type="text"
            placeholder="${escapeHtml(placeholder)}" maxlength="${maxLen}"
            value="${escapeHtml(currentVal || "")}">
          <button class="btn btn-primary customize-text-apply"
            data-cust-apply="${optionKey}" data-cust-cost="${cost}">${btnLabel}</button>
        </div>
        ${resetBtn}
        ${note}`;
    };

    const now = Date.now();
    const isPromoted = custom.promoted && custom.promotedUntil > now;
    const remainMin = isPromoted ? Math.ceil((custom.promotedUntil - now) / 60000) : 0;

    container.innerHTML = `
      <div class="customize-option">
        <div class="customize-option-header">
          <span class="co-icon">🎨</span>
          <div class="co-info"><strong>Фон карточки</strong><p>7 тёмных градиентных пресетов</p></div>
          <span class="co-cost">${costLabel("bg")}</span>
        </div>
        ${mkPresets("bg", custom.bg || null, GALLERY_BG_PRESETS, false)}
      </div>

      <div class="customize-option">
        <div class="customize-option-header">
          <span class="co-icon">✨</span>
          <div class="co-info"><strong>Свечение рамки</strong><p>Анимированный цветной ореол</p></div>
          <span class="co-cost">${costLabel("glow")}</span>
        </div>
        ${mkPresets("glow", custom.glow || null, GALLERY_GLOW_PRESETS, true)}
      </div>

      <div class="customize-option">
        <div class="customize-option-header">
          <span class="co-icon">🖋️</span>
          <div class="co-info"><strong>Цвет названия</strong><p>Изменить цвет текста предмета</p></div>
          <span class="co-cost">${costLabel("nameColor")}</span>
        </div>
        ${mkPresets("nameColor", custom.nameColor || null, GALLERY_NAMECOLOR_PRESETS, true)}
      </div>

      <div class="customize-option">
        <div class="customize-option-header">
          <span class="co-icon">🎯</span>
          <div class="co-info"><strong>Стикер</strong><p>Большой эмодзи-стикер на карточке</p></div>
          <span class="co-cost">${costLabel("sticker")}</span>
        </div>
        ${mkPresets("sticker", custom.sticker || null, GALLERY_STICKER_PRESETS.map((s) => ({ ...s, emoji: s.value })), false)}
      </div>

      <div class="customize-option">
        <div class="customize-option-header">
          <span class="co-icon">✍️</span>
          <div class="co-info"><strong>Подпись к лоту</strong><p>Краткий текст под названием (до 40 симв.)</p></div>
          <span class="co-cost">${costLabel("caption")}</span>
        </div>
        ${mkText("caption", custom.caption || "", 40, "Напр.: Легендарный дроп!")}
      </div>

      <div class="customize-option">
        <div class="customize-option-header">
          <span class="co-icon">🏷️</span>
          <div class="co-info"><strong>Кастомный бейдж</strong><p>Заменяет бейдж редкости (до 12 симв.)</p></div>
          <span class="co-cost">${costLabel("badge")}</span>
        </div>
        ${mkText("badge", custom.badge || "", 12, "Напр.: MEGA RARE")}
      </div>

      <div class="customize-option">
        <div class="customize-option-header">
          <span class="co-icon">🔝</span>
          <div class="co-info"><strong>Поднять в ТОП</strong><p>Бейдж ТОП + позиция вверху ленты на 1 час</p></div>
          <span class="co-cost">2 000 BC</span>
        </div>
        <div class="customize-promoted-row">
          ${isPromoted
            ? `<span class="customize-promoted-active">🔝 Активно — осталось ${remainMin} мин.</span>`
            : `<button class="btn btn-primary"
                data-cust-option="promoted" data-cust-value="true" data-cust-cost="2000">
                Активировать на 1 час · 2 000 BC
               </button>`
          }
        </div>
      </div>
    `;
  }

  function applyCustomizeOption(entryId, optionKey, value, cost) {
    const player = getCurrentPlayer(state);
    if (!player) return;

    if (cost > 0 && (player.balance || 0) < cost) {
      showToast(`Недостаточно BC. Нужно ${formatBC(cost)}`);
      return;
    }

    const entries = getGalleryEntriesList();
    const idx = entries.findIndex((e) => e.id === entryId && e.ownerId === player.id);
    if (idx === -1) { showToast("Лот не найден", "error"); return; }

    const entry = entries[idx];
    const prevCustom = entry.custom || {};
    const unlocked = Array.isArray(prevCustom.unlocked) ? [...prevCustom.unlocked] : [];
    const patch = { ...prevCustom };

    if (!value) {
      // Сброс опции (бесплатно)
      delete patch[optionKey];
      if (optionKey === "bg")        delete patch.bgValue;
      if (optionKey === "glow")      delete patch.glowValue;
      if (optionKey === "nameColor") delete patch.nameColorValue;
      if (optionKey === "sticker")   delete patch.stickerValue;
      if (optionKey === "promoted")  { delete patch.promoted; delete patch.promotedUntil; }
    } else {
      patch[optionKey] = value;
      if (optionKey === "bg") {
        const p = GALLERY_BG_PRESETS.find((x) => x.id === value);
        patch.bgValue = p ? p.value : null;
      } else if (optionKey === "glow") {
        const p = GALLERY_GLOW_PRESETS.find((x) => x.id === value);
        patch.glowValue = p ? p.value : null;
      } else if (optionKey === "nameColor") {
        const p = GALLERY_NAMECOLOR_PRESETS.find((x) => x.id === value);
        patch.nameColorValue = p ? p.value : null;
      } else if (optionKey === "sticker") {
        const p = GALLERY_STICKER_PRESETS.find((x) => x.id === value);
        patch.stickerValue = p ? p.value : null;
      } else if (optionKey === "promoted") {
        patch.promoted = true;
        patch.promotedUntil = Date.now() + 3600 * 1000;
      }
      // Разблокировка: первая оплата → бесплатные будущие смены (кроме promoted)
      if (optionKey !== "promoted" && cost > 0 && !unlocked.includes(optionKey)) {
        unlocked.push(optionKey);
      }
    }

    patch.unlocked = unlocked;

    if (cost > 0) {
      player.balance = (player.balance || 0) - cost;
    }

    const nextEntries = entries.slice();
    nextEntries[idx] = { ...entry, custom: patch };
    state = { ...state, galleryEntries: nextEntries };
    saveState(state);
    syncPlayerUI();

    showToast(cost > 0 ? `Применено! Списано ${formatBC(cost)}` : "Обновлено");

    // Обновить модал если открыт
    if (customizeModal && customizeModal.classList.contains("open")) {
      renderCustomizeModal(nextEntries[idx], getCurrentPlayer(state));
    }
    renderGallerySection();
  }

  // ===== ЕЖЕДНЕВНЫЙ БОНУС =====

  function formatCountdown(ms) {
    if (ms <= 0) return "";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function getDailyBonusInfo(player) {
    const db = player.dailyBonus || { lastClaim: 0, streak: 0 };
    const now = Date.now();
    const msSinceLast = now - (db.lastClaim || 0);
    const canClaim   = msSinceLast >= DAILY_COOLDOWN_MS;
    const isExpired  = db.lastClaim > 0 && msSinceLast >= DAILY_STREAK_RESET_MS;
    // streak that will apply to NEXT claim
    const effectiveStreak = isExpired ? 0 : (db.streak || 0);
    const streakIdx  = effectiveStreak % DAILY_STREAK_REWARDS.length;
    const nextReward = DAILY_STREAK_REWARDS[streakIdx];
    const cooldownLeft = canClaim ? 0 : DAILY_COOLDOWN_MS - msSinceLast;
    return { canClaim, streak: effectiveStreak, streakIdx, nextReward, cooldownLeft, isExpired };
  }

  function claimDailyBonus() {
    const player = getCurrentPlayer(state);
    if (!player) return;
    const { canClaim, streak, nextReward, isExpired } = getDailyBonusInfo(player);
    if (!canClaim) { showToast("Бонус уже получен!", "warning"); return; }

    const newStreak = isExpired ? 1 : streak + 1;
    player.dailyBonus = { lastClaim: Date.now(), streak: newStreak };
    player.balance    = (player.balance || 0) + nextReward;

    saveState(state);
    syncPlayerUI();
    renderBonusSection();
    showToast(`🎁 +${formatBC(nextReward)}! День ${newStreak} из 7`);
  }

  function renderBonusSection() {
    const player = getCurrentPlayer(state);
    if (!player) return;

    // ---- Ежедневный бонус ----
    if (bonusDailyCard) {
      const { canClaim, streak, streakIdx, nextReward, cooldownLeft } = getDailyBonusInfo(player);

      const dotsHtml = DAILY_STREAK_REWARDS.map((r, i) => {
        const cls = i < streakIdx ? "done" : i === streakIdx ? "current" : "";
        return `<div class="daily-streak-dot ${cls}" title="${formatBC(r)}"></div>`;
      }).join("");

      bonusDailyCard.innerHTML = `
        ${canClaim ? '<div class="bonus-available-dot"></div>' : ""}
        <span class="reward-card-icon">📅</span>
        <div>
          <p class="reward-card-title">Ежедневный бонус</p>
          <p class="reward-card-sub">День ${streakIdx + 1} из 7</p>
        </div>
        <p class="reward-card-amount">${formatBC(nextReward)}</p>
        <div class="daily-streak-dots">${dotsHtml}</div>
        ${canClaim
          ? `<button class="btn btn-primary reward-action-btn" id="claimDailyBtn" type="button">Получить!</button>`
          : `<div class="reward-cooldown">⏳ ${formatCountdown(cooldownLeft)}</div>`
        }
      `;
    }

    // ---- Колесо ----
    if (bonusWheelCard) {
      const { canSpin, msLeft } = getWheelCooldownInfo(player);
      const topReward = formatBC(Math.max(...WHEEL_SEGMENTS.map(s => s.reward)));

      bonusWheelCard.innerHTML = `
        ${canSpin ? '<div class="bonus-available-dot"></div>' : ""}
        <span class="reward-card-icon">🎰</span>
        <div>
          <p class="reward-card-title">Колесо удачи</p>
          <p class="reward-card-sub">Каждые 8 часов</p>
        </div>
        <p class="wheel-top-prize">До ${topReward}!</p>
        ${canSpin
          ? `<button class="btn btn-primary reward-action-btn" id="openWheelBtn" type="button">Крутить!</button>`
          : `<div class="reward-cooldown">⏳ ${formatCountdown(msLeft)}</div>`
        }
      `;
    }
  }

  // ===== КОЛЕСО УДАЧИ =====

  function getWheelCooldownInfo(player) {
    const now     = Date.now();
    const msLeft  = Math.max(0, WHEEL_COOLDOWN_MS - (now - (player.wheelLastSpun || 0)));
    return { canSpin: msLeft === 0, msLeft };
  }

  function pickWeightedWheelSegment() {
    const total = WHEEL_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
    let r = Math.random() * total;
    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
      r -= WHEEL_SEGMENTS[i].weight;
      if (r <= 0) return i;
    }
    return WHEEL_SEGMENTS.length - 1;
  }

  function drawWheelCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    const W   = canvas.width;
    const cx  = W / 2, cy = W / 2, r = W / 2 - 5;
    const n   = WHEEL_SEGMENTS.length;
    const segAngle = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, W, W);

    // Внешнее кольцо
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();

    for (let i = 0; i < n; i++) {
      const seg        = WHEEL_SEGMENTS[i];
      const startAngle = -Math.PI / 2 + i * segAngle;
      const endAngle   = startAngle + segAngle;

      // Заливка сегмента
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      // Границы
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,0.13)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Текст (поворот к читаемому виду)
      const midAngle = startAngle + segAngle / 2;
      const textDist = r * 0.66;
      const tx = cx + Math.cos(midAngle) * textDist;
      const ty = cy + Math.sin(midAngle) * textDist;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.fillStyle = seg.textColor;
      ctx.font = "bold 10px Montserrat, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const parts = seg.label.split(" ");
      if (parts.length === 2) {
        ctx.fillText(parts[0], 0, -6);
        ctx.fillText(parts[1], 0,  6);
      } else {
        ctx.fillText(seg.label, 0, 0);
      }
      ctx.restore();
    }

    // Центральный круг
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22);
    grad.addColorStop(0, "#1a1e2e");
    grad.addColorStop(1, "#0d0f18");
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✦", cx, cy);
  }

  function updateWheelStatus() {
    const el     = wheelStatusText;
    const player = getCurrentPlayer(state);
    if (!el || !player) return;
    const { canSpin, msLeft } = getWheelCooldownInfo(player);
    el.classList.remove("wheel-win");
    if (canSpin) {
      el.textContent = "Удача ждёт тебя! Крути колесо!";
      if (spinWheelBtn) spinWheelBtn.disabled = false;
    } else {
      el.textContent = `Следующий спин через ${formatCountdown(msLeft)}`;
      if (spinWheelBtn) spinWheelBtn.disabled = true;
    }
  }

  function openWheelModal() {
    if (!wheelModal) return;
    const canvas = document.getElementById("wheelCanvas");
    if (canvas) {
      canvas.style.transition = "none";
      canvas.style.transform  = `rotate(${wheelCurrentDeg}deg)`;
      drawWheelCanvas(canvas);
    }
    updateWheelStatus();
    wheelModal.classList.add("open");
    wheelModal.setAttribute("aria-hidden", "false");
  }

  function closeWheelModal() {
    if (!wheelModal) return;
    wheelModal.classList.remove("open");
    wheelModal.setAttribute("aria-hidden", "true");
  }

  function spinWheel() {
    if (isWheelSpinning) return;
    const player = getCurrentPlayer(state);
    if (!player) return;
    const { canSpin } = getWheelCooldownInfo(player);
    if (!canSpin) { showToast("Спин ещё не готов!"); return; }

    const canvas = document.getElementById("wheelCanvas");
    if (!canvas) return;

    isWheelSpinning = true;
    if (spinWheelBtn) spinWheelBtn.disabled = true;

    const segIdx     = pickWeightedWheelSegment();
    const n          = WHEEL_SEGMENTS.length;
    const segAngleDeg = 360 / n;

    // Calculates target rotation so segment midpoint lands exactly at pointer (top)
    const midAngle    = (segIdx + 0.5) * segAngleDeg; // degrees from top, clockwise
    const baseR       = ((-midAngle) % 360 + 360) % 360;
    const extraSpins  = (5 + Math.floor(Math.random() * 3)) * 360;
    const additionalDeg = ((baseR - (wheelCurrentDeg % 360)) + 360) % 360;
    const targetDeg   = wheelCurrentDeg + extraSpins + additionalDeg;

    wheelCurrentDeg = targetDeg;
    canvas.style.transition = "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)";
    canvas.style.transform  = `rotate(${targetDeg}deg)`;

    setTimeout(() => {
      isWheelSpinning = false;
      const seg = WHEEL_SEGMENTS[segIdx];
      player.wheelLastSpun = Date.now();
      player.balance = (player.balance || 0) + seg.reward;

      saveState(state);
      syncPlayerUI();
      renderBonusSection();

      if (wheelStatusText) {
        wheelStatusText.textContent = `🎉 ${seg.label} — зачислено на баланс!`;
        wheelStatusText.classList.add("wheel-win");
      }
      if (spinWheelBtn) spinWheelBtn.disabled = true;
      updateWheelStatus();
      showToast(`🎰 ${seg.label}! +${formatBC(seg.reward)}`);
    }, 5200);
  }

  function renderGalleryInventorySelection(items) {
    if (!galleryInventoryList) return;
    if (!items || !items.length) {
      galleryInventoryList.innerHTML = '<div class="gallery-empty">Нет свободных предметов для выставки.</div>';
      return;
    }

    galleryInventoryList.innerHTML = items
      .map((item) => {
        const rarity = rarityClass(item.rarity || "gray");
        return `
          <article class="gallery-inventory-card rarity-${rarity}">
            <img src="${item.image || fallbackImage}" alt="${item.name}">
            <p>${item.name}</p>
            <span>${formatBC(item.value || 0)}</span>
            <button class="btn btn-primary" data-gallery-item-id="${item.id}" type="button">Выставить</button>
          </article>
        `;
      })
      .join("");
  }

  function addItemToGallery(itemId) {
    const player = getCurrentPlayer(state);
    if (!player) return;
    const entries = getGalleryEntriesList();
    const myEntries = entries.filter((entry) => entry.ownerId === player.id);
    if (myEntries.length >= 5) {
      showToast("Лимит выставки уже достигнут", "error");
      return;
    }

    const item = (player.inventory || []).find((inv) => inv.id === itemId);
    if (!item) {
      showToast("Предмет не найден в инвентаре", "error");
      return;
    }

    const newEntry = {
      id: `gallery_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      ownerId: player.id,
      itemId: item.id,
      name: item.name,
      image: item.image || fallbackImage,
      rarity: item.rarity || "gray",
      value: Number(item.value || 0),
      likes: 0,
      likedBy: [],
      createdAt: Date.now()
    };

    const nextEntries = [...entries, newEntry];
    state = { ...state, galleryEntries: nextEntries };
    saveState(state);
    galleryPage = 1;
    renderGallerySection();
    showToast("Предмет добавлен на выставку", "success");

    const updatedEntries = nextEntries.filter((entry) => entry.ownerId === player.id);
    const availableItems = getEligibleGalleryItems(player, updatedEntries);
    renderGalleryInventorySelection(availableItems);
    if (!availableItems.length || updatedEntries.length >= 5) {
      closeGalleryModal();
    }
  }

  function removeGalleryEntry(entryId) {
    const player = getCurrentPlayer(state);
    if (!player) return;
    const entries = getGalleryEntriesList();
    const nextEntries = entries.filter((entry) => !(entry.ownerId === player.id && entry.id === entryId));
    if (nextEntries.length === entries.length) return;
    state = { ...state, galleryEntries: nextEntries };
    saveState(state);
    galleryPage = 1;
    renderGallerySection();
    showToast("Предмет снят с витрины", "info");
  }

  function toggleGalleryLike(entryId) {
    const player = getCurrentPlayer(state);
    if (!player) return;
    const entries = getGalleryEntriesList();
    const index = entries.findIndex((entry) => entry.id === entryId);
    if (index === -1) return;
    const entry = entries[index];
    if (entry.ownerId === player.id) {
      showToast("Нельзя лайкнуть свой предмет", "warning");
      return;
    }

    const likedBy = Array.isArray(entry.likedBy) ? entry.likedBy.slice() : [];
    const alreadyLiked = likedBy.includes(player.id);
    const updatedEntry = {
      ...entry,
      likedBy: alreadyLiked ? likedBy.filter((id) => id !== player.id) : [...likedBy, player.id],
      likes: Math.max(0, (entry.likes || 0) + (alreadyLiked ? -1 : 1))
    };

    const nextEntries = entries.slice();
    nextEntries[index] = updatedEntry;
    state = { ...state, galleryEntries: nextEntries };
    saveState(state);
    renderGallerySection();
  }

  // ===== МОДАЛЬНОЕ ОКНО ПРЕДМЕТА ВИТРИНЫ =====

  function openItemDetailModal(entryId) {
    const entry = getGalleryEntriesList().find((e) => e.id === entryId);
    if (!entry || !itemDetailModal) return;
    currentItemDetailEntryId = entryId;

    const player = getCurrentPlayer(state);
    const owner = state.players.find((p) => p.id === entry.ownerId);
    const rarity = rarityClass(entry.rarity || "gray");
    const custom = entry.custom || {};
    const now = Date.now();
    const isPromoted = !!(custom.promoted && custom.promotedUntil > now);
    const liked = Array.isArray(entry.likedBy) && player && entry.likedBy.includes(player.id);
    const isOwner = !!(player && entry.ownerId === player.id);

    // Карточка — стили и классы
    const card = document.getElementById("itemDetailCard");
    card.className = `item-detail-card rarity-${rarity}`;
    card.removeAttribute("style");
    if (custom.bgValue) card.style.background = custom.bgValue;
    if (custom.glowValue) card.style.boxShadow = `0 0 45px ${custom.glowValue}, 0 30px 90px rgba(0,0,0,0.9)`;

    // Изображение
    const imgEl = document.getElementById("itemDetailImg");
    imgEl.src = entry.image || fallbackImage;
    imgEl.alt = escapeHtml(entry.name);

    // Стикер
    const stickerEl = document.getElementById("itemDetailSticker");
    const stickerEmoji = custom.stickerValue || (custom.sticker ? (GALLERY_STICKER_PRESETS.find((x) => x.id === custom.sticker) || {}).value : null);
    stickerEl.textContent = stickerEmoji || "";
    stickerEl.style.display = stickerEmoji ? "" : "none";

    // Бейдж ТОП
    const promotedEl = document.getElementById("itemDetailPromotedBadge");
    promotedEl.classList.toggle("visible", isPromoted);

    // Пилюля редкости
    const rarityPill = document.getElementById("itemDetailRarityPill");
    if (custom.badge) {
      rarityPill.textContent = escapeHtml(custom.badge);
      rarityPill.className = "item-detail-rarity-pill";
    } else {
      rarityPill.textContent = rarityLabel(entry.rarity);
      rarityPill.className = `item-detail-rarity-pill rarity-${rarity}`;
    }

    // Название
    const nameEl = document.getElementById("itemDetailName");
    nameEl.textContent = entry.name;
    nameEl.style.color = custom.nameColorValue || "";

    // Подпись
    const captionEl = document.getElementById("itemDetailCaption");
    captionEl.textContent = custom.caption || "";
    captionEl.style.display = custom.caption ? "" : "none";

    // Цена
    document.getElementById("itemDetailPrice").textContent = formatBC(entry.value);

    // Лайк
    const likeBtn = document.getElementById("itemDetailLikeBtn");
    document.getElementById("itemDetailLikeIcon").textContent = liked ? "❤" : "♡";
    document.getElementById("itemDetailLikeCount").textContent = entry.likes || 0;
    likeBtn.className = `gallery-like-btn item-detail-like-btn${liked ? " is-liked" : ""}`;
    likeBtn.disabled = isOwner;

    // Владелец
    const ownerNickEl = document.getElementById("itemDetailOwnerNick");
    ownerNickEl.innerHTML = escapeHtml(owner ? owner.nick : "Игрок") + (owner ? getBadgesHtml(owner) : "");
    document.getElementById("itemDetailOwnerServer").textContent = owner ? (owner.server || "Black Russia") : "Black Russia";

    // Дата
    const dateEl = document.getElementById("itemDetailDate");
    if (entry.createdAt) {
      const d = new Date(entry.createdAt);
      dateEl.textContent = `Выставлено ${d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`;
    } else {
      dateEl.textContent = "";
    }

    itemDetailModal.classList.add("open");
    itemDetailModal.setAttribute("aria-hidden", "false");
  }

  function closeItemDetailModal() {
    if (!itemDetailModal) return;
    itemDetailModal.classList.remove("open");
    itemDetailModal.setAttribute("aria-hidden", "true");
    currentItemDetailEntryId = null;
  }

  // ===== ПРОФИЛЬ ИГРОКА ИЗ ТОПА =====

  function openPlayerProfileModal(playerId) {
    if (!playerProfileModal) return;

    const targetId = String(playerId);
    const rankedPlayers = state.players
      .map((p) => ({ ...p, score: computeScore(p) }))
      .sort((a, b) => b.score - a.score);
    const rankIdx = rankedPlayers.findIndex((p) => String(p.id) === targetId);
    const player = rankedPlayers[rankIdx];
    if (!player) return false;

    const rank = rankIdx + 1;

    // Avatar
    const photoUrl = (player.stats && player.stats.photo_url) ? player.stats.photo_url : "img/avatar_placeholder.png";
    document.getElementById("ppAvatar").src = photoUrl;

    // Rank badge
    const badge = document.getElementById("ppRankBadge");
    badge.textContent = rank;
    badge.className = "pp-rank-badge" + (rank === 1 ? "" : rank === 2 ? " is-silver" : rank === 3 ? " is-bronze" : " is-plain");

    // Nick / server
    document.getElementById("ppNick").innerHTML = escapeHtml(player.nick || "Игрок") + getBadgesHtml(player);
    document.getElementById("ppServer").textContent = player.server || "Black Russia";
    document.getElementById("ppScore").textContent = formatBC(player.score);

    // Stats
    const invValue = (player.inventory || []).reduce((s, i) => s + Number(i.value || 0), 0);
    document.getElementById("ppBalance").textContent = formatBC(player.balance || 0);
    document.getElementById("ppInvValue").textContent = formatBC(invValue);
    document.getElementById("ppCasesOpened").textContent = (player.stats && player.stats.opened || 0).toLocaleString("ru-RU");
    document.getElementById("ppItemsSold").textContent = (player.stats && player.stats.itemsSold || 0).toLocaleString("ru-RU");
    document.getElementById("ppValueSold").textContent = formatBC(player.stats && player.stats.valueSold || 0);

    // Fav case
    let fav = "—";
    if (player.stats && player.stats.casesOpenedCount) {
      let max = 0, bestId = null;
      for (const [cId, cnt] of Object.entries(player.stats.casesOpenedCount)) {
        if (cnt > max) { max = cnt; bestId = cId; }
      }
      if (bestId) {
        const cObj = state.cases.find((c) => c.id === bestId);
        fav = cObj ? cObj.name : "Неизвестно";
      }
    }
    document.getElementById("ppFavCase").textContent = fav;

    // Showcase
    const showcase = document.getElementById("ppShowcase");
    const myEntries = (state.galleryEntries || []).filter((e) => e.ownerId === playerId);
    if (myEntries.length) {
      showcase.innerHTML = myEntries.slice(0, 6).map((e) => `
        <div class="pp-showcase-item">
          <img src="${e.image || fallbackImage}" alt="${escapeHtml(e.name)}">
          <span class="pp-showcase-item-name">${escapeHtml(e.name)}</span>
        </div>
      `).join("");
      document.getElementById("ppShowcaseTitle").style.display = "";
      showcase.style.display = "";
    } else {
      document.getElementById("ppShowcaseTitle").style.display = "none";
      showcase.innerHTML = "";
      showcase.style.display = "none";
    }

    // Top inventory
    const topInv = document.getElementById("ppTopInv");
    const inv = (player.inventory || []).slice().sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 5);
    if (inv.length) {
      topInv.innerHTML = inv.map((item) => `
        <div class="pp-inv-row">
          <img class="pp-inv-img" src="${item.image || fallbackImage}" alt="">
          <div class="pp-inv-info">
            <div class="pp-inv-name">${escapeHtml(item.name)}</div>
            <div class="pp-inv-value">${formatBC(item.value)}</div>
          </div>
        </div>
      `).join("");
      document.getElementById("ppTopInvTitle").style.display = "";
      topInv.style.display = "";
    } else {
      document.getElementById("ppTopInvTitle").style.display = "none";
      topInv.innerHTML = '<div class="pp-inv-empty">Инвентарь пуст</div>';
      topInv.style.display = "";
    }

    playerProfileModal.classList.add("open");
    playerProfileModal.setAttribute("aria-hidden", "false");
    return true;
  }

  function closePlayerProfileModal() {
    if (!playerProfileModal) return;
    playerProfileModal.classList.remove("open");
    playerProfileModal.setAttribute("aria-hidden", "true");
  }

  function renderAll() {
    console.log("%c[Main] Rendering...", "color:cyan");
    renderCases();
    renderNews();
    renderTop();
    renderGallerySection();
    renderLabView();
    renderBonusSection();
    renderHomeStats();
    syncPlayerUI();
    LiveDrop.seed();
  }

  function previewCaseInfo(caseId) {
    const selectedCase = state.cases.find(c => c.id === caseId);
    if (!selectedCase) return;
    currentPreviewedCaseId = caseId;
    
    previewCaseImg.src = selectedCase.image || fallbackImage;
    previewCaseName.textContent = selectedCase.name;
    setActiveMultiplierButton(selectedOpenMultiplier);
    updateOpenButtonsForCase(selectedCase);
    
    const rarityOrder = ["secret","gold","legendary","purple","blue","green","gray","common"];
    const sortedItems = [...selectedCase.items].sort((a, b) => {
      const rarA = (a.rarity || "gray").toLowerCase();
      const rarB = (b.rarity || "gray").toLowerCase();
      const wA = rarityOrder.indexOf(rarA) !== -1 ? rarityOrder.indexOf(rarA) : rarityOrder.length;
      const wB = rarityOrder.indexOf(rarB) !== -1 ? rarityOrder.indexOf(rarB) : rarityOrder.length;
      if (wA !== wB) return wA - wB;
      return (b.value || 0) - (a.value || 0);
    });
    const normalizedChances = normalizeChances(state.rarityChances || {});
    const chanceBuckets = {};
    sortedItems.forEach((item) => {
      const rarity = (item.rarity || "gray").toLowerCase();
      const chanceKey = rarityMeta[rarity]?.chanceKey || rarity;
      chanceBuckets[chanceKey] = (chanceBuckets[chanceKey] || 0) + 1;
    });
    const formatChanceLabel = (value) => {
      if (!value || value <= 0) return "<0.1%";
      if (value < 0.1) return value.toFixed(2) + "%";
      if (value < 1) return value.toFixed(2) + "%";
      if (value < 10) return value.toFixed(1) + "%";
      return value.toFixed(0) + "%";
    };

    previewItemList.innerHTML = sortedItems.map(item => {
      const rarity = (item.rarity || "gray").toLowerCase();
      const rarityVisualClass = rarityClass(rarity);
      const chanceKey = rarityMeta[rarity]?.chanceKey || rarity;
      const totalRarityChance = normalizedChances[chanceKey] || 0;
      const perItemChance = totalRarityChance / (chanceBuckets[chanceKey] || 1);
      const chanceLabel = formatChanceLabel(perItemChance);
      const rarityTitle = rarityLabel(rarity);

      return `
        <article class="inventory-card rarity-${rarityVisualClass}">
          <div class="preview-item-meta">
            <span class="preview-rarity-pill rarity-${rarityVisualClass}">${rarityTitle}</span>
            <span class="preview-item-chance" title="Ориентировочный шанс выпадения">
              <small>Шанс</small>
              <strong>${chanceLabel}</strong>
            </span>
          </div>
          <div class="preview-item-art">
            <img src="${item.image || 'img/standart_case.png'}" alt="${item.name}">
          </div>
          <div class="preview-item-name">${item.name}</div>
          <div class="preview-item-price">${formatBC(item.value || 0)}</div>
        </article>
      `;
    }).join("");

    switchView("case-preview");
    const contentPanel = document.querySelector('.content');
    if (contentPanel) contentPanel.scrollTo(0, 0);
  }



  navButtons.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.target));
  });

  if (moreNavBtn && moreNavMenu) {
    moreNavBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = moreNavMenu.classList.contains("open");
      setMoreNavMenuOpen(!isOpen);
    });

    moreNavMenu.addEventListener("click", (event) => {
      const item = event.target.closest(".more-nav-item[data-target]");
      if (!item) return;
      switchView(item.dataset.target);
      setMoreNavMenuOpen(false);
    });

    document.addEventListener("click", (event) => {
      const clickedInsideMenu = moreNavMenu.contains(event.target);
      const clickedMoreButton = moreNavBtn.contains(event.target);
      if (!clickedInsideMenu && !clickedMoreButton) {
        setMoreNavMenuOpen(false);
      }
    });
  }

  const caseGridContainer = caseCategoriesContainer || casesGrid;
  if (caseGridContainer) {
    caseGridContainer.addEventListener("click", (event) => {
      const target = event.target.closest("[data-preview-case]");
      if (target) {
        previewCaseInfo(target.dataset.previewCase);
      }
    });
  }

  if (backToHomeBtn) {
    backToHomeBtn.addEventListener("click", () => switchView("home"));
  }

  // --- Upgrade inventory click (toggle item) ---
  // --- Upgrade inventory click (toggle item) ---
  const upgInv = document.getElementById("labUpgradeInventory");
  if (upgInv) {
    upgInv.addEventListener("click", (e) => {
      const card = e.target.closest("[data-upg-item]");
      if (!card) return;
      addItemToUpgrade(card.dataset.upgItem);
    });
  }

  // --- Contract inventory click (toggle item) ---
  const ctrInv = document.getElementById("labContractInventory");
  if (ctrInv) {
    ctrInv.addEventListener("click", (e) => {
      const card = e.target.closest("[data-ctr-item]");
      if (!card) return;
      addItemToContract(card.dataset.ctrItem);
    });
  }

  if (labUpgradeSlots) {
    labUpgradeSlots.addEventListener("click", (event) => {
      const removeBtn = event.target.closest("[data-remove-upgrade]");
      if (!removeBtn) return;
      removeFromUpgrade(removeBtn.dataset.removeUpgrade);
    });
  }

  if (labContractSlots) {
    labContractSlots.addEventListener("click", (event) => {
      const removeBtn = event.target.closest("[data-remove-contract]");
      if (!removeBtn) return;
      removeFromContract(removeBtn.dataset.removeContract);
    });
  }

  if (launchUpgradeBtn) {
    launchUpgradeBtn.addEventListener("click", runLabUpgrade);
  }
  
  const upgSlider = document.getElementById("upgBalanceSlider");
  if (upgSlider) {
      upgSlider.addEventListener("input", function() {
          const balAddEl = document.getElementById("upgBalanceAdd");
          if (balAddEl) balAddEl.textContent = formatBC(Number(this.value));
          renderUpgradeView();
      });
  }

  if (launchContractBtn) {
    launchContractBtn.addEventListener("click", runLabContract);
  }

  // --- Upgrade target picker: open/close ---
  const upgTargetBox = document.getElementById("upgTargetBox");
  const upgTargetSection = document.getElementById("upgTargetSection");
  const upgCloseTarget = document.getElementById("upgCloseTarget");
  const upgTargetRemove = document.getElementById("upgTargetRemove");
  const upgTargetGrid = document.getElementById("upgTargetGrid");

  function setUpgradeTargetModalOpen(open) {
    if (upgTargetSection) {
      upgTargetSection.style.display = open ? "flex" : "none";
    }
    document.body.classList.toggle("upg-target-open", !!open);
  }

  if (upgTargetBox) {
    upgTargetBox.addEventListener("click", (e) => {
      if (e.target.closest("#upgTargetRemove")) return;
      if (upgTargetSection) {
        setUpgradeTargetModalOpen(true);
        renderUpgradeTargetPicker();
      }
    });
  }
  if (upgCloseTarget) {
    upgCloseTarget.addEventListener("click", () => {
      setUpgradeTargetModalOpen(false);
    });
  }
  if (upgTargetSection) {
    upgTargetSection.addEventListener("click", (e) => {
      if (e.target === upgTargetSection) {
        setUpgradeTargetModalOpen(false);
      }
    });
  }
  if (upgTargetRemove) {
    upgTargetRemove.addEventListener("click", () => {
      upgradeTargetItem = null;
      renderUpgradeView();
    });
  }
  if (upgTargetGrid) {
    upgTargetGrid.addEventListener("click", (e) => {
      const card = e.target.closest("[data-tgt-idx]");
      if (!card) return;
      const idx = Number(card.dataset.tgtIdx);
      const catalog = window._allItemsCatalog || [];
      if (catalog[idx]) {
        upgradeTargetItem = { ...catalog[idx], value: Number(catalog[idx].value || 0) };
        setUpgradeTargetModalOpen(false);
        renderUpgradeView();
      }
    });
  }

  // --- Upgrade target search/sort/filter ---
  ["upgTargetSearch", "upgTargetSort", "upgTargetRarity"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => renderUpgradeTargetPicker());
    if (el) el.addEventListener("change", () => renderUpgradeTargetPicker());
  });

  // --- Upgrade inventory search/sort ---
  ["upgInvSearch", "upgInvSort"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => renderUpgradeView());
    if (el) el.addEventListener("change", () => renderUpgradeView());
  });

  // --- Contract inventory search/sort ---
  ["ctrInvSearch", "ctrInvSort"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => renderContractView());
    if (el) el.addEventListener("change", () => renderContractView());
  });

  function handleOpenCase(mode = "classic") {
    if (!currentPreviewedCaseId) return;
    const selectedCase = getPreviewedCase();
    const player = getCurrentPlayer(state);

    if (!selectedCase || !player) return;
    if (player.banned) {
      showToast("Игрок заблокирован, доступ к кейсам закрыт", "error");
      return;
    }
    if (mode !== "quick" && isSpinning) {
      showToast("Подождите завершения анимации", "warning");
      return;
    }

    if (!selectedCase.items.length) {
      showToast("В кейсе нет предметов", "error");
      return;
    }

    const multiplier = Math.max(1, Math.min(selectedOpenMultiplier, 10));
    const totalCost = Number(selectedCase.price || 0) * multiplier;
    if (player.balance < totalCost) {
      showToast("Недостаточно BC для открытия", "error");
      return;
    }

    player.balance -= totalCost;
    player.totalSpent = Math.max(0, Number(player.totalSpent || 0) + totalCost);
    player.stats = player.stats || { opened: 0 };
    player.stats.opened += multiplier;
    player.stats.casesOpenedCount = player.stats.casesOpenedCount || {};
    player.stats.casesOpenedCount[selectedCase.id] = (player.stats.casesOpenedCount[selectedCase.id] || 0) + multiplier;

    const spinPayload = [];
    for (let i = 0; i < multiplier; i++) {
      spinPayload.push(rollDropForCase(selectedCase, player));
    }

    saveState(state);
    renderTop();
    syncPlayerUI();

    activeOpenMode = mode;
    updateOpenButtonsForCase(selectedCase);

    if (mode === "quick") {
      openDropModalFromItems(spinPayload.map((spin) => spin.inventoryItem));
      return;
    }

    isSpinning = true;
    startRouletteBatch(spinPayload);
  }

  function rollDropForCase(selectedCase, player) {
    const droppedRarity = (pickRarity(state.rarityChances) || "").toLowerCase();
    let pool = selectedCase.items.filter((item) => (item.rarity || "").toLowerCase() === droppedRarity);
    if (!pool.length) {
      pool = selectedCase.items;
    }

    const dropped = randomItem(pool);
    const inventoryItem = {
      id: `drop_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: dropped.name,
      rarity: dropped.rarity,
      value: Number(dropped.value || 0),
      image: dropped.image || fallbackImage,
      caseId: selectedCase.id,
      caseName: selectedCase.name,
      droppedAt: Date.now()
    };

    player.inventory = player.inventory || [];
    player.inventory.push(inventoryItem);

    return {
      caseRef: selectedCase,
      winningItem: dropped,
      inventoryItem
    };
  }

  function getRouletteLayout(count) {
    if (count === 2) {
      return [[{ size: "normal" }], [{ size: "normal" }]];
    }
    if (count === 5) {
      return [
        [{ size: "compact" }, { size: "compact" }],
        [{ size: "compact" }, { size: "compact" }],
        [{ size: "normal" }]
      ];
    }
    if (count === 10) {
      return Array.from({ length: 5 }, () => [{ size: "compact" }, { size: "compact" }]);
    }
    return Array.from({ length: count }, () => [{ size: "normal" }]);
  }

  function startRouletteBatch(spinPayload) {
    if (!rouletteModal || !rouletteGrid || !spinPayload.length) return;

    rouletteGrid.innerHTML = "";
    const layout = getRouletteLayout(spinPayload.length);
    const lanes = [];
    let payloadIndex = 0;

    layout.forEach((rowConfig) => {
      const rowEl = document.createElement("div");
      rowEl.className = "roulette-row";
      rouletteGrid.appendChild(rowEl);

      rowConfig.forEach((cellConfig) => {
        const payload = spinPayload[payloadIndex];
        if (!payload) return;
        payloadIndex += 1;

        const container = document.createElement("div");
        container.className = "roulette-container" + (cellConfig.size === "compact" ? " is-compact" : "");
        const pointer = document.createElement("div");
        pointer.className = "roulette-pointer";
        const track = document.createElement("div");
        track.className = "roulette-track";
        container.append(pointer, track);
        rowEl.appendChild(container);

        const slots = [];
        for (let i = 0; i < 60; i++) {
          const slotItem = i === 50 ? payload.winningItem : randomItem(payload.caseRef.items);
          const rarityClass = getRarityClassName(slotItem.rarity);
          const isWin = i === 50 ? 'data-winning="true"' : '';
          slots.push(`
            <div class="roulette-item r-${rarityClass}" ${isWin}>
              <img src="${slotItem.image || fallbackImage}">
              <span>${slotItem.name}</span>
            </div>
          `);
        }
        track.innerHTML = slots.join("");

        const winningElement = track.querySelector('[data-winning="true"]');
        lanes.push({ track, container, winningElement, size: cellConfig.size === "compact" ? "compact" : "normal" });
      });
    });

    rouletteModal.classList.add("open");
    rouletteModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-case-open");

    const CHARGE_MS  = 750;
    const SPIN_MS    = 5800;
    const LANE_DELAY = 90;

    // Phase 1 — зарядка: мигание рамок
    lanes.forEach(lane => lane.container.classList.add("is-charging"));

    setTimeout(() => {
      lanes.forEach(lane => lane.container.classList.remove("is-charging"));

      // Phase 2 — прокрутка
      requestAnimationFrame(() => {
        lanes.forEach((lane, idx) => {
          lane.track.style.transition = "none";
          lane.track.style.transform = "translateX(0px)";
          void lane.track.offsetWidth;

          const containerWidth = lane.container.offsetWidth || 320;
          const itemCenter = lane.winningElement
            ? lane.winningElement.offsetLeft + lane.winningElement.offsetWidth / 2
            : containerWidth / 2;
          const finalTranslate = -(itemCenter - containerWidth / 2);

          setTimeout(() => {
            lane.track.style.transition = `transform ${SPIN_MS / 1000}s cubic-bezier(0.05, 0.88, 0.1, 1)`;
            lane.track.style.transform = `translateX(${finalTranslate}px)`;
          }, idx * LANE_DELAY);
        });
      });
    }, CHARGE_MS);

    // Phase 3 — эффект победы после остановки
    const winRevealAt = CHARGE_MS + SPIN_MS + lanes.length * LANE_DELAY + 280;

    setTimeout(() => {
      // Вспышка экрана
      const flash = document.createElement("div");
      flash.className = "roulette-flash";
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 750);

      // Shake грида
      rouletteGrid.classList.add("is-shaking");
      setTimeout(() => rouletteGrid.classList.remove("is-shaking"), 560);

      // Подсветка выигрышного предмета
      lanes.forEach(lane => {
        if (lane.winningElement) lane.winningElement.classList.add("is-winning");
      });
    }, winRevealAt);

    // Phase 4 — закрытие модалки
    setTimeout(() => {
      isSpinning = false;
      if (document.activeElement) document.activeElement.blur();
      rouletteModal.classList.remove("open");
      rouletteModal.setAttribute("aria-hidden", "true");
      openDropModalFromItems(spinPayload.map((spin) => spin.inventoryItem));
    }, winRevealAt + 1700);
  }

  function openDropModalFromItems(items, options = {}) {
    if (!items || !items.length) return;
    
    // Find modal elements fresh each time
    const modal = document.getElementById("dropModal");
    const dropModalTitle = document.getElementById("dropModalTitle");
    const dropModalContent = document.getElementById("dropModalContent");
    const dropModalClose = document.getElementById("dropModalClose");
    
    if (!modal) {
      console.warn("[DropModal] Element #dropModal not found");
      return;
    }
    const customTitle = options && typeof options.title === "string" ? options.title.trim() : "";
    const singleMetaText = options && typeof options.singleMeta === "string" ? options.singleMeta.trim() : "";
    const isMulti = items.length > 1;

    // Push to Live Drop bar + Supabase realtime table
    const currentPlayer = getCurrentPlayer(state);
    const nick = (currentPlayer && currentPlayer.nick && currentPlayer.nick.trim()) || "Игрок";
    items.forEach((item) => {
      if (!item) return;
      try {
        LiveDrop.push(nick, item.name, item.rarity, item.value, item.image);
      } catch (e) {
        console.warn("[LiveDrop] push error:", e);
      }
      try {
        // Write to live_drops table for realtime broadcast to other players
        supabaseClient.from("live_drops").insert({
          nick,
          item_name: item.name,
          rarity:    item.rarity || "gray",
          value:     item.value  || 0,
          image:     item.image  || null,
        }).then(({ error }) => {
          if (error) console.warn("[LiveDrop] insert error:", error.message);
        });
      } catch (e) {
        console.warn("[LiveDrop] insert call failed:", e);
      }
    });

    if (dropModalTitle) {
      dropModalTitle.textContent = customTitle || (isMulti ? `Серия наград` : "Выпал предмет");
    }

    if (dropSingleView) {
      dropSingleView.classList.toggle("is-hidden", isMulti);
    }
    if (dropMultiView) {
      dropMultiView.classList.toggle("active", isMulti);
      dropMultiView.classList.toggle("is-hidden", !isMulti);
    }

    if (closeModalBtn) {
      closeModalBtn.textContent = isMulti ? "Готово" : "Забрать в инвентарь";
    }

    if (isMulti) {
      if (dropName) {
        dropName.textContent = `x${items.length} предметов`;
      }
      if (dropMeta) {
        dropMeta.textContent = "Все предметы добавлены в инвентарь";
      }
      const totalValue = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
      const bestItem = items.reduce((best, item) => (item.value || 0) > (best.value || 0) ? item : best, items[0]);

      if (dropMultiSummary) {
        dropMultiSummary.classList.remove("is-hidden");
      }
      if (dropMultiTotal) {
        dropMultiTotal.textContent = formatBC(totalValue);
      }
      if (dropMultiBest) {
        const bestCaseLabel = bestItem.caseName ? ` • ${bestItem.caseName}` : "";
        dropMultiBest.textContent = `${bestItem.name}`;
      }
      if (dropMultiList) {
        dropMultiList.innerHTML = items
          .map((item) => {
            const rarityClass = getRarityClassName(item.rarity);
            const caseLabel = item.caseName || "В инвентаре";
            return `
              <article class="drop-multi-card rarity-${rarityClass}">
                <div class="drop-multi-meta">
                  <span class="meta-chip value-chip">${formatBC(item.value)}</span>
                </div>
                <img src="${item.image || fallbackImage}" alt="${item.name}">
                <div class="drop-text">
                  <small>Добавлено</small>
                  <strong>${item.name}</strong>
                </div>
              </article>
            `;
          })
          .join("");
      }
      if (sellDropBtn) {
        sellDropBtn.classList.add("is-hidden");
      }
      window.currentDropItem = null;
    } else {
      const item = items[0];
      if (dropName) {
        dropName.textContent = item.name;
      }
      if (dropMeta) {
        dropMeta.textContent = singleMetaText || "Добавлено в инвентарь";
      }
      const rarityClass = getRarityClassName(item.rarity);
      if (dropRarityBadge) {
        dropRarityBadge.textContent = rarityLabel(item.rarity);
        dropRarityBadge.className = `drop-rarity-badge rarity-${rarityClass}`;
      }
      if (dropValueEl) {
        dropValueEl.textContent = formatBC(item.value);
      }
      if (dropImgEl) {
        dropImgEl.src = item.image || fallbackImage;
      }
      if (dropMultiList) {
        dropMultiList.innerHTML = "";
      }
      if (dropMultiSummary) {
        dropMultiSummary.classList.add("is-hidden");
      }
      if (sellDropBtn) {
        sellDropBtn.classList.remove("is-hidden");
        sellDropBtn.textContent = `Продать за ${formatBC(item.value)}`;
      }
      window.currentDropItem = item;
    }

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    modal.style.display = "flex";
    modal.style.visibility = "visible";
    modal.style.opacity = "1";
    modal.style.pointerEvents = "auto";
    document.body.classList.add("modal-case-open");
  }

  function closeDropModal() {
    if (document.activeElement) document.activeElement.blur();
    // Keep island hidden if we're still on the case-preview view
    const onCaseView = !!document.querySelector('.view[data-view="case-preview"].active');
    if (!onCaseView) document.body.classList.remove("modal-case-open");
    if (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      modal.style.display = "";
      modal.style.visibility = "";
      modal.style.opacity = "";
      modal.style.pointerEvents = "";
    }
    if (dropMultiList) {
      dropMultiList.innerHTML = "";
    }
    if (dropMultiView) {
      dropMultiView.classList.remove("active");
      dropMultiView.classList.remove("is-hidden");
    }
    if (dropSingleView) {
      dropSingleView.classList.remove("is-hidden");
    }
    if (sellDropBtn) {
      sellDropBtn.classList.remove("is-hidden");
    }
    if (dropMultiSummary) {
      dropMultiSummary.classList.add("is-hidden");
    }
    if (dropMultiTotal) {
      dropMultiTotal.textContent = formatBC(0);
    }
    if (dropMultiBest) {
      dropMultiBest.textContent = "---";
    }
    window.currentDropItem = null;
  }

  openModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.openMode || "classic";
      activeOpenMode = mode;
      updateOpenButtonsForCase();
      handleOpenCase(mode);
    });
  });

  multiplierButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const multiplier = Number(button.dataset.openMultiplier) || 1;
      selectedOpenMultiplier = multiplier;
      setActiveMultiplierButton(multiplier);
      updateOpenButtonsForCase();
    });
  });

  setActiveMultiplierButton(selectedOpenMultiplier);
  updateOpenButtonsForCase();

  if (previewCaseImg) {
    previewCaseImg.addEventListener("click", () => {
      activeOpenMode = "classic";
      updateOpenButtonsForCase();
      handleOpenCase("classic");
    });
  }

  const editProfileModal = document.getElementById("editProfileModal");

  if (profileForm) {
    profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const player = getCurrentPlayer(state);
      if (!player) return;
      if (player.banned) {
        showToast("Игрок заблокирован, изменение профиля недоступно", "error");
        return;
      }

      const nickValue = nickInput.value.trim();
      const serverValue = serverInput.value.trim();
      
      if (!nickValue) {
        showToast("Введите никнейм", "warning");
        return;
      }
      
      if (!serverValue) {
        showToast("Выберите сервер", "warning");
        return;
      }

      player.nick = nickValue;
      player.server = serverValue;
      saveState(state);
      
      // Hide form modal and update UI
      if (editProfileModal) {
          if (document.activeElement) document.activeElement.blur();
          editProfileModal.classList.remove("open");
          editProfileModal.setAttribute("aria-hidden", "true");
      }

      renderTop();
      syncPlayerUI();
      showToast("Профиль обновлен", "success");
    });
  }

  const editProfileBtn = document.getElementById("editProfileBtn");
  const cancelEditProfileBtn = document.getElementById("cancelEditProfileBtn");
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
       const player = getCurrentPlayer(state);
       if (player && nickInput && serverInput) {
         nickInput.value = player.nick || "";
         serverInput.value = player.server || "";
       }
       if (editProfileModal) {
         editProfileModal.classList.add("open");
         editProfileModal.setAttribute("aria-hidden", "false");
         if (nickInput) nickInput.focus();
       }
    });
  }
  if (cancelEditProfileBtn) {
    cancelEditProfileBtn.addEventListener("click", () => {
       if (editProfileModal) {
           if (document.activeElement) document.activeElement.blur();
           editProfileModal.classList.remove("open");
           editProfileModal.setAttribute("aria-hidden", "true");
       }
    });
  }
  if (editProfileModal) {
    editProfileModal.addEventListener("click", (event) => {
      if (event.target === editProfileModal) {
        if (document.activeElement) document.activeElement.blur();
        editProfileModal.classList.remove("open");
        editProfileModal.setAttribute("aria-hidden", "true");
      }
    });
  }

  const sellAllBtn = document.getElementById("sellAllBtn");
  if (sellAllBtn) {
    sellAllBtn.addEventListener("click", () => {
      if (isCurrentPlayerBanned()) {
        showToast("Игрок заблокирован, продажа недоступна");
        return;
      }
      if(confirm("Вы уверены, что хотите продать ВСЕ предметы?")) {
        sellAllItems();
      }
    });
  }

  if (openGalleryModalBtn) {
    openGalleryModalBtn.addEventListener("click", () => openGalleryModal());
  }

  if (closeGalleryModalBtn) {
    closeGalleryModalBtn.addEventListener("click", () => closeGalleryModal());
  }

  if (galleryModal) {
    galleryModal.addEventListener("click", (event) => {
      if (event.target === galleryModal) {
        closeGalleryModal();
      }
    });
  }

  if (galleryInventoryList) {
    galleryInventoryList.addEventListener("click", (event) => {
      const target = event.target.closest('[data-gallery-item-id]');
      if (target) {
        addItemToGallery(target.dataset.galleryItemId);
      }
    });
  }

  if (myGallerySlots) {
    myGallerySlots.addEventListener("click", (event) => {
      const removeBtn = event.target.closest('[data-remove-entry]');
      if (removeBtn) { removeGalleryEntry(removeBtn.dataset.removeEntry); return; }

      const custBtn = event.target.closest('[data-customize-entry]');
      if (custBtn) { openCustomizeModal(custBtn.dataset.customizeEntry); }
    });
  }

  // Кастомизация лота — modal
  if (customizeModal) {
    customizeModal.addEventListener("click", (event) => {
      if (event.target === customizeModal) closeCustomizeModal();

      // Preset / toggle button
      const presetBtn = event.target.closest("[data-cust-option]");
      if (presetBtn && !presetBtn.dataset.custApply) {
        const key   = presetBtn.dataset.custOption;
        const value = presetBtn.dataset.custValue || "";
        const cost  = Number(presetBtn.dataset.custCost || 0);
        if (customizeEntryId) applyCustomizeOption(customizeEntryId, key, value, cost);
        return;
      }

      // Text-input apply button
      const applyBtn = event.target.closest("[data-cust-apply]");
      if (applyBtn) {
        const key   = applyBtn.dataset.custApply;
        const cost  = Number(applyBtn.dataset.custCost || 0);
        const input = document.getElementById(`custInput_${key}`);
        const value = input ? input.value.trim() : "";
        if (customizeEntryId) applyCustomizeOption(customizeEntryId, key, value, cost);
        return;
      }
    });
  }

  if (closeCustomizeModalBtn) {
    closeCustomizeModalBtn.addEventListener("click", closeCustomizeModal);
  }

  if (galleryFeed) {
    galleryFeed.addEventListener("click", (event) => {
      const likeBtn = event.target.closest('[data-like-entry]');
      if (likeBtn) {
        toggleGalleryLike(likeBtn.dataset.likeEntry);
        return;
      }
      const card = event.target.closest('[data-view-entry]');
      if (card) openItemDetailModal(card.dataset.viewEntry);
    });
  }

  if (itemDetailModal) {
    itemDetailModal.addEventListener("click", (event) => {
      if (event.target === itemDetailModal) { closeItemDetailModal(); return; }
      const likeBtn = event.target.closest("#itemDetailLikeBtn");
      if (likeBtn && currentItemDetailEntryId) {
        const savedId = currentItemDetailEntryId;
        toggleGalleryLike(savedId);
        openItemDetailModal(savedId);
      }
    });
  }
  if (closeItemDetailModalBtn) {
    closeItemDetailModalBtn.addEventListener("click", closeItemDetailModal);
  }

  // ===== ТОП — просмотр профиля =====
  if (topList) {
    topList.addEventListener("click", (event) => {
      const item = event.target.closest('[data-view-player]');
      if (!item) return;
      const playerId = item.dataset.viewPlayer;
      if (!playerId) return;
      const opened = openPlayerProfileModal(playerId);
      if (!opened) showToast("Профиль игрока не найден");
    });
    topList.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        const item = event.target.closest('[data-view-player]');
        if (item) {
          event.preventDefault();
          const playerId = item.dataset.viewPlayer;
          const opened = openPlayerProfileModal(playerId);
          if (!opened) showToast("Профиль игрока не найден");
        }
      }
    });
  }
  if (playerProfileModal) {
    playerProfileModal.addEventListener("click", (event) => {
      if (event.target === playerProfileModal) closePlayerProfileModal();
    });
  }
  if (closePlayerProfileModalBtn) {
    closePlayerProfileModalBtn.addEventListener("click", closePlayerProfileModal);
  }

  if (galleryPagination) {
    galleryPagination.addEventListener("click", (event) => {
      const btn = event.target.closest('[data-gallery-page]');
      if (!btn) return;
      const nextPage = Number(btn.dataset.galleryPage);
      if (!Number.isNaN(nextPage) && nextPage !== galleryPage) {
        galleryPage = nextPage;
        renderGallerySection();
      }
    });
  }

  const promoInput = document.getElementById("promoInput");
  const activatePromoBtn = document.getElementById("activatePromoBtn");
  if (activatePromoBtn && promoInput) {
    activatePromoBtn.addEventListener("click", () => {
      if (isCurrentPlayerBanned()) {
        showToast("Игрок заблокирован, промокод недоступен", "error");
        return;
      }
      const code = promoInput.value.trim().toUpperCase();
      if (!code) return;
      
      const player = getCurrentPlayer(state);
      if (!player) return;

      player.usedPromos = player.usedPromos || [];
      if (player.usedPromos.includes(code)) {
        showToast("Вы уже использовали этот промокод");
        return;
      }

      let reward = 0;
      const promoObj = state.promocodes ? state.promocodes.find(p => p.code.toUpperCase() === code) : null;
      if (promoObj) {
        reward = Number(promoObj.reward) || 0;
      }

      if (reward > 0) {
        player.balance += reward;
        player.usedPromos.push(code);
        saveState(state);
        syncPlayerUI();
        promoInput.value = "";
        showToast(`Промокод активирован! Вы получили ${formatBC(reward)}`);
      } else {
        showToast("Неверный промокод");
      }
    });
  }

  if (sellDropBtn) {
    sellDropBtn.addEventListener("click", () => {
      if (isCurrentPlayerBanned()) {
        showToast("Игрок заблокирован, продажа недоступна");
        return;
      }
      if (window.currentDropItem) {
        sellItem(window.currentDropItem.id, window.currentDropItem.value);
        window.currentDropItem = null;
      }
      closeDropModal();
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => closeDropModal());
  }

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeDropModal();
      }
    });
  }

  if (editProfileModal) {
    editProfileModal.addEventListener("click", (event) => {
      if (event.target === editProfileModal) {
          if (document.activeElement) document.activeElement.blur();
          editProfileModal.classList.remove("open");
          editProfileModal.setAttribute("aria-hidden", "true");
      }
    });
  }

  if (donateBtn) {
    donateBtn.addEventListener("click", () => {
      if (isCurrentPlayerBanned()) {
        showToast("Игрок заблокирован, пожертвования недоступны");
        return;
      }
      showToast("Раздел пожертвования будет подключен отдельно");
    });
  }

  // ===== БОНУСЫ: EVENT HANDLERS =====

  if (bonusDailyCard) {
    bonusDailyCard.addEventListener("click", (e) => {
      if (e.target.id === "claimDailyBtn") {
        if (isCurrentPlayerBanned()) {
          showToast("Игрок заблокирован, бонус недоступен", "error");
          return;
        }
        claimDailyBonus();
      }
    });
  }

  if (bonusWheelCard) {
    bonusWheelCard.addEventListener("click", (e) => {
      if (e.target.id === "openWheelBtn") {
        if (isCurrentPlayerBanned()) {
          showToast("Игрок заблокирован, колесо недоступно", "error");
          return;
        }
        openWheelModal();
      }
    });
  }

  if (spinWheelBtn)       spinWheelBtn.addEventListener("click", () => {
    if (isCurrentPlayerBanned()) {
      showToast("Игрок заблокирован, колесо недоступно");
      return;
    }
    spinWheel();
  });
  if (closeWheelModalBtn) closeWheelModalBtn.addEventListener("click", closeWheelModal);
  if (wheelModal) {
    wheelModal.addEventListener("click", (e) => {
      if (e.target === wheelModal) closeWheelModal();
    });
  }

  // Таймер обновления обратного отсчёта каждую секунду
  setInterval(() => {
    renderBonusSection();
    if (wheelModal && wheelModal.classList.contains("open")) updateWheelStatus();
  }, 1000);

  window.addEventListener("storage", () => {
    state = loadState();
    upgradeSelection = [];
    contractSelection = [];
    renderAll();
  });

  renderAll();
  setTimeout(() => {
    renderAll();
  }, 0);
}

function renderAdminApp() {
    // --- Конструктор: выпадающий select со всеми предметами из Excel ---
    let allItemsFromExcel = [];
    const openItemModalBtn = document.getElementById("openItemModalBtn");
    const itemModal = document.getElementById("itemModal");
    const itemModalGrid = document.getElementById("itemModalGrid");
    const closeItemModalBtn = document.getElementById("closeItemModalBtn");

    async function fetchAllItems() {
      try {
        const res = await fetch("allitems.json");
        if (!res.ok) throw new Error("Ошибка загрузки предметов");
        allItemsFromExcel = await res.json();
        window._allItemsCatalog = allItemsFromExcel;
      } catch (e) {
        allItemsFromExcel = [];
        console.error("Не удалось загрузить предметы из Excel:", e);
      }
    }

    function getRarityClass(val) {
      val = (val || "common").toLowerCase();
      if (["серый", "обычный", "gray", "common"].includes(val)) return "rarity-common";
      if (["зеленый", "редкий", "rare", "green"].includes(val)) return "rarity-rare";
      if (["синий", "эпический", "epic", "blue"].includes(val)) return "rarity-epic";
      if (["фиолетовый", "легендарный", "legendary", "purple"].includes(val)) return "rarity-legendary";
      if (["золотой", "секретный", "secret", "gold", "yellow"].includes(val)) return "rarity-secret";
      return "rarity-common";
    }

    function renderItemModalGrid() {
      if (!itemModalGrid) return;
      // Мультивыбор: хранить выбранные индексы
      window.selectedItemModalIdxs = window.selectedItemModalIdxs || [];
      const search = (document.getElementById("itemModalSearch")?.value || "").toLowerCase();
      const sort = document.getElementById("itemModalSort")?.value || "name";
      const rarityFilter = document.getElementById("itemModalRarityFilter")?.value || "";
      const countryFilter = document.getElementById("itemModalCountryFilter")?.value || "";
      let items = allItemsFromExcel.map((item, idx) => ({
        idx,
        name: item.name || item.Название || "Без названия",
        value: Number(item.value || item.Цена || 0),
        rarity: (item.rarity || item.Редкость || "common").toLowerCase(),
        type: item.type || item.Тип || "-",
        country: item.country || item.Страна || "",
        image: item.image || item.Картинка || "img/standart_case.png"
      }));
      if (search) {
        items = items.filter(i => i.name.toLowerCase().includes(search) || i.type.toLowerCase().includes(search));
      }
      if (rarityFilter) {
        items = items.filter(i => i.rarity === rarityFilter);
      }
      if (countryFilter) {
        items = items.filter(i => (i.country || "") === countryFilter);
      }
      if (sort === "name") {
        items.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      } else if (sort === "value") {
        items.sort((a, b) => b.value - a.value);
      } else if (sort === "rarity") {
        const order = ["secret","legendary","epic","rare","common"];
        items.sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
      } else if (sort === "type") {
        items.sort((a, b) => a.type.localeCompare(b.type, 'ru'));
      } else if (sort === "country") {
        items.sort((a, b) => (a.country || "").localeCompare(b.country || "", 'ru'));
      }
      // Рендер карточек с выделением
      itemModalGrid.innerHTML = items.map(item => {
        const selected = window.selectedItemModalIdxs.includes(item.idx);
        return `<div class="item-card-modal ${getRarityClass(item.rarity)}${selected ? ' selected' : ''}" data-idx="${item.idx}" style="background:#20212a; border-radius:14px; padding:14px; cursor:pointer; border:3px solid; display:flex; flex-direction:column; align-items:center; position:relative;">
          <span class="selected-check">${selected ? '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#ffe066"/><path d="M6 10.5L9 13.5L14 8.5" stroke="#222" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}</span>
          <img src="${item.image}" alt="${item.name}" style="width:72px; height:72px; object-fit:contain; margin-bottom:10px; border-radius:8px; background:#181922; border:2px solid #333;">
          <div class="item-title" style="font-weight:700; color:#fff; font-size:15px; text-align:center; margin-bottom:4px;">${item.name}</div>
          <div style="font-size:12px; color:#aaa; margin-bottom:2px;">${item.type}</div>
          <div style="font-size:13px; color:#ffcc00; font-weight:600; margin-bottom:2px;">${item.value} BC</div>
          <div style="font-size:11px; color:#fff; opacity:0.7;">${rarityLabel(item.rarity)}</div>
        </div>`;
      }).join("");
      // Кнопка добавить
      const addBtn = document.getElementById("addSelectedItemsBtn");
      if (addBtn) addBtn.disabled = !window.selectedItemModalIdxs.length;
    }

    fetchAllItems().then(() => {
      if (openItemModalBtn) {
        openItemModalBtn.addEventListener("click", () => {
          window.selectedItemModalIdxs = [];
          renderItemModalGrid();
          itemModal.style.display = "flex";
        });
      }
      if (closeItemModalBtn) {
        closeItemModalBtn.addEventListener("click", () => {
          itemModal.style.display = "none";
        });
      }
      if (itemModal) {
        itemModal.addEventListener("click", (e) => {
          if (e.target === itemModal) itemModal.style.display = "none";
        });
      }
      // События поиска, сортировки, фильтра
      const searchInput = document.getElementById("itemModalSearch");
      const sortSelect = document.getElementById("itemModalSort");
      const raritySelect = document.getElementById("itemModalRarityFilter");
      const countrySelect = document.getElementById("itemModalCountryFilter");
      if (searchInput) searchInput.addEventListener("input", renderItemModalGrid);
      if (sortSelect) sortSelect.addEventListener("change", renderItemModalGrid);
      if (raritySelect) raritySelect.addEventListener("change", renderItemModalGrid);
      if (countrySelect) countrySelect.addEventListener("change", renderItemModalGrid);
      if (itemModalGrid) {
        // Мультивыбор карточек
        itemModalGrid.addEventListener("click", (e) => {
          const card = e.target.closest(".item-card-modal");
          if (!card) return;
          const idx = Number(card.getAttribute("data-idx"));
          window.selectedItemModalIdxs = window.selectedItemModalIdxs || [];
          if (window.selectedItemModalIdxs.includes(idx)) {
            window.selectedItemModalIdxs = window.selectedItemModalIdxs.filter(i => i !== idx);
          } else {
            window.selectedItemModalIdxs.push(idx);
          }
          renderItemModalGrid();
        });
        // Кнопка добавить выбранные
        const addBtn = document.getElementById("addSelectedItemsBtn");
        if (addBtn) {
          addBtn.addEventListener("click", () => {
            if (!window.selectedItemModalIdxs || !window.selectedItemModalIdxs.length) return;
            window.selectedItemModalIdxs.forEach(idx => {
              const item = allItemsFromExcel[idx];
              draftItems.push({
                name: item.name || item.Название || "",
                type: item.type || item.Тип || "",
                rarity: item.rarity || item.Редкость || "common",
                value: item.value || item.Цена || 0,
                image: item.image || item.Картинка || "img/standart_case.png"
              });
            });
            window.selectedItemModalIdxs = [];
            renderCaseDraftItems();
            itemModal.style.display = "none";
          });
        }
      }
    });
  let state = loadState();

  const rarityForm = document.getElementById("rarityForm");
  const rarityInputsWrap = document.getElementById("rarityInputs");

  const caseForm = document.getElementById("caseForm");
  const caseList = document.getElementById("caseList");
  const caseIdInput = document.getElementById("caseId");
  const caseNameInput = document.getElementById("caseName");
  const casePriceInput = document.getElementById("casePrice");
  const caseImageInput = document.getElementById("caseImage");
  const caseCategoryInput = document.getElementById("caseCategory");

  // Управление категориями
  const addCategoryBtn = document.getElementById("addCategoryBtn");
  const categoryNameInput = document.getElementById("categoryName");
  const categoryDescriptionInput = document.getElementById("categoryDescription");
  const categoriesList = document.getElementById("categoriesList");

  // Удаляем ручные поля, оставляем только выбор предмета
  const addItemBtn = document.getElementById("addItemBtn");
  const caseItemsList = document.getElementById("caseItemsList");

  const playerList = document.getElementById("playerList");
  const addPlayerForm = document.getElementById("addPlayerForm");

  const newsList = document.getElementById("adminNewsList");
  const newsForm = document.getElementById("newsForm");
  const newsTextInput = document.getElementById("newsText");
  
  const promoForm = document.getElementById("promoForm");
  const promoCodeInput = document.getElementById("promoCodeInput");
  const promoRewardInput = document.getElementById("promoRewardInput");
  const adminPromoList = document.getElementById("adminPromoList");

  const resetDbBtn = document.getElementById("resetDbBtn");
  const resetTopBtn = document.getElementById("resetTopBtn");

  let draftItems = [];

// Реалтайм обновление статистики при изменении цены кейса
if (casePriceInput) {
  casePriceInput.addEventListener('input', () => {
    renderCaseDraftItems();
  });
}

  function refreshState() {
    console.log('[Admin] loadState => cases:', state.cases.length, 'players:', state.players.length);
    state = loadState();
  }

  function updateState(next) {
    state = next;
    saveState(state);
  }

  function renderRarityForm() {
    const entries = Object.keys(rarityMeta);
    console.log('[Admin] Generating Rarity Form HTML. Entries:', entries.length);
    rarityInputsWrap.innerHTML = entries
      .map((code) => {
        return `
          <div class="form-group" style="margin: 0;">
            <label style="color: ${rarityColor(code)};">${rarityLabel(code)} (%)</label>
            <input type="number" name="${code}" min="0" step="0.1" value="${Number(state.rarityChances[code] || 0)}" required />
          </div>
        `;
      })
      .join("");
  }

  function renderCaseDraftItems() {
    if (!draftItems.length) {
      caseItemsList.innerHTML = '<div style="color:var(--text-muted); font-size: 13px; text-align:center; padding: 10px;">Предметы пока не добавлены</div>';
      return;
    }

    // Расчёт средней стоимости дропа и окупаемости с учетом экономики (шансов редкостей)
    const casePrice = Number(document.getElementById('casePrice')?.value || 0);
    // Получаем актуальные шансы редкостей
    const chances = (window.state?.rarityChances || state?.rarityChances || defaultState.rarityChances);
    // Группируем предметы по редкости
    const rarityGroups = {};
    draftItems.forEach(item => {
      const r = (item.rarity || item.Редкость || 'common').toLowerCase();
      if (!rarityGroups[r]) rarityGroups[r] = [];
      rarityGroups[r].push(item);
    });
    // Считаем среднюю стоимость по каждой редкости
    const rarityAvgs = {};
    Object.keys(chances).forEach(rarity => {
      const items = rarityGroups[rarity] || [];
      if (items.length) {
        rarityAvgs[rarity] = items.reduce((a,b) => a+Number(b.value||0),0) / items.length;
      } else {
        rarityAvgs[rarity] = 0;
      }
    });
    // Итоговая средняя стоимость дропа с учетом экономики
    let avgDrop = 0;
    Object.keys(chances).forEach(rarity => {
      avgDrop += (Number(chances[rarity]||0)/100) * (rarityAvgs[rarity]||0);
    });
    const payback = casePrice ? (avgDrop / casePrice * 100) : 0;
    caseItemsList.innerHTML =
      draftItems
        .map((item, index) => {
          return `
            <div class="admin-list-item" style="padding: 10px 12px; gap: 4px; border-left: 3px solid ${rarityColor(item.rarity)}">
              <div class="item-header">
                <span class="item-title" style="font-size:13px;">${item.name}</span>
                <button class="btn-sm btn-danger" style="padding:4px 8px; border-radius:4px;" data-remove-draft="${index}" type="button"><i class="fa-solid fa-xmark"></i></button>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px;">
                <span class="draft-badge" style="background: rgba(255,255,255,0.1); color:#fff;">${rarityLabel(item.rarity)}</span>
                <span class="item-price">${formatBC(item.value || 0)}</span>
              </div>
            </div>
          `;
        })
        .join("");

    // Выводим инфо о кейсе в отдельный блок
    const statsDiv = document.getElementById('caseStatsInfo');
    if (statsDiv) {
      let table = `<table style="width:100%; font-size:13px; color:#fff; margin-bottom:8px; border-spacing:0 2px;">
        <tr><th style='text-align:left;'>Редкость</th><th>Шанс</th><th>Сред. цена</th></tr>`;
      Object.keys(chances).forEach(rarity => {
        table += `<tr><td style='color:${rarityColor(rarity)};'>${rarityLabel(rarity)}</td><td>${Number(chances[rarity]||0).toFixed(1)}%</td><td>${formatBC(rarityAvgs[rarity]||0)}</td></tr>`;
      });
      table += `</table>`;
      statsDiv.innerHTML = `<div style="padding:10px 14px; background:rgba(255,255,255,0.04); border-radius:10px; font-size:13px; color:#fff;">
        <b>Средняя стоимость дропа (учёт экономики):</b> <span style="color:#ffe066;">${formatBC(avgDrop)}</span><br>
        <b>Цена открытия кейса:</b> <span style="color:#ffe066;">${formatBC(casePrice)}</span><br>
        <b>Средняя окупаемость:</b> <span style="color:#ffe066;">${payback.toFixed(1)}%</span>
        <div style="margin-top:10px;">${table}</div>
      </div>`;
    }
  }

  function renderCategories() {
    if (!state.caseCategories || !state.caseCategories.length) {
      categoriesList.innerHTML = '<div style="color:var(--text-muted); padding: 20px; text-align:center;">Категории не создавались</div>';
      return;
    }

    categoriesList.innerHTML = state.caseCategories
      .map((cat) => {
        const casesInCat = (cat.caseIds || []).length;
        return `
          <div class="admin-list-item" style="padding: 12px; border-left: 3px solid #ffe066;">
            <div class="item-header">
              <div>
                <div class="item-title">${cat.name}</div>
                <div class="item-subtitle">${cat.description || 'Без описания'}</div>
              </div>
              <div class="item-subtitle" style="text-align: right;">📦 ${casesInCat}</div>
            </div>
            <div class="item-actions">
              <button class="btn btn-outline" data-edit-category="${cat.id}" type="button" style="flex:1; padding: 8px;"><i class="fa-solid fa-pen-to-square"></i> Изменить</button>
              <button class="btn btn-danger" data-delete-category="${cat.id}" type="button" style="flex:1; padding: 8px;"><i class="fa-solid fa-trash"></i> Удалить</button>
            </div>
          </div>
        `;
      })
      .join("");

    // Обновляем select для выбора категории при создании кейса
    if (caseCategoryInput) {
      caseCategoryInput.innerHTML = `<option value="">Выберите категорию</option>` +
        state.caseCategories.map((cat) => `<option value="${cat.id}">${cat.name}</option>`).join("");
    }
  }

  function renderCaseList() {
    if (!state.cases.length) {
      console.log('Rendering 0 cases..'); caseList.innerHTML = '<div style="color:var(--text-muted); padding: 20px; text-align:center;">Список кейсов пуст</div>';
      return;
    }

    console.log('Rendering cases UI...'); if(!caseList) { console.error('caseList is null!'); return; }
    caseList.innerHTML = state.cases
      .map((item) => {
        return `
          <div class="admin-list-item">
            <div class="item-header">
              <div>
                <div class="item-title">${item.name}</div>
                <div class="item-subtitle" style="font-family: monospace;">ID: ${item.id}</div>
              </div>
              <div class="item-price">${formatBC(item.price)}</div>
            </div>
            <div class="item-subtitle"><i class="fa-solid fa-box"></i> Предметов внутри: ${item.items ? item.items.length : 0}</div>
            <div class="item-actions">
              <button class="btn btn-outline" data-edit-case="${item.id}" type="button" style="flex:1; padding: 8px;"><i class="fa-solid fa-pen-to-square"></i> Изменить</button>
              <button class="btn btn-danger" data-delete-case="${item.id}" type="button" style="flex:1; padding: 8px;"><i class="fa-solid fa-trash"></i> Удалить</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderPlayers() {
    if (!state.players.length) {
      playerList.innerHTML = '<div style="color:var(--text-muted); padding: 20px; text-align:center;">Игроки не найдены</div>';
      return;
    }

    if(!playerList) { console.error('playerList is null!'); return; } 
    playerList.innerHTML = state.players
      .map((player) => {
        const inventoryText = (player.inventory || []).map((item) => item.name).join("\\n");
        const playerBadges = Array.isArray(player.badges) ? player.badges : [];
        const badgeCheckboxes = Object.entries(BADGE_TYPES).map(([key, b]) => `
          <label class="badge-toggle-label">
            <input type="checkbox" data-badge-toggle="${player.id}" data-badge-key="${key}" ${playerBadges.includes(key) ? "checked" : ""}>
            <span class="player-badge ${b.cls}" title="${b.title}">${BADGE_SVG[key]}</span> ${b.label}
          </label>
        `).join("");
        const bannedLabel = player.banned ? `<span style="display:inline-flex; align-items:center; gap:6px; padding:4px 9px; border-radius:8px; background:rgba(255,0,0,0.14); color:#ff7b7b; font-size:12px;">⚠️ Забанен</span>` : "";
        const banButton = player.banned
          ? `<button class="btn btn-outline" data-toggle-ban="${player.id}" type="button" style="flex:1; padding: 8px;"><i class="fa-solid fa-lock-open"></i> Разбанить</button>`
          : `<button class="btn btn-danger" data-toggle-ban="${player.id}" type="button" style="flex:1; padding: 8px;"><i class="fa-solid fa-ban"></i> Забанить</button>`;
        return `
          <div class="admin-list-item" style="gap: 15px; border-color: ${player.banned ? 'rgba(255,99,99,0.4)' : 'rgba(255,255,255,0.08)'};">
            <div style="display:flex; gap:10px; width: 100%;">
              <div class="form-group" style="flex:1; margin:0;">
                <label>Никнейм</label>
                <input data-player-nick="${player.id}" value="${player.nick}" />
              </div>
              <div class="form-group" style="flex:1; margin:0;">
                <label>Сервер</label>
                <input data-player-server="${player.id}" value="${player.server}" />
              </div>
              <div class="form-group" style="flex:1; margin:0;">
                <label>BC</label>
                <input type="number" min="0" step="1" data-player-balance="${player.id}" value="${Math.round(player.balance || 0)}" />
              </div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:space-between; margin-bottom:10px;">
              ${bannedLabel}
              <div style="font-size:13px; color:var(--text-muted);">Открыл кейсов: ${(player.stats?.opened || 0).toLocaleString('ru-RU')}</div>
              <div style="font-size:13px; color:var(--text-muted);">Потрачено: ${formatBC(player.totalSpent || 0)}</div>
            </div>
            <div class="form-group" style="margin:0;">
              <label>Инвентарь (каждый предмет с новой строк)</label>
              <textarea rows="2" data-player-inventory="${player.id}">${inventoryText}</textarea>
            </div>
            <div class="form-group" style="margin:0;">
              <label>Верификация</label>
              <div class="badge-toggles">${badgeCheckboxes}</div>
            </div>
            <div class="item-actions">
              <button class="btn" data-save-player="${player.id}" type="button" style="flex:1"><i class="fa-solid fa-floppy-disk"></i> Обновить</button>
              ${banButton}
              <button class="btn btn-danger" data-delete-player="${player.id}" type="button" style="flex:1"><i class="fa-solid fa-user-xmark"></i> Удалить</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderNews() {
    if (!newsList) return;
    if (!state.news.length) {
      newsList.innerHTML = '<div style="color:var(--text-muted); padding: 20px; text-align:center;">Новостей нет</div>';
      return;
    }

    newsList.innerHTML = state.news
      .map((news, index) => {
        return `
          <div class="admin-list-item">
            <div class="form-group" style="margin:0;">
              <textarea style="width:100%; box-sizing:border-box;" rows="3" data-news-text="${index}">${news}</textarea>
            </div>
            <div class="item-actions">
              <button class="btn btn-outline" data-save-news="${index}" type="button" style="flex:1;"><i class="fa-solid fa-floppy-disk"></i> Сохранить</button>
              <button class="btn btn-danger" data-delete-news="${index}" type="button" style="flex:1;"><i class="fa-solid fa-trash"></i> Удалить</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderPromos() {
    if (!adminPromoList) return;
    const promos = state.promocodes || [];
    
    if (promos.length === 0) {
      adminPromoList.innerHTML = '<p style="color:var(--text-muted); font-size:13px; text-align:center;">Промокодов пока нет.</p>';
      return;
    }

    adminPromoList.innerHTML = promos.map((p, index) => {
      return `
        <div class="admin-list-item" style="flex-direction: row; align-items: center; justify-content: space-between;">
          <div>
            <div class="item-title">${p.code}</div>
            <div class="item-subtitle">Награда: <span style="color:#00e676;">${formatBC(p.reward)}</span></div>
          </div>
          <button class="btn btn-danger btn-sm" data-delete-promo="${index}"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
    }).join("");
  }

  function renderDashboardStats() {
    const dashboard = document.getElementById('dashboardStats');
    if (!dashboard) return;

    const totalPlayers = state.players.length;
    const bannedPlayers = state.players.filter(p => p.banned).length;
    const totalBalance = state.players.reduce((sum, p) => sum + Number(p.balance || 0), 0);
    const totalCasesOpened = state.players.reduce((sum, p) => sum + Number(p.stats?.opened || 0), 0);
    const totalSpend = state.players.reduce((sum, p) => sum + Number(p.totalSpent || 0), 0);
    const avgSpend = totalPlayers ? Math.round(totalSpend / totalPlayers) : 0;

    dashboard.innerHTML = `
      <div class="card">
        <h3><i class="fa-solid fa-users"></i> Игроков всего</h3>
        <p style="font-size: 32px; margin-top: 10px;">${totalPlayers}</p>
      </div>
      <div class="card">
        <h3><i class="fa-solid fa-user-lock"></i> Забанено</h3>
        <p style="font-size: 32px; margin-top: 10px;">${bannedPlayers}</p>
      </div>
      <div class="card">
        <h3><i class="fa-solid fa-coins"></i> Общий баланс</h3>
        <p style="font-size: 32px; margin-top: 10px;">${formatBC(totalBalance)}</p>
      </div>
      <div class="card">
        <h3><i class="fa-solid fa-chart-line"></i> Открыл кейсов</h3>
        <p style="font-size: 32px; margin-top: 10px;">${totalCasesOpened.toLocaleString('ru-RU')}</p>
      </div>
      <div class="card" style="grid-column: span 2;">
        <h3><i class="fa-solid fa-money-bill-trend-up"></i> Средние траты</h3>
        <p style="font-size: 32px; margin-top: 10px;">${formatBC(avgSpend)}</p>
      </div>
    `;
  }

  function renderAll() {
    console.log("%c[Admin] Rendering...", "color:cyan");
    refreshState();
    console.table({ 'cases': state.cases.length, 'players': state.players.length, 'news': state.news.length });
    try { renderRarityForm(); } catch(e) { console.error("%c[Render] Error: Форма редкости", "color:yellow", e); }
    try { renderCategories(); } catch(e) { console.error("%c[Render] Error: Категории", "color:yellow", e); }
    try { renderCaseDraftItems(); } catch(e) { console.error("%c[Render] Error: Черновик кейсов", "color:yellow", e); }
    try { renderCaseList(); } catch(e) { console.error("%c[Render] Error: Список кейсов", "color:yellow", e); }
    try { renderPlayers(); } catch(e) { console.error("%c[Render] Error: Игроки", "color:yellow", e); }
    try { renderNews(); } catch(e) { console.error("%c[Render] Error: Новости", "color:yellow", e); }
    try { renderPromos(); } catch(e) { console.error("%c[Render] Error: Промокоды", "color:yellow", e); }
    try { renderDashboardStats(); } catch(e) { console.error("%c[Render] Error: Dashboard", "color:yellow", e); }
  }

  rarityForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(rarityForm);
    const next = { ...state, rarityChances: {} };

    for (const [key, value] of data.entries()) {
      next.rarityChances[key] = Number(value || 0);
    }

    next.rarityChances = normalizeChances(next.rarityChances);
    updateState(next);
    renderRarityForm();
    showToast("Шансы редкостей обновлены");
  });

  // Обработчик добавления категории
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener("click", () => {
      const name = categoryNameInput.value.trim();
      const description = categoryDescriptionInput.value.trim();

      if (!name) {
        showToast("Введите название категории");
        return;
      }

      const next = { ...state };
      const newCategory = {
        id: `cat_${Date.now()}`,
        name,
        description,
        caseIds: []
      };
      
      next.caseCategories = next.caseCategories || [];
      next.caseCategories.push(newCategory);

      updateState(next);
      categoryNameInput.value = "";
      categoryDescriptionInput.value = "";
      renderAll();
      showToast("Категория добавлена");
    });
  }

  // Обработчик управления категориями
  if (categoriesList) {
    categoriesList.addEventListener("click", (event) => {
      const deleteBtn = event.target.closest('[data-delete-category]');
      
      if (deleteBtn) {
        const catId = deleteBtn.dataset.deleteCategory;
        if (confirm("Удалить эту категорию? Кейсы останутся в базе.")) {
          const next = { ...state };
          next.caseCategories = next.caseCategories.filter((cat) => cat.id !== catId);
          updateState(next);
          renderAll();
          showToast("Категория удалена");
        }
      }
    });
  }

  addItemBtn.addEventListener("click", () => {
    const idx = itemSelect.value;
    if (!allItemsFromExcel[idx]) {
      showToast("Выберите предмет из списка");
      return;
    }
    const item = allItemsFromExcel[idx];
    draftItems.push({
      name: item.Название || item.name || "",
      rarity: item.Редкость || item.rarity || "common",
      value: item.Цена || item.value || 0,
      image: item.Картинка || item.image || "img/standart_case.png",
      type: item.Тип || item.type || ""
    });
    itemSelect.value = "";
    renderCaseDraftItems();
  });

  caseItemsList.addEventListener("click", (event) => {
    const btn = event.target.closest('button[data-remove-draft]');
    if (!btn) return;

    const removeIndex = btn.dataset.removeDraft;
    if (removeIndex !== undefined) {
      draftItems.splice(Number(removeIndex), 1);
      renderCaseDraftItems();
    }
  });

  caseForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const id = caseIdInput.value.trim() || `case_${Date.now()}`;
    const name = caseNameInput.value.trim();
    const price = Number(casePriceInput.value || 0);
    const image = caseImageInput.value.trim() || fallbackImage;
    const categoryId = caseCategoryInput.value.trim();

    if (!name) {
      showToast("Введите название кейса");
      return;
    }

    if (!categoryId) {
      showToast("Выберите категорию");
      return;
    }

    if (!draftItems.length) {
      showToast("Добавьте хотя бы один предмет");
      return;
    }

    const next = { ...state };
    const existsIndex = next.cases.findIndex((item) => item.id === id);
    const originalCategoryId = existsIndex >= 0 ? next.cases[existsIndex].categoryId : null;
    const payload = {
      id,
      name,
      price,
      image,
      items: draftItems,
      categoryId: categoryId
    };

    if (existsIndex >= 0) {
      next.cases[existsIndex] = payload;
    } else {
      next.cases.push(payload);
    }

    // Перенос кейса между категориями
    if (originalCategoryId && originalCategoryId !== categoryId) {
      next.caseCategories = (next.caseCategories || []).map((cat) => {
        if (!cat.caseIds) return cat;
        return {
          ...cat,
          caseIds: cat.caseIds.filter((caseId) => caseId !== id)
        };
      });
    }

    const catIndex = (next.caseCategories || []).findIndex((cat) => cat.id === categoryId);
    if (catIndex >= 0) {
      next.caseCategories[catIndex].caseIds = next.caseCategories[catIndex].caseIds || [];
      if (!next.caseCategories[catIndex].caseIds.includes(id)) {
        next.caseCategories[catIndex].caseIds.push(id);
      }
    }

    updateState(next);

    caseIdInput.value = "";
    caseNameInput.value = "";
    casePriceInput.value = "";
    caseImageInput.value = "";
    caseCategoryInput.value = "";
    draftItems = [];

    renderCaseDraftItems();
    renderCaseList();
    renderCategories();
    showToast("Кейс сохранен");
  });

  document.getElementById("clearCaseDraftBtn").addEventListener("click", () => {
    draftItems = [];
    caseIdInput.value = "";
    caseNameInput.value = "";
    casePriceInput.value = "";
    caseImageInput.value = "";
    renderCaseDraftItems();
  });

  caseList.addEventListener("click", (event) => {
    const editBtn = event.target.closest('[data-edit-case]');
    const deleteBtn = event.target.closest('[data-delete-case]');

    const editId = editBtn ? editBtn.dataset.editCase : null;
    const deleteId = deleteBtn ? deleteBtn.dataset.deleteCase : null;

    if (editId) {
      const item = state.cases.find((entry) => entry.id === editId);
      if (!item) return;

      caseIdInput.value = item.id;
      caseNameInput.value = item.name;
      casePriceInput.value = item.price;
      caseImageInput.value = item.image;
      caseCategoryInput.value = item.categoryId || "";
      draftItems = item.items.map((entry) => ({ ...entry }));
      renderCaseDraftItems();
      showToast("Кейс загружен в форму");
    }

    if (deleteId) {
        supabaseClient.from('cases').delete().eq('id', deleteId).then();
        const next = { ...state, cases: state.cases.filter((entry) => entry.id !== deleteId) };
      updateState(next);
      renderCaseList();
      showToast("Кейс удален");
    }
  });

  playerList.addEventListener("click", (event) => {
    const saveBtn = event.target.closest('[data-save-player]');
    const deleteBtn = event.target.closest('[data-delete-player]');
    const toggleBanBtn = event.target.closest('[data-toggle-ban]');

    const savePlayerId = saveBtn ? saveBtn.dataset.savePlayer : null;
    const deletePlayerId = deleteBtn ? deleteBtn.dataset.deletePlayer : null;
    const toggleBanId = toggleBanBtn ? toggleBanBtn.dataset.toggleBan : null;

    if (savePlayerId) {
      const next = { ...state };
      const idx = next.players.findIndex((player) => player.id === savePlayerId);
      if (idx < 0) return;

      const nickInputEl = playerList.querySelector(`[data-player-nick="${savePlayerId}"]`);
      const serverInputEl = playerList.querySelector(`[data-player-server="${savePlayerId}"]`);
      const balanceInputEl = playerList.querySelector(`[data-player-balance="${savePlayerId}"]`);
      const inventoryInputEl = playerList.querySelector(`[data-player-inventory="${savePlayerId}"]`);
      const badgeCheckboxEls = playerList.querySelectorAll(`[data-badge-toggle="${savePlayerId}"]`);
      const badges = Array.from(badgeCheckboxEls).filter((cb) => cb.checked).map((cb) => cb.dataset.badgeKey);

      const inventoryLines = (inventoryInputEl.value || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      next.players[idx] = {
        ...next.players[idx],
        nick: nickInputEl.value.trim() || next.players[idx].nick,
        server: serverInputEl.value.trim() || next.players[idx].server,
        balance: Number(balanceInputEl.value || 0),
        badges,
        inventory: inventoryLines.map((name) => ({
          id: `manual_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          name,
          rarity: "gray",
          value: 0,
          droppedAt: Date.now()
        }))
      };

      updateState(next);
      renderPlayers();
      showToast("Игрок обновлен");
    }

    if (toggleBanId) {
      const next = { ...state };
      const idx = next.players.findIndex((player) => player.id === toggleBanId);
      if (idx < 0) return;
      next.players[idx] = {
        ...next.players[idx],
        banned: !next.players[idx].banned
      };
      updateState(next);
      renderPlayers();
      showToast(next.players[idx].banned ? "Игрок забанен" : "Игрок разбанен");
    }

    if (deletePlayerId) {
      const nextPlayers = state.players.filter((player) => player.id !== deletePlayerId);
      if (!nextPlayers.length) {
        showToast("Нельзя удалить всех игроков");
        return;
      }

      const next = { ...state, players: nextPlayers };
      if (!next.players.some((player) => player.id === next.currentPlayerId)) {
        next.currentPlayerId = next.players[0].id;
      }

      updateState(next);
      renderPlayers();
      showToast("Игрок удален");
    }
  });

  addPlayerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(addPlayerForm);

    const nick = String(data.get("nick") || "").trim();
    const server = String(data.get("server") || "").trim();
    const balance = Number(data.get("balance") || 0);

    if (!nick || !server) {
      showToast("Введите ник и сервер");
      return;
    }

    const next = { ...state };
    next.players.push({
      id: `player_${Date.now()}`,
      nick,
      server,
      balance,
      inventory: [],
      stats: { opened: 0 },
      totalSpent: 0,
      banned: false
    });

    updateState(next);
    renderPlayers();
    addPlayerForm.reset();
    showToast("Игрок добавлен");
  });

  newsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = newsTextInput.value.trim();
    if (!value) {
      showToast("Введите текст новости");
      return;
    }

    const next = { ...state, news: [value, ...state.news] };
    updateState(next);
    newsForm.reset();
    renderNews();
    showToast("Новость добавлена");
  });

  if (newsList) {
    newsList.addEventListener("click", (event) => {
    const saveBtn = event.target.closest('[data-save-news]');
    const deleteBtn = event.target.closest('[data-delete-news]');

    const saveIdx = saveBtn ? saveBtn.dataset.saveNews : undefined;
    const deleteIdx = deleteBtn ? deleteBtn.dataset.deleteNews : undefined;

    if (saveIdx !== undefined) {
      const input = newsList.querySelector(`[data-news-text="${saveIdx}"]`);
      if (!input) return;

      const next = { ...state, news: state.news.slice() };
      next.news[Number(saveIdx)] = input.value.trim() || next.news[Number(saveIdx)];
      updateState(next);
      renderNews();
      showToast("Новость сохранена");
    }

    if (deleteIdx !== undefined) {
      const next = { ...state, news: state.news.filter((_, idx) => idx !== Number(deleteIdx)) };
      updateState(next);
      renderNews();
      showToast("Новость удалена");
    }
  });
  }

  if (promoForm) {
    promoForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const code = promoCodeInput.value.trim().toUpperCase();
      const reward = Number(promoRewardInput.value);

      if (!code || reward <= 0) {
        showToast("Некорректные данные для промокода", "red");
        return;
      }

      const next = { ...state, promocodes: (state.promocodes || []).slice() };
      const existsIdx = next.promocodes.findIndex(p => p.code === code);
      if (existsIdx !== -1) {
        next.promocodes[existsIdx].reward = reward;
      } else {
        next.promocodes.push({ code, reward });
      }

      updateState(next);
      promoCodeInput.value = "";
      promoRewardInput.value = "";
      renderPromos();
      showToast("Промокод успешно сохранён!");
    });
  }

  if (adminPromoList) {
    adminPromoList.addEventListener("click", (event) => {
      const deleteBtn = event.target.closest('[data-delete-promo]');
      if (!deleteBtn) return;
      const idx = deleteBtn.dataset.deletePromo;
      if (idx !== undefined) {
        const next = { ...state, promocodes: state.promocodes.filter((_, i) => i !== Number(idx)) };
        updateState(next);
        renderPromos();
        showToast("Промокод удален!");
      }
    });
  }

  resetDbBtn.addEventListener("click", () => {
    if (!confirm("Вы уверены? Это сбросит всю статистику ВСЕХ игроков, но сохранит их аккаунты")) return;
    // Сброс статистики всех игроков, но не удаление самих игроков
    state.players = state.players.map((p) => ({
      ...p,
      balance: 1500,
      inventory: [],
      stats: { opened: 0 },
      totalSpent: 0
    }));
    updateState(state);
    renderAll();
    showToast("Статистика всех игроков сброшена! Аккаунты сохранены");
  });

  if (resetTopBtn) {
    resetTopBtn.addEventListener("click", () => {
      if (!confirm("Сбросить топ? Счёт всех игроков (открытые кейсы) будет обнулён.")) return;
      state.players = state.players.map((p) => ({
        ...p,
        stats: { ...(p.stats || {}), opened: 0 },
        totalSpent: 0
      }));
      updateState(state);
      renderAll();
      showToast("Топ сброшен");
    });
  }

  renderAll();
}

async function bootstrap() {
  showPageLoader();
  
  globalState = await fetchStateFromSupabase();

  if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
    const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
    if (tgUser) {
      const pid = 'tg_' + tgUser.id;
      let found = globalState.players.find(p => p.id === pid);
      if (!found) {
        found = {
          id: pid,
          nick: tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : ''),
          server: 'Сервер',
          balance: 1500,
          inventory: [],
          stats: { opened: 0 },
          totalSpent: 0
        };
        globalState.players.push(found);
      }
      
      if (!found.stats) found.stats = { opened: 0 };
      found.stats.photo_url = tgUser.photo_url || '';
      found.stats.tg_username = tgUser.username || '';
      if (found.nick === 'User' || !found.nick) {
        found.nick = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
      }
      
      globalState.currentPlayerId = pid;
      saveState(globalState);
      
      try {
        window.Telegram.WebApp.expand();
      } catch (e) {}
    }
  }

  const page = document.body.dataset.page;
  if (["main", "upgrade", "contract", "gallery", "top", "profile", "donate"].includes(page)) {
    renderMainApp();
  }
  if (page === "admin") {
    renderAdminApp();
  }
  
  hidePageLoader();
}

bootstrap();

/* ======================================================
   SHARED CHAT UTILITIES
   ====================================================== */

function formatMessageTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'сейчас';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} дн назад`;

  return date.toLocaleDateString('ru-RU');
}

function getPlayerAvatar(nick) {
  const avatars = ['🎮', '👾', '🎯', '🏆', '⚡', '🔥', '💎', '🌟', '🎨', '🚀'];
  let hash = 0;
  for (let i = 0; i < nick.length; i++) {
    hash = ((hash << 5) - hash) + nick.charCodeAt(i);
    hash = hash & hash;
  }
  return avatars[Math.abs(hash) % avatars.length];
}

function escapeAttr(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ======================================================
   GLOBAL CHAT SYSTEM
   ====================================================== */

const ChatSystem = (function () {
  const chatModal = document.getElementById('chatModal');
  const chatFabBtn = document.getElementById('chatFabBtn');
  const chatCloseBtn = document.getElementById('chatCloseBtn');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatMessages = document.getElementById('chatMessages');
  const chatBadge = document.getElementById('chatBadge');
  const chatOnlineCount = document.getElementById('chatOnlineCount');
  const globalReplyPreview = document.getElementById('globalReplyPreview');
  const globalReplyPreviewText = document.getElementById('globalReplyPreviewText');
  const globalReplyPreviewClose = document.getElementById('globalReplyPreviewClose');

  let messages = [];
  let isOpen = false;
  let unreadCount = 0;
  let lastMessageTime = 0;
  let isLoadingMessages = false;
  let selectedReplyToId = null;

  // Open/Close handlers
  function openChat() {
    isOpen = true;
    chatModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('chat-open');
    loadMessages();
    unreadCount = 0;
    updateBadge();
  }

  function closeChat() {
    isOpen = false;
    chatModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.classList.remove('chat-open');
  }

  function toggleChat() {
    isOpen ? closeChat() : openChat();
  }

  // Load messages from Supabase
  async function loadMessages() {
    if (isLoadingMessages) return;
    isLoadingMessages = true;

    try {
      const { data: msgs, error } = await supabaseClient
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Ошибка загрузки сообщений:', error);
        return;
      }

      const newMessages = msgs || [];
      const prevMessages = messages;
      const prevCount = prevMessages.length;
      const canAppend = prevCount > 0 && newMessages.length > prevCount && newMessages.slice(0, prevCount).every((msg, idx) => msg.id === prevMessages[idx].id);

      messages = newMessages;
      lastMessageTime = messages.length > 0 ? new Date(messages[messages.length - 1].created_at).getTime() : 0;

      if (canAppend) {
        appendNewMessages(newMessages.slice(prevCount));
      } else {
        renderMessages();
        scrollToBottom();
      }

      // Load reactions for global chat
      await loadGlobalReactions();
    } catch (err) {
      console.error('Ошибка при загрузке сообщений:', err);
    } finally {
      isLoadingMessages = false;
    }
  }

  async function loadGlobalReactions() {
    if (!messages.length) return;

    const messageIds = messages.map(m => m.id);
    try {
      const { data: reactions, error } = await supabaseClient
        .from('message_reactions')
        .select('*')
        .eq('message_type', 'global')
        .in('message_id', messageIds);

      if (error || !reactions) {
        console.error('Ошибка загрузки реакций:', error);
        return;
      }

      // Group reactions by message_id
      const reactionsByMessage = {};
      reactions.forEach(r => {
        if (!reactionsByMessage[r.message_id]) {
          reactionsByMessage[r.message_id] = {};
        }
        if (!reactionsByMessage[r.message_id][r.emoji]) {
          reactionsByMessage[r.message_id][r.emoji] = [];
        }
        reactionsByMessage[r.message_id][r.emoji].push(r.player_nick);
      });

      // Render reactions for each message
      Object.entries(reactionsByMessage).forEach(([msgId, emojiMap]) => {
        const reactionsContainer = document.getElementById(`reactions-${msgId}`);
        if (!reactionsContainer) return;

        const reactionsHtml = Object.entries(emojiMap).map(([emoji, nicks]) => {
          const title = nicks.join(', ');
          return `<span class="reaction-chip" title="${escapeAttr(title)}">${emoji} ${nicks.length}</span>`;
        }).join('');

        reactionsContainer.innerHTML = reactionsHtml;
      });
    } catch (err) {
      console.error('Ошибка при загрузке реакций:', err);
    }
  }

  function appendNewMessages(newMessages) {
    if (!newMessages.length) return;

    const currentPlayerId = globalState?.currentPlayerId;
    const nodes = newMessages.map((msg) => {
      const isOwn = String(msg.player_id) === String(currentPlayerId);
      const timeStr = formatMessageTime(msg.created_at);
      const avatarUrl = msg.player_avatar || '';
      const avatarContent = avatarUrl
        ? `<img class="chat-message-avatar-img" src="${escapeAttr(avatarUrl)}" alt="avatar" onerror="this.src='img/avatar_placeholder.png'" />`
        : getPlayerAvatar(msg.player_nick);

      let replyHtml = '';
      if (msg.replied_to_id) {
        const numericReplyId = Number(msg.replied_to_id);
        const repliedMsg = messages.find(m => m.id === numericReplyId);
        if (repliedMsg) {
          replyHtml = `<div class="chat-message-reply"><span class="chat-message-reply-nick">${escapeHtml(repliedMsg.player_nick)}</span><span class="chat-message-reply-text">${escapeHtml(repliedMsg.message)}</span></div>`;
        }
      }

      return `
        <div class="chat-message new ${isOwn ? 'own' : ''}" data-player-id="${escapeAttr(msg.player_id)}" data-player-nick="${escapeAttr(msg.player_nick)}" data-player-avatar="${escapeAttr(avatarUrl)}" data-message-id="${msg.id}">
          <div class="chat-message-avatar">${avatarContent}</div>
          <div class="chat-message-bubble" data-message-id="${msg.id}">
            ${!isOwn ? `<div class="chat-message-nick">${escapeHtml(msg.player_nick)}</div>` : ''}
            ${replyHtml}
            <p class="chat-message-text">${escapeHtml(msg.message)}</p>
            <div class="chat-message-time">${timeStr}</div>
            <div class="message-reactions-list" id="reactions-${msg.id}"></div>
            <button class="chat-message-actions-btn" data-message-id="${msg.id}" type="button" title="Больше">⋮</button>
          </div>
        </div>
      `;
    }).join('');

    if (chatMessages.querySelector('.chat-empty-state')) {
      chatMessages.innerHTML = '';
    }

    chatMessages.insertAdjacentHTML('beforeend', nodes);
    scrollToBottom();

    setTimeout(() => {
      chatMessages.querySelectorAll('.chat-message.new').forEach((el) => el.classList.remove('new'));
    }, 400);
  }

  // Send message
  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    const currentPlayer = getCurrentPlayer(globalState || {});
    if (!currentPlayer) {
      console.warn('Chat: не найден текущий игрок. Сообщение не отправлено.');
      return;
    }

    const playerId = currentPlayer.id || globalState?.currentPlayerId;
    if (!playerId) {
      console.warn('Chat: currentPlayerId отсутствует.');
      return;
    }

    chatInput.value = '';
    chatSendBtn.disabled = true;

    try {
      const { error } = await supabaseClient
        .from('chat_messages')
        .insert([{
          player_id: String(playerId),
          player_nick: currentPlayer.nick || 'Unknown',
          player_avatar: currentPlayer.stats?.photo_url || '',
          message: text,
          replied_to_id: selectedReplyToId,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Ошибка отправки сообщения:', error);
        chatInput.value = text; // Restore text on error
      } else {
        clearGlobalReply();
        await loadMessages();
      }
    } catch (err) {
      console.error('Ошибка при отправке сообщения:', err);
      chatInput.value = text;
    } finally {
      chatSendBtn.disabled = false;
      chatInput.focus();
    }
  }

  function setGlobalReply(messageId) {
    // Convert to number in case it comes as string from dataset
    const numericId = Number(messageId);
    console.log('setGlobalReply called with ID:', messageId, 'Type:', typeof messageId, 'Numeric:', numericId);
    
    const msg = messages.find(m => m.id === numericId);
    console.log('Found message:', msg, 'Messages array:', messages);
    
    if (!msg) {
      console.warn('Message not found in messages array. Looking for ID:', numericId, 'Messages:', messages);
      return;
    }

    selectedReplyToId = numericId;
    const previewText = `Ответ ${msg.player_nick}: ${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}`;
    globalReplyPreviewText.textContent = previewText;
    globalReplyPreview.classList.remove('hidden');
    console.log('Reply preview shown for:', previewText);
  }

  function clearGlobalReply() {
    selectedReplyToId = null;
    globalReplyPreview.classList.add('hidden');
  }

  // Render messages
  function renderMessages() {
    if (messages.length === 0) {
      chatMessages.innerHTML = `
        <div class="chat-empty-state">
          <div class="empty-icon">🎮</div>
          <p>Пока нет сообщений</p>
        </div>
      `;
      return;
    }

    const currentPlayerId = globalState?.currentPlayerId;
    chatMessages.innerHTML = messages.map((msg) => {
      const isOwn = String(msg.player_id) === String(currentPlayerId);
      const timeStr = formatMessageTime(msg.created_at);
      const avatarUrl = msg.player_avatar || '';
      const avatarContent = avatarUrl
        ? `<img class="chat-message-avatar-img" src="${escapeAttr(avatarUrl)}" alt="avatar" onerror="this.src='img/avatar_placeholder.png'" />`
        : getPlayerAvatar(msg.player_nick);

      let replyHtml = '';
      if (msg.replied_to_id) {
        const numericReplyId = Number(msg.replied_to_id);
        const repliedMsg = messages.find(m => m.id === numericReplyId);
        if (repliedMsg) {
          replyHtml = `<div class="chat-message-reply"><span class="chat-message-reply-nick">${escapeHtml(repliedMsg.player_nick)}</span><span class="chat-message-reply-text">${escapeHtml(repliedMsg.message)}</span></div>`;
        }
      }

      return `
        <div class="chat-message ${isOwn ? 'own' : ''}" data-player-id="${escapeAttr(msg.player_id)}" data-player-nick="${escapeAttr(msg.player_nick)}" data-player-avatar="${escapeAttr(avatarUrl)}" data-message-id="${msg.id}">
          <div class="chat-message-avatar">${avatarContent}</div>
          <div class="chat-message-bubble" data-message-id="${msg.id}">
            ${!isOwn ? `<div class="chat-message-nick">${escapeHtml(msg.player_nick)}<span class="player-badges-inline">${(() => {
              const badges = getPlayerBadgesById(msg.player_id);
              return badges.map(key => {
                const b = BADGE_TYPES[key];
                return b ? `<span class="player-badge ${b.cls}" data-badge-key="${key}" title="${b.title}">${BADGE_SVG[key]}</span>` : '';
              }).join('');
            })()}</span></div>` : ''}
            ${replyHtml}
            <p class="chat-message-text">${escapeHtml(msg.message)}</p>
            <div class="chat-message-time">${timeStr} ${isOwn ? '✓✓' : ''}</div>
            <div class="message-reactions-list" id="reactions-${msg.id}"></div>
            <button class="chat-message-actions-btn" data-message-id="${msg.id}" type="button" title="Больше">⋮</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function scrollToBottom() {
    setTimeout(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 0);
  }

  function updateBadge() {
    if (unreadCount > 0) {
      chatBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      chatBadge.style.display = 'flex';
    } else {
      chatBadge.style.display = 'none';
    }
  }

  // Event listeners
  chatFabBtn.addEventListener('click', toggleChat);
  chatCloseBtn.addEventListener('click', closeChat);

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  chatSendBtn.addEventListener('click', sendMessage);
  globalReplyPreviewClose.addEventListener('click', clearGlobalReply);

  // Close on backdrop click
  chatModal.addEventListener('click', (e) => {
    if (e.target === chatModal) closeChat();
  });

  // Load messages periodically (every 3 seconds if chat is open)
  setInterval(() => {
    if (isOpen) {
      loadMessages();
    }
  }, 3000);

  return {
    open: openChat,
    close: closeChat,
    toggle: toggleChat,
    loadMessages,
    setGlobalReply,
    incrementUnread() {
      if (!isOpen) {
        unreadCount++;
        updateBadge();
      }
    }
  };
})();

// Initialize chat on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ChatSystem.loadMessages();
  });
} else {
  ChatSystem.loadMessages();
}

// Listen for new messages via Supabase real-time (optional)
// This would require setting up Postgres changes subscription

/* ======================================================
   PRIVATE CHAT + REPLY + REACTIONS SYSTEM
   ====================================================== */

const PrivateChatSystem = (function () {
  const privateChat = document.getElementById('privateChat');
  const privateChatCloseBtn = document.getElementById('privateChatCloseBtn');
  const privateInput = document.getElementById('privateInput');
  const privateSendBtn = document.getElementById('privateSendBtn');
  const privateMessages = document.getElementById('privateMessages');
  const privateChatTitle = document.getElementById('privateChatTitle');
  const replyPreview = document.getElementById('replyPreview');
  const replyPreviewText = document.getElementById('replyPreviewText');
  const replyPreviewClose = document.getElementById('replyPreviewClose');
  const reactionsPopup = document.getElementById('reactionsPopup');

  let currentReceiverId = null;
  let messages = [];
  let selectedReplyToId = null;
  let selectedMessageForReaction = null;
  let isLoadingMessages = false;

  function openChat(receiverId, receiverNick, receiverAvatar) {
    currentReceiverId = receiverId;
    privateChatTitle.textContent = receiverNick;
    document.getElementById('privateChatUserAvatar').src = receiverAvatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Ccircle cx="12" cy="12" r="12" fill="%2300d4ff" opacity="0.2"/%3E%3Ctext x="12" y="16" text-anchor="middle" fill="white" font-size="16"%3E👤%3C/text%3E%3C/svg%3E';
    document.body.classList.add('private-chat-open');
    privateChat.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    loadMessages();
    privateInput.focus();
  }

  function closeChat() {
    currentReceiverId = null;
    document.body.classList.remove('private-chat-open');
    privateChat.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    clearReply();
  }

  async function loadMessages() {
    if (!currentReceiverId || isLoadingMessages) return;
    isLoadingMessages = true;

    try {
      const currentId = globalState?.currentPlayerId;
      const { data: msgs, error } = await supabaseClient
        .from('personal_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentId},receiver_id.eq.${currentReceiverId}),` +
          `and(sender_id.eq.${currentReceiverId},receiver_id.eq.${currentId})`
        )
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Ошибка загрузки личных сообщений:', error);
        return;
      }

      const newMessages = msgs || [];
      const prevCount = messages.length;
      messages = newMessages;

      if (prevCount > 0 && newMessages.length > prevCount) {
        appendNewMessages(newMessages.slice(prevCount));
      } else {
        renderMessages();
      }
      
      // Load reactions for all messages
      await loadReactions();
      scrollToBottom();
    } catch (err) {
      console.error('Ошибка при загрузке личных сообщений:', err);
    } finally {
      isLoadingMessages = false;
    }
  }

  async function loadReactions() {
    if (!messages.length) return;

    const messageIds = messages.map(m => m.id);
    try {
      const { data: reactions, error } = await supabaseClient
        .from('message_reactions')
        .select('*')
        .eq('message_type', 'personal')
        .in('message_id', messageIds);

      if (error || !reactions) {
        console.error('Ошибка загрузки реакций:', error);
        return;
      }

      // Group reactions by message_id
      const reactionsByMessage = {};
      reactions.forEach(r => {
        if (!reactionsByMessage[r.message_id]) {
          reactionsByMessage[r.message_id] = {};
        }
        if (!reactionsByMessage[r.message_id][r.emoji]) {
          reactionsByMessage[r.message_id][r.emoji] = [];
        }
        reactionsByMessage[r.message_id][r.emoji].push(r.player_nick);
      });

      // Render reactions for each message
      Object.entries(reactionsByMessage).forEach(([msgId, emojiMap]) => {
        const reactionsContainer = document.getElementById(`reactions-${msgId}`);
        if (!reactionsContainer) return;

        const reactionsHtml = Object.entries(emojiMap).map(([emoji, nicks]) => {
          const title = nicks.join(', ');
          return `<span class="reaction-chip" title="${escapeAttr(title)}">${emoji} ${nicks.length}</span>`;
        }).join('');

        reactionsContainer.innerHTML = reactionsHtml;
      });
    } catch (err) {
      console.error('Ошибка при загрузке реакций:', err);
    }
  }

  function renderMessages() {
    if (messages.length === 0) {
      privateMessages.innerHTML = `
        <div class="chat-empty-state">
          <div class="empty-icon">💌</div>
          <p>Нет сообщений</p>
        </div>
      `;
      return;
    }

    const currentId = globalState?.currentPlayerId;
    privateMessages.innerHTML = messages.map((msg) => {
      const isOwn = msg.sender_id === currentId;
      const timeStr = formatMessageTime(msg.created_at);
      const avatarEmoji = getPlayerAvatar(msg.sender_nick);
      const avatarHtml = msg.sender_avatar
        ? `<img src="${escapeAttr(msg.sender_avatar)}" alt="" class="chat-message-avatar-img">`
        : `<span>${avatarEmoji}</span>`;

      let replyHtml = '';
      if (msg.replied_to_id) {
        const numericReplyId = Number(msg.replied_to_id);
        const repliedMsg = messages.find(m => m.id === numericReplyId);
        if (repliedMsg) {
          replyHtml = `<div class="chat-message-reply"><span class="chat-message-reply-nick">${escapeHtml(repliedMsg.sender_nick)}</span><span class="chat-message-reply-text">${escapeHtml(repliedMsg.message)}</span></div>`;
        }
      }

      return `
        <div class="chat-message ${isOwn ? 'own' : ''}" data-message-id="${msg.id}">
          <div class="chat-message-avatar">${avatarHtml}</div>
          <div class="chat-message-bubble" data-message-id="${msg.id}">
            ${!isOwn ? `<div class="chat-message-nick">${escapeHtml(msg.sender_nick)}<span class="player-badges-inline">${(() => {
              const badges = getPlayerBadgesById(msg.sender_id);
              return badges.map(key => {
                const b = BADGE_TYPES[key];
                return b ? `<span class="player-badge ${b.cls}" data-badge-key="${key}" title="${b.title}">${BADGE_SVG[key]}</span>` : '';
              }).join('');
            })()}</span></div>` : ''}
            ${replyHtml}
            <p class="chat-message-text">${escapeHtml(msg.message)}</p>
            <div class="chat-message-time">${timeStr} ${isOwn ? '✓✓' : ''}</div>
            <div class="message-reactions-list" id="reactions-${msg.id}"></div>
            <button class="chat-message-actions-btn" data-message-id="${msg.id}" type="button" title="Больше">⋮</button>
          </div>
        </div>
      `;
    }).join('');

    attachMessageHandlers();
  }

  function appendNewMessages(newMessages) {
    if (!newMessages.length) return;

    const currentId = globalState?.currentPlayerId;
    const nodes = newMessages.map((msg) => {
      const isOwn = msg.sender_id === currentId;
      const timeStr = formatMessageTime(msg.created_at);
      const avatarEmoji = getPlayerAvatar(msg.sender_nick);
      const avatarHtml = msg.sender_avatar
        ? `<img src="${escapeAttr(msg.sender_avatar)}" alt="" class="chat-message-avatar-img">`
        : `<span>${avatarEmoji}</span>`;

      let replyHtml = '';
      if (msg.replied_to_id) {
        const numericReplyId = Number(msg.replied_to_id);
        const repliedMsg = messages.find(m => m.id === numericReplyId);
        if (repliedMsg) {
          replyHtml = `<div class="chat-message-reply"><span class="chat-message-reply-nick">${escapeHtml(repliedMsg.sender_nick)}</span><span class="chat-message-reply-text">${escapeHtml(repliedMsg.message)}</span></div>`;
        }
      }

      return `
        <div class="chat-message new ${isOwn ? 'own' : ''}" data-message-id="${msg.id}">
          <div class="chat-message-avatar">${avatarHtml}</div>
          <div class="chat-message-bubble" data-message-id="${msg.id}">
            ${!isOwn ? `<div class="chat-message-nick">${escapeHtml(msg.sender_nick)}<span class="player-badges-inline">${(() => {
              const badges = getPlayerBadgesById(msg.sender_id);
              return badges.map(key => {
                const b = BADGE_TYPES[key];
                return b ? `<span class="player-badge ${b.cls}" data-badge-key="${key}" title="${b.title}">${BADGE_SVG[key]}</span>` : '';
              }).join('');
            })()}</span></div>` : ''}
            ${replyHtml}
            <p class="chat-message-text">${escapeHtml(msg.message)}</p>
            <div class="chat-message-time">${timeStr} ${isOwn ? '✓✓' : ''}</div>
            <div class="message-reactions-list" id="reactions-${msg.id}"></div>
            <button class="chat-message-actions-btn" data-message-id="${msg.id}" type="button" title="Больше">⋮</button>
          </div>
        </div>
      `;
    }).join('');

    if (privateMessages.querySelector('.chat-empty-state')) {
      privateMessages.innerHTML = '';
    }

    privateMessages.insertAdjacentHTML('beforeend', nodes);
    scrollToBottom();

    setTimeout(() => {
      privateMessages.querySelectorAll('.chat-message.new').forEach(el => el.classList.remove('new'));
    }, 400);

    attachMessageHandlers();
  }

  function attachMessageHandlers() {
    document.querySelectorAll('#privateMessages .chat-message-bubble[data-message-id]').forEach(el => {
      const messageId = el.dataset.messageId;
      let touchStartX = 0;
      let touchStartY = 0;

      // Click to show reactions popup (but not if clicking the actions button)
      el.addEventListener('click', (e) => {
        if (e.target.closest('.chat-message-actions-btn')) return;
        e.stopPropagation();
        showMessageActions(e, messageId);
      });

      // Double-click to add heart reaction
      el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        e.preventDefault();
        selectedMessageForReaction = Number(messageId);
        addReaction('❤️');
      });

      // Swipe left to reply
      el.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      });

      el.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const swipeDistance = touchStartX - touchEndX;
        const verticalDistance = Math.abs(touchEndY - touchStartY);

        // Require minimum horizontal distance and prevent diagonal swipes
        if (swipeDistance > 50 && verticalDistance < 30) {
          e.stopPropagation();
          el.classList.add('reply-active');
          setReply(Number(messageId));
          setTimeout(() => {
            el.classList.remove('reply-active');
          }, 300);
        }
      });
    });
  }

  function showMessageActions(e, messageId) {
    selectedMessageForReaction = Number(messageId);
    openReactionsPopup(e.target.closest('.chat-message-bubble'));
  }

  function openReactionsPopup(bubbleEl) {
    if (!bubbleEl) return;
    
    reactionsPopup.setAttribute('aria-hidden', 'false');
    
    // Position the popup below the message bubble
    const rect = bubbleEl.getBoundingClientRect();
    const popupWidth = reactionsPopup.offsetWidth || 220;
    
    // Position below the message
    reactionsPopup.style.position = 'fixed';
    reactionsPopup.style.top = (rect.bottom + 8) + 'px';
    reactionsPopup.style.left = Math.max(8, rect.left + rect.width / 2 - popupWidth / 2) + 'px';
    reactionsPopup.style.right = 'auto';
    reactionsPopup.style.bottom = 'auto';
  }

  async function notifyTelegramAboutMessage(receiverId, senderNick, messageText) {
    try {
      const isLocalDev = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
      const endpoint = isLocalDev
        ? 'https://black-russia-simulator.vercel.app/api/notify-private-message'
        : '/api/notify-private-message';

      const payload = {
        receiver_id: receiverId,
        sender_nick: senderNick,
        message: messageText
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        console.warn('[NotifyTelegram] Failed to send notification:', response.status);
      }
    } catch (err) {
      const isLocalDev = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
      if (isLocalDev) {
        try {
          // no-cors fallback for local static hosts where preflight can be blocked
          await fetch('https://black-russia-simulator.vercel.app/api/notify-private-message', {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: JSON.stringify({
              receiver_id: receiverId,
              sender_nick: senderNick,
              message: messageText
            })
          });
          return;
        } catch (fallbackErr) {
          console.warn('[NotifyTelegram] Local fallback failed:', fallbackErr.message);
        }
      }

      console.warn('[NotifyTelegram] Error:', err.message);
    }
  }

  async function sendMessage() {
    const text = privateInput.value.trim();
    if (!text || !currentReceiverId) return;

    const currentPlayer = getCurrentPlayer(globalState || {});
    if (!currentPlayer) return;

    privateInput.value = '';
    privateSendBtn.disabled = true;

    try {
      const { error } = await supabaseClient
        .from('personal_messages')
        .insert([{
          sender_id: currentPlayer.id,
          receiver_id: currentReceiverId,
          sender_nick: currentPlayer.nick || 'Unknown',
          sender_avatar: currentPlayer.stats?.photo_url || '',
          message: text,
          replied_to_id: selectedReplyToId,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Ошибка отправки личного сообщения:', error);
        privateInput.value = text;
      } else {
        // Отправляем уведомление в Telegram
        notifyTelegramAboutMessage(currentReceiverId, currentPlayer.nick || 'Unknown', text);
        clearReply();
        await loadMessages();
      }
    } catch (err) {
      console.error('Ошибка при отправке личного сообщения:', err);
      privateInput.value = text;
    } finally {
      privateSendBtn.disabled = false;
      privateInput.focus();
    }
  }

  function setReply(messageId) {
    const numericId = Number(messageId);
    const msg = messages.find(m => m.id === numericId);
    if (!msg) return;

    selectedReplyToId = numericId;
    replyPreviewText.textContent = `Ответ ${msg.sender_nick}: ${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}`;
    replyPreview.classList.remove('hidden');
  }

  function clearReply() {
    selectedReplyToId = null;
    replyPreview.classList.add('hidden');
  }

  async function addReaction(emoji) {
    if (!selectedMessageForReaction) return;

    const currentPlayer = getCurrentPlayer(globalState);
    if (!currentPlayer) return;

    // Add visual feedback
    const messageEl = document.querySelector(`[data-message-id="${selectedMessageForReaction}"]`);
    if (messageEl) {
      messageEl.classList.add('reaction-added');
      setTimeout(() => {
        messageEl.classList.remove('reaction-added');
      }, 400);
    }

    try {
      const playerId = globalState?.currentPlayerId;
      
      // First, delete any existing reactions from this player on this message
      const { error: deleteError } = await supabaseClient
        .from('message_reactions')
        .delete()
        .eq('message_id', selectedMessageForReaction)
        .eq('message_type', 'personal')
        .eq('player_id', playerId);

      if (deleteError) {
        console.error('Ошибка при удалении старой реакции:', deleteError);
      }

      // Now add the new reaction
      const { error: insertError } = await supabaseClient
        .from('message_reactions')
        .insert([{
          message_id: selectedMessageForReaction,
          message_type: 'personal',
          player_id: playerId,
          player_nick: currentPlayer.nick || 'Unknown',
          emoji: emoji
        }]);

      if (!insertError) {
        await loadMessages();
      } else {
        console.error('Ошибка при добавлении реакции:', insertError);
      }
    } catch (err) {
      console.error('Ошибка при добавлении реакции:', err);
    }

    closeReactionsPopup();
  }

  function closeReactionsPopup() {
    reactionsPopup.setAttribute('aria-hidden', 'true');
    selectedMessageForReaction = null;
  }

  function scrollToBottom() {
    setTimeout(() => {
      privateMessages.scrollTop = privateMessages.scrollHeight;
    }, 0);
  }

  // Event listeners
  privateChatCloseBtn.addEventListener('click', closeChat);
  privateChat.addEventListener('click', (e) => {
    if (e.target === privateChat) closeChat();
  });

  privateInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  privateSendBtn.addEventListener('click', sendMessage);
  replyPreviewClose.addEventListener('click', clearReply);

  document.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addReaction(btn.dataset.emoji);
    });
  });

  // Close popup on outside click or when clicking the popup itself
  document.addEventListener('click', (e) => {
    if (reactionsPopup.getAttribute('aria-hidden') === 'false') {
      if (!e.target.closest('.reactions-popup') && !e.target.closest('.chat-message-bubble')) {
        closeReactionsPopup();
      }
    }
  }, true);

  return {
    open: openChat,
    close: closeChat,
    loadMessages,
    setReplyMessage(messageId) {
      setReply(messageId);
    }
  };
})();

// Add click handler to player names/avatars in global chat to open private chat
document.addEventListener('click', (e) => {
  const playerNick = e.target.closest('.chat-message-nick');
  if (playerNick && !playerNick.closest('#privateChat')) {
    const msg = playerNick.closest('.chat-message');
    if (msg) {
      const receiverId = msg.dataset.playerId;
      const receiverNick = msg.dataset.playerNick;
      const receiverAvatar = msg.dataset.playerAvatar;
      if (receiverId && receiverNick) {
        PrivateChatSystem.open(receiverId, receiverNick, receiverAvatar);
      }
    }
  }
}, true);

// Add swipe and double-click handlers to global chat messages
document.addEventListener('touchstart', (e) => {
  const msgBubble = e.target.closest('.chat-message-bubble');
  if (msgBubble && !msgBubble.closest('#privateChat') && msgBubble.closest('#chatModal')) {
    msgBubble.dataset.touchStartX = e.touches[0].clientX;
    msgBubble.dataset.touchStartY = e.touches[0].clientY;
  }
}, true);

document.addEventListener('touchend', (e) => {
  const msgBubble = e.target.closest('.chat-message-bubble');
  if (msgBubble && !msgBubble.closest('#privateChat') && msgBubble.closest('#chatModal')) {
    const startX = parseFloat(msgBubble.dataset.touchStartX);
    const startY = parseFloat(msgBubble.dataset.touchStartY);
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const swipeDistance = startX - endX;
    const verticalDistance = Math.abs(endY - startY);

    if (swipeDistance > 50 && verticalDistance < 30) {
      const msg = msgBubble.closest('.chat-message');
      if (msg) {
        const messageId = msg.dataset.messageId;
        if (messageId) {
          msgBubble.classList.add('reply-active');
          ChatSystem.setGlobalReply(Number(messageId));
          setTimeout(() => {
            msgBubble.classList.remove('reply-active');
          }, 300);
        }
      }
    }
  }
}, true);

document.addEventListener('dblclick', (e) => {
  const msgBubble = e.target.closest('.chat-message-bubble');
  if (msgBubble && !msgBubble.closest('#privateChat') && msgBubble.closest('#chatModal')) {
    e.preventDefault();
    const msg = msgBubble.closest('.chat-message');
    if (msg) {
      // Auto-add heart reaction on double-click in global chat
      const messageId = msg.dataset.messageId;
      if (messageId) {
        // Add visual feedback
        msgBubble.classList.add('reaction-added');
        setTimeout(() => {
          msgBubble.classList.remove('reaction-added');
        }, 400);

        // Add reaction to database
        supabaseClient
          .from('message_reactions')
          .insert([{
            message_id: Number(messageId),
            message_type: 'global',
            player_id: globalState?.currentPlayerId,
            player_nick: getCurrentPlayer(globalState).nick || 'Unknown',
            emoji: '❤️'
          }])
          .then(({ error }) => {
            if (!error) {
              // Reload reactions
              const currentId = globalState?.currentPlayerId;
              supabaseClient
                .from('message_reactions')
                .select('*')
                .eq('message_id', Number(messageId))
                .eq('message_type', 'global')
                .then(({ data: reactions }) => {
                  if (reactions) {
                    const reactionsContainer = document.getElementById(`reactions-${messageId}`);
                    if (reactionsContainer) {
                      const reactionsByEmoji = {};
                      reactions.forEach(r => {
                        if (!reactionsByEmoji[r.emoji]) {
                          reactionsByEmoji[r.emoji] = [];
                        }
                        reactionsByEmoji[r.emoji].push(r.player_nick);
                      });

                      const reactionsHtml = Object.entries(reactionsByEmoji).map(([emoji, nicks]) => {
                        const title = nicks.join(', ');
                        return `<span class="reaction-chip" title="${escapeAttr(title)}">${emoji} ${nicks.length}</span>`;
                      }).join('');

                      reactionsContainer.innerHTML = reactionsHtml;
                    }
                  }
                });
            }
          });
      }
    }
  }
}, true);

// Click handler to show reactions popup for global chat messages
document.addEventListener('click', (e) => {
  const msgBubble = e.target.closest('.chat-message-bubble');
  if (msgBubble && !msgBubble.closest('#privateChat') && msgBubble.closest('#chatModal')) {
    const msg = msgBubble.closest('.chat-message');
    if (msg) {
      const messageId = msg.dataset.messageId;
      if (messageId) {
        // Store the message ID for reaction
        msgBubble.dataset.selectedMessageForReaction = messageId;
        // Show reactions popup
        const reactionsPopup = document.getElementById('reactionsPopup');
        if (reactionsPopup) {
          reactionsPopup.dataset.messageType = 'global';
          const rect = msgBubble.getBoundingClientRect();
          const popupWidth = 220;
          reactionsPopup.setAttribute('aria-hidden', 'false');
          reactionsPopup.style.position = 'fixed';
          reactionsPopup.style.top = (rect.bottom + 8) + 'px';
          reactionsPopup.style.left = Math.max(8, rect.left + rect.width / 2 - popupWidth / 2) + 'px';
          reactionsPopup.style.right = 'auto';
          reactionsPopup.style.bottom = 'auto';
        }
      }
    }
  }
}, false);

// Update reaction button click handlers to handle both global and personal messages
document.addEventListener('click', (e) => {
  const reactionBtn = e.target.closest('.reaction-btn');
  if (reactionBtn) {
    e.stopPropagation();
    const emoji = reactionBtn.dataset.emoji;
    const reactionsPopup = document.getElementById('reactionsPopup');
    const messageType = reactionsPopup.dataset.messageType || 'personal';
    
    if (messageType === 'global') {
      // Handle global chat reaction
      const msgBubbles = document.querySelectorAll('.chat-message-bubble');
      let messageId = null;
      
      msgBubbles.forEach(bubble => {
        if (bubble.dataset.selectedMessageForReaction) {
          messageId = bubble.dataset.selectedMessageForReaction;
        }
      });
      
      if (messageId) {
        addGlobalReaction(messageId, emoji);
      }
    }
    // For personal messages, the reaction is handled by PrivateChatSystem
  }
});

async function addGlobalReaction(messageId, emoji) {
  if (!messageId) return;

  const currentPlayer = getCurrentPlayer(globalState);
  if (!currentPlayer) return;

  // Add visual feedback
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  if (messageEl) {
    const bubble = messageEl.querySelector('.chat-message-bubble');
    if (bubble) {
      bubble.classList.add('reaction-added');
      setTimeout(() => {
        bubble.classList.remove('reaction-added');
      }, 400);
    }
  }

  try {
    const playerId = globalState?.currentPlayerId;
    
    // First, delete any existing reactions from this player on this message
    const { error: deleteError } = await supabaseClient
      .from('message_reactions')
      .delete()
      .eq('message_id', Number(messageId))
      .eq('message_type', 'global')
      .eq('player_id', playerId);

    if (deleteError) {
      console.error('Ошибка при удалении старой реакции:', deleteError);
    }

    // Now add the new reaction
    const { error: insertError } = await supabaseClient
      .from('message_reactions')
      .insert([{
        message_id: Number(messageId),
        message_type: 'global',
        player_id: playerId,
        player_nick: currentPlayer.nick || 'Unknown',
        emoji: emoji
      }]);

    if (!insertError) {
      // Reload reactions
      supabaseClient
        .from('message_reactions')
        .select('*')
        .eq('message_id', Number(messageId))
        .eq('message_type', 'global')
        .then(({ data: reactions }) => {
          if (reactions) {
            const reactionsContainer = document.getElementById(`reactions-${messageId}`);
            if (reactionsContainer) {
              const reactionsByEmoji = {};
              reactions.forEach(r => {
                if (!reactionsByEmoji[r.emoji]) {
                  reactionsByEmoji[r.emoji] = [];
                }
                reactionsByEmoji[r.emoji].push(r.player_nick);
              });

              const reactionsHtml = Object.entries(reactionsByEmoji).map(([emoji, nicks]) => {
                const title = nicks.join(', ');
                return `<span class="reaction-chip" title="${escapeAttr(title)}">${emoji} ${nicks.length}</span>`;
              }).join('');

              reactionsContainer.innerHTML = reactionsHtml;
            }
          }
        });
    } else {
      console.error('Ошибка при добавлении реакции:', insertError);
    }
  } catch (err) {
    console.error('Ошибка при добавлении реакции:', err);
  }

  const reactionsPopup = document.getElementById('reactionsPopup');
  if (reactionsPopup) {
    reactionsPopup.setAttribute('aria-hidden', 'true');
  }
}

/* ======================================================
   MESSAGE ACTIONS MENU (3 DOTS) + GLOBAL CHAT REPLY + SEARCH
   ====================================================== */

let selectedMessageForActions = null;
let selectedMessageChatType = null; // 'global' or 'personal'

// Handle 3-dots button click to show message actions menu
document.addEventListener('click', (e) => {
  const actionsBtn = e.target.closest('.chat-message-actions-btn');
  if (actionsBtn) {
    e.stopPropagation();
    const messageId = actionsBtn.dataset.messageId;
    const msg = actionsBtn.closest('.chat-message');
    
    if (msg && messageId) {
      selectedMessageForActions = {
        id: messageId,
        playerNick: msg.dataset.playerNick || msg.querySelector('.chat-message-nick')?.textContent || '',
        playerId: msg.dataset.playerId || '',
        isGlobal: !!msg.closest('#chatModal'),
        element: msg
      };
      
      selectedMessageChatType = selectedMessageForActions.isGlobal ? 'global' : 'personal';
      
      // Show/hide DM action based on if we're in global chat
      const dmBtn = document.getElementById('dmActionBtn');
      if (dmBtn) {
        dmBtn.style.display = selectedMessageChatType === 'global' ? 'block' : 'none';
      }
      
      // Show actions menu
      showMessageActionsMenu(e.target, messageId);
    }
  }
}, false);

function showMessageActionsMenu(target, messageId) {
  const menu = document.getElementById('messageActionsMenu');
  if (!menu) return;
  
  const btn = target.closest('.chat-message-actions-btn');
  if (!btn) return;
  
  const rect = btn.getBoundingClientRect();
  
  menu.setAttribute('aria-hidden', 'false');
  menu.style.position = 'fixed';
  menu.style.top = (rect.bottom + 4) + 'px';
  menu.style.right = Math.max(4, window.innerWidth - rect.right) + 'px';
  menu.style.left = 'auto';
}

// Handle message actions menu items clicks
document.addEventListener('click', (e) => {
  const actionItem = e.target.closest('.message-action-item');
  if (actionItem && selectedMessageForActions) {
    e.stopPropagation();
    const action = actionItem.dataset.action;
    
    if (action === 'reply') {
      handleReplyAction();
    } else if (action === 'react') {
      handleReactAction();
    } else if (action === 'dm') {
      handleDMAction();
    }
    
    closeMessageActionsMenu();
  }
});

function handleReplyAction() {
  if (!selectedMessageForActions) {
    console.warn('selectedMessageForActions is null');
    return;
  }
  
  console.log('handleReplyAction called. Chat type:', selectedMessageChatType, 'Message:', selectedMessageForActions);
  
  if (selectedMessageChatType === 'global') {
    // For global chat, show reply preview
    console.log('Calling ChatSystem.setGlobalReply with ID:', selectedMessageForActions.id);
    ChatSystem.setGlobalReply(selectedMessageForActions.id);
  } else {
    // For private chat, show reply preview
    const msgId = selectedMessageForActions.id;
    const msg = selectedMessageForActions.element;
    
    if (msg) {
      msg.classList.add('reply-active');
      setTimeout(() => msg.classList.remove('reply-active'), 300);
    }
    
    // Call setReply through PrivateChatSystem
    PrivateChatSystem.setReplyMessage(msgId);
  }
}

function handleReactAction() {
  if (!selectedMessageForActions) return;
  
  const reactionsPopup = document.getElementById('reactionsPopup');
  if (!reactionsPopup) return;
  
  // Store message ID for reaction in the appropriate place
  if (selectedMessageChatType === 'global') {
    const msgBubble = selectedMessageForActions.element?.querySelector('.chat-message-bubble');
    if (msgBubble) {
      msgBubble.dataset.selectedMessageForReaction = selectedMessageForActions.id;
    }
    reactionsPopup.dataset.messageType = 'global';
  } else {
    reactionsPopup.dataset.messageType = 'personal';
  }
  
  // Show reactions popup below the message
  const btn = selectedMessageForActions.element?.querySelector('.chat-message-actions-btn');
  if (btn) {
    const rect = btn.getBoundingClientRect();
    reactionsPopup.setAttribute('aria-hidden', 'false');
    reactionsPopup.style.position = 'fixed';
    reactionsPopup.style.top = (rect.bottom + 8) + 'px';
    reactionsPopup.style.left = Math.max(8, rect.left) + 'px';
    reactionsPopup.style.right = 'auto';
    reactionsPopup.style.bottom = 'auto';
  }
}

function handleDMAction() {
  if (!selectedMessageForActions) return;
  
  PrivateChatSystem.open(
    selectedMessageForActions.playerId,
    selectedMessageForActions.playerNick,
    selectedMessageForActions.element?.dataset.playerAvatar || ''
  );
}

function closeMessageActionsMenu() {
  const menu = document.getElementById('messageActionsMenu');
  if (menu) {
    menu.setAttribute('aria-hidden', 'true');
  }
  selectedMessageForActions = null;
}

// Close menu on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.message-actions-menu') && !e.target.closest('.chat-message-actions-btn')) {
    closeMessageActionsMenu();
  }
}, true);

// ======== FRIEND SEARCH MODAL (ALL REGISTERED PLAYERS) ========

const friendSearchBackdrop = document.getElementById('friendSearchBackdrop');
const friendSearchModal = document.getElementById('friendSearchModal');
const friendSearchInput = document.getElementById('friendSearchInput');
const friendSearchResults = document.getElementById('friendSearchResults');
const friendSearchClose = document.getElementById('friendSearchClose');

// Friend search modal logic
async function openFriendSearchModal() {
  if (!friendSearchBackdrop || !friendSearchModal) return;
  
  friendSearchBackdrop.style.display = 'flex';
  friendSearchInput.focus();
  
  // Load all players if not already loaded
  await loadAllPlayers();
}

function closeFriendSearchModal() {
  if (friendSearchBackdrop) {
    friendSearchBackdrop.style.display = 'none';
  }
  friendSearchInput.value = '';
  friendSearchResults.innerHTML = '<div class="friend-search-empty">Начните вводить ник для поиска...</div>';
}

let allPlayers = [];

async function loadAllPlayers() {
  if (allPlayers.length > 0) return; // Already loaded
  
  try {
    const { data, error } = await supabaseClient
      .from('players')
      .select('id, nick, stats:stats->photo_url')
      .limit(1000);
    
    if (error) {
      console.error('Ошибка загрузки игроков:', error);
      return;
    }
    
    allPlayers = data || [];
    console.log('Загружено игроков:', allPlayers.length);
  } catch (err) {
    console.error('Ошибка при загрузке всех игроков:', err);
  }
}

function renderFriendSearchResults() {
  const query = friendSearchInput.value.toLowerCase().trim();
  
  if (query.length < 2) {
    friendSearchResults.innerHTML = '<div class="friend-search-empty">Введите минимум 2 символа...</div>';
    return;
  }
  
  const filtered = allPlayers.filter(p => 
    p.nick.toLowerCase().includes(query)
  ).slice(0, 50);
  
  if (filtered.length === 0) {
    friendSearchResults.innerHTML = '<div class="friend-search-empty">Игроки не найдены</div>';
    return;
  }
  
  friendSearchResults.innerHTML = filtered.map(player => {
    const avatarUrl = player.stats?.photo_url || getPlayerAvatar(player.nick);
    const isImage = player.stats?.photo_url && player.stats.photo_url.startsWith('http');
    
    return `
      <div class="friend-result-card" data-player-id="${escapeAttr(player.id)}" data-player-nick="${escapeAttr(player.nick)}" data-player-avatar="${escapeAttr(avatarUrl || '')}">
        <div class="friend-result-avatar">
          ${isImage ? `<img src="${escapeAttr(player.stats.photo_url)}" alt="">` : avatarUrl}
        </div>
        <div class="friend-result-info">
          <div class="friend-result-nick">${escapeHtml(player.nick)}</div>
          <div class="friend-result-meta">Игрок</div>
        </div>
        <button class="friend-result-action" type="button" title="Открыть ЛС">
          💌
        </button>
      </div>
    `;
  }).join('');
}

if (friendSearchInput) {
  friendSearchInput.addEventListener('input', () => {
    renderFriendSearchResults();
  });
}

if (friendSearchResults) {
  friendSearchResults.addEventListener('click', (e) => {
    const btn = e.target.closest('.friend-result-action');
    if (btn) {
      e.stopPropagation();
      const card = btn.closest('.friend-result-card');
      if (card) {
        const playerId = card.dataset.playerId;
        const nick = card.dataset.playerNick;
        const avatar = card.dataset.playerAvatar;
        
        closeFriendSearchModal();
        PrivateChatSystem.open(playerId, nick, avatar);
      }
    }
  });
}

if (friendSearchClose) {
  friendSearchClose.addEventListener('click', closeFriendSearchModal);
}

if (friendSearchBackdrop) {
  friendSearchBackdrop.addEventListener('click', (e) => {
    if (e.target === friendSearchBackdrop) {
      closeFriendSearchModal();
    }
  });
}

// Search functionality in global chat
const chatSearchBtn = document.getElementById('chatSearchBtn');
const chatSearchBox = document.getElementById('chatSearchBox');
const chatSearchInput = document.getElementById('chatSearchInput');
const chatSearchResults = document.getElementById('chatSearchResults');

if (chatSearchBtn) {
  chatSearchBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Open friend search modal instead of toggle search box
    openFriendSearchModal();
  });
}

if (chatSearchInput) {
  chatSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (query.length < 1) {
      chatSearchResults.classList.remove('active');
      return;
    }
    
    // Search through messages for player nicknames
    const messages = document.querySelectorAll('#chatMessages .chat-message');
    const results = [];
    const seen = new Set();
    
    messages.forEach(msg => {
      const nick = msg.dataset.playerNick || '';
      const playerId = msg.dataset.playerId || '';
      const avatar = msg.dataset.playerAvatar || '';
      
      if (nick.toLowerCase().includes(query) && !seen.has(playerId)) {
        seen.add(playerId);
        results.push({ playerId, nick, avatar });
      }
    });
    
    if (results.length > 0) {
      chatSearchResults.innerHTML = results.map(r => `
        <div class="chat-search-item" data-player-id="${escapeAttr(r.playerId)}" data-player-nick="${escapeAttr(r.nick)}" data-player-avatar="${escapeAttr(r.avatar)}">
          <div class="chat-search-item-avatar">${r.avatar ? `<img src="${escapeAttr(r.avatar)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : getPlayerAvatar(r.nick)}</div>
          <div>${escapeHtml(r.nick)}</div>
        </div>
      `).join('');
      chatSearchResults.classList.add('active');
    } else {
      chatSearchResults.classList.remove('active');
    }
  });
}

if (chatSearchResults) {
  chatSearchResults.addEventListener('click', (e) => {
    const item = e.target.closest('.chat-search-item');
    if (item) {
      const playerId = item.dataset.playerId;
      const nick = item.dataset.playerNick;
      const avatar = item.dataset.playerAvatar;
      
      // Open private chat with the found player
      PrivateChatSystem.open(playerId, nick, avatar);
      
      // Close search
      chatSearchBox.style.display = 'none';
      chatSearchInput.value = '';
      chatSearchResults.classList.remove('active');
    }
  });
}

// Work in progress










// Work in progress
