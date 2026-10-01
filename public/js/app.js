/* ==========================================================================
   Project DNA — Main Application Controller
   Orchestrates state, API communication, and cross-module coordination.
   ========================================================================== */

const AppState = {
  currentRepo: null,
  currentRepoId: 'express-api',
  selectedNodeId: null,
  activeFilter: 'all',
  traceMode: false,
  traceStart: null,
  traceEnd: null,
  clusterMode: false,
  customFiles: null,
  isLiveUpload: false
};

const API_BASE = '';

/* --------------------------------------------------------------------------
   API Communication Layer
   -------------------------------------------------------------------------- */

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

/* --------------------------------------------------------------------------
   Repository Loading & State Management
   -------------------------------------------------------------------------- */

async function loadSampleRepo(sampleId) {
  setLoadingState(true);
  try {
    const repo = await apiGet(`/api/sample/${sampleId}`);
    AppState.currentRepo = repo;
    AppState.currentRepoId = sampleId;
    AppState.customFiles = null;
    AppState.isLiveUpload = false;
    AppState.selectedNodeId = null;
    AppState.traceStart = null;
    AppState.traceEnd = null;
    onRepoLoaded(repo, 'DEMO / CACHED REAL CODEBASE');
  } catch (err) {
    console.error('Failed to load sample repo:', err);
    showNoticeModal('Load Error', `Could not load sample repository: ${err.message}`);
  } finally {
    setLoadingState(false);
  }
}

async function analyzeRepoUrl(url) {
  if (!url || !url.trim()) {
    showNoticeModal('Input Required', 'Please enter a public GitHub repository URL to analyze.');
    return;
  }
  setLoadingState(true);
  try {
    const result = await apiPost('/api/analyze-url', { url: url.trim() });
    if (result.status === 'success' && result.repository) {
      AppState.currentRepo = result.repository;
      AppState.currentRepoId = result.repository.metadata.id;
      AppState.customFiles = null;
      AppState.isLiveUpload = false;
      onRepoLoaded(result.repository, result.mode_badge || 'DEMO / CACHED REAL CODEBASE');
    } else if (result.status === 'offline_restricted') {
      showOfflineNotice(result);
    }
  } catch (err) {
    console.error('URL analysis failed:', err);
    showNoticeModal('Analysis Error', `Failed to analyze repository URL: ${err.message}`);
  } finally {
    setLoadingState(false);
  }
}

async function analyzeUploadedFiles(filesDict, repoName) {
  setLoadingState(true);
  try {
    const result = await apiPost('/api/analyze-upload', {
      files: filesDict,
      repo_name: repoName
    });
    if (result.status === 'success' && result.repository) {
      AppState.currentRepo = result.repository;
      AppState.currentRepoId = result.repository.metadata.id;
      AppState.customFiles = filesDict;
      AppState.isLiveUpload = true;
      onRepoLoaded(result.repository, 'LIVE REPOSITORY ANALYSIS');
    }
  } catch (err) {
    console.error('Upload analysis failed:', err);
    showNoticeModal('Upload Error', `Failed to analyze uploaded files: ${err.message}`);
  } finally {
    setLoadingState(false);
  }
}

/* --------------------------------------------------------------------------
   Repo Loaded Callback — Updates all UI modules
   -------------------------------------------------------------------------- */

function onRepoLoaded(repo, modeBadge) {
  const meta = repo.metadata || {};
  const tech = repo.technologies || {};
  const graph = repo.graph || {};
  const metrics = graph.metrics || {};

  // Update header meta
  document.getElementById('repoTitle').textContent = meta.title || 'Analyzed Repository';
  document.getElementById('repoDesc').textContent = meta.description || 'Repository analyzed with live AST engine.';
  document.getElementById('statFiles').textContent = `${tech.total_files || 0} files`;
  document.getElementById('statLoc').textContent = `${(tech.total_lines_of_code || 0).toLocaleString()} LOC`;
  document.getElementById('statEdges').textContent = `${metrics.total_edges || 0} links`;

  // Update mode badge
  const badge = document.getElementById('repoModeBadge');
  const badgeText = document.getElementById('repoModeText');
  badgeText.textContent = modeBadge;
  badge.className = 'status-badge ' + (AppState.isLiveUpload ? 'live' : 'demo');

  // Update tech pills
  renderTechPills(tech);

  // Render file tree
  renderFileTree(repo.file_tree || [], repo);

  // Render architecture graph
  renderArchitectureGraph(graph, repo);

  // Reset inspector
  resetInspector();

  // Reset chat context
  resetChatContext(repo);
}

