// Global variables
let bestScore = 0;
let playerName = ""; 
let moveLeft = false;
let moveRight = false;
let userEmail = null;
let userID = null; // New: To track Google User ID

// Generate or retrieve a unique ID for this browser instance
let playerID = localStorage.getItem('player_uuid') || 
               (localStorage.setItem('player_uuid', 'id_' + Math.random().toString(36).substr(2, 9)), 
                localStorage.getItem('player_uuid'));

// --- 1. Navigation Logic (Pill Highlight) ---
function showTab(tabId) {
    // Update Tabs
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.classList.add('active');
    
    // Update Pill Buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        // Match the text of the button to the tabId
        if (btn.innerText.toLowerCase() === tabId.toLowerCase()) {
            btn.classList.add('active');
        }
    });

    setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 50);

    if (tabId !== 'game') {
        isPlaying = false;
        if (anim) cancelAnimationFrame(anim);
    }
}

// --- 2. Google Login & Calendar Sync ---
async function handleCredentialResponse(response) {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    userEmail = payload.email;
    userID = payload.sub; // The unique Google ID
    playerName = payload.given_name || payload.name;

    // Update Top-Right Profile UI
    document.querySelector('.g_id_signin').style.display = 'none';
    const profileDiv = document.getElementById('user-profile');
    const avatarImg = document.getElementById('user-avatar');
    if (profileDiv && avatarImg) {
        profileDiv.style.display = 'block';
        avatarImg.src = payload.picture; // Google profile pic
    }

    // Update Calendar in Home Tab
    document.getElementById('user-email').innerText = userEmail;
    document.getElementById('calendar-container').style.display = 'block';
    const iframe = document.getElementById('google-calendar-iframe');
    iframe.src = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(userEmail)}&ctz=America%2FNew_York`;

    // Reload Cloud-saved data for this user
    await loadUserMusic();
}

// --- 3. Spotify Logic (Persistent per User) ---
async function loadUserMusic() {
    const wrapper = document.getElementById('spotify-wrapper');
    if (!wrapper) return;

    // Use userID if logged in, otherwise use playerID
    const key = userID ? `spotify_${userID}` : `spotify_${playerID}`;
    const defaultLink = "https://open.spotify.com/embed/playlist/37i9dQZF1DX82Zzp6Mjs64"; // Default matchday vibe
    
    try {
        const savedLink = await puter.kv.get(key);
        let finalLink = savedLink || defaultLink;
        
        // Auto-fix link to embed format if user just pastes a standard URL
        if (finalLink.includes('spotify.com') && !finalLink.includes('embed')) {
            finalLink = finalLink.replace('spotify.com/', 'spotify.com/embed/');
        }

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
        loadUserMusic();
        input.value = "";
        alert("Music updated!");
    } catch (e) { console.error("Save failed", e); }
}

// --- 4. AI Assistant ---
async function askAI() {
    const userInput = document.getElementById('user-input').value;
    const chatWindow = document.getElementById('chat-window');
    if (!userInput) return;
    chatWindow.innerHTML += `<p><strong>You:</strong> ${userInput}</p>`;
    document.getElementById('user-input').value = "";
    const loadingMsg = document.createElement("p");
    loadingMsg.innerHTML = "<strong>AI:</strong> Thinking...";
    chatWindow.appendChild(loadingMsg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    try {
        const response = await puter.ai.chat(userInput);
        loadingMsg.innerHTML = `<strong>AI:</strong> ${response}`;
    } catch (error) {
        loadingMsg.innerHTML = "<strong>AI:</strong> Error loading response.";
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// --- 5. Doodle Jump Core & Leaderboard ---
const canvas = document.getElementById('jumpGame');
const ctx = canvas ? canvas.getContext('2d') : null;
const playerImg = new Image();
playerImg.src = 'character.png'; 

let player = { x: 135, y: 400, w: 60, h: 48, dy: 0, jump: -12, grav: 0.4, facing: 'right' };
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
        x: Math.random() * (canvas.width - 50), 
        y: yStart, w: 50, h: 12, 
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
        if (!playerName) {
            playerName = window.prompt("New High Score! Name:", "Player") || "Anonymous";
            playerName = playerName.substring(0, 10);
        }

        const currentID = userID || playerID; // Google ID takes priority over local UUID
        const existingIndex = scores.findIndex(s => s.name === playerName);

        if (existingIndex !== -1) {
            if (scores[existingIndex].id === currentID) {
                if (finalScore > scores[existingIndex].score) scores[existingIndex].score = finalScore;
            } else {
                scores.push({ name: playerName, score: finalScore, id: currentID });
            }
        } else {
            scores.push({ name: playerName, score: finalScore, id: currentID });
        }

        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 5);

        try { await puter.kv.set('global_leaderboard', JSON.stringify(scores)); } catch(e){}
        localStorage.setItem('local_leaderboard', JSON.stringify(scores));
    }
    return scores;
}

// (Existing game functions like drawGameOverScreen, initJumpGame, gameLoop remain the same)
function drawGameOverScreen(leaderboardData) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
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
    } else {
        ctx.fillText(leaderboardData, canvas.width / 2, 190);
    }
    ctx.fillStyle = "#4A90E2";
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(canvas.width / 2 - 70, 330, 140, 45, 10);
        ctx.fill();
    } else { ctx.fillRect(canvas.width / 2 - 70, 330, 140, 45); }
    ctx.fillStyle = "white";
    ctx.fillText("PLAY AGAIN", canvas.width / 2, 358);
}

async function gameOver() {
    isPlaying = false;
    if (anim) cancelAnimationFrame(anim);
    if (score > bestScore) bestScore = score;
    drawGameOverScreen("Loading...");
    const topScores = await handleLeaderboard(score);
    drawGameOverScreen(topScores);
}

function initJumpGame() {
    if (!canvas) return;
    score = 0; player.x = 135; player.y = 400; player.dy = 0;
    platforms = []; bullets = []; bossBullets = [];
    boss.active = false; boss.hp = 10; boss.y = -100; boss.defeated = false;
    document.getElementById('jumpScore').innerText = score;
    platforms.push({ x: 125, y: 450, w: 50, h: 12, type: 'normal', rocket: false });
    for (let i = 0; i < 6; i++) platforms.push(generatePlatform(i * 75));
    if (anim) cancelAnimationFrame(anim);
    isPlaying = true;
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
            bossBullets.push({ x: boss.x + boss.w/2, y: boss.y + boss.h, w: 10, h: 10 });
            boss.lastShot = Date.now();
        }
        ctx.fillStyle = "#e53e3e";
        ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
    }

    bossBullets.forEach((bb, i) => {
        bb.y += 4; 
        ctx.fillStyle = "#f6e05e";
        ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
        if (bb.x < player.x + player.w && bb.x + bb.w > player.x && bb.y < player.y + player.h && bb.y + bb.h > player.y) {
            gameOver();
        }
        if (bb.y > canvas.height) bossBullets.splice(i, 1);
    });

    bullets.forEach((b, i) => {
        b.y -= 7; 
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
        ctx.fillStyle = "#48bb78";
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(p.x, p.y, p.w, p.h, 6);
            ctx.fill();
        } else { ctx.fillRect(p.x, p.y, p.w, p.h); }

        if (p.type === 'spring') { ctx.fillStyle = "#a0aec0"; ctx.fillRect(p.x + 15, p.y - 8, 20, 8); }
        if (p.rocket) {
            ctx.fillStyle = "#ed8936"; ctx.fillRect(p.x + 20, p.y - 15, 10, 15);
        }
        
        if (player.dy > 0 && player.x < p.x + p.w && player.x + player.w > p.x && 
            player.y + player.h > p.y && player.y + player.h < p.y + p.h + 10) {
            if (p.rocket) { player.dy = -50; p.rocket = false; }
            else if (p.type === 'spring') { player.dy = -30; }
            else { player.dy = player.jump; }
        }
    });

    drawPlayer();

    if (player.y > canvas.height) { gameOver(); } 
    else anim = requestAnimationFrame(gameLoop);
}

// Initial Run
loadUserMusic();

// Event Listeners for Game
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if ((e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') && isPlaying && canShoot) {
        e.preventDefault();
        shoot();
        canShoot = false; 
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') canShoot = true;
});
canvas.addEventListener('mousedown', (e) => {
    if (isPlaying) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x > 80 && x < 220 && y > 330 && y < 375) initJumpGame();
});
