// State Management
let chatHistory = [];
let isGenerating = false;
let recognition = null;
let isListening = false;

// DOM Elements
const messagesList = document.getElementById('messagesList');
const chatArea = document.getElementById('chatArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const resetBtn = document.getElementById('resetBtn');
const micBtn = document.getElementById('micBtn');

// Check if running on file:// protocol
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.protocol === 'file:') {
        appendMessage('bot', '⚠️ <strong>Peringatan:</strong> Halaman ini dibuka langsung lewat file (<code>file://</code>). Fitur chat tidak akan berjalan jika tidak melalui server.<br><br>👉 Silakan jalankan <code>node index.js</code> di terminal, lalu buka <strong><a href="http://localhost:3000" target="_blank">http://localhost:3000</a></strong> di browser kamu.');
    }
    setupSpeechRecognition();
});

// Auto resize textarea
messageInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Handle Enter key for sending (Shift + Enter for newline)
messageInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// ----------------------------------------------------
// Microphone / Speech-to-Text (Web Speech API)
// ----------------------------------------------------
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        micBtn.style.opacity = '0.4';
        micBtn.title = 'Browser tidak mendukung Speech Recognition (Gunakan Chrome/Edge)';
        micBtn.addEventListener('click', () => {
            alert('Browser kamu tidak mendukung Speech Recognition. Silakan gunakan Google Chrome atau Microsoft Edge.');
        });
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'id-ID'; // Bahasa Indonesia
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('listening');
        micBtn.title = 'Sedang mendengarkan... Klik untuk berhenti';
        messageInput.placeholder = 'Mendengarkan suara kamu...';
    };

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        messageInput.value = transcript;
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    };

    recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        stopListening();
        if (event.error === 'not-allowed') {
            alert('Izin mikrofon ditolak. Silakan izinkan akses mikrofon di browser.');
        }
    };

    recognition.onend = () => {
        stopListening();
    };

    micBtn.addEventListener('click', toggleListening);
}

function toggleListening() {
    if (isGenerating) return;
    if (!recognition) return;

    if (isListening) {
        recognition.stop();
        stopListening();
    } else {
        try {
            recognition.start();
        } catch (err) {
            console.error('Gagal memulai mic:', err);
        }
    }
}

function stopListening() {
    isListening = false;
    micBtn.classList.remove('listening');
    micBtn.title = 'Bicara dengan Mikrofon';
    messageInput.placeholder = 'Ketik pesan atau gunakan mic...';
}

// ----------------------------------------------------
// Chat & Messaging Functions
// ----------------------------------------------------

// Reset conversation
resetBtn.addEventListener('click', function () {
    if (isGenerating) return;
    if (isListening) {
        recognition.stop();
        stopListening();
    }
    
    chatHistory = [];
    messagesList.innerHTML = `
        <div class="message-row bot-row">
            <div class="bubble bot-bubble">
                <p>Obrolan telah direset. Silakan mulai percakapan baru!</p>
            </div>
        </div>
        <div class="suggestions-container" id="suggestionsContainer">
            <button class="chip" onclick="sendSuggestion('Jelaskan apa itu Web Services secara singkat')">
                🌐 Apa itu Web Services?
            </button>
            <button class="chip" onclick="sendSuggestion('Buatkan ide project web sederhana untuk pemula')">
                💡 Ide Project Web
            </button>
            <button class="chip" onclick="sendSuggestion('Tuliskan contoh kode fetch API di JavaScript')">
                💻 Contoh Fetch API JS
            </button>
        </div>
    `;
    scrollToBottom();
});

// Send suggestion chip
function sendSuggestion(text) {
    if (isGenerating) return;
    messageInput.value = text;
    sendMessage();
}

// Scroll chat to bottom
function scrollToBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
}

