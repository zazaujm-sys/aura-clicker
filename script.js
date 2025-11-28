// --- 1. НАСТРОЙКИ И КЛЮЧИ ---
const SUPABASE_URL = 'https://vvumgyyafdwnhhothvqd.supabase.co';
// Твой ключ уже здесь
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dW1neXlhZmR3bmhob3RodnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTIzNjIsImV4cCI6MjA3OTkyODM2Mn0.dVU9j4FLhdk4a7RbyAMo2tfFDBJ8s2_GBXoDDTNj1xE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const tg = window.Telegram.WebApp;

tg.expand(); // На весь экран

// --- 2. ДАННЫЕ ИГРОКА ---
let user = {
    id: 0,
    username: 'Аноним',
    score: 0
};

// --- 3. ЗВУКИ (Улучшенные) ---
const audioGood = new Audio('assets/click_good.mp3');
const audioBad = new Audio('assets/click_bad.mp3');
// Громкость потише, чтобы не оглохнуть
audioGood.volume = 0.6;
audioBad.volume = 0.6;

// --- 4. СПИСОК РАНГОВ (Новые пороги очков) ---
// Умножили пороги, так как баллов теперь дают больше
const ranks = [
    { min: -10000000000, name: "Космическая Пыль", img: "rank_1.jpg" },
    { min: -5000000, name: "Атом Кринжа", img: "rank_2.jpg" },
    { min: -2500000, name: "Салфетка", img: "rank_3.jpg" },
    { min: -1000000, name: "Плесневый Гриб", img: "rank_4.jpg" },
    { min: -500000, name: "Ершик", img: "rank_5.jpg" },
    { min: -250000, name: "Дырявый Носок", img: "rank_6.jpg" },
    { min: -100000, name: "Грустный Пельмень", img: "rank_7.jpg" },
    { min: -75000, name: "Комар", img: "rank_8.jpg" },
    { min: -50000, name: "Душнила", img: "rank_9.jpg" },
    { min: -25000, name: "Диванный Воин", img: "rank_10.jpg" },
    { min: -10000, name: "Карен", img: "rank_11.jpg" },
    { min: -5000, name: "Симп", img: "rank_12.jpg" },
    { min: -100, name: "NPC", img: "rank_13.jpg" }, // Ноль (примерно)
    { min: 5000, name: "Трогатель Травы", img: "rank_14.jpg" },
    { min: 25000, name: "Водохлёб", img: "rank_15.jpg" },
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
    { min: 500000000, name: "Император", img: "rank_27.jpg" },
    { min: 1000000000, name: "Чистая Энергия", img: "rank_28.jpg" },
    { min: 5000000000, name: "DEV", img: "rank_29.jpg" },
    { min: 10000000000, name: "АБСОЛЮТ", img: "rank_30.jpg" }
];

// UI
const scoreEl = document.getElementById('score');
const rankNameEl = document.getElementById('rank-name');
const rankImgEl = document.getElementById('rank-image');
const progressBar = document.getElementById('progress-bar');
const clickBtn = document.getElementById('click-btn');
const imageContainer = document.querySelector('.image-container');
const effectsContainer = document.getElementById('click-effects');

// --- 5. ЗАПУСК ---
async function init() {
    // 1. Пытаемся взять данные из Телеграма
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        user.id = tg.initDataUnsafe.user.id;
        user.username = tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name;
    } else {
        // 2. Если Телеграма нет (браузер) -> СПРАШИВАЕМ ИМЯ
        // Генерируем случайный ID, чтобы база работала
        let storedId = localStorage.getItem('aura_user_id');
        if (!storedId) {
            storedId = Math.floor(Math.random() * 1000000000);
            localStorage.setItem('aura_user_id', storedId);
        }
        user.id = storedId;

        let name = prompt("Введите ваш никнейм (для рейтинга):", "Аноним");
        if (name && name.length > 0) user.username = name;
    }

    // Загружаем данные из базы
    const { data, error } = await supabase
        .from('users')
        .select('score, username')
        .eq('telegram_id', user.id)
        .single();

    if (data) {
        user.score = data.score;
        // Если в базе имя другое (например, сменил ник), обновляем
        if(data.username !== user.username) {
            await supabase.from('users').update({ username: user.username }).eq('telegram_id', user.id);
        }
    } else {
        // Создаем нового
        await supabase.from('users').insert([{ telegram_id: user.id, username: user.username, score: 0 }]);
    }

    updateUI();
    rankImgEl.style.display = 'block';
}

