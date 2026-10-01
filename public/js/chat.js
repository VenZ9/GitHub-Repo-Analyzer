/* ==========================================================================
   Project DNA — AI Repository Chat Controller
   Handles grounded Q&A, preset prompts, and markdown rendering.
   ========================================================================== */

let chatHistory = [];

function resetChatContext(repo) {
  chatHistory = [];
  const container = document.getElementById('chatMessages');
  container.innerHTML = '';
  
  const meta = repo.metadata || {};
  const tech = repo.technologies || {};
  const frameworks = (tech.frameworks || []).map(f => f.name).join(', ') || 'Modern Stack';
  
  appendChatMessage('assistant', `Hello! I am your <strong>Project DNA Architectural Intelligence</strong> agent. I have analyzed <strong>${meta.title || 'this codebase'}</strong> (${tech.total_files || 0} files, ${(tech.total_lines_of_code || 0).toLocaleString()} LOC) built on <strong>${frameworks}</strong>.

Ask any architectural question above or click any node in the graph to inspect blast radius, callers, and code previews.`);
}

function appendChatMessage(role, htmlContent) {
  const container = document.getElementById('chatMessages');
  const msg = document.createElement('div');
  msg.className = `chat-message ${role}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = role === 'user' ? 'YOU' : 'DNA';
  
  const content = document.createElement('div');
  content.className = 'message-content';
  content.innerHTML = renderMarkdown(htmlContent);
  
  msg.appendChild(avatar);
  msg.appendChild(content);
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function renderMarkdown(text) {
  if (!text) return '';
  let html = text;
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, (m, code) => `<pre><code>${escapeHtml(code.trim())}</code></pre>`);
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
  
  // Paragraphs
  html = html.split('\n\n').map(p => {
    if (p.trim().startsWith('<h') || p.trim().startsWith('<ul') || p.trim().startsWith('<pre')) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');
  
  return html;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendChatQuery(question) {
  if (!question || !question.trim()) return;
  
  appendChatMessage('user', question);
  document.getElementById('chatInput').value = '';
  
  // Show typing indicator
  const container = document.getElementById('chatMessages');
  const typing = document.createElement('div');
  typing.className = 'chat-message assistant';
  typing.id = 'typingIndicator';
  typing.innerHTML = '<div class="message-avatar">DNA</div><div class="message-content"><em>Analyzing codebase graph...</em></div>';
  container.appendChild(typing);
  container.scrollTop = container.scrollHeight;

  try {
    const result = await apiPost('/api/chat', {
      repo_id: AppState.currentRepoId,
      question: question,
      active_node_id: AppState.selectedNodeId,
      custom_files: AppState.customFiles
    });
    
    document.getElementById('typingIndicator')?.remove();
    appendChatMessage('assistant', result.reply);
  } catch (err) {
    document.getElementById('typingIndicator')?.remove();
    appendChatMessage('assistant', `⚠️ Error: ${err.message}`);
  }
}

function initChat() {
  document.getElementById('btnSendChat').addEventListener('click', () => {
    sendChatQuery(document.getElementById('chatInput').value);
  });

  document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatQuery(e.target.value);
  });

  document.querySelectorAll('.preset-pill').forEach(pill => {
    pill.addEventListener('click', () => sendChatQuery(pill.dataset.query));
  });

  document.getElementById('btnToggleChatExpand').addEventListener('click', () => {
    document.getElementById('aiChatPanel').classList.toggle('expanded');
  });
}

window.addEventListener('DOMContentLoaded', initChat);
