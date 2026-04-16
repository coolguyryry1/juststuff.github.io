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

// --- 3. Doodle Jump Logic ---
const canvas = document.getElementById('jumpGame');
const ctx = canvas ? canvas.getContext('2d') : null;

let player = { x: 135, y: 400, w: 30, h: 30, dy: 0, jump: -10, grav: 0.4 };
let platforms = [];
let score = 0;
let isPlaying = false;
let anim;

function initJumpGame() {
    if(!canvas) return;
    score = 0;
    player.y = 400;
    player.dy = 0;
    platforms = [];
    document.getElementById('jumpScore').innerText = score;
    
    // Initial platforms
    for (let i = 0; i < 7; i++) {
        platforms.push({ x: Math.random() * (canvas.width - 50), y: i * 80, w: 50, h: 10 });
    }
    
    if (anim) cancelAnimationFrame(anim);
    isPlaying = true;
    gameLoop();
}

function gameLoop() {
    if (!isPlaying) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Physics
    player.dy += player.grav;
    player.y += player.dy;

    // Camera scroll
    if (player.y < 250) {
        let offset = 250 - player.y;
        player.y = 250;
        platforms.forEach(p => {
            p.y += offset;
            if (p.y > canvas.height) {
                p.y = 0;
                p.x = Math.random() * (canvas.width - 50);
                score += 10;
                document.getElementById('jumpScore').innerText = score;
            }
        });
    }

    // Platforms
    ctx.fillStyle = "#cbd5e0";
    platforms.forEach(p => {
        ctx.fillRect(p.x, p.y, p.w, p.h);
        if (player.dy > 0 && player.x < p.x + p.w && player.x + player.w > p.x &&
            player.y + player.h > p.y && player.y + player.h < p.y + p.h) {
            player.dy = player.jump;
        }
    });

    // Player (Blue Square)
    ctx.fillStyle = "#4A90E2";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    if (player.y > canvas.height) {
        isPlaying = false;
        alert("Game Over! Score: " + score);
    } else {
        anim = requestAnimationFrame(gameLoop);
    }
}

// Mouse controls for jumping
if(canvas) {
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        player.x = (e.clientX - rect.left) * (canvas.width / rect.width) - player.w / 2;
    });
}
