/**
 * Project DNA — Main Application Controller
 * Coordinates graph visualization, file explorer, inspector, AI chat,
 * repository fetching, local file uploading, and dependency tracing.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const repoUrlInput = document.getElementById('repoUrlInput');
  const btnAnalyzeUrl = document.getElementById('btnAnalyzeUrl');
  const btnSamplesDropdown = document.getElementById('btnSamplesDropdown');
  const samplesMenu = document.getElementById('samplesMenu');
  const fileUploadInput = document.getElementById('fileUploadInput');
  const repoModeBadge = document.getElementById('repoModeBadge');
  const repoModeText = document.getElementById('repoModeText');

  // Metadata Card Elements
  const repoTitle = document.getElementById('repoTitle');
  const repoDesc = document.getElementById('repoDesc');
  const statFiles = document.getElementById('statFiles');
  const statLoc = document.getElementById('statLoc');
  const statEdges = document.getElementById('statEdges');
  const techPills = document.getElementById('techPills');

  // File Search Input
  const fileSearchInput = document.getElementById('fileSearchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');

  // Graph Elements
  const architectureSvg = document.getElementById('architectureSvg');
  const minimapCanvas = document.getElementById('minimapCanvas');
  const btnTraceMode = document.getElementById('btnTraceMode');
  const btnGroupToggle = document.getElementById('btnGroupToggle');
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnFitView = document.getElementById('btnFitView');
  const btnResetLayout = document.getElementById('btnResetLayout');
  const traceBanner = document.getElementById('traceBanner');
  const traceStatusText = document.getElementById('traceStatusText');
  const btnClearTrace = document.getElementById('btnClearTrace');
  const btnCloseTrace = document.getElementById('btnCloseTrace');

  // Modal Dialog
  const noticeModal = document.getElementById('noticeModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');
  const modalActions = document.getElementById('modalActions');
  const btnCloseModal = document.getElementById('btnCloseModal');

  // State
  let currentRepoId = 'express-api';
  let currentRepoData = null;
  let activeNodeId = null;

  // Initialize Graph Engine
  const graph = new ArchitectureGraph(architectureSvg, minimapCanvas);

  // Initialize File Explorer
  const explorer = new FileExplorer(
    document.getElementById('fileTreeContainer'),
    (selectedPath) => {
      activeNodeId = selectedPath;
      graph.focusNode(selectedPath);
      updateInspectorForNode(selectedPath);
    }
  );

  // Initialize Node Inspector
  const inspector = new NodeInspector({
    onNavigateNode: (targetNodeId) => {
      activeNodeId = targetNodeId;
      explorer.setActiveFile(targetNodeId);
      graph.focusNode(targetNodeId);
      updateInspectorForNode(targetNodeId);
    },
    onTraceFromNode: (startNodeId) => {
      enableTraceMode(startNodeId);
    },
    onAskAiAboutNode: (node) => {
      chat.submitQuery(`Explain ${node.path} and analyze its architectural impact`);
    }
  });

  // Initialize AI Chat Panel
  const chat = new AiChatPanel({
    onSendQuery: (query, callback) => {
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_id: currentRepoId,
          question: query,
          active_node_id: activeNodeId,
          custom_files: currentRepoData && !currentRepoData.metadata.is_demo ? currentRepoData.files_content : null
        })
      })
      .then(res => res.json())
      .then(data => callback(data.reply || data.error))
      .catch(err => callback(`Error analyzing query: ${err.message}`));
    },
    onNodeClick: (nodePath) => {
      activeNodeId = nodePath;
      explorer.setActiveFile(nodePath);
      graph.focusNode(nodePath);
      updateInspectorForNode(nodePath);
    }
  });

  // Sync Graph Node Selection with Explorer & Inspector
  graph.onNodeSelect = (nodeId) => {
    activeNodeId = nodeId;
    explorer.setActiveFile(nodeId);
    updateInspectorForNode(nodeId);
  };

  // Graph Trace Step Callback
  graph.onTraceStep = (step, nodeId) => {
    if (step === 'start') {
      traceStatusText.innerHTML = `Source: <strong>${nodeId}</strong>. Now click Target node on graph.`;
    } else if (step === 'end') {
      traceStatusText.innerHTML = `Calculating dependency path between <strong>${graph.traceStartNode}</strong> and <strong>${graph.traceEndNode}</strong>...`;
      executeTrace(graph.traceStartNode, graph.traceEndNode);
    }
  };

  function updateInspectorForNode(nodeId) {
    if (!nodeId || !currentRepoData) {
      inspector.setNode(null, '', null);
      return;
    }
    const node = currentRepoData.graph.nodes.find(n => n.id === nodeId);
    const code = currentRepoData.files_content[nodeId] || '';

    // Fetch deep AI file explanation
    inspector.setNode(node, code, null);

    fetch('/api/explain-node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo_id: currentRepoId,
        node_id: nodeId,
        custom_files: !currentRepoData.metadata.is_demo ? currentRepoData.files_content : null
      })
    })
    .then(res => res.json())
    .then(data => {
      if (activeNodeId === nodeId) {
        inspector.setAiExplanation(data.explanation);
      }
    })
    .catch(() => {
      inspector.setAiExplanation('Could not load AI explanation for this file.');
    });
  }

  // Load Repository Function
  function loadRepository(sampleId) {
    setLoadingState(true);
    fetch(`/api/sample/${sampleId}`)
      .then(res => res.json())
      .then(data => {
        setLoadingState(false);
        if (data.error) {
          showModalNotice('Error', data.error);
          return;
        }
        currentRepoId = sampleId;
        currentRepoData = data;
        applyRepositoryData(data);
      })
      .catch(err => {
        setLoadingState(false);
        showModalNotice('Error Loading Repository', err.message);
      });
  }

  function applyRepositoryData(data) {
    // 1. Update Header & Badges
    const meta = data.metadata || {};
    repoUrlInput.value = meta.repo_url || '';
    repoTitle.textContent = meta.title || 'Repository Architecture';
    repoDesc.textContent = meta.description || 'Full AST parsed architecture graph';

    if (meta.is_demo) {
      repoModeBadge.className = 'status-badge demo';
      repoModeText.textContent = `DEMO: ${meta.title}`;
    } else {
      repoModeBadge.className = 'status-badge live';
      repoModeText.textContent = `LIVE: ${meta.title}`;
    }

    // 2. Stats
    statFiles.textContent = `${data.file_tree.length} files`;
    statLoc.textContent = `${(data.technologies.total_lines_of_code || 0).toLocaleString()} LOC`;
    statEdges.textContent = `${data.graph.edges.length} links`;

    // 3. Tech Pills
    techPills.innerHTML = '';
    (data.technologies.frameworks || []).forEach(fw => {
      const p = document.createElement('span');
      p.className = 'tech-pill';
      p.textContent = fw.name;
      techPills.appendChild(p);
    });
    Object.keys(data.technologies.languages || {}).slice(0, 3).forEach(lang => {
      const p = document.createElement('span');
      p.className = 'tech-pill';
      p.style.color = '#a855f7';
      p.textContent = `${lang} ${data.technologies.languages[lang]}%`;
      techPills.appendChild(p);
    });

    // 4. Update Explorer & Graph
    explorer.setFiles(data.file_tree);
    graph.setData(data.graph);

    // 5. Select entrypoint by default
    const entry = data.graph.nodes.find(n => n.role === 'entrypoint') || data.graph.nodes[0];
    if (entry) {
      activeNodeId = entry.id;
      explorer.setActiveFile(entry.id);
      updateInspectorForNode(entry.id);
    }
  }

  // URL Submission Handler
  btnAnalyzeUrl.addEventListener('click', () => {
    const url = repoUrlInput.value.trim();
    if (!url) return;

    setLoadingState(true);
    fetch('/api/analyze-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    })
    .then(res => res.json())
    .then(data => {
      setLoadingState(false);
      if (data.status === 'success') {
        currentRepoData = data.repository;
        currentRepoId = data.repository.metadata.id;
        applyRepositoryData(data.repository);
      } else if (data.status === 'offline_restricted') {
        // Honest disclosure per user requirements
        showOfflineNoticeModal(data);
      }
    })
    .catch(err => {
      setLoadingState(false);
      showModalNotice('Analysis Request Failed', err.message);
    });
  });

  repoUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnAnalyzeUrl.click();
    }
  });

  // Local File / Folder Upload
  fileUploadInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    setLoadingState(true);
    const filesMap = {};
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relPath = file.webkitRelativePath || file.name;
      // Skip binary, lockfiles, and git files
      if (relPath.includes('/.git/') || relPath.includes('/node_modules/') || relPath.endsWith('.lock') || relPath.endsWith('.png') || relPath.endsWith('.jpg')) {
        continue;
      }
      try {
        const text = await file.text();
        filesMap[relPath] = text;
      } catch (err) {
        console.warn('Skipping unreadable file', relPath);
      }
    }

    if (!Object.keys(filesMap).length) {
      setLoadingState(false);
      showModalNotice('Upload Error', 'No readable code files found in selected folder.');
      return;
    }

    fetch('/api/analyze-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo_name: files[0].webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] : 'Uploaded Project',
        files: filesMap
      })
    })
    .then(res => res.json())
    .then(data => {
      setLoadingState(false);
      if (data.status === 'success') {
        currentRepoData = data.repository;
        currentRepoId = data.repository.metadata.id;
        applyRepositoryData(data.repository);
        chat.appendMessage('assistant', `✅ Successfully analyzed uploaded codebase! Found **${data.repository.file_tree.length} files** and **${data.repository.graph.edges.length} dependency relationships**.`);
      } else {
        showModalNotice('Upload Analysis Failed', data.error || 'Unknown error');
      }
    })
    .catch(err => {
      setLoadingState(false);
      showModalNotice('Upload Error', err.message);
    });
  });

  // Sample Selector Dropdown
  btnSamplesDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    samplesMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    samplesMenu.classList.add('hidden');
  });

  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const sampleId = item.getAttribute('data-sample');
      samplesMenu.classList.add('hidden');
      loadRepository(sampleId);
    });
  });

  // Search Files Filter
  fileSearchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    explorer.setFilter(val);
    if (val) {
      btnClearSearch.classList.remove('hidden');
    } else {
      btnClearSearch.classList.add('hidden');
    }
  });

  btnClearSearch.addEventListener('click', () => {
    fileSearchInput.value = '';
    explorer.setFilter('');
    btnClearSearch.classList.add('hidden');
  });

  // Graph Category Filter Buttons
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const filter = pill.getAttribute('data-filter');
      graph.setFilter(filter);
    });
  });

  // Graph View Controls
  btnZoomIn.addEventListener('click', () => graph.zoomIn());
  btnZoomOut.addEventListener('click', () => graph.zoomOut());
  btnFitView.addEventListener('click', () => graph.fitView());
  btnResetLayout.addEventListener('click', () => {
    if (currentRepoData) graph.setData(currentRepoData.graph);
  });

  btnGroupToggle.addEventListener('click', () => {
    const clustered = graph.toggleClustering();
    btnGroupToggle.classList.toggle('active', clustered);
  });

  // Trace Dependency Mode Controls
  btnTraceMode.addEventListener('click', () => {
    if (graph.traceMode) {
      disableTraceMode();
    } else {
      enableTraceMode();
    }
  });

  btnClearTrace.addEventListener('click', () => {
    graph.clearTrace();
    traceStatusText.textContent = 'Click Node 1 (Source) then Node 2 (Target) to inspect the dependency path.';
  });

  btnCloseTrace.addEventListener('click', () => {
    disableTraceMode();
  });

  function enableTraceMode(preselectedStartNode) {
    graph.traceMode = true;
    graph.clearTrace();
    btnTraceMode.classList.add('active');
    traceBanner.classList.remove('hidden');

    if (preselectedStartNode) {
      graph.traceStartNode = preselectedStartNode;
      traceStatusText.innerHTML = `Source: <strong>${preselectedStartNode}</strong>. Now click Target node on graph.`;
    } else {
      traceStatusText.textContent = 'Click Node 1 (Source) then Node 2 (Target) to inspect the dependency path.';
    }
  }

  function disableTraceMode() {
    graph.traceMode = false;
    graph.clearTrace();
    btnTraceMode.classList.remove('active');
    traceBanner.classList.add('hidden');
  }

  function executeTrace(startNode, endNode) {
    fetch('/api/trace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo_id: currentRepoId,
        start_node: startNode,
        end_node: endNode,
        custom_files: currentRepoData && !currentRepoData.metadata.is_demo ? currentRepoData.files_content : null
      })
    })
    .then(res => res.json())
    .then(result => {
      if (result.found) {
        graph.setTracePath(result.path, result.edges);
        traceStatusText.innerHTML = `✅ ${result.description} (${result.path.map(p => p.split('/').pop()).join(' ➔ ')})`;
        chat.appendMessage('assistant', `### 📍 Dependency Trace: \`${startNode}\` ➔ \`${endNode}\`\n\nFound **${result.length} dependency hops**:\n` + result.path.map((p, idx) => `${idx + 1}. \`${p}\``).join('\n'));
      } else {
        traceStatusText.innerHTML = `❌ ${result.message}`;
      }
    })
    .catch(err => {
      traceStatusText.innerHTML = `Error computing trace: ${err.message}`;
    });
  }

  // Modal Notice Functions
  function showModalNotice(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalActions.innerHTML = '';
    noticeModal.classList.remove('hidden');
  }

  function showOfflineNoticeModal(offlineData) {
    modalTitle.textContent = 'Sandbox Network Notice';
    modalMessage.textContent = offlineData.message;

    modalActions.innerHTML = '';
    (offlineData.recommended_actions || []).forEach(act => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.textContent = act.label;
      btn.addEventListener('click', () => {
        noticeModal.classList.add('hidden');
        if (act.sample_id) {
          loadRepository(act.sample_id);
        } else if (act.action === 'trigger_upload') {
          fileUploadInput.click();
        }
      });
      modalActions.appendChild(btn);
    });

    noticeModal.classList.remove('hidden');
  }

  btnCloseModal.addEventListener('click', () => {
    noticeModal.classList.add('hidden');
  });

  // Mobile Bottom Navigation Tabs
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-target');

      const leftSidebar = document.getElementById('leftSidebar');
      const rightSidebar = document.getElementById('rightSidebar');
      const chatPanel = document.getElementById('aiChatPanel');

      leftSidebar.classList.remove('mobile-open');
      rightSidebar.classList.remove('mobile-open');
      chatPanel.classList.remove('mobile-open');

      if (target === 'explorer') {
        leftSidebar.classList.add('mobile-open');
      } else if (target === 'inspector') {
        rightSidebar.classList.add('mobile-open');
      } else if (target === 'chat') {
        chatPanel.classList.add('mobile-open');
      }
    });
  });

  function setLoadingState(isLoading) {
    const text = btnAnalyzeUrl.querySelector('.btn-text');
    const spinner = btnAnalyzeUrl.querySelector('.btn-spinner');
    if (isLoading) {
      text.classList.add('hidden');
      spinner.classList.remove('hidden');
      btnAnalyzeUrl.disabled = true;
    } else {
      text.classList.remove('hidden');
      spinner.classList.add('hidden');
      btnAnalyzeUrl.disabled = false;
    }
  }

  // Load initial demo repository (Express Auth API)
  loadRepository('express-api');
});