// Simple Markdown formatting helper
function formatMarkdown(text) {
    if (!text) return '';
    
    // Escape HTML
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Code blocks ```code```
    escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold **text**
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italic *text*
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Line breaks to <br>
    escaped = escaped.replace(/\n/g, '<br>');

    return escaped;
}

// Append a message row to UI
function appendMessage(role, content) {
    const row = document.createElement('div');
    row.className = `message-row ${role === 'user' ? 'user-row' : 'bot-row'}`;
    
    const bubble = document.createElement('div');
    bubble.className = `bubble ${role === 'user' ? 'user-bubble' : 'bot-bubble'}`;
    
    if (role === 'user') {
        bubble.textContent = content;
    } else {
        bubble.innerHTML = formatMarkdown(content);
    }
    
    row.appendChild(bubble);
    messagesList.appendChild(row);
    scrollToBottom();
    return bubble;
}

// Show Typing Indicator
function showTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row bot-row typing-row';
    row.id = 'typingIndicator';
    
    row.innerHTML = `
        <div class="bubble bot-bubble typing-bubble">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;
    
    messagesList.appendChild(row);
    scrollToBottom();
}

// Remove Typing Indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Send Message handler
async function sendMessage() {
    // If mic was listening, stop it
    if (isListening && recognition) {
        recognition.stop();
        stopListening();
    }

    const userText = messageInput.value.trim();
    if (!userText || isGenerating) return;

    // Remove suggestion container if present
    const suggestions = document.getElementById('suggestionsContainer');
    if (suggestions) {
        suggestions.remove();
    }

    // Append user message
    appendMessage('user', userText);
    chatHistory.push({ role: 'user', content: userText });

    // Reset input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Set UI state
    isGenerating = true;
    sendBtn.disabled = true;
    showTypingIndicator();

    let botBubble = null;
    let fullResponse = '';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages: chatHistory })
        });

        if (!response.ok) {
            let errorDetail = `Status code: ${response.status}`;
            try {
                const errData = await response.json();
                if (errData && errData.error) {
                    if (typeof errData.error === 'string') {
                        errorDetail = errData.error;
                    } else if (errData.error.message) {
                        errorDetail = errData.error.message;
                    } else {
                        errorDetail = JSON.stringify(errData.error);
                    }
                }
            } catch (e) {
                // not json
            }
            throw new Error(errorDetail);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // save incomplete line

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;

                const data = trimmed.replace('data:', '').trim();
                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);
                    if (parsed) {
                        if (!botBubble) {
                            removeTypingIndicator();
                            botBubble = appendMessage('bot', '');
                        }
                        fullResponse += parsed;
                        botBubble.innerHTML = formatMarkdown(fullResponse);
                        scrollToBottom();
                    }
                } catch (e) {
                    // Fallback for non-JSON content
                    if (!botBubble) {
                        removeTypingIndicator();
                        botBubble = appendMessage('bot', '');
                    }
                    fullResponse += data;
                    botBubble.innerHTML = formatMarkdown(fullResponse);
                    scrollToBottom();
                }
            }
        }

        if (fullResponse) {
            chatHistory.push({ role: 'assistant', content: fullResponse });
        } else if (!botBubble) {
            removeTypingIndicator();
            appendMessage('bot', 'Maaf, tidak ada respon dari server.');
        }

    } catch (error) {
        console.error('Error saat menghubungi server:', error);
        removeTypingIndicator();
        
        let errorMessage = 'Maaf, terjadi gangguan koneksi ke server.';
        if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
            errorMessage = '⚠️ <strong>Server belum berjalan atau tidak terhubung!</strong><br><br>Pastikan kamu sudah menjalankan command:<br><code>node index.js</code><br>di terminal dan membuka web melalui <strong>http://localhost:3000</strong>.';
        } else if (error.message) {
            errorMessage = `⚠️ <strong>Respon Server:</strong> ${error.message}`;
        }
        
        appendMessage('bot', errorMessage);
    } finally {
        isGenerating = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}
