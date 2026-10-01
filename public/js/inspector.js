/* ==========================================================================
   Project DNA — Node Inspector Panel
   Renders file metadata, symbols, dependencies, source code, and AI insights.
   ========================================================================== */

function resetInspector() {
  document.getElementById('emptyInspectorState').classList.remove('hidden');
  document.getElementById('nodeDetailContainer').classList.add('hidden');
  document.getElementById('codeViewerContent').textContent = 'Select a node to inspect source code.';
  document.getElementById('aiFileContent').innerHTML = '<p class="text-muted">Select a file to see AI architectural breakdown, blast radius analysis, and failure mode risks.</p>';
}

function updateInspector(nodeId) {
  const repo = AppState.currentRepo;
  if (!repo) return;
  
  const node = (repo.graph.nodes || []).find(n => n.id === nodeId);
  if (!node) return;

  document.getElementById('emptyInspectorState').classList.add('hidden');
  document.getElementById('nodeDetailContainer').classList.remove('hidden');

  // Header
  const roleBadge = document.getElementById('nodeRoleBadge');
  roleBadge.textContent = node.role.toUpperCase();
  roleBadge.className = `node-role-badge tree-node-role ${node.role}`;
  document.getElementById('nodeTitle').textContent = node.label;
  document.getElementById('nodePath').textContent = node.path;

  // Metrics
  document.getElementById('nodeLoc').textContent = node.loc;
  document.getElementById('nodeComplexity').textContent = `${node.complexity}/100`;
  document.getElementById('nodeCentrality').textContent = `${node.centrality}%`;
  document.getElementById('nodeCallersCount').textContent = (node.dependents || []).length;

  // Symbols
  const symbolsList = document.getElementById('nodeSymbolsList');
  symbolsList.innerHTML = '';
  const allSymbols = [...(node.exports || []), ...(node.functions || []), ...(node.classes || [])];
  const uniqueSymbols = [...new Set(allSymbols)];
  if (uniqueSymbols.length) {
    uniqueSymbols.slice(0, 20).forEach(sym => {
      const tag = document.createElement('span');
      tag.className = 'symbol-tag';
      tag.textContent = sym;
      symbolsList.appendChild(tag);
    });
  } else {
    symbolsList.innerHTML = '<span class="text-muted">No exported symbols detected.</span>';
  }

  // Dependencies
  renderConnectionList('nodeDepsList', node.dependencies || [], 'depsBadge');
  renderConnectionList('nodeCallersList', node.dependents || [], 'callersBadge');

  // Source code
  const content = (repo.files_content || {})[node.path] || '// Source not available';
  document.getElementById('codeFilePath').textContent = node.path;
  document.getElementById('codeViewerContent').textContent = content;

  // AI insights
  loadAiFileInsights(nodeId);
}

function renderConnectionList(containerId, items, badgeId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  document.getElementById(badgeId).textContent = items.length;

  if (!items.length) {
    container.innerHTML = '<span class="text-muted" style="font-size:11px">None</span>';
    return;
  }

  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'connection-item';
    el.textContent = item;
    el.addEventListener('click', () => selectNode(item));
    container.appendChild(el);
  });
}

async function loadAiFileInsights(nodeId) {
  const container = document.getElementById('aiFileContent');
  container.innerHTML = '<p class="text-muted">Generating AI architectural analysis...</p>';
  
  try {
    const result = await apiPost('/api/explain-node', {
      repo_id: AppState.currentRepoId,
      node_id: nodeId,
      custom_files: AppState.customFiles
    });
    container.innerHTML = renderMarkdown(result.explanation);
  } catch (err) {
    container.innerHTML = `<p class="text-muted">Could not load AI insights: ${err.message}</p>`;
  }
}

function initInspector() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // Copy code
  document.getElementById('btnCopyCode').addEventListener('click', () => {
    const code = document.getElementById('codeViewerContent').textContent;
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById('btnCopyCode');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 1500);
    });
  });

  // Trace from node
  document.getElementById('btnTraceFromNode').addEventListener('click', () => {
    if (!AppState.selectedNodeId) return;
    if (!AppState.traceMode) toggleTraceMode();
    AppState.traceStart = AppState.selectedNodeId;
    document.getElementById('traceStatusText').textContent = `Source: ${AppState.selectedNodeId}. Now click the target node.`;
  });

  // Ask AI about node
  document.getElementById('btnAskAiAboutNode').addEventListener('click', () => {
    if (!AppState.selectedNodeId) return;
    sendChatQuery(`Explain this file: ${AppState.selectedNodeId}`);
  });
}

window.addEventListener('DOMContentLoaded', initInspector);
