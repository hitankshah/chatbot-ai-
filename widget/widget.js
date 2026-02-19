/**
 * AI Chatbot - Embeddable Chat Widget
 * Vanilla JavaScript - works on any website
 * 
 * Embed code:
 * <script>
 *   window.CHATBOT_CONFIG = { id: 'bot_123', primaryColor: '#007bff' };
 * </script>
 * <script src="https://yourcdn.com/widget.js" defer></script>
 */

(function () {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = window.CHATBOT_CONFIG || {};
  const CHATBOT_ID = CONFIG.id || '';
  const PRIMARY_COLOR = CONFIG.primaryColor || '#007bff';
  const WELCOME_MESSAGE = CONFIG.welcomeMessage || 'Hi! How can I help you today?';
  const POSITION = CONFIG.position || 'bottom-right';
  const API_URL = CONFIG.apiUrl || `${window.location.origin}/api`;
  const WIDGET_TITLE = CONFIG.title || 'Chat Support';

  if (!CHATBOT_ID) {
    console.error('Chatbot Widget: Missing chatbot ID in CHATBOT_CONFIG');
    return;
  }

  // Session management
  const SESSION_KEY = `chatbot_session_${CHATBOT_ID}`;
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  // State
  let isOpen = false;
  let isLoading = false;

  // ============================================
  // STYLES (CSS isolation via shadow DOM fallback)
  // ============================================
  const STYLES = `
    /* Reset & Container */
    #chatbot-widget-container * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }

    /* Bubble Button */
    #chatbot-bubble {
      position: fixed;
      ${POSITION === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
      bottom: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${PRIMARY_COLOR};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999998;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    #chatbot-bubble:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 24px rgba(0,0,0,0.3);
    }
    #chatbot-bubble svg {
      width: 28px;
      height: 28px;
      fill: white;
    }
    #chatbot-bubble.open svg.chat-icon { display: none; }
    #chatbot-bubble.open svg.close-icon { display: block; }
    #chatbot-bubble:not(.open) svg.chat-icon { display: block; }
    #chatbot-bubble:not(.open) svg.close-icon { display: none; }

    /* Chat Window */
    #chatbot-window {
      position: fixed;
      ${POSITION === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
      bottom: 90px;
      width: 380px;
      height: 520px;
      max-height: calc(100vh - 120px);
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    #chatbot-window.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }

    /* Header */
    #chatbot-header {
      background: ${PRIMARY_COLOR};
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    #chatbot-header-title {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    #chatbot-header-subtitle {
      font-size: 12px;
      opacity: 0.85;
      margin-top: 2px;
    }
    #chatbot-header-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 20px;
      padding: 4px;
      opacity: 0.8;
      transition: opacity 0.2s;
    }
    #chatbot-header-close:hover { opacity: 1; }

    /* Messages Area */
    #chatbot-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f8f9fa;
    }
    #chatbot-messages::-webkit-scrollbar {
      width: 4px;
    }
    #chatbot-messages::-webkit-scrollbar-thumb {
      background: #ccc;
      border-radius: 2px;
    }

    /* Message Bubbles */
    .chatbot-msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
      animation: chatbot-fadeIn 0.3s ease;
    }
    .chatbot-msg.bot {
      background: #ffffff;
      color: #1a1a1a;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .chatbot-msg.user {
      background: ${PRIMARY_COLOR};
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .chatbot-msg-time {
      font-size: 10px;
      opacity: 0.6;
      margin-top: 4px;
    }
    .chatbot-msg.user .chatbot-msg-time {
      text-align: right;
      color: rgba(255,255,255,0.7);
    }

    /* Typing Indicator */
    .chatbot-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
      background: white;
      border-radius: 14px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .chatbot-typing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #999;
      animation: chatbot-bounce 1.4s infinite ease-in-out;
    }
    .chatbot-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .chatbot-typing-dot:nth-child(2) { animation-delay: -0.16s; }

    /* Input Area */
    #chatbot-input-area {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: white;
      border-top: 1px solid #e8e8e8;
      flex-shrink: 0;
      gap: 8px;
    }
    #chatbot-input {
      flex: 1;
      border: 1px solid #e0e0e0;
      border-radius: 24px;
      padding: 10px 16px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
      background: #f8f9fa;
    }
    #chatbot-input:focus {
      border-color: ${PRIMARY_COLOR};
      background: white;
    }
    #chatbot-input::placeholder {
      color: #999;
    }
    #chatbot-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${PRIMARY_COLOR};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.1s;
      flex-shrink: 0;
    }
    #chatbot-send:hover {
      filter: brightness(1.1);
    }
    #chatbot-send:active {
      transform: scale(0.95);
    }
    #chatbot-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    #chatbot-send svg {
      width: 18px;
      height: 18px;
      fill: white;
    }

    /* Powered by */
    #chatbot-powered {
      text-align: center;
      padding: 6px;
      font-size: 10px;
      color: #aaa;
      background: white;
    }

    /* Animations */
    @keyframes chatbot-fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes chatbot-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      #chatbot-window {
        width: calc(100vw - 16px);
        height: calc(100vh - 100px);
        right: 8px;
        left: 8px;
        bottom: 80px;
        border-radius: 12px;
      }
    }
  `;

  // ============================================
  // HTML STRUCTURE
  // ============================================
  function createWidget() {
    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);

    // Create container
    const container = document.createElement('div');
    container.id = 'chatbot-widget-container';

    container.innerHTML = `
      <!-- Chat Bubble Button -->
      <button id="chatbot-bubble" aria-label="Open chat">
        <svg class="chat-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
        <svg class="close-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>

      <!-- Chat Window -->
      <div id="chatbot-window">
        <div id="chatbot-header">
          <div>
            <div id="chatbot-header-title">${WIDGET_TITLE}</div>
            <div id="chatbot-header-subtitle">We typically reply instantly</div>
          </div>
          <button id="chatbot-header-close" aria-label="Close chat">&times;</button>
        </div>

        <div id="chatbot-messages"></div>

        <div id="chatbot-input-area">
          <input
            id="chatbot-input"
            type="text"
            placeholder="Type your message..."
            autocomplete="off"
            maxlength="2000"
          />
          <button id="chatbot-send" aria-label="Send message">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>

        <div id="chatbot-powered">Powered by AI Support</div>
      </div>
    `;

    document.body.appendChild(container);

    // Bind events
    initEvents();

    // Load chat history
    loadHistory();

    // Show welcome message
    setTimeout(() => {
      const messagesEl = document.getElementById('chatbot-messages');
      if (messagesEl && messagesEl.children.length === 0) {
        addMessage('bot', WELCOME_MESSAGE);
      }
    }, 500);
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================
  function initEvents() {
    const bubble = document.getElementById('chatbot-bubble');
    const closeBtn = document.getElementById('chatbot-header-close');
    const sendBtn = document.getElementById('chatbot-send');
    const input = document.getElementById('chatbot-input');

    // Toggle chat window
    bubble.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    // Send message
    sendBtn.addEventListener('click', sendMessage);

    // Enter key to send
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  function toggleChat() {
    isOpen = !isOpen;
    const chatWindow = document.getElementById('chatbot-window');
    const bubble = document.getElementById('chatbot-bubble');

    if (isOpen) {
      chatWindow.classList.add('open');
      bubble.classList.add('open');
      document.getElementById('chatbot-input').focus();
    } else {
      chatWindow.classList.remove('open');
      bubble.classList.remove('open');
    }
  }

  // ============================================
  // MESSAGING
  // ============================================
  async function sendMessage() {
    if (isLoading) return;

    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();

    if (!message) return;

    // Clear input
    input.value = '';

    // Add user message to UI
    addMessage('user', message);

    // Show typing indicator
    showTyping();

    isLoading = true;
    document.getElementById('chatbot-send').disabled = true;

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbotId: CHATBOT_ID,
          sessionId: sessionId,
          message: message,
        }),
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      // Remove typing indicator
      hideTyping();

      if (response.ok && data.response) {
        addMessage('bot', data.response);
        // Update session ID if server sends one
        if (data.sessionId) {
          sessionId = data.sessionId;
          localStorage.setItem(SESSION_KEY, sessionId);
        }
      } else {
        addMessage('bot', data.error || 'Sorry, something went wrong. Please try again.');
      }
    } catch (err) {
      hideTyping();
      console.error('Chat widget error:', err);
      addMessage('bot', 'Unable to connect. Please check your internet and try again.');
    } finally {
      isLoading = false;
      document.getElementById('chatbot-send').disabled = false;
      document.getElementById('chatbot-input').focus();
    }
  }

  /**
   * Add a message bubble to the chat
   */
  function addMessage(sender, text) {
    const messagesEl = document.getElementById('chatbot-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chatbot-msg ${sender}`;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    msgDiv.innerHTML = `
      <div>${escapeHtml(text)}</div>
      <div class="chatbot-msg-time">${time}</div>
    `;

    messagesEl.appendChild(msgDiv);

    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /**
   * Show typing indicator
   */
  function showTyping() {
    const messagesEl = document.getElementById('chatbot-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chatbot-typing';
    typingDiv.id = 'chatbot-typing-indicator';
    typingDiv.innerHTML = `
      <div class="chatbot-typing-dot"></div>
      <div class="chatbot-typing-dot"></div>
      <div class="chatbot-typing-dot"></div>
    `;
    messagesEl.appendChild(typingDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /**
   * Hide typing indicator
   */
  function hideTyping() {
    const el = document.getElementById('chatbot-typing-indicator');
    if (el) el.remove();
  }

  /**
   * Load previous chat history from API
   */
  async function loadHistory() {
    try {
      const response = await fetch(
        `${API_URL}/chat/history?chatbotId=${CHATBOT_ID}&sessionId=${sessionId}`
      );
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          addMessage(msg.sender, msg.content);
        });
      }
    } catch (err) {
      console.warn('Could not load chat history:', err);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // INITIALIZE
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