// --- 6. ЛОГИКА ---

function playSound(audio) {
    // Фишка против "каши": сбрасываем звук и чуть меняем скорость (pitch)
    audio.pause();
    audio.currentTime = 0;
    // Случайная скорость от 0.9 до 1.3 (делает звук живым)
    audio.playbackRate = 0.9 + Math.random() * 0.4;
    audio.play().catch(e => {});
}

function getCurrentRank() {
    let current = ranks[12]; 
    for (let i = 0; i < ranks.length; i++) {
        if (user.score >= ranks[i].min) {
            current = ranks[i];
        }
    }
    return current;
}

function updateUI() {
    scoreEl.innerText = user.score.toLocaleString(); // Добавляет пробелы (1 000 000)
    const rank = getCurrentRank();

    if (rankNameEl.innerText !== rank.name) {
        rankNameEl.innerText = rank.name;
        rankImgEl.src = `assets/${rank.img}`;
    }

    // Прогресс бар (более плавная логика)
    // Шкала от -100к до +100к (примерно)
    let percent = 50;
    const range = 100000; // Диапазон чувствительности бара
    
    if (user.score !== 0) {
        let shift = (user.score / range) * 50;
        if (shift > 50) shift = 50;
        if (shift < -50) shift = -50;
        percent = 50 + shift;
    }
    progressBar.style.width = percent + "%";
}

clickBtn.addEventListener('click', (e) => {
    // Анимация нажатия
    imageContainer.classList.add('clicked-anim');
    setTimeout(() => imageContainer.classList.remove('clicked-anim'), 50);

    const isLuck = Math.random() > 0.5;
    
    // БОЛЬШИЕ БАЛЛЫ: от 100 до 5000
    const points = Math.floor(Math.random() * 4900) + 100;
    
    const value = isLuck ? points : -points;
    user.score += value;

    if (isLuck) {
        playSound(audioGood);
    } else {
        playSound(audioBad);
    }

    showClickEffect(e.clientX, e.clientY, value);
    updateUI();
    saveToDB();
});

function showClickEffect(x, y, value) {
    const el = document.createElement('div');
    el.classList.add('floating-text');
    // Форматируем число с пробелами
    const formattedValue = Math.abs(value).toLocaleString();
    
    el.innerText = value > 0 ? `+${formattedValue}` : `-${formattedValue}`;
    el.style.color = value > 0 ? '#00ff00' : '#ff3333';
    
    const randomX = (Math.random() - 0.5) * 80; // Разброс шире
    const randomY = (Math.random() - 0.5) * 80;

    el.style.left = `${x + randomX}px`;
    el.style.top = `${y + randomY}px`;
    
    effectsContainer.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

// Сохранение в базу
let saveTimeout;
function saveToDB() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        await supabase
            .from('users')
            .update({ score: user.score, username: user.username })
            .eq('telegram_id', user.id);
    }, 1000);
}

// Рейтинг
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
    let query = supabase.from('users').select('username, score').limit(30);
    
    if (type === 'top') {
        query = query.order('score', { ascending: false });
    } else {
        query = query.order('score', { ascending: true });
    }

    const { data, error } = await query;
    if (data) {
        list.innerHTML = '';
        data.forEach((u, index) => {
            const li = document.createElement('li');
            let rankEmoji = `#${index+1}`;
            if(index===0) rankEmoji = '🥇';
            if(index===1) rankEmoji = '🥈';
            if(index===2) rankEmoji = '🥉';
            
            li.innerHTML = `
                <span>${rankEmoji} ${u.username}</span> 
                <span style="color:${u.score > 0 ? '#ffd700' : '#ff3333'}">${u.score.toLocaleString()}</span>
            `;
            list.appendChild(li);
        });
    }
}

init();