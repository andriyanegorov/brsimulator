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
  gray: { label: "Серое", className: "gray" },
  green: { label: "Зеленое", className: "green" },
  blue: { label: "Синее", className: "blue" },
  purple: { label: "Фиолетовое", className: "purple" },
  gold: { label: "Золотое", className: "gold" }
};

const fallbackImage = "img/placeholder-case.jpg";

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
      stats: { opened: 0 }
    },
    {
      id: "bot_1",
      nick: "Legend_Maks",
      server: "Санкт-Петербург",
      balance: 8200,
      inventory: [],
      stats: { opened: 0 }
    },
    {
      id: "bot_2",
      nick: "Vlad_Boss",
      server: "Казань",
      balance: 7600,
      inventory: [],
      stats: { opened: 0 }
    },
    {
      id: "bot_3",
      nick: "Lime_Drive",
      server: "Самара",
      balance: 6900,
      inventory: [],
      stats: { opened: 0 }
    }
  ],
  news: [
    "Каждую неделю топ игроков сбрасывается. Лидеры получат настоящую игровую валюту в Black Russia.",
    "Добавлены новые кейсы и обновленная система редкостей.",
    "Минимальный вес интерфейса: стабильная работа даже на слабых устройствах."
  ],
  cases: [],
  promocodes: [
    { code: "START", reward: 10000 }
  ]
};

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function loadState() {
  if (globalState) {
    return JSON.parse(JSON.stringify(globalState));
  }
  return cloneDefaultState();
}

function saveState(state) {
  globalState = JSON.parse(JSON.stringify(state));
  
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      // 1. Конфиг
      await supabaseClient.from('config').upsert({ id: 'global', rarity_chances: state.rarityChances, promocodes: state.promocodes });

      // 2. Игроки
      const playersPayload = state.players.map(p => ({
        id: p.id,
        nick: p.nick,
        server: p.server,
        balance: p.balance,
        inventory: p.inventory,
        stats: p.stats,
        usedPromos: p.usedPromos || []
      }));
      await supabaseClient.from('players').upsert(playersPayload);

      // 3. Кейсы
      const casesPayload = state.cases.map(c => ({
        id: c.id,
        name: c.name,
        price: c.price,
        image: c.image,
        items: c.items
      }));
      const { error: casesErr } = await supabaseClient.from('cases').upsert(casesPayload);
      if (casesErr) {
        console.group('%c❌ Ошибка БД: Отправка кейсов (Supabase)', 'color: white; background: red; padding: 4px; border-radius: 4px;');
        console.error(casesErr);
        console.groupEnd();
      }

      // 4. Новости
      await supabaseClient.from('news').delete().neq('id', 0);
      const newsPayload = state.news.map((content) => ({ content }));
      if(newsPayload.length > 0) {
        await supabaseClient.from('news').insert(newsPayload);
      }
    } catch (err) {
      console.group('%c❌ Критическая ошибка: Синхронизация с Supabase', 'color: white; background: red; padding: 4px; border-radius: 4px;');
      console.error(err);
      console.groupEnd();
    }
  }, 1000); // Debounce на 1 секунду чтобы не спамить БД
}

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
        usedPromos: p.usedPromos || []
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
        items: c.items || []
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
  safe.players = (Array.isArray(state.players) && state.players.length > 0) ? state.players : base.players;
  safe.cases = Array.isArray(state.cases) ? state.cases : base.cases;
  safe.news = (Array.isArray(state.news) && state.news.length > 0) ? state.news : base.news;
  safe.promocodes = Array.isArray(state.promocodes) ? state.promocodes : base.promocodes;

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

function getCurrentPlayer(state) {
  return state.players.find((player) => player.id === state.currentPlayerId) || state.players[0];
}

function formatBC(value) {
  return `${Math.max(0, Math.round(value)).toLocaleString("ru-RU")} BC`;
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
  const invValue = (player.inventory || []).reduce((sum, item) => sum + Number(item.value || 0), 0);
  return Number(player.balance || 0) + invValue + Number((player.stats && player.stats.opened) || 0) * 10;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1700);
}

