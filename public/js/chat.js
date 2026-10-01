/**
 * Project DNA — AI Repository Chat Panel
 * Manages conversational architectural Q&A, preset prompt pills,
 * code citations, streaming typing animation, and graph node linking.
 */

class AiChatPanel {
  constructor(options) {
    this.onSendQuery = options.onSendQuery;
    this.onNodeClick = options.onNodeClick;

    this.panel = document.getElementById('aiChatPanel');
    this.messagesContainer = document.getElementById('chatMessages');
    this.input = document.getElementById('chatInput');
    this.btnSend = document.getElementById('btnSendChat');
    this.btnToggleExpand = document.getElementById('btnToggleChatExpand');
    this.isExpanded = false;

    this._bindEvents();
  }

  _bindEvents() {
    // Expand / Collapse Toggle
    if (this.btnToggleExpand) {
      this.btnToggleExpand.addEventListener('click', () => {
        this.isExpanded = !this.isExpanded;
        if (this.isExpanded) {
          this.panel.classList.add('expanded');
          this.btnToggleExpand.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
        } else {
          this.panel.classList.remove('expanded');
          this.btnToggleExpand.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>`;
        }
      });
    }

    // Preset Prompt Pills
    document.querySelectorAll('.preset-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const query = pill.getAttribute('data-query');
        if (query) {
          this.submitQuery(query);
        }
      });
    });

    // Send Button
    if (this.btnSend) {
      this.btnSend.addEventListener('click', () => {
        const val = this.input.value.trim();
        if (val) {
          this.submitQuery(val);
          this.input.value = '';
        }
      });
    }

    // Input Enter Key
    if (this.input) {
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = this.input.value.trim();
          if (val) {
            this.submitQuery(val);
            this.input.value = '';
          }
        }
      });
    }

    // Click on code tags in chat messages to focus on graph
    this.messagesContainer.addEventListener('click', (e) => {
      const codeElem = e.target.closest('code');
      if (codeElem) {
        const text = codeElem.textContent.trim().replace(/^`|`$/g, '');
        if (this.onNodeClick && (text.includes('/') || text.endsWith('.ts') || text.endsWith('.py') || text.endsWith('.js'))) {
          this.onNodeClick(text);
        }
      }
    });
  }

  submitQuery(text) {
    this.appendMessage('user', text);
    // Show typing state
    const typingId = this.appendTypingIndicator();

    if (this.onSendQuery) {
      this.onSendQuery(text, (reply) => {
        this.removeTypingIndicator(typingId);
        this.appendMessage('assistant', reply);
      });
    }
  }

  appendMessage(role, content) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${role}`;

    const avatar = role === 'user' ? 'YOU' : 'DNA';
    const parsedHtml = this._parseMarkdown(content);

    msgDiv.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">${parsedHtml}</div>
    `;

    this.messagesContainer.appendChild(msgDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  appendTypingIndicator() {
    const id = `typing_${Date.now()}`;
    const div = document.createElement('div');
    div.id = id;
    div.className = 'chat-message assistant';
    div.innerHTML = `
      <div class="message-avatar">DNA</div>
      <div class="message-content" style="display:flex; align-items:center; gap:6px;">
        <span class="pulse-dot"></span>
        <span style="font-size:11px; color:#94a3b8;">Analyzing AST symbols and graph paths...</span>
      </div>
    `;
    this.messagesContainer.appendChild(div);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    return id;
  }

  removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  _parseMarkdown(md) {
    if (!md) return '';

    // Convert code blocks
    let text = md.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<pre><code>${this._escapeHtml(code.trim())}</code></pre>`;
    });

    // Headers & Formatting
    text = text
      .replace(/### (.*?)\n/g, '<h3>$1</h3>')
      .replace(/#### (.*?)\n/g, '<h4>$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code title="Click to locate on graph" style="cursor:pointer; text-decoration:underline dotted rgba(56, 189, 248, 0.4);">$1</code>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/\n\n/g, '<br/>');

    return text;
  }

  _escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.AiChatPanel = AiChatPanel;
