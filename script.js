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
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Add active class to the clicked button
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    // WAKE UP THE WIDGET
    // We target your specific widget ID to force a re-render
    if (tabId === 'barca') {
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            const widget = document.getElementById('widget-8fhkmo3eac2k');
            if (widget) {
                widget.style.display = 'none';
                widget.offsetHeight; // Force reflow
                widget.style.display = 'block';
            }
        }, 150);
    } else {
        window.dispatchEvent(new Event('resize'));
    }

    // Stop the game if we leave the game tab
    if (tabId !== 'game') {
        isPlaying = false;
        if (anim) cancelAnimationFrame(anim);
    }
}

// --- 1. Google Login & Calendar Logic ---
function handleCredentialResponse(response) {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const email = payload.email;

    document.getElementById('user-email').innerText = email;
    document.getElementById('calendar-container').style.display = 'block';
    
    const iframe = document.getElementById('google-calendar-iframe');
    iframe.src = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(email)}&ctz=America%2FNew_York`;
    
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
        const response = await puter.ai.chat(`Help the user the most you can with whatever they ask, try to keep responses short unless specifically told to have a longer answer. Question: ${userInput}`);
        loadingMsg.innerHTML = `<strong>AI:</strong> ${response}`;
    } catch (error) {
        loadingMsg.innerHTML = "<strong>AI:</strong> Sorry I couldnt load a response. Try again!";
    }

    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// --- 3. Doodle Jump (The Stuff-ling Edition) ---
const canvas = document.getElementById('jumpGame');
const ctx = canvas ? canvas.getContext('2d') : null;

const playerImg = new Image();
playerImg.src = 'character.png'; 

let player = { 
    x: 135, y: 400, w: 60, h: 48, 
    dy: 0, 
    jump: -12,    // Buffed jump height
    grav: 0.4,    // Kept floaty gravity
    facing: 'right' 
};

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
        rocket: Math.random() < 0.05 
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

    // Speed tweaks left untouched per instructions
    if (keys['ArrowLeft'] || keys['KeyA']) { player.x -= 7; player.facing = 'left'; }
    if (keys['ArrowRight'] || keys['KeyD']) { player.x += 7; player.facing = 'right'; }

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
        ctx.fillStyle = "red";
        ctx.fillRect(10, 10, boss.hp * 20, 10);
    }

    let bodyWidth = player.w * 0.67; 
    let trunkWidth = player.w - bodyWidth;
    let hitboxX = (player.facing === 'right') ? player.x : player.x + trunkWidth;

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
        if (boss.active) boss.y += offset * 0.2;
    }

    platforms.forEach(p => {
        ctx.fillStyle = "#48bb78";
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(p.x, p.y, p.w, p.h, 6);
        } else {
            ctx.fillRect(p.x, p.y, p.w, p.h); 
        }
        ctx.fill();

        if (p.type === 'spring') { ctx.fillStyle = "#a0aec0"; ctx.fillRect(p.x + 15, p.y - 8, 20, 8); }
        
        if (player.dy > 0 && 
            hitboxX < p.x + p.w && 
            hitboxX + bodyWidth > p.x && 
            player.y + player.h > p.y && 
            player.y + player.h < p.y + p.h + 10) {
            
            if (p.rocket) { player.dy = player.jump * 2.8; p.rocket = false; }
            else if (p.type === 'spring') player.dy = player.jump * 1.6;
            else player.dy = player.jump;
        }
    });

    drawPlayer();

    if (player.y > canvas.height) { isPlaying = false; alert("Game Over! Score: " + score); } 
    else anim = requestAnimationFrame(gameLoop);
}

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
