let strobeInterval = null;
let confettiInterval = null;
let isPartyMode = false;
let isEffectRunning = false;
let hasTriggeredToday = false;

// Moderacja i Antyspam
let userMutedUntil = localStorage.getItem('userMutedUntil') ? parseInt(localStorage.getItem('userMutedUntil')) : 0;
let messageTimestamps = [];

// Clicker
let clickCount = 0;

const firebaseConfig = {
    apiKey: "AIzaSyDgn4ux6ZJyFbxbG-aB-kv9GjNqfPJUiSw",
    authDomain: "monyk-czat.firebaseapp.com",
    databaseURL: "https://monyk-czat-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "monyk-czat",
    storageBucket: "monyk-czat.firebasestorage.app",
    messagingSenderId: "39641097299",
    appId: "1:39641097299:web:aac07712b25e2b501652a6"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- ZABAWY: CLICKER ---
function clickCookie() {
    clickCount++;
    document.getElementById("click-count").innerText = `Punkty: ${clickCount}`;
}

// --- ZAKŁADKI I NAWIGACJA ---
function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

function switchSettingsTab(setTabId) {
    document.querySelectorAll('.settings-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.set-tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(setTabId).classList.add('active');
    event.target.classList.add('active');
}

// --- VISUAL SETTINGS ---
function updateVisuals() {
    const showChat = document.getElementById("toggle-chat").checked;
    const showClock = document.getElementById("toggle-clock").checked;
    const showSound = document.getElementById("toggle-sound").checked;
    const showLasers = document.getElementById("toggle-lasers").checked;
    const showSmoke = document.getElementById("toggle-smoke").checked;

    document.getElementById("chat-section").style.display = showChat ? "block" : "none";
    document.getElementById("center-timer-box").style.display = showClock ? "block" : "none";
    document.getElementById("sound-section").style.display = showSound ? "flex" : "none";

    document.getElementById("lasers-container").classList.toggle("hidden", !showLasers);
    document.getElementById("smoke-container").classList.toggle("hidden", !showSmoke);
}

// --- EFEKTY IMPREZY (STROBE / KONFETTI) ---
function updateStrobe() {
    clearInterval(strobeInterval);
    const overlay = document.getElementById('party-overlay');
    const allowStrobe = document.getElementById("toggle-strobe").checked;
    if (!overlay || !isEffectRunning) return;

    if (isPartyMode && allowStrobe) {
        let flash = false;
        strobeInterval = setInterval(() => {
            overlay.style.backgroundColor = flash ? "#ffffff" : "#f1c40f";
            flash = !flash;
        }, 100);
    } else {
        overlay.style.backgroundColor = "transparent";
    }
}

function startBarkaEffect(startTimeSeconds = 0) {
    if (isEffectRunning && startTimeSeconds === 0) return; 
    
    isEffectRunning = true;
    const audio = document.getElementById('barka-audio');
    let overlay = document.getElementById('party-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'party-overlay';
        document.body.appendChild(overlay);
    }

    updateStrobe();

    const allowConfetti = document.getElementById("toggle-confetti").checked;
    if (!confettiInterval && allowConfetti) {
        confettiInterval = setInterval(() => {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.9 } });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.9 } });
        }, 300);
    }

    if (audio) {
        audio.currentTime = startTimeSeconds;
        audio.play().catch(() => console.log("Czekam na interakcję..."));
    }
}

function stopBarkaEffect() {
    isEffectRunning = false;
    clearInterval(strobeInterval);
    clearInterval(confettiInterval);
    strobeInterval = null;
    confettiInterval = null;
    const overlay = document.getElementById('party-overlay');
    if (overlay) overlay.style.backgroundColor = "transparent";
}

db.ref("lastTrigger").on("value", (snapshot) => {
    const triggerTime = snapshot.val();
    if (!triggerTime) return;
    const now = Date.now();
    const diff = (now - triggerTime) / 1000;
    if (diff > 0 && diff < 170) {
        startBarkaEffect(diff);
    }
});

// Przycisk "Imprezy" przeniesiony do zakładki Ustawienia -> Visual
window.toggleParty = function() {
    alert("OSTRZEŻENIE: Tryb imprezy może wywołać napad epilepsji.");
    isPartyMode = !isPartyMode;
    const btn = document.getElementById("party-btn-visual");
    if (btn) {
        btn.innerText = `IMPREZA (STROBE): ${isPartyMode ? "WŁĄCZONA" : "WYŁĄCZONA"}`;
        btn.style.backgroundColor = isPartyMode ? "#2ecc71" : "#495057";
    }
    updateStrobe();
};

