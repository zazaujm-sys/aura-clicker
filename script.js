// --- КОНФИГУРАЦИЯ ---
const SUPABASE_URL = 'https://vvumgyyafdwnhhothvqd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dW1neXlhZmR3bmhob3RodnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTIzNjIsImV4cCI6MjA3OTkyODM2Mn0.dVU9j4FLhdk4a7RbyAMo2tfFDBJ8s2_GBXoDDTNj1xE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const tg = window.Telegram.WebApp;

tg.expand();

// Данные
let user = {
    id: 0,
    username: 'Guest',
    score: 0,
    unlocked_ranks: [] // Храним в памяти, какие открыли
};

// Звук только для повышения уровня!
const audioLevelUp = new Audio('assets/level_up.mp3');
audioLevelUp.volume = 0.5;

// --- РАНГИ ---
const ranks = [
    // НЕГАТИВНЫЕ (Скуф путь)
    { min: -100000000, name: "Космическая Пыль", img: "rank_1.jpg" },
    { min: -50000000, name: "Атом Кринжа", img: "rank_2.jpg" },
    { min: -25000000, name: "Салфетка", img: "rank_3.jpg" },
    { min: -10000000, name: "Плесневый Гриб", img: "rank_4.jpg" },
    { min: -5000000, name: "Ершик", img: "rank_5.jpg" },
    { min: -2500000, name: "Носок", img: "rank_6.jpg" },
    { min: -1000000, name: "Пельмень", img: "rank_7.jpg" },
    { min: -500000, name: "Комар", img: "rank_8.jpg" },
    { min: -250000, name: "Душнила", img: "rank_9.jpg" },
    { min: -100000, name: "Диванный Воин", img: "rank_10.jpg" },
    { min: -50000, name: "Карен", img: "rank_11.jpg" },
    { min: -10000, name: "Симп", img: "rank_12.jpg" },
    // НЕЙТРАЛЬ
    { min: -1000, name: "NPC", img: "rank_13.jpg" },
    // ПОЗИТИВНЫЕ (Сигма путь)
    { min: 5000, name: "Трогатель Травы", img: "rank_14.jpg" },
    { min: 20000, name: "Водохлёб", img: "rank_15.jpg" },
    { min: 50000, name: "Турникмен", img: "rank_16.jpg" },
    { min: 100000, name: "Офисный Выживший", img: "rank_17.jpg" },
    { min: 250000, name: "Мамкин Инвестор", img: "rank_18.jpg" },
    { min: 500000, name: "Темщик", img: "rank_19.jpg" },
    { min: 1000000, name: "Биткоин Барон", img: "rank_20.jpg" },
    { min: 2500000, name: "Мастер Мьюинга", img: "rank_21.jpg" },
    { min: 5000000, name: "Рицц-Лорд", img: "rank_22.jpg" },
    { min: 10000000, name: "Патрик", img: "rank_23.jpg" },
    { min: 25000000, name: "Гигачад", img: "rank_24.jpg" },
    { min: 50000000, name: "Нейро Бог", img: "rank_25.jpg" },
    { min: 100000000, name: "Путешественник", img: "rank_26.jpg" },
    { min: 250000000, name: "Император", img: "rank_27.jpg" },
    { min: 500000000, name: "Чистая Энергия", img: "rank_28.jpg" },
    { min: 1000000000, name: "DEV", img: "rank_29.jpg" },
    { min: 5000000000, name: "АБСОЛЮТ", img: "rank_30.jpg" }
];

// UI
const scoreEl = document.getElementById('score');
const rankNameEl = document.getElementById('rank-name');
const rankImgEl = document.getElementById('rank-image');
const progressBar = document.getElementById('progress-bar');
const clickBtn = document.getElementById('click-btn');
const imageContainer = document.querySelector('.image-container');
const effectsContainer = document.getElementById('click-effects');

let currentRankIndex = 12; // Start at NPC

