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
