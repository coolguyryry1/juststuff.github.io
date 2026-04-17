function showTab(tabId) {
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show the selected tab
    document.getElementById(tabId).classList.add('active');

    // Add active class to the clicked button
    event.currentTarget.classList.add('active');
    
    // Stop the game if we leave the game tab
    if (tabId !== 'game') {
        isPlaying = false;
        if (anim) cancelAnimationFrame(anim);
    }
}

// --- 1. Google Login & Calendar Logic ---
function handleCredentialResponse(response) {
    // Decode the Google ID Token (JWT)
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const email = payload.email;

    // Update the UI
    document.getElementById('user-email').innerText = email;
    document.getElementById('calendar-container').style.display = 'block';
    
    // Set the Iframe to the user's email calendar
    const iframe = document.getElementById('google-calendar-iframe');
    iframe.src = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(email)}&ctz=America%2FNew_York`;
    
    // Hide the login button after success
    document.querySelector('.g_id_signin').style.display = 'none';
}

// --- 2. AI Implementation (Puter.js) ---
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
        // We tell the AI it is April 2026.
        const response = await puter.ai.chat(`Help the user the most you can with whatever they ask, try to keep responses short unless specifically told to have a longer answer. Question: ${userInput}`);
        loadingMsg.innerHTML = `<strong>AI:</strong> ${response}`;
    } catch (error) {
        loadingMsg.innerHTML = "<strong>AI:</strong> Sorry I couldnt load a response. Try again!";
    }

    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// --- 3. Doodle Jump Logic (With Boss & Shooting) ---
const canvas = document.getElementById('jumpGame');
const ctx = canvas ? canvas.getContext('2d') : null;

let player = { x: 135, y: 400, w: 30, h: 30, dy: 0, jump: -10, grav: 0.4 };
let platforms = [];
let bullets = [];
let bossBullets = [];
let score = 0;
let isPlaying = false;
let anim;

// Boss Object
let boss = {
    active: false,
    hp: 10,
    x: 100,
    y: -100,
    w: 100,
    h: 80,
    dx: 2,
    lastShot: 0,
    defeated: false
};

function generatePlatform(yStart) {
    return {
        x: Math.random() * (canvas.width - 50),
        y: yStart,
        w: 50,
        h: 10,
        type: Math.random() < 0.15 ? 'spring' : 'normal',
        rocket: Math.random() < 0.05
    };
}

function shoot() {
    bullets.push({ x: player.x + player.w / 2 - 2, y: player.y, w: 5, h: 10 });
}

function initJumpGame() {
    if (!canvas) return;
    score = 0;
    player.x = 135; player.y = 400; player.dy = 0;
    platforms = []; bullets = []; bossBullets = [];
    boss.active = false; boss.hp = 10; boss.y = -100; boss.defeated = false;
    document.getElementById('jumpScore').innerText = score;
    
    // Start Platform
    platforms.push({ x: 125, y: 450, w: 50, h: 10, type: 'normal', rocket: false });
    for (let i = 0; i < 6; i++) platforms.push(generatePlatform(i * 70));
    
    if (anim) cancelAnimationFrame(anim);
    isPlaying = true;
    gameLoop();
}

function gameLoop() {
    if (!isPlaying) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Player Physics & Wrap
    player.dy += player.grav;
    player.y += player.dy;
    if (player.x > canvas.width) player.x = -player.w;
    else if (player.x + player.w < 0) player.x = canvas.width;

    // Trigger Boss at 500 points
    if (score >= 500 && !boss.defeated && !boss.active) {
        boss.active = true;
    }

    // Boss Logic
    if (boss.active) {
        if (boss.y < 50) boss.y += 1; // Entry
        boss.x += boss.dx;
        if (boss.x <= 0 || boss.x + boss.w >= canvas.width) boss.dx *= -1;

        // Boss Shooting
        if (Date.now() - boss.lastShot > 1500) {
            bossBullets.push({ x: boss.x + boss.w/2, y: boss.y + boss.h, w: 10, h: 10 });
            boss.lastShot = Date.now();
        }

        // Draw Boss
        ctx.fillStyle = "#e53e3e";
        ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
        ctx.fillStyle = "white"; // Eye
        ctx.fillRect(boss.x + 30, boss.y + 20, 40, 20);
        ctx.fillStyle = "black";
        ctx.fillRect(boss.x + 45, boss.y + 25, 10, 10);
        
        // HP Bar
        ctx.fillStyle = "red";
        ctx.fillRect(10, 10, boss.hp * 20, 10);
    }

    // Bullets Logic
    bullets.forEach((b, index) => {
        b.y -= 7;
        ctx.fillStyle = "#2d3748";
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (b.y < 0) bullets.splice(index, 1);

        // Hit Boss?
        if (boss.active && b.x < boss.x + boss.w && b.x + b.w > boss.x && b.y < boss.y + boss.h && b.y + b.h > boss.y) {
            bullets.splice(index, 1);
            boss.hp--;
            if (boss.hp <= 0) {
                boss.active = false;
                boss.defeated = true;
                score += 500;
                document.getElementById('jumpScore').innerText = score;
            }
        }
    });

    // Boss Bullets (Debris)
    bossBullets.forEach((bb, index) => {
        bb.y += 4;
        ctx.fillStyle = "red";
        ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
        if (bb.y > canvas.height) bossBullets.splice(index, 1);
        
        // Hit Player?
        if (bb.x < player.x + player.w && bb.x + bb.w > player.x && bb.y < player.y + player.h && bb.y + bb.h > player.y) {
            player.y = canvas.height + 100; // Game Over
        }
    });

    // Camera & Platforms
    if (player.y < 250) {
        let offset = 250 - player.y;
        player.y = 250;
        platforms.forEach(p => {
            p.y += offset;
            if (p.y > canvas.height) {
                let n = generatePlatform(0);
                Object.assign(p, n);
                score += 10;
                document.getElementById('jumpScore').innerText = score;
            }
        });
        if (boss.active) boss.y += offset * 0.2; // Boss stays at top but moves slightly
    }

    // Draw Platforms
    platforms.forEach(p => {
        ctx.fillStyle = "#48bb78";
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 5); ctx.fill(); } 
        else ctx.fillRect(p.x, p.y, p.w, p.h);

        if (p.type === 'spring') { ctx.fillStyle = "#a0aec0"; ctx.fillRect(p.x + 15, p.y - 8, 20, 8); }
        if (p.rocket) { ctx.fillStyle = "#f56565"; ctx.beginPath(); ctx.moveTo(p.x+25, p.y-15); ctx.lineTo(p.x+35, p.y); ctx.lineTo(p.x+15, p.y); ctx.fill(); }

        if (player.dy > 0 && player.x < p.x + p.w && player.x + player.w > p.x && player.y + player.h > p.y && player.y + player.h < p.y + p.h) {
            if (p.rocket) { player.dy = player.jump * 2.8; p.rocket = false; }
            else if (p.type === 'spring') player.dy = player.jump * 1.6;
            else player.dy = player.jump;
        }
    });

    // Draw Player
    ctx.fillStyle = "#4A90E2";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    if (player.y > canvas.height) { isPlaying = false; alert("Score: " + score); } 
    else anim = requestAnimationFrame(gameLoop);
}

// Controls
window.addEventListener('keydown', (e) => { 
    if (e.code === 'Space' && isPlaying) {
        e.preventDefault(); // Stop page from jumping down
        shoot(); 
    }
});

if(canvas) {
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        player.x = (e.clientX - rect.left) * (canvas.width / rect.width) - player.w / 2;
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        player.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width) - player.w / 2;
    }, { passive: false });
    // Tap to shoot on mobile
    canvas.addEventListener('touchstart', (e) => {
        if(isPlaying) shoot();
    });
}