// --- ЗАПУСК ---
async function init() {
    // 1. Telegram Auth
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        user.id = tg.initDataUnsafe.user.id;
        user.username = tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name;
    } else {
        // Браузер (тест)
        let storedId = localStorage.getItem('aura_uid');
        if(!storedId) {
            storedId = Math.floor(Math.random() * 100000000);
            localStorage.setItem('aura_uid', storedId);
        }
        user.id = storedId;
        user.username = localStorage.getItem('aura_name') || "Anon";
        if(user.username === "Anon") {
            let input = prompt("Твой ник?", "Anon");
            if(input) {
                user.username = input;
                localStorage.setItem('aura_name', input);
            }
        }
    }

    // 2. Load Data
    const { data, error } = await supabase
        .from('users')
        .select('score, username')
        .eq('telegram_id', user.id)
        .single();

    if (data) {
        user.score = data.score;
        if(data.username !== user.username) {
            await supabase.from('users').update({ username: user.username }).eq('telegram_id', user.id);
        }
    } else {
        await supabase.from('users').insert([{ telegram_id: user.id, username: user.username, score: 0 }]);
    }

    // Восстанавливаем открытые ранги (локально для визуализации)
    // Упрощение: считаем открытыми все, что "по пути" к текущему счету
    updateUI();
    rankImgEl.style.display = 'block';
}

// --- ЛОГИКА ---
function getRankByScore(score) {
    let bestMatch = ranks[12]; // Default NPC
    for (let i = 0; i < ranks.length; i++) {
        if (score >= ranks[i].min) {
            bestMatch = ranks[i];
        }
    }
    return bestMatch;
}

function updateUI() {
    scoreEl.innerText = user.score.toLocaleString();
    const rank = getRankByScore(user.score);
    
    // Если ранг изменился
    if (rankNameEl.innerText !== rank.name) {
        rankNameEl.innerText = rank.name;
        rankImgEl.src = `assets/${rank.img}`;
        
        // Эффект смены ранга (Звук только тут!)
        if (rankImgEl.src !== "") {
            audioLevelUp.currentTime = 0;
            audioLevelUp.play().catch(e => {});
            
            // Вспышка на картинке
            imageContainer.style.filter = "brightness(1.5)";
            setTimeout(() => imageContainer.style.filter = "brightness(1)", 200);
        }
    }

    // Прогресс бар
    // Сделаем его умным: показывает прогресс до СЛЕДУЮЩЕГО ранга
    // Находим индекс текущего ранга
    let rIndex = ranks.indexOf(rank);
    let nextRank = ranks[rIndex + 1];
    let prevRank = ranks[rIndex];
    
    // Логика бара для позитивных и негативных чисел сложная, 
    // поэтому для Брейнрота делаем проще: Визуализация от -100k до +100k
    // Центр (50%) = 0
    let percent = 50;
    const range = 500000; // Чувствительность
    if (user.score !== 0) {
        let shift = (user.score / range) * 50;
        shift = Math.max(-50, Math.min(50, shift));
        percent = 50 + shift;
    }
    progressBar.style.width = percent + "%";
}

// КЛИК
clickBtn.addEventListener('click', (e) => {
    // 1. Анимация нажатия
    imageContainer.classList.add('clicked');
    setTimeout(() => imageContainer.classList.remove('clicked'), 80);
    // Вибрация (Haptic)
    if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    // 2. Математика (БАЛАНС)
    // Шанс успеха 55% (было 50%) -> Ты будешь расти
    let isSuccess = Math.random() > 0.45;
    
    // КРИТ (Шанс 1%)
    let isCrit = Math.random() > 0.99;

    let basePoints = Math.floor(Math.random() * 2000) + 100; // 100..2100
    
    if (isCrit) {
        basePoints *= 10; // Крит х10
        isSuccess = true; // Крит всегда в плюс
    }

    let value = isSuccess ? basePoints : -basePoints;
    
    // Снижаем наказание для новичков (если у тебя мало очков, минус меньше)
    if (!isSuccess && user.score < 5000 && user.score > -5000) {
        value = Math.floor(value * 0.7);
    }

    user.score += value;

    // 3. Эффекты
    showFloatingText(e.clientX, e.clientY, value, isCrit);
    updateUI();
    saveData();
});