function renderTechPills(tech) {
  const container = document.getElementById('techPills');
  container.innerHTML = '';
  
  (tech.frameworks || []).forEach(fw => {
    const pill = document.createElement('span');
    pill.className = 'tech-pill';
    pill.textContent = fw.name;
    container.appendChild(pill);
  });

  (tech.libraries || []).forEach(lib => {
    const pill = document.createElement('span');
    pill.className = 'tech-pill';
    pill.textContent = lib;
    container.appendChild(pill);
  });
}

/* --------------------------------------------------------------------------
   Loading & Notice UI
   -------------------------------------------------------------------------- */

function setLoadingState(isLoading) {
  const btn = document.getElementById('btnAnalyzeUrl');
  const spinner = btn.querySelector('.btn-spinner');
  const text = btn.querySelector('.btn-text');
  if (isLoading) {
    spinner.classList.remove('hidden');
    text.textContent = 'Analyzing...';
    btn.disabled = true;
  } else {
    spinner.classList.add('hidden');
    text.textContent = 'Analyze';
    btn.disabled = false;
  }
}

function showNoticeModal(title, message, actions) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMessage').textContent = message;
  const actionsContainer = document.getElementById('modalActions');
  actionsContainer.innerHTML = '';
  
  if (actions && actions.length) {
    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.textContent = action.label;
      btn.onclick = () => {
        closeNoticeModal();
        if (action.sample_id) loadSampleRepo(action.sample_id);
        if (action.action === 'trigger_upload') document.getElementById('fileUploadInput').click();
      };
      actionsContainer.appendChild(btn);
    });
  }
  
  document.getElementById('noticeModal').classList.remove('hidden');
}

function showOfflineNotice(result) {
  showNoticeModal(
    'Sandbox Network Restriction',
    result.message,
    result.recommended_actions || []
  );
}

function closeNoticeModal() {
  document.getElementById('noticeModal').classList.add('hidden');
}

/* --------------------------------------------------------------------------
   Event Wiring & Initialization
   -------------------------------------------------------------------------- */

function initApp() {
  // Analyze URL button
  document.getElementById('btnAnalyzeUrl').addEventListener('click', () => {
    analyzeRepoUrl(document.getElementById('repoUrlInput').value);
  });

  document.getElementById('repoUrlInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') analyzeRepoUrl(e.target.value);
  });

  // Samples dropdown
  const samplesBtn = document.getElementById('btnSamplesDropdown');
  const samplesMenu = document.getElementById('samplesMenu');
  samplesBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    samplesMenu.classList.toggle('hidden');
  });

  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      samplesMenu.classList.add('hidden');
      loadSampleRepo(item.dataset.sample);
    });
  });

  document.addEventListener('click', () => samplesMenu.classList.add('hidden'));

  // File upload
  document.getElementById('fileUploadInput').addEventListener('change', handleFileUpload);

  // Modal close
  document.getElementById('btnCloseModal').addEventListener('click', closeNoticeModal);
  document.getElementById('noticeModal').addEventListener('click', (e) => {
    if (e.target.id === 'noticeModal') closeNoticeModal();
  });

  // Mobile nav
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      handleMobileNav(btn.dataset.target);
    });
  });

  // Initial load
  loadSampleRepo('express-api');
}

function handleMobileNav(target) {
  const left = document.getElementById('leftSidebar');
  const right = document.getElementById('rightSidebar');
  const chat = document.getElementById('aiChatPanel');
  
  left.classList.remove('mobile-open');
  right.classList.remove('mobile-open');
  chat.classList.remove('mobile-open');

  if (target === 'explorer') left.classList.add('mobile-open');
  if (target === 'inspector') right.classList.add('mobile-open');
  if (target === 'chat') chat.classList.add('mobile-open');
}

async function handleFileUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const filesDict = {};
  const ignoreExts = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz', '.pyc', '.exe', '.dll', '.so', '.woff', '.woff2', '.ttf'];

  for (const file of files) {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ignoreExts.includes(ext)) continue;
    if (file.size > 500000) continue;
    try {
      const text = await file.text();
      const relPath = file.webkitRelativePath || file.name;
      filesDict[relPath] = text;
    } catch (e) {
      console.warn('Could not read file:', file.name);
    }
  }

  if (Object.keys(filesDict).length === 0) {
    showNoticeModal('No Source Files', 'No readable source files were found in the selected folder.');
    return;
  }

  const repoName = files[0].webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] : 'Uploaded Codebase';
  await analyzeUploadedFiles(filesDict, repoName);
}

// Boot
window.addEventListener('DOMContentLoaded', initApp);