function renderMainApp() {
  let state = loadState();

  let currentPreviewedCaseId = null;
  let isSpinning = false;

  const balanceValue = document.getElementById("balanceValue");
  const casesGrid = document.getElementById("casesGrid");
  const newsList = document.getElementById("newsList");
  const topList = document.getElementById("topList");
  const profileForm = document.getElementById("profileForm");
  const nickInput = document.getElementById("nickInput");
  const serverInput = document.getElementById("serverInput");
  const inventoryList = document.getElementById("inventoryList");
  const inventoryCount = document.getElementById("inventoryCount");
  const donateBtn = document.getElementById("donateBtn");

  const previewCaseImg = document.getElementById("previewCaseImg");
  const previewCaseName = document.getElementById("previewCaseName");
  const startOpenBtn = document.getElementById("startOpenBtn");
  const previewItemList = document.getElementById("previewItemList");
  const backToHomeBtn = document.getElementById("backToHomeBtn");
  const rouletteModal = document.getElementById("rouletteModal");
  const rouletteTrack = document.getElementById("rouletteTrack");

  const modal = document.getElementById("dropModal");
  const dropName = document.getElementById("dropName");
  const dropMeta = document.getElementById("dropMeta");
  const closeModalBtn = document.getElementById("closeModalBtn");

  const views = Array.from(document.querySelectorAll(".view"));
  const navButtons = Array.from(document.querySelectorAll(".nav-btn"));

  function switchView(target) {
    views.forEach((view) => {
      view.classList.toggle("active", view.dataset.view === target);
    });
    navButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.target === target);
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

    state = next;
    saveState(state);
    renderAll();
    showToast(`Все предметы проданы за ${formatBC(totalVal)}`);
  }

  function syncPlayerUI() {
    const player = getCurrentPlayer(state);
    if (!player) return;

    balanceValue.textContent = Math.round(player.balance || 0).toLocaleString("ru-RU");
    nickInput.value = player.nick || "";
    serverInput.value = player.server || "";

    const pNick = document.getElementById("profileNickDisplay");
    const pServer = document.getElementById("profileServerDisplay");
    if(pNick) {
      pNick.textContent = player.nick || "User";
      if (player.stats && player.stats.tg_username) {
        pNick.textContent += ` (@${player.stats.tg_username})`;
      }
    }
    if(pServer) pServer.textContent = player.server || "Server";
    
    const pAvatar = document.getElementById("profileAvatar");
    if(pAvatar) {
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
    
    if(sInv) sInv.textContent = formatBC(totalInvValue);
    if(sItemsStr) sItemsStr.textContent = (player.stats?.itemsSold || 0).toLocaleString("ru-RU");
    if(sValStr) sValStr.textContent = formatBC(player.stats?.valueSold || 0);
    
    if(sFav) {
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

    inventoryCount.textContent = `${inventory.length} предметов`;

    if (!inventory.length) {
      inventoryList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #aaa; background: rgba(0,0,0,0.3); border-radius: 12px;">Инвентарь пуст</div>';
      return;
    }

    inventoryList.innerHTML = inventory
      .map((item) => {
        let colorCode = "#aaa";
        if(item.rarity === "yellow") colorCode = "#f1c40f";
        else if (item.rarity === "red") colorCode = "#e74c3c";
        else if (item.rarity === "pink") colorCode = "#e84393";
        else if (item.rarity === "purple") colorCode = "#9b59b6";
        else if (item.rarity === "blue") colorCode = "#3498db";

        return `
          <article class="inventory-card" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 8px; text-align: center; position: relative; display: flex; flex-direction: column;">
            <div style="height: 50px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
              <img src="${item.image || 'img/standart_case.png'}" alt="" style="max-height: 100%; max-width: 100%; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.5));">
            </div>
            <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${colorCode};">${item.name}</div>
            <div style="font-size: 10px; color: #f1c40f; margin-bottom: 8px;">${formatBC(item.value || 0)}</div>
            <button class="btn btn-icon sell-item-btn" data-inv-id="${item.id}" data-value="${item.value || 0}" style="margin-top: auto; width: 100%; padding: 6px; font-size: 11px; background: rgba(231, 76, 60, 0.2); border: 1px solid #e74c3c; color: #e74c3c; border-radius: 6px;">Продать 💰</button>
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
    if (!state.cases.length) {
      casesGrid.innerHTML = '<p class="news-item">Кейсы не найдены. Добавьте их через admin.html</p>';
      return;
    }

    casesGrid.innerHTML = state.cases
      .map((item) => {
        return `
          <article class="case-card" data-preview-case="${item.id}" style="cursor: pointer; transition: transform 0.2s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">
            <img class="case-image" src="${item.image || fallbackImage}" alt="${item.name}" loading="lazy" style="pointer-events: none;" />
            <div class="case-body" style="pointer-events: none;">
              <h3>${item.name}</h3>
              <p>Цена открытия: ${formatBC(item.price)}</p>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderNews() {
    if(!newsList) { console.error('newsList is null!'); return; } newsList.innerHTML = state.news
      .map((news) => `<article class="news-item">${news}</article>`)
      .join("");
  }

  function renderTop() {
    const players = state.players
      .map((player) => ({ ...player, score: computeScore(player) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);

    topList.innerHTML = players
      .map((player, idx) => {
        const rankClass = idx < 3 ? "rank top" : "rank";
        const photoUrl = (player.stats && player.stats.photo_url) ? player.stats.photo_url : "img/avatar_placeholder.png";

        let rewardText = "";
        if (idx === 0) rewardText = "<div style='font-size: 10px; color: #f1c40f; margin-top: 2px;'>Приз: 1.000.000 вирт</div>";
        if (idx === 1) rewardText = "<div style='font-size: 10px; color: #silver; margin-top: 2px;'>Приз: 750.000 вирт</div>";
        if (idx === 2) rewardText = "<div style='font-size: 10px; color: #cd7f32; margin-top: 2px;'>Приз: 500.000 вирт</div>";

        return `
          <article class="top-item">
            <div class="inline">
              <div class="${rankClass}">${idx + 1}</div>
              <div style="width: 36px; height: 36px; border-radius: 50%; overflow: hidden; margin-right: 10px; border: 2px solid var(--primary, #f1c40f); flex-shrink: 0;">
                <img src="${photoUrl}" onerror="this.src='img/avatar_placeholder.png'" style="width: 100%; height: 100%; object-fit: cover; display: block;">
              </div>
              <div>
                <strong>${player.nick}</strong>
                <p>${player.server}</p>
                ${rewardText}
              </div>
            </div>
            <strong>${formatBC(player.score)}</strong>
          </article>
        `;
      })
      .join("");
  }

  function renderAll() {
    console.log("%c[Admin] Rendering...", "color:cyan");
    renderCases();
    renderNews();
    renderTop();
    syncPlayerUI();
  }

  function previewCaseInfo(caseId) {
    const selectedCase = state.cases.find(c => c.id === caseId);
    if (!selectedCase) return;
    currentPreviewedCaseId = caseId;
    
    previewCaseImg.src = selectedCase.image || fallbackImage;
    previewCaseName.textContent = selectedCase.name;
    startOpenBtn.textContent = 'Открыть за ' + formatBC(selectedCase.price);
    
    const sortedItems = [...selectedCase.items].sort((a,b) => b.value - a.value);
    previewItemList.innerHTML = sortedItems.map(item => {
      let colorCode = "#aaa";
      if(item.rarity === "yellow") colorCode = "#f1c40f";
      else if (item.rarity === "red") colorCode = "#e74c3c";
      else if (item.rarity === "pink") colorCode = "#e84393";
      else if (item.rarity === "purple") colorCode = "#9b59b6";
      else if (item.rarity === "blue") colorCode = "#3498db";

      return `
        <article class="inventory-card" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 8px; text-align: center; position: relative; display: flex; flex-direction: column;">
          <div style="height: 50px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
            <img src="${item.image || 'img/standart_case.png'}" alt="" style="max-height: 100%; max-width: 100%; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.5));">
          </div>
          <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${colorCode};">${item.name}</div>
          <div style="font-size: 10px; color: #f1c40f; margin-bottom: 4px;">${formatBC(item.value || 0)}</div>
        </article>
      `;
    }).join("");

    switchView("case-preview");
    const contentPanel = document.querySelector('.content');
    if (contentPanel) contentPanel.scrollTo(0, 0);
  }

  function startRouletteSpin(selectedCase, winningItem, finalInventoryItem) {
    const ITEMS_COUNT = 60;
    const WIN_INDEX = 50;
    
    const trackItems = [];
    for (let i = 0; i < ITEMS_COUNT; i++) {
      if (i === WIN_INDEX) {
        trackItems.push(winningItem);
      } else {
        trackItems.push(randomItem(selectedCase.items));
      }
    }

    rouletteTrack.innerHTML = trackItems.map(item => `
      <div class="roulette-item r-${item.rarity}">
        <img src="${item.image}">
        <span>${item.name}</span>
      </div>
    `).join("");

    rouletteTrack.style.transition = "none";
    rouletteTrack.style.transform = "translateX(0px)";
    
    // Force reflow
    void rouletteTrack.offsetWidth;

    const itemWidth = 130; // 120px width + 10px margin (5px left + 5px right)
    const containerWidth = rouletteModal.querySelector('.roulette-container').offsetWidth || 480;
    const centerPosition = (WIN_INDEX * itemWidth) + (itemWidth / 2);
    // Randomize stop position slightly within the item
    const randomOffset = (Math.random() - 0.5) * (itemWidth - 30);
    const finalTranslate = -(centerPosition - containerWidth / 2) + randomOffset;

    // Start spin
    rouletteTrack.style.transition = "transform 6s cubic-bezier(0.1, 0.85, 0.15, 1)";
    rouletteTrack.style.transform = `translateX(${finalTranslate}px)`;

    setTimeout(() => {
      isSpinning = false;
        if (document.activeElement) document.activeElement.blur();

      dropName.textContent = finalInventoryItem.name;
      dropMeta.textContent = `${rarityLabel(finalInventoryItem.rarity)} | ${formatBC(finalInventoryItem.value)}`;
      
      const dropImgEl = document.getElementById("dropImg");
      if (dropImgEl) {
        dropImgEl.src = finalInventoryItem.image || "img/standart_case.png";
      }
      
      const sdBtn = document.getElementById("sellDropBtn");
      if (sdBtn) {
        sdBtn.textContent = `Продать за ${formatBC(finalInventoryItem.value)}`;
      }

      rouletteModal.classList.remove("open");
      rouletteModal.setAttribute("aria-hidden", "true");

      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    }, 6200);
  }

  navButtons.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.target));
  });

  casesGrid.addEventListener("click", (event) => {
    const target = event.target.closest("[data-preview-case]");
    if (target) {
      previewCaseInfo(target.dataset.previewCase);
    }
  });

  if (backToHomeBtn) {
    backToHomeBtn.addEventListener("click", () => switchView("home"));
  }

  function handleOpenCase() {
    if (isSpinning || !currentPreviewedCaseId) return;
    const selectedCase = state.cases.find((item) => item.id === currentPreviewedCaseId);
    const player = getCurrentPlayer(state);

    if (!selectedCase || !player) return;
    if (player.balance < selectedCase.price) {
      showToast("Недостаточно BC для открытия");
      return;
    }

    if (!selectedCase.items.length) {
      showToast("В кейсе нет предметов");
      return;
    }

    player.balance -= Number(selectedCase.price || 0);
    player.stats = player.stats || { opened: 0 };
    player.stats.opened += 1;
    
    player.stats.casesOpenedCount = player.stats.casesOpenedCount || {};
    player.stats.casesOpenedCount[selectedCase.id] = (player.stats.casesOpenedCount[selectedCase.id] || 0) + 1;

    const droppedRarity = pickRarity(state.rarityChances);
    let pool = selectedCase.items.filter((item) => item.rarity === droppedRarity);
    if (!pool.length) {
      pool = selectedCase.items;
    }

    const dropped = randomItem(pool);
    const droppedItem = {
      id: `drop_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: dropped.name,
      rarity: dropped.rarity,
      value: Number(dropped.value || 0),
      image: dropped.image || "",
      caseId: selectedCase.id,
      droppedAt: Date.now()
    };

    player.inventory = player.inventory || [];
    player.inventory.push(droppedItem);
    
    // Track drop to know what we are holding in case of selling from modal
    window.currentDropItem = droppedItem;

    saveState(state);
    renderTop();
    syncPlayerUI();

    isSpinning = true;
    rouletteModal.classList.add("open");
    rouletteModal.setAttribute("aria-hidden", "false");
    startRouletteSpin(selectedCase, dropped, droppedItem);
  }

  if (startOpenBtn) {
    startOpenBtn.addEventListener("click", handleOpenCase);
  }
  
  if (previewCaseImg) {
    previewCaseImg.addEventListener("click", handleOpenCase);
  }

  const editProfileModal = document.getElementById("editProfileModal");

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const player = getCurrentPlayer(state);
    if (!player) return;

    player.nick = nickInput.value.trim() || player.nick;
    player.server = serverInput.value.trim() || player.server;
    saveState(state);
    
    // Hide form modal and update UI
    if (editProfileModal) {
        if (document.activeElement) document.activeElement.blur();
        editProfileModal.classList.remove("open");
        editProfileModal.setAttribute("aria-hidden", "true");
    }

    renderTop();
    syncPlayerUI();
    showToast("Профиль обновлен");
  });

  const editProfileBtn = document.getElementById("editProfileBtn");
  const cancelEditProfileBtn = document.getElementById("cancelEditProfileBtn");
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
       if (editProfileModal) {
         editProfileModal.classList.add("open");
         editProfileModal.setAttribute("aria-hidden", "false");
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

  const sellAllBtn = document.getElementById("sellAllBtn");
  if (sellAllBtn) {
    sellAllBtn.addEventListener("click", () => {
       if(confirm("Вы уверены, что хотите продать ВСЕ предметы?")) {
         sellAllItems();
       }
    });
  }

  const promoInput = document.getElementById("promoInput");
  const activatePromoBtn = document.getElementById("activatePromoBtn");
  if (activatePromoBtn && promoInput) {
    activatePromoBtn.addEventListener("click", () => {
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

  const sellDropBtn = document.getElementById("sellDropBtn");
  if (sellDropBtn) {
    sellDropBtn.addEventListener("click", () => {
       if(window.currentDropItem) {
          sellItem(window.currentDropItem.id, window.currentDropItem.value);
          window.currentDropItem = null;
            if (document.activeElement) document.activeElement.blur();
            modal.classList.remove("open");
            modal.setAttribute("aria-hidden", "true");
         }
      });
    }

    closeModalBtn.addEventListener("click", () => {
      if (document.activeElement) document.activeElement.blur();
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      window.currentDropItem = null;
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        if (document.activeElement) document.activeElement.blur();
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
      }
    });

  if (editProfileModal) {
    editProfileModal.addEventListener("click", (event) => {
      if (event.target === editProfileModal) {
          if (document.activeElement) document.activeElement.blur();
          editProfileModal.classList.remove("open");
          editProfileModal.setAttribute("aria-hidden", "true");
      }
    });
  }

  donateBtn.addEventListener("click", () => {
    showToast("Раздел пожертвования будет подключен отдельно");
  });

  window.addEventListener("storage", () => {
    state = loadState();
    renderAll();
  });

  renderAll();
}

function renderAdminApp() {
  let state = loadState();

  const rarityForm = document.getElementById("rarityForm");
  const rarityInputsWrap = document.getElementById("rarityInputs");

  const caseForm = document.getElementById("caseForm");
  const caseList = document.getElementById("caseList");
  const caseIdInput = document.getElementById("caseId");
  const caseNameInput = document.getElementById("caseName");
  const casePriceInput = document.getElementById("casePrice");
  const caseImageInput = document.getElementById("caseImage");

  const itemNameInput = document.getElementById("itemName");
  const itemRarityInput = document.getElementById("itemRarity");
  const itemValueInput = document.getElementById("itemValue");
  const itemImageInput = document.getElementById("itemImage");
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

  let draftItems = [];

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

    caseItemsList.innerHTML = draftItems
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
        return `
          <div class="admin-list-item" style="gap: 15px;">
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
            <div class="form-group" style="margin:0;">
              <label>Инвентарь (каждый предмет с новой строки)</label>
              <textarea rows="2" data-player-inventory="${player.id}">${inventoryText}</textarea>
            </div>
            <div class="item-actions">
              <button class="btn" data-save-player="${player.id}" type="button" style="flex:1"><i class="fa-solid fa-floppy-disk"></i> Обновить</button>
              <button class="btn btn-danger" data-delete-player="${player.id}" type="button" style="flex:1"><i class="fa-solid fa-user-xmark"></i> Удалить</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderNews() {
    if (!state.news.length) {
      newsList.innerHTML = '<div style="color:var(--text-muted); padding: 20px; text-align:center;">Новостей нет</div>';
      return;
    }

    if(!newsList) { console.error('newsList is null!'); return; } 
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

  function renderAll() {
    console.log("%c[Admin] Rendering...", "color:cyan");
    refreshState();
    console.table({ 'cases': state.cases.length, 'players': state.players.length, 'news': state.news.length });
    try { renderRarityForm(); } catch(e) { console.error("%c[Render] Error: Форма редкости", "color:yellow", e); }
    try { renderCaseDraftItems(); } catch(e) { console.error("%c[Render] Error: Черновик кейсов", "color:yellow", e); }
    try { renderCaseList(); } catch(e) { console.error("%c[Render] Error: Список кейсов", "color:yellow", e); }
    try { renderPlayers(); } catch(e) { console.error("%c[Render] Error: Игроки", "color:yellow", e); }
    try { renderNews(); } catch(e) { console.error("%c[Render] Error: Новости", "color:yellow", e); }
    try { renderPromos(); } catch(e) { console.error("%c[Render] Error: Промокоды", "color:yellow", e); }
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

  addItemBtn.addEventListener("click", () => {
    const name = itemNameInput.value.trim();
    const rarity = itemRarityInput.value;
    const value = Number(itemValueInput.value || 0);
    const image = itemImageInput.value.trim();

    if (!name) {
      showToast("Введите название предмета");
      return;
    }

    draftItems.push({ name, rarity, value, image });
    itemNameInput.value = "";
    itemValueInput.value = "";
    itemImageInput.value = "";
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

    if (!name) {
      showToast("Введите название кейса");
      return;
    }

    if (!draftItems.length) {
      showToast("Добавьте хотя бы один предмет");
      return;
    }

    const next = { ...state };
    const existsIndex = next.cases.findIndex((item) => item.id === id);
    const payload = {
      id,
      name,
      price,
      image,
      items: draftItems
    };

    if (existsIndex >= 0) {
      next.cases[existsIndex] = payload;
    } else {
      next.cases.push(payload);
    }

    updateState(next);

    caseIdInput.value = "";
    caseNameInput.value = "";
    casePriceInput.value = "";
    caseImageInput.value = "";
    draftItems = [];

    renderCaseDraftItems();
    renderCaseList();
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

    const savePlayerId = saveBtn ? saveBtn.dataset.savePlayer : null;
    const deletePlayerId = deleteBtn ? deleteBtn.dataset.deletePlayer : null;

    if (savePlayerId) {
      const next = { ...state };
      const idx = next.players.findIndex((player) => player.id === savePlayerId);
      if (idx < 0) return;

      const nickInputEl = playerList.querySelector(`[data-player-nick="${savePlayerId}"]`);
      const serverInputEl = playerList.querySelector(`[data-player-server="${savePlayerId}"]`);
      const balanceInputEl = playerList.querySelector(`[data-player-balance="${savePlayerId}"]`);
      const inventoryInputEl = playerList.querySelector(`[data-player-inventory="${savePlayerId}"]`);

      const inventoryLines = (inventoryInputEl.value || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      next.players[idx] = {
        ...next.players[idx],
        nick: nickInputEl.value.trim() || next.players[idx].nick,
        server: serverInputEl.value.trim() || next.players[idx].server,
        balance: Number(balanceInputEl.value || 0),
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
      stats: { opened: 0 }
    });

    updateState(next);
    addPlayerForm.reset();
    renderPlayers();
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
    updateState(cloneDefaultState());
    draftItems = [];
    renderAll();
    showToast("Данные сброшены до стартовых");
  });

  renderAll();
}

async function bootstrap() {
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
          stats: { opened: 0 }
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
  if (page === "main") {
    renderMainApp();
  }
  if (page === "admin") {
    renderAdminApp();
  }
}

bootstrap();

















