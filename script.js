// Global variables
let bestScore = 0;
let playerName = ""; 
let moveLeft = false;
let moveRight = false;
let userEmail = null;
let userID = null; 
let chatHistory = []; 
let isGenerating = false;

// Naming Logic Variables
let isNaming = false;
let inputName = "";
const MAX_NAME_LENGTH = 10;

// Generate or retrieve a unique ID
let playerID = localStorage.getItem('player_uuid') || 
                (localStorage.setItem('player_uuid', 'id_' + Math.random().toString(36).substr(2, 9)), 
                 localStorage.getItem('player_uuid'));

// --- 1. Navigation Logic ---
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick')?.includes(`'${tabId}'`)) {
            btn.classList.add('active');
        }
    });

    if (tabId !== 'game') {
        isPlaying = false;
        isNaming = false;
        if (typeof anim !== 'undefined') cancelAnimationFrame(anim);
    }
}

function toggleMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) menu.classList.toggle('open');
}

// --- 2. Google Login & Account Sync ---
async function handleCredentialResponse(response) {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    userEmail = payload.email;
    userID = payload.sub; 
    playerName = payload.given_name || payload.name;

    document.querySelector('.g_id_signin').style.display = 'none';
    const profileDiv = document.getElementById('user-profile');
    const avatarImg = document.getElementById('user-avatar');
    if (profileDiv && avatarImg) {
        profileDiv.style.display = 'block';
        avatarImg.src = payload.picture;
        avatarImg.onclick = openSettings;
    }

    document.getElementById('user-email').innerText = userEmail;
    document.getElementById('calendar-container').style.display = 'block';
    const iframe = document.getElementById('google-calendar-iframe');
    iframe.src = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(userEmail)}&ctz=America%2FNew_York`;

    await loadUserMusic();
}

// --- 3. Spotify Logic ---
async function loadUserMusic() {
    const wrapper = document.getElementById('spotify-wrapper');
    if (!wrapper) return;
    const key = userID ? `spotify_${userID}` : `spotify_${playerID}`;
    const defaultLink = "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM3M"; 
    
    try {
        const savedLink = await puter.kv.get(key);
        let finalLink = savedLink || defaultLink;
        wrapper.innerHTML = `<iframe style="border-radius:12px" src="${finalLink}" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
    } catch (e) { console.error(e); }
}

async function updateUserMusic() {
    const input = document.getElementById('spotify-link-input');
    let link = input.value.trim();
    if (!link) return;
    const key = userID ? `spotify_${userID}` : `spotify_${playerID}`;
    try {
        await puter.kv.set(key, link);
        await loadUserMusic();
        input.value = "";
    } catch (e) { console.error("Save failed", e); }
}

