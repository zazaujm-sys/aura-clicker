// --- 1. НАСТРОЙКИ И КЛЮЧИ ---
const SUPABASE_URL = 'https://vvumgyyafdwnhhothvqd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dW1neXlhZmR3bmhob3RodnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTIzNjIsImV4cCI6MjA3OTkyODM2Mn0.dVU9j4FLhdk4a7RbyAMo2tfFDBJ8s2_GBXoDDTNj1xE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const tg = window.Telegram.WebApp;

// Разворачиваем на весь экран
tg.expand();

// --- 2. ДАННЫЕ ИГРОКА ---
let user = {
    id: 0,
    username: 'Anon',
    score: 0
};

// --- 3. ЗВУКИ ---
// Важно: имена файлов должны совпадать с тем, что в папке assets
const audioGood = new Audio('assets/click_good.mp3');
const audioBad = new Audio('assets/click_bad.mp3');
const audioLevelUp = new Audio('assets/level_up.mp3');

// --- 4. СПИСОК РАНГОВ ---
// Убедись, что картинки в папке assets называются именно так!
const ranks = [
    { min: -1000000000, name: "Космическая Пыль", img: "rank_1.jpg" },
    { min: -500000, name: "Атом Кринжа", img: "rank_2.jpg" },
    { min: -250000, name: "Салфетка", img: "rank_3.jpg" },
    { min: -100000, name: "Плесневый Гриб", img: "rank_4.jpg" },
    { min: -50000, name: "Ершик", img: "rank_5.jpg" },
    { min: -25000, name: "Дырявый Носок", img: "rank_6.jpg" },
    { min: -10000, name: "Грустный Пельмень", img: "rank_7.jpg" },
    { min: -7500, name: "Комар", img: "rank_8.jpg" },
    { min: -5000, name: "Душнила", img: "rank_9.jpg" },
    { min: -2500, name: "Диванный Воин", img: "rank_10.jpg" },
    { min: -1000, name: "Карен", img: "rank_11.jpg" },
    { min: -500, name: "Симп", img: "rank_12.jpg" },
    { min: -1, name: "NPC", img: "rank_13.jpg" }, // Ноль
    { min: 100, name: "Трогатель Травы", img: "rank_14.jpg" },
    { min: 500, name: "Водохлёб", img: "rank_15.jpg" },
    { min: 1000, name: "Турникмен", img: "rank_16.jpg" },
    { min: 2500, name: "Офисный Выживший", img: "rank_17.jpg" },
    { min: 5000, name: "Мамкин Инвестор", img: "rank_18.jpg" },
    { min: 10000, name: "Темщик", img: "rank_19.jpg" },
    { min: 25000, name: "Биткоин Барон", img: "rank_20.jpg" },
    { min: 50000, name: "Мастер Мьюинга", img: "rank_21.jpg" },
    { min: 100000, name: "Рицц-Лорд", img: "rank_22.jpg" },
    { min: 250000, name: "Патрик", img: "rank_23.jpg" },
    { min: 500000, name: "Гигачад", img: "rank_24.jpg" },
    { min: 1000000, name: "Нейро Бог", img: "rank_25.jpg" },
    { min: 5000000, name: "Путешественник", img: "rank_26.jpg" },
    { min: 10000000, name: "Император", img: "rank_27.jpg" },
    { min: 50000000, name: "Чистая Энергия", img: "rank_28.jpg" },
    { min: 100000000, name: "DEV", img: "rank_29.jpg" },
    { min: 1000000000, name: "АБСОЛЮТ", img: "rank_30.jpg" }
];

// Элементы на экране
const scoreEl = document.getElementById('score');
const rankNameEl = document.getElementById('rank-name');
const rankImgEl = document.getElementById('rank-image');
const progressBar = document.getElementById('progress-bar');
const clickBtn = document.getElementById('click-btn');
const imageContainer = document.querySelector('.image-container');
const effectsContainer = document.getElementById('click-effects');

// --- 5. ЗАПУСК ПРИЛОЖЕНИЯ ---
async function init() {
    // Получаем данные из Телеграма
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        user.id = tg.initDataUnsafe.user.id;
        user.username = tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name;
    } else {
        // Если открыли в браузере для теста
        user.id = Math.floor(Math.random() * 999999);
        user.username = "Test_User";
    }

    // Загружаем данные из Базы
    const { data, error } = await supabase
        .from('users')
        .select('score')
        .eq('telegram_id', user.id)
        .single();

    if (data) {
        user.score = data.score;
    } else {
        // Новый пользователь
        await supabase.from('users').insert([{ telegram_id: user.id, username: user.username, score: 0 }]);
    }

    updateUI();
    rankImgEl.style.display = 'block'; // Показываем картинку после загрузки
}

