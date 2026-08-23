let strobeInterval = null;
let confettiInterval = null;
let isPartyMode = false;
let isEffectRunning = false;
let hasTriggeredToday = false;
let userMutedUntil = localStorage.getItem('userMutedUntil') ? parseInt(localStorage.getItem('userMutedUntil')) : 0;
let messageTimestamps = [];
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

function clickCookie() {
    clickCount++;
    document.getElementById("click-count").innerText = `Punkty: ${clickCount}`;
}

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

function updateVisuals() {
    document.getElementById("chat-section").style.display = document.getElementById("toggle-chat").checked ? "block" : "none";
    document.getElementById("center-timer-box").style.display = document.getElementById("toggle-clock").checked ? "block" : "none";
    document.getElementById("sound-section").style.display = document.getElementById("toggle-sound").checked ? "flex" : "none";
    document.getElementById("lasers-container").classList.toggle("hidden", !document.getElementById("toggle-lasers").checked);
    document.getElementById("smoke-container").classList.toggle("hidden", !document.getElementById("toggle-smoke").checked);
}

function updateStrobe() {
    clearInterval(strobeInterval);
    if (!isEffectRunning) {
        document.body.style.backgroundColor = "#30343f";
        return;
    }
    if (isPartyMode && document.getElementById("toggle-strobe").checked) {
        let flash = false;
        strobeInterval = setInterval(() => {
            document.body.style.backgroundColor = flash ? "#ffffff" : "#f1c40f";
            flash = !flash;
        }, 100);
    } else {
        document.body.style.backgroundColor = "#30343f";
    }
}

function startBarkaEffect(startTimeSeconds = 0) {
    isEffectRunning = true;
    const audio = document.getElementById('barka-audio');
    updateStrobe();

    if (!confettiInterval && document.getElementById("toggle-confetti").checked) {
        confettiInterval = setInterval(() => {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.9 } });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.9 } });
        }, 300);
    }

    if (audio) {
        audio.currentTime = startTimeSeconds;
        audio.play().catch(() => {});
    }
}

function stopBarkaEffect() {
    isEffectRunning = false;
    clearInterval(strobeInterval);
    clearInterval(confettiInterval);
    strobeInterval = null;
    confettiInterval = null;
    document.body.style.backgroundColor = "#30343f";
}

db.ref("lastTrigger").on("value", (snapshot) => {
    const triggerTime = snapshot.val();
    if (!triggerTime) return;
    const diff = (Date.now() - triggerTime) / 1000;
    if (diff >= 0 && diff < 170) {
        startBarkaEffect(diff);
    }
});

document.addEventListener('click', () => {
    const audio = document.getElementById('barka-audio');
    if (isEffectRunning && audio.paused) {
        db.ref("lastTrigger").once("value", snapshot => {
            const triggerTime = snapshot.val();
            if (triggerTime) {
                const diff = (Date.now() - triggerTime) / 1000;
                if (diff > 0 && diff < 170) {
                    audio.currentTime = diff;
                    audio.play().catch(()=>{});
                }
            }
        });
    }
});
document.addEventListener('keydown', () => document.body.click());

window.toggleParty = function() {
    isPartyMode = !isPartyMode;
    const btn = document.getElementById("party-btn-visual");
    if (btn) {
        btn.innerText = `IMPREZA (STROBE): ${isPartyMode ? "WŁĄCZONA" : "WYŁĄCZONA"}`;
        btn.style.backgroundColor = isPartyMode ? "#2ecc71" : "#444";
    }
    updateStrobe();
};

window.checkSound = function() {
    const audio = document.getElementById('barka-audio');
    audio.currentTime = 0;
    audio.play();
    setTimeout(() => audio.pause(), 3000);
};

window.sendMsg = function() {
    const now = Date.now();
    if (now < userMutedUntil) {
        alert(`Wyciszenie!`);
        return;
    }

    const tekstInput = document.getElementById("tekst");
    const tekst = tekstInput.value.trim();
    if (!tekst) return;

    if (/(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i.test(tekst)) {
        userMutedUntil = now + 600000;
        localStorage.setItem('userMutedUntil', userMutedUntil);
        tekstInput.value = "";
        return;
    }

    messageTimestamps = messageTimestamps.filter(t => now - t <= 2000);
    messageTimestamps.push(now);
    if (messageTimestamps.length >= 4) {
        userMutedUntil = now + 300000;
        localStorage.setItem('userMutedUntil', userMutedUntil);
        tekstInput.value = "";
        return;
    }

    if (tekst === "/test") {
        db.ref("lastTrigger").set(Date.now());
        db.ref("wiadomosci").push({ autor: "SYSTEM", tekst: "właśnie wybiła godzina 21:37🚣", czas: Date.now() });
    } else {
        db.ref("wiadomosci").push({ autor: document.getElementById("user-nick").value.trim() || "Anonim", tekst: tekst, czas: Date.now() });
    }
    tekstInput.value = "";
};

db.ref("wiadomosci").limitToLast(20).on("child_added", (snapshot) => {
    const dane = snapshot.val();
    const chatBox = document.getElementById("chat-box");
    const msg = document.createElement("div");
    if(dane.autor === "SYSTEM") msg.style.color = "#f1c40f";
    msg.innerHTML = `<b>${dane.autor}:</b> ${dane.tekst}`;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
});

db.ref("wiadomosci").on("value", (snapshot) => {
    if (!snapshot.exists()) document.getElementById("chat-box").innerHTML = "";
});

function updateTimer() {
    const now = new Date();
    let target = new Date(now);
    target.setHours(21, 37, 0, 0);

    let diff = target - now;

    if (diff <= 0 && diff > -170000) {
        if (!hasTriggeredToday) {
            hasTriggeredToday = true;
            db.ref("lastTrigger").set(Date.now());
            db.ref("wiadomosci").push({ autor: "SYSTEM", tekst: "właśnie wybiła godzina 21:37🚣", czas: Date.now() });
        }
    } else if (diff <= -170000) {
        target.setDate(target.getDate() + 1);
        diff = target - now;
        hasTriggeredToday = false;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    document.getElementById("timer").innerText = 
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

setInterval(updateTimer, 1000);
document.getElementById('barka-audio').onended = stopBarkaEffect;