// --- 4. AI Assistant ---
async function askAI() {
    if (isGenerating) return;
    const userInputField = document.getElementById('user-input');
    const userInput = userInputField.value.trim();
    const chatWindow = document.getElementById('chat-window');
    if (!userInput) return;
    isGenerating = true;
    chatWindow.innerHTML += `<p><strong>You:</strong> ${userInput}</p>`;
    chatHistory.push({role: "user", content: userInput});
    userInputField.value = "";
    const loadingMsg = document.createElement("p");
    loadingMsg.innerHTML = "<strong>AI:</strong> Thinking...";
    chatWindow.appendChild(loadingMsg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    if (chatHistory.length > 12) chatHistory = chatHistory.slice(-12);
    try {
        const response = await puter.ai.chat(chatHistory);
        loadingMsg.innerHTML = `<strong>AI:</strong> ${response}`;
        chatHistory.push({role: "assistant", content: response.toString()});
    } catch (error) {
        loadingMsg.innerHTML = "<strong>AI:</strong> Error loading response.";
    } finally {
        isGenerating = false;
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
}

// --- 5. Settings & Theme ---
function openSettings() { document.getElementById('settings-modal').style.display = 'block'; }
function closeSettings() { document.getElementById('settings-modal').style.display = 'none'; }

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-theme');
    const btn = document.getElementById('dark-mode-btn');
    if (btn) btn.innerText = isDark ? "On" : "Off";
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function handleSignOut() {
    userEmail = null; userID = null; playerName = "Anonymous";
    document.getElementById('user-profile').style.display = 'none';
    document.querySelector('.g_id_signin').style.display = 'block';
    document.getElementById('calendar-container').style.display = 'none';
    closeSettings();
    showToast("Signed out successfully", "error");
}

function showToast(message, type = "success", duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div>${message}</div><div class="toast-progress" style="animation: progressAnim ${duration}ms linear forwards"></div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

// --- 6. Mobile & FullScreen Logic ---
function toggleFullScreen() {
    const container = document.getElementById('game-container');
    const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);

    if (!isFull) {
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            // Needed for iOS Safari
            container.webkitRequestFullscreen();
        } else if (container.msRequestFullscreen) {
            container.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

function handleResize() {
    const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (isFull) {
        const ratio = window.innerWidth / window.innerHeight;
        if (ratio < 0.8) { 
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        } else { 
            canvas.width = 300;
            canvas.height = 500;
        }
    } else {
        canvas.width = 300;
        canvas.height = 500;
    }
    if (isNaming) drawNamingScreen();
}

window.addEventListener('resize', handleResize);
window.addEventListener('fullscreenchange', handleResize);
window.addEventListener('webkitfullscreenchange', handleResize);

// --- 7. Doodle Jump Core ---
const canvas = document.getElementById('jumpGame');
const ctx = canvas ? canvas.getContext('2d') : null;
const playerImg = new Image();
playerImg.src = 'character.png'; 

let player = { x: 120, y: 400, w: 60, h: 48, dy: 0, jump: -12, grav: 0.4, facing: 'right' };
let platforms = [];
let bullets = [];
let bossBullets = [];
let score = 0;
let isPlaying = false;
let anim;
let keys = {};
let canShoot = true;
let boss = { active: false, hp: 10, x: 100, y: -100, w: 100, h: 80, dx: 2, lastShot: 0, defeated: false };

function generatePlatform(yStart) {
    return { 
        x: Math.random() * (canvas.width - 60), 
        y: yStart, w: 60, h: 12, 
        type: Math.random() < 0.15 ? 'spring' : 'normal', 
        rocket: Math.random() < 0.01 
    };
}

function shoot() {
    bullets.push({ x: player.x + player.w / 2 - 3, y: player.y, w: 6, h: 12 });
}

function drawPlayer() {
    ctx.save();
    if (player.facing === 'left') {
        ctx.translate(player.x + player.w, player.y);
        ctx.scale(-1, 1);
        ctx.drawImage(playerImg, 0, 0, player.w, player.h);
    } else {
        ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
    }
    ctx.restore();
}

function drawNamingScreen() {
    if (!isNaming) return;
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "bold 22px Arial";
    ctx.fillText("NEW HIGH SCORE!", canvas.width / 2, 120);
    ctx.font = "16px Arial";
    ctx.fillText("Type your name:", canvas.width / 2, 160);
    
    ctx.strokeStyle = "#4A90E2";
    ctx.strokeRect(canvas.width / 2 - 80, 180, 160, 40);
    
    ctx.fillStyle = "white";
    ctx.font = "20px Courier New";
    let cursor = (Date.now() % 1000 < 500) ? "_" : "";
    ctx.fillText(inputName + cursor, canvas.width / 2, 208);
    
    ctx.fillStyle = "#48bb78";
    ctx.fillRect(canvas.width / 2 - 50, 240, 100, 40);
    ctx.fillStyle = "white";
    ctx.font = "bold 16px Arial";
    ctx.fillText("SUBMIT", canvas.width / 2, 265);
}

async function finishNaming() {
    const ghost = document.getElementById('mobile-keyboard-trigger');
    if (ghost) { 
        ghost.blur();
        ghost.value = "";
    }
    playerName = inputName.trim() || "Player";
    isNaming = false;
    drawGameOverScreen("Loading Leaderboard...");
    const topScores = await handleLeaderboard(score);
    drawGameOverScreen(topScores);
}

async function handleLeaderboard(finalScore) {
    let scores = [];
    try {
        let rawData = await puter.kv.get('global_leaderboard');
        scores = rawData ? JSON.parse(rawData) : [];
    } catch (e) {
        let localData = localStorage.getItem('local_leaderboard');
        scores = localData ? JSON.parse(localData) : [];
    }
    if (finalScore > 0) {
        const currentID = userID || playerID;
        scores.push({ name: playerName, score: finalScore, id: currentID });
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 5);
        try { await puter.kv.set('global_leaderboard', JSON.stringify(scores)); } catch(e){}
        localStorage.setItem('local_leaderboard', JSON.stringify(scores));
    }
    return scores;
}

function drawGameOverScreen(leaderboardData) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.95)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "bold 28px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2, 70);
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, canvas.width / 2, 105);
    ctx.fillStyle = "#f6e05e";
    ctx.fillText("--- TOP 5 ---", canvas.width / 2, 150);
    ctx.fillStyle = "white";
    ctx.font = "16px Courier New";
    if (Array.isArray(leaderboardData)) {
        leaderboardData.forEach((s, i) => {
            ctx.fillText(`${i + 1}. ${s.name}: ${s.score}`, canvas.width / 2, 190 + (i * 25));
        });
    } else { ctx.fillText(leaderboardData, canvas.width / 2, 190); }
    ctx.fillStyle = "#4A90E2";
    ctx.fillRect(canvas.width / 2 - 70, 380, 140, 45);
    ctx.fillStyle = "white";
    ctx.fillText("PLAY AGAIN", canvas.width / 2, 408);
}

