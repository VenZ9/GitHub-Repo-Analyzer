/* ==========================================================================
   Project DNA — File Tree Explorer
   Renders hierarchical file tree with role badges and search filtering.
   ========================================================================== */

let currentFileTree = [];
let currentRepoRef = null;

function renderFileTree(fileTree, repo) {
  currentFileTree = fileTree;
  currentRepoRef = repo;
  const container = document.getElementById('fileTreeContainer');
  container.innerHTML = '';

  // Build hierarchical structure
  const root = { children: {}, files: [] };
  
  fileTree.forEach(f => {
    const parts = f.path.split('/');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!node.children[part]) node.children[part] = { children: {}, files: [] };
      node = node.children[part];
    }
    node.files.push(f);
  });

  renderTreeNode(root, container, 0);
}

function renderTreeNode(node, container, depth) {
  // Render directories
  Object.keys(node.children).sort().forEach(dirName => {
    const dirEl = document.createElement('div');
    dirEl.className = 'tree-node tree-dir';
    dirEl.style.paddingLeft = `${12 + depth * 12}px`;
    dirEl.innerHTML = `<span class="tree-node-icon">📁</span><span class="tree-node-name">${dirName}</span>`;
    container.appendChild(dirEl);
    renderTreeNode(node.children[dirName], container, depth + 1);
  });

  // Render files
  node.files.sort((a, b) => a.filename.localeCompare(b.filename)).forEach(f => {
    const fileEl = document.createElement('div');
    fileEl.className = 'tree-node tree-file';
    fileEl.dataset.path = f.path;
    fileEl.style.paddingLeft = `${12 + depth * 12}px`;
    
    const icon = getFileIcon(f.extension);
    fileEl.innerHTML = `
      <span class="tree-node-icon">${icon}</span>
      <span class="tree-node-name">${f.filename}</span>
      <span class="tree-node-role ${f.role}">${f.role}</span>
    `;
    
    fileEl.addEventListener('click', () => {
      document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('active'));
      fileEl.classList.add('active');
      selectNode(f.path);
    });
    
    container.appendChild(fileEl);
  });
}

function getFileIcon(ext) {
  const icons = {
    '.ts': '🟦', '.tsx': '⚛️', '.js': '🟨', '.jsx': '⚛️',
    '.py': '🐍', '.go': '🐹', '.rs': '🦀', '.java': '☕',
    '.kt': '🟪', '.json': '📋', '.md': '📖', '.css': '🎨',
    '.html': '🌐', '.yml': '⚙️', '.yaml': '⚙️', '.toml': '⚙️'
  };
  return icons[ext] || '📄';
}

function initExplorer() {
  const searchInput = document.getElementById('fileSearchInput');
  const clearBtn = document.getElementById('btnClearSearch');

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    clearBtn.classList.toggle('hidden', !query);
    filterFileTree(query);
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    filterFileTree('');
  });
}

function filterFileTree(query) {
  document.querySelectorAll('.tree-file').forEach(el => {
    const path = el.dataset.path.toLowerCase();
    const match = !query || path.includes(query);
    el.style.display = match ? 'flex' : 'none';
  });
}

window.addEventListener('DOMContentLoaded', initExplorer);