function showFloatingText(x, y, value, isCrit) {
    const el = document.createElement('div');
    el.classList.add('floating-text');
    
    let text = value > 0 ? `+${value.toLocaleString()}` : value.toLocaleString();
    let color = value > 0 ? 'var(--success)' : 'var(--danger)';
    
    if (isCrit) {
        text = `🔥 CRIT ${text} 🔥`;
        color = '#ffd700'; // Gold
        el.style.fontSize = '2.5rem';
    }

    el.innerText = text;
    el.style.color = color;
    
    // Random Position jitter
    const jX = (Math.random() - 0.5) * 60;
    const jY = (Math.random() - 0.5) * 60;
    el.style.left = `${x + jX}px`;
    el.style.top = `${y + jY}px`;

    effectsContainer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

// Сохранение (Debounce)
let saveTimer;
function saveData() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        await supabase
            .from('users')
            .update({ score: user.score })
            .eq('telegram_id', user.id);
    }, 1500);
}

// --- КОЛЛЕКЦИЯ ---
const colModal = document.getElementById('collection-modal');
const colBtn = document.getElementById('collection-btn');
const closeCol = document.getElementById('close-collection');
const colGrid = document.getElementById('collection-grid');

colBtn.onclick = () => {
    renderCollection();
    colModal.classList.remove('hidden');
}
closeCol.onclick = () => colModal.classList.add('hidden');

function renderCollection() {
    colGrid.innerHTML = '';
    // Проходимся по всем рангам
    ranks.forEach((rank, index) => {
        const item = document.createElement('div');
        item.className = 'collection-item';
        
        // Логика "Открыто": 
        // Позитивные: если твой макс скор больше минимума ранга.
        // Негативные: если твой мин скор меньше минимума ранга.
        // ДЛЯ ПРОСТОТЫ: Если ты СЕЙЧАС выше этого ранга (для позитива) или ниже (для негатива) - он подсвечен.
        // Остальное - силуэт.
        
        let isUnlocked = false;
        if (rank.min >= 0 && user.score >= rank.min) isUnlocked = true; // Позитив пройден
        else if (rank.min < 0 && user.score <= rank.min) isUnlocked = true; // Негатив пройден
        else if (rank.min === -1000) isUnlocked = true; // NPC всегда открыт
        
        // Либо, если ты просто "видел" этот ранг (храним в localStorage массив увиденных)
        // Но пока сделаем по текущему скору, чтобы мотивировать держать статус.
        
        if (isUnlocked) {
            item.innerHTML = `
                <img src="assets/${rank.img}">
                <div class="rank-label">${rank.name}</div>
            `;
        } else {
            item.classList.add('locked');
            item.innerHTML = `
                <img src="assets/${rank.img}"> <!-- Блюр делается в CSS -->
            `;
        }
        colGrid.appendChild(item);
    });
}

// --- ЛИДЕРБОРД ---
// (Тот же код, что и был, только селекторы)
const lbModal = document.getElementById('leaderboard-modal');
const lbBtn = document.getElementById('leaderboard-btn');
const closeLb = document.getElementById('close-leaderboard');
const lbList = document.getElementById('leaderboard-list');
const tabBtns = document.querySelectorAll('.tab-btn');

lbBtn.onclick = () => {
    lbModal.classList.remove('hidden');
    loadLeaderboard('top');
};
closeLb.onclick = () => lbModal.classList.add('hidden');

tabBtns.forEach(btn => {
    btn.onclick = () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadLeaderboard(btn.dataset.tab);
    };
});

async function loadLeaderboard(type) {
    lbList.innerHTML = '<li>Загрузка...</li>';
    let query = supabase.from('users').select('username, score').limit(20);
    if (type === 'top') query = query.order('score', { ascending: false });
    else query = query.order('score', { ascending: true });

    const { data } = await query;
    if (data) {
        lbList.innerHTML = '';
        data.forEach((u, i) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>#${i+1} ${u.username}</span> <span>${u.score.toLocaleString()}</span>`;
            lbList.appendChild(li);
        });
    }
}

init();