// --- 6. ОСНОВНАЯ ЛОГИКА ---

function getCurrentRank() {
    let current = ranks[12]; // По умолчанию NPC (0 очков)
    // Ищем подходящий ранг. Так как массив сортирован от минуса к плюсу:
    for (let i = 0; i < ranks.length; i++) {
        if (user.score >= ranks[i].min) {
            current = ranks[i];
        }
    }
    return current;
}

function updateUI() {
    scoreEl.innerText = user.score;
    const rank = getCurrentRank();

    // Если ранг изменился
    if (rankNameEl.innerText !== rank.name) {
        rankNameEl.innerText = rank.name;
        rankImgEl.src = `assets/${rank.img}`;
        
        // Звук нового уровня (если это не первый запуск)
        if (rankImgEl.src !== "") {
            // audioLevelUp.play().catch(e => {}); // Иногда браузер блокирует автоплей
        }
    }

    // Прогресс бар (просто для красоты двигается)
    // 50% - это ноль. Вправо плюс, влево минус.
    let percent = 50;
    // Ограничим бар, чтобы не вылезал
    if (user.score !== 0) {
        let shift = (user.score / 5000) * 50; // Каждые 5000 очков - полный бар
        if (shift > 50) shift = 50;
        if (shift < -50) shift = -50;
        percent = 50 + shift;
    }
    progressBar.style.width = percent + "%";
}

// КЛИК!
clickBtn.addEventListener('click', (e) => {
    // Визуальный эффект нажатия
    imageContainer.classList.add('clicked-anim');
    setTimeout(() => imageContainer.classList.remove('clicked-anim'), 50);

    // Логика: 50/50
    const isLuck = Math.random() > 0.5;
    const points = Math.floor(Math.random() * 150) + 10; // От 10 до 160 очков
    
    const value = isLuck ? points : -points;
    user.score += value;

    // Звуки (сбрасываем время, чтобы можно было спамить кликами)
    if (isLuck) {
        audioGood.currentTime = 0;
        audioGood.play().catch(e => {});
    } else {
        audioBad.currentTime = 0;
        audioBad.play().catch(e => {});
    }

    // Показываем цифру
    showClickEffect(e.clientX, e.clientY, value);
    
    updateUI();
    saveToDB(); // Сохраняем
});

function showClickEffect(x, y, value) {
    const el = document.createElement('div');
    el.classList.add('floating-text');
    el.innerText = value > 0 ? `+${value}` : value;
    el.style.color = value > 0 ? '#00ff00' : '#ff3333';
    
    // Рандомный разброс позиции, чтобы цифры не перекрывали друг друга
    const randomX = (Math.random() - 0.5) * 50;
    el.style.left = `${x + randomX}px`;
    el.style.top = `${y}px`;
    
    effectsContainer.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

// Отложенное сохранение (Debounce), чтобы сервер не упал
let saveTimeout;
function saveToDB() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        await supabase
            .from('users')
            .update({ score: user.score })
            .eq('telegram_id', user.id);
    }, 1000); // Шлем в базу через 1 секунду после последнего клика
}

// --- 7. РЕЙТИНГ ---
const modal = document.getElementById('leaderboard-modal');
const openBtn = document.getElementById('leaderboard-btn');
const closeBtn = document.getElementById('close-modal');
const list = document.getElementById('leaderboard-list');
const tabBtns = document.querySelectorAll('.tab-btn');

openBtn.onclick = () => {
    modal.classList.remove('hidden');
    loadLeaderboard('top');
};
closeBtn.onclick = () => modal.classList.add('hidden');

tabBtns.forEach(btn => {
    btn.onclick = () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadLeaderboard(btn.dataset.tab);
    };
});

async function loadLeaderboard(type) {
    list.innerHTML = '<li>Загрузка...</li>';
    
    let query = supabase.from('users').select('username, score').limit(20);
    
    if (type === 'top') {
        query = query.order('score', { ascending: false }); // От большего к меньшему
    } else {
        query = query.order('score', { ascending: true }); // От меньшего к большему (дно)
    }

    const { data, error } = await query;
    
    if (data) {
        list.innerHTML = '';
        data.forEach((u, index) => {
            const li = document.createElement('li');
            let icon = type === 'top' ? '🥇' : '💀';
            if (index > 2) icon = `#${index + 1}`;
            
            li.innerHTML = `
                <span>${icon} ${u.username}</span> 
                <span style="color:${u.score > 0 ? '#ffd700' : '#ff3333'}">${u.score}</span>
            `;
            list.appendChild(li);
        });
    }
}

// Поехали!
init();