function gameOver() {
    isPlaying = false;
    if (anim) cancelAnimationFrame(anim);
    if (score > bestScore) bestScore = score;
    if (!playerName || playerName === "Anonymous") {
        isNaming = true;
        inputName = "";
        const ghost = document.getElementById('mobile-keyboard-trigger');
        if (ghost) { 
            ghost.value = "";
            setTimeout(() => ghost.focus(), 100); 
        }
        anim = requestAnimationFrame(function namingLoop() {
            if (isNaming) {
                drawNamingScreen();
                anim = requestAnimationFrame(namingLoop);
            }
        });
    } else {
        handleLeaderboard(score).then(scores => drawGameOverScreen(scores));
    }
}

function initJumpGame() {
    handleResize(); 
    score = 0; player.x = canvas.width/2 - 30; player.y = 400; player.dy = 0;
    platforms = []; bullets = []; bossBullets = [];
    boss.active = false; boss.hp = 10; boss.y = -100; boss.defeated = false;
    document.getElementById('jumpScore').innerText = score;
    platforms.push({ x: canvas.width/2 - 25, y: 450, w: 50, h: 12, type: 'normal', rocket: false });
    for (let i = 0; i < 6; i++) platforms.push(generatePlatform(i * 80));
    if (anim) cancelAnimationFrame(anim);
    isPlaying = true;
    isNaming = false;
    gameLoop();
}

function gameLoop() {
    if (!isPlaying) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (keys['ArrowLeft'] || keys['KeyA'] || moveLeft) { player.x -= 7; player.facing = 'left'; }
    if (keys['ArrowRight'] || keys['KeyD'] || moveRight) { player.x += 7; player.facing = 'right'; }
    player.dy += player.grav;
    player.y += player.dy;

    if (player.x > canvas.width) player.x = -player.w;
    else if (player.x + player.w < 0) player.x = canvas.width;

    if (score >= 1000 && !boss.defeated && !boss.active) boss.active = true;

    if (boss.active) {
        if (boss.y < 50) boss.y += 1;
        boss.x += boss.dx;
        if (boss.x <= 0 || boss.x + boss.w >= canvas.width) boss.dx *= -1;
        if (Date.now() - boss.lastShot > 1500) {
            bossBullets.push({ x: boss.x + boss.w/2, y: boss.y + boss.h, w: 15, h: 15 });
            boss.lastShot = Date.now();
        }
        ctx.fillStyle = "#e53e3e";
        ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
    }

    bossBullets.forEach((bb, i) => {
        bb.y += 5;
        ctx.fillStyle = "#f6e05e";
        ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
        if (bb.x < player.x + player.w && bb.x + bb.w > player.x && bb.y < player.y + player.h && bb.y + bb.h > player.y) gameOver();
        if (bb.y > canvas.height) bossBullets.splice(i, 1);
    });

    bullets.forEach((b, i) => {
        b.y -= 10;
        ctx.fillStyle = "#2D3748";
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (b.y < 0) bullets.splice(i, 1);
        if (boss.active && b.x < boss.x + boss.w && b.x + b.w > boss.x && b.y < boss.y + boss.h && b.y + b.h > boss.y) {
            bullets.splice(i, 1);
            boss.hp--;
            if (boss.hp <= 0) { boss.active = false; boss.defeated = true; score += 500; }
        }
    });

    if (player.y < 250) {
        let offset = 250 - player.y;
        player.y = 250;
        platforms.forEach(p => {
            p.y += offset;
            if (p.y > canvas.height) { Object.assign(p, generatePlatform(0)); score += 10; }
        });
        document.getElementById('jumpScore').innerText = score;
    }

    platforms.forEach(p => {
        ctx.fillStyle = p.type === 'spring' ? "#48bb78" : "#68d391";
        ctx.fillRect(p.x, p.y, p.w, p.h);
        if (p.type === 'spring') { ctx.fillStyle = "#a0aec0"; ctx.fillRect(p.x + 15, p.y - 8, 20, 8); }
        if (p.rocket) { ctx.fillStyle = "#ed8936"; ctx.fillRect(p.x + 20, p.y - 15, 10, 15); }
        if (player.dy > 0 && player.x < p.x + p.w && player.x + player.w > p.x && 
            player.y + player.h > p.y && player.y + player.h < p.y + p.h + 10) {
            if (p.rocket) { player.dy = -50; p.rocket = false; }
            else if (p.type === 'spring') player.dy = -30;
            else player.dy = player.jump;
        }
    });

    drawPlayer();
    if (player.y > canvas.height) gameOver();
    else anim = requestAnimationFrame(gameLoop);
}