window.checkSound = function() {
    const audio = document.getElementById('barka-audio');
    audio.currentTime = 0;
    audio.play();
    setTimeout(() => audio.pause(), 3000);
};

// --- CZAT I MODERACJA (ANTYSPAM / BLOCKER LINKÓW) ---
window.sendMsg = function() {
    const now = Date.now();

    if (now < userMutedUntil) {
        const minsLeft = Math.ceil((userMutedUntil - now) / 60000);
        alert(`Jesteś wyciszony jeszcze przez ${minsLeft} min!`);
        return;
    }

    const tekstInput = document.getElementById("tekst");
    const tekst = tekstInput.value.trim();
    if (!tekst) return;

    // Zakaz wysyłania linków -> wyciszenie 10 min
    const urlPattern = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i;
    if (urlPattern.test(tekst)) {
        userMutedUntil = now + (10 * 60 * 1000);
        localStorage.setItem('userMutedUntil', userMutedUntil);
        alert("Wysyłanie linków jest zabronione! Zostałeś wyciszony na 10 minut.");
        tekstInput.value = "";
        return;
    }

    // Antyspam: 4 wiadomości / 2s -> wyciszenie 5 min
    messageTimestamps = messageTimestamps.filter(t => now - t <= 2000);
    messageTimestamps.push(now);
    if (messageTimestamps.length >= 4) {
        userMutedUntil = now + (5 * 60 * 1000);
        localStorage.setItem('userMutedUntil', userMutedUntil);
        alert("Wykryto spam (4 wiadomości w 2s)! Zostałeś wyciszony na 5 minut.");
        tekstInput.value = "";
        return;
    }

    if (tekst === "/test") {
        db.ref("lastTrigger").set(Date.now());
        db.ref("wiadomosci").push({
            autor: "SYSTEM",
            tekst: "właśnie wybiła godzina 21:37🚣",
            czas: Date.now()
        });
    } else {
        const nickInput = document.getElementById("user-nick");
        db.ref("wiadomosci").push({
            autor: nickInput.value.trim() || "Anonim",
            tekst: tekst,
            czas: Date.now()
        });
    }
    tekstInput.value = "";
};

db.ref("wiadomosci").limitToLast(20).on("child_added", (snapshot) => {
    const dane = snapshot.val();
    if (dane.tekst === "/test") return;

    const chatBox = document.getElementById("chat-box");
    const msg = document.createElement("div");
    if(dane.autor === "SYSTEM") msg.style.color = "#f1c40f";
    msg.innerHTML = `<b>${dane.autor}:</b> ${dane.tekst}`;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
});

db.ref("wiadomosci").on("value", (snapshot) => {
    if (!snapshot.exists()) {
        document.getElementById("chat-box").innerHTML = "";
    }
});

// --- TIMER & AUTOMATYCZNE ODLICZANIE ---
function updateTimer() {
    const now = new Date();
    const polandTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Warsaw"}));
    
    const currentHour = polandTime.getHours();
    db.ref("lastCleanup").once("value", (snapshot) => {
        const lastHour = snapshot.val();
        if (lastHour !== null && lastHour !== currentHour) {
            db.ref("wiadomosci").remove();
            db.ref("lastCleanup").set(currentHour);
        } else if (lastHour === null) {
            db.ref("lastCleanup").set(currentHour);
        }
    });

    let target = new Date(polandTime);
    target.setHours(21, 37, 0, 0);
    if (polandTime > target) target.setDate(target.getDate() + 1);
    
    const diff = target - polandTime;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    if (h === 0 && m === 0 && s === 0 && !hasTriggeredToday) {
        hasTriggeredToday = true;
        db.ref("lastTrigger").set(Date.now());
        db.ref("wiadomosci").push({
            autor: "SYSTEM",
            tekst: "właśnie wybiła godzina 21:37🚣",
            czas: Date.now()
        });
    }
    if (m > 1) hasTriggeredToday = false;

    document.getElementById("timer").innerText = 
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

setInterval(updateTimer, 1000);
document.getElementById('barka-audio').onended = stopBarkaEffect;
