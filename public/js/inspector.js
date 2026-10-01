/**
 * Project DNA — Node Inspector Component
 * Displays selected node metadata, connections, raw source code, and AI blast radius insights.
 */

class NodeInspector {
  constructor(options) {
    this.onNavigateNode = options.onNavigateNode;
    this.onTraceFromNode = options.onTraceFromNode;
    this.onAskAiAboutNode = options.onAskAiAboutNode;

    this.emptyState = document.getElementById('emptyInspectorState');
    this.container = document.getElementById('nodeDetailContainer');

    // Overview Elements
    this.roleBadge = document.getElementById('nodeRoleBadge');
    this.title = document.getElementById('nodeTitle');
    this.path = document.getElementById('nodePath');
    this.loc = document.getElementById('nodeLoc');
    this.complexity = document.getElementById('nodeComplexity');
    this.centrality = document.getElementById('nodeCentrality');
    this.callersCount = document.getElementById('nodeCallersCount');
    this.symbolsList = document.getElementById('nodeSymbolsList');
    this.depsList = document.getElementById('nodeDepsList');
    this.callersList = document.getElementById('nodeCallersList');
    this.depsBadge = document.getElementById('depsBadge');
    this.callersBadge = document.getElementById('callersBadge');

    // Code Elements
    this.codePath = document.getElementById('codeFilePath');
    this.codeViewer = document.getElementById('codeViewerContent');
    this.btnCopyCode = document.getElementById('btnCopyCode');

    // AI Tab
    this.aiFileContent = document.getElementById('aiFileContent');

    // Action buttons
    this.btnTraceFrom = document.getElementById('btnTraceFromNode');
    this.btnAskAi = document.getElementById('btnAskAiAboutNode');

    this.currentNode = null;
    this.currentCode = '';

    this._bindEvents();
  }

  _bindEvents() {
    // Tab switching
    document.querySelectorAll('.inspector-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.inspector-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.inspector-content .tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        const pane = document.getElementById(targetId);
        if (pane) pane.classList.add('active');
      });
    });

    if (this.btnTraceFrom) {
      this.btnTraceFrom.addEventListener('click', () => {
        if (this.currentNode && this.onTraceFromNode) {
          this.onTraceFromNode(this.currentNode.id);
        }
      });
    }

    if (this.btnAskAi) {
      this.btnAskAi.addEventListener('click', () => {
        if (this.currentNode && this.onAskAiAboutNode) {
          this.onAskAiAboutNode(this.currentNode);
        }
      });
    }

    if (this.btnCopyCode) {
      this.btnCopyCode.addEventListener('click', () => {
        if (this.currentCode) {
          navigator.clipboard.writeText(this.currentCode);
          this.btnCopyCode.textContent = 'Copied!';
          setTimeout(() => { this.btnCopyCode.textContent = 'Copy'; }, 1500);
        }
      });
    }
  }

  setNode(node, sourceCode, aiExplanation) {
    this.currentNode = node;
    this.currentCode = sourceCode || '';

    if (!node) {
      this.emptyState.classList.remove('hidden');
      this.container.classList.add('hidden');
      this.codePath.textContent = 'Select a file';
      this.codeViewer.textContent = 'Select a node to inspect source code.';
      this.aiFileContent.innerHTML = '<p class="text-muted">Select a file to see AI architectural breakdown, blast radius analysis, and failure mode risks.</p>';
      return;
    }

    this.emptyState.classList.add('hidden');
    this.container.classList.remove('hidden');

    // Populate Overview
    this.roleBadge.textContent = (node.role || 'UTIL').toUpperCase();
    this.roleBadge.className = `node-role-badge ${node.role || 'util'}`;
    this.title.textContent = node.label;
    this.path.textContent = node.path;
    this.loc.textContent = node.loc || 0;
    this.complexity.textContent = `${node.complexity || 1}/100`;
    this.centrality.textContent = `${node.centrality || 0}%`;
    this.callersCount.textContent = (node.dependents || []).length;

    // Symbols (functions, classes, routes)
    this.symbolsList.innerHTML = '';
    const symbols = [
      ...(node.functions || []).map(f => `${f}()`),
      ...(node.classes || []).map(c => `class ${c}`),
      ...(node.components || []).map(cp => `<${cp}/>`),
      ...(node.routes || []).map(r => `${r.method || 'GET'} ${r.path || '/'}`)
    ];

    if (symbols.length) {
      symbols.slice(0, 12).forEach(sym => {
        const tag = document.createElement('span');
        tag.className = 'symbol-tag';
        tag.textContent = sym;
        this.symbolsList.appendChild(tag);
      });
    } else {
      this.symbolsList.innerHTML = '<span style="color:#64748b; font-size:11px;">No declared exports or symbols.</span>';
    }

    // Dependencies (Imports)
    this.depsList.innerHTML = '';
    const deps = node.dependencies || [];
    this.depsBadge.textContent = deps.length;
    if (deps.length) {
      deps.forEach(depPath => {
        const item = document.createElement('div');
        item.className = 'connection-item';
        item.innerHTML = `<span>${depPath}</span><span style="color:#a855f7;">→</span>`;
        item.addEventListener('click', () => {
          if (this.onNavigateNode) this.onNavigateNode(depPath);
        });
        this.depsList.appendChild(item);
      });
    } else {
      this.depsList.innerHTML = '<span style="color:#64748b; font-size:11px;">Zero dependencies.</span>';
    }

    // Callers (Dependents)
    this.callersList.innerHTML = '';
    const callers = node.dependents || [];
    this.callersBadge.textContent = callers.length;
    if (callers.length) {
      callers.forEach(callerPath => {
        const item = document.createElement('div');
        item.className = 'connection-item';
        item.innerHTML = `<span>${callerPath}</span><span style="color:#38bdf8;">←</span>`;
        item.addEventListener('click', () => {
          if (this.onNavigateNode) this.onNavigateNode(callerPath);
        });
        this.callersList.appendChild(item);
      });
    } else {
      this.callersList.innerHTML = '<span style="color:#64748b; font-size:11px;">Leaf node (no direct callers).</span>';
    }

    // Populate Source Code
    this.codePath.textContent = node.path;
    this.codeViewer.textContent = sourceCode || '// Source code not available in preview';

    // Populate AI Tab
    if (aiExplanation) {
      this.aiFileContent.innerHTML = this._formatMarkdown(aiExplanation);
    } else {
      this.aiFileContent.innerHTML = '<p class="text-muted">Loading AI File Intelligence...</p>';
    }
  }

  setAiExplanation(text) {
    if (this.aiFileContent) {
      this.aiFileContent.innerHTML = this._formatMarkdown(text);
    }
  }

  _formatMarkdown(md) {
    if (!md) return '';
    // Lightweight markdown parser for headers, lists, code, bold
    let html = md
      .replace(/### (.*?)\n/g, '<h3>$1</h3>')
      .replace(/#### (.*?)\n/g, '<h4>$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/\n\n/g, '<br/>');
    return html;
  }
}

window.NodeInspector = NodeInspector;