// --- 8. Event Listeners ---
window.addEventListener('keydown', (e) => {
    if (isNaming) return; 
    keys[e.code] = true;
    if ((e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') && isPlaying && canShoot) {
        e.preventDefault(); shoot(); canShoot = false; 
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') canShoot = true;
});

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    
    if (isNaming) {
        if (x > canvas.width / 2 - 80 && x < canvas.width / 2 + 80 && y > 180 && y < 220) {
            const ghost = document.getElementById('mobile-keyboard-trigger');
            if (ghost) { ghost.focus(); }
        }
        if (x > canvas.width / 2 - 50 && x < canvas.width / 2 + 50 && y > 240 && y < 280) {
            if (inputName.length > 0) finishNaming();
        }
        return;
    }
    if (!isPlaying && x > canvas.width/2 - 70 && x < canvas.width/2 + 70 && y > 380 && y < 425) initJumpGame();
});

const shootBtn = document.getElementById('mobile-shoot-btn');
if (shootBtn) shootBtn.addEventListener('touchstart', (e) => { e.preventDefault(); if (isPlaying) shoot(); });

canvas.addEventListener('touchstart', (e) => {
    if (isNaming) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = ((touch.clientX - rect.left) / rect.width) * canvas.width;
        const y = ((touch.clientY - rect.top) / rect.height) * canvas.height;
        
        // Use stopPropagation to prevent the game from handling this touch
        if (x > canvas.width / 2 - 80 && x < canvas.width / 2 + 80 && y > 180 && y < 220) {
            e.preventDefault();
            e.stopPropagation();
            const ghost = document.getElementById('mobile-keyboard-trigger');
            if (ghost) { 
                ghost.focus(); 
                ghost.click(); 
            }
        }
        if (x > canvas.width / 2 - 50 && x < canvas.width / 2 + 50 && y > 240 && y < 280) {
            e.preventDefault();
            e.stopPropagation();
            if (inputName.length > 0) finishNaming();
        }
        return;
    }
    if (!isPlaying) return;
    const touchX = e.touches[0].clientX;
    if (touchX < window.innerWidth / 2) { moveLeft = true; moveRight = false; }
    else { moveRight = true; moveLeft = false; }
}, { passive: false });

canvas.addEventListener('touchend', () => { moveLeft = false; moveRight = false; });

const ghostInput = document.getElementById('mobile-keyboard-trigger');
if (ghostInput) {
    ghostInput.addEventListener('blur', () => {
        // If the keyboard closes but we're still in naming mode, keep trying to re-focus
        if (isNaming) {
            setTimeout(() => { if (isNaming) ghostInput.focus(); }, 150);
        }
    });
    ghostInput.addEventListener('input', (e) => { if (isNaming) inputName = e.target.value.substring(0, MAX_NAME_LENGTH); });
    ghostInput.addEventListener('keydown', (e) => { 
        if (e.key === "Enter" && isNaming && inputName.length > 0) { 
            ghostInput.blur(); 
            finishNaming(); 
        } 
    });
}

document.getElementById('user-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !isGenerating) askAI();
});

if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');
loadUserMusic();
