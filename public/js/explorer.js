/**
 * Project DNA — File Explorer Component
 * Renders nested directory tree with role badges, LOC, search filtering,
 * and bidirectional sync with the architecture graph.
 */

class FileExplorer {
  constructor(containerElement, onFileSelect) {
    this.container = containerElement;
    this.onFileSelect = onFileSelect;
    this.files = [];
    this.activePath = null;
    this.filterQuery = '';
    this.collapsedFolders = new Set();
  }

  setFiles(fileList) {
    this.files = fileList || [];
    this.render();
  }

  setActiveFile(path) {
    this.activePath = path;
    const current = this.container.querySelector('.tree-node.active');
    if (current) current.classList.remove('active');

    if (path) {
      const target = this.container.querySelector(`[data-path="${path}"]`);
      if (target) {
        target.classList.add('active');
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  setFilter(query) {
    this.filterQuery = (query || '').toLowerCase().trim();
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    if (!this.files.length) {
      this.container.innerHTML = `<div style="padding:16px; color:#64748b; font-size:12px; text-align:center;">No files found</div>`;
      return;
    }

    // Filter files if query is present
    const filtered = this.files.filter(f => {
      if (!this.filterQuery) return true;
      return f.path.toLowerCase().includes(this.filterQuery) || 
             f.filename.toLowerCase().includes(this.filterQuery) ||
             (f.role && f.role.toLowerCase().includes(this.filterQuery));
    });

    // Build directory tree
    const root = { name: '', isDir: true, children: {}, files: [] };

    filtered.forEach(file => {
      const parts = file.path.split('/');
      let curr = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const folder = parts[i];
        if (!curr.children[folder]) {
          curr.children[folder] = {
            name: folder,
            path: parts.slice(0, i + 1).join('/'),
            isDir: true,
            children: {},
            files: []
          };
        }
        curr = curr.children[folder];
      }
      curr.files.push(file);
    });

    // Recursively render tree DOM
    const frag = document.createDocumentFragment();
    this._renderDirectory(root, frag, 0);
    this.container.appendChild(frag);
  }

  _renderDirectory(dirNode, parentElem, depth) {
    // Render subfolders
    const folderNames = Object.keys(dirNode.children).sort();
    folderNames.forEach(folderName => {
      const subDir = dirNode.children[folderName];
      const isCollapsed = this.collapsedFolders.has(subDir.path);

      const folderRow = document.createElement('div');
      folderRow.className = 'tree-node folder-node';
      folderRow.style.paddingLeft = `${12 + depth * 14}px`;
      folderRow.innerHTML = `
        <span class="tree-node-icon">${isCollapsed ? '▶' : '▼'}</span>
        <span class="tree-node-icon">📁</span>
        <span class="tree-node-name" style="font-weight:600; color:#94a3b8;">${folderName}</span>
      `;

      folderRow.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.collapsedFolders.has(subDir.path)) {
          this.collapsedFolders.delete(subDir.path);
        } else {
          this.collapsedFolders.add(subDir.path);
        }
        this.render();
      });

      parentElem.appendChild(folderRow);

      if (!isCollapsed) {
        this._renderDirectory(subDir, parentElem, depth + 1);
      }
    });

    // Render files
    dirNode.files.sort((a, b) => a.filename.localeCompare(b.filename)).forEach(file => {
      const fileRow = document.createElement('div');
      fileRow.className = `tree-node file-node ${file.path === this.activePath ? 'active' : ''}`;
      fileRow.setAttribute('data-path', file.path);
      fileRow.style.paddingLeft = `${12 + depth * 14}px`;

      const roleClass = file.role || 'util';
      const fileIcon = this._getFileIcon(file.extension);

      fileRow.innerHTML = `
        <span class="tree-node-icon">${fileIcon}</span>
        <span class="tree-node-name" title="${file.path}">${file.filename}</span>
        <span class="tree-node-role ${roleClass}">${file.role || 'FILE'}</span>
      `;

      fileRow.addEventListener('click', () => {
        this.setActiveFile(file.path);
        if (this.onFileSelect) {
          this.onFileSelect(file.path);
        }
      });

      parentElem.appendChild(fileRow);
    });
  }

  _getFileIcon(ext) {
    switch (ext) {
      case '.ts': case '.tsx': return '🔷';
      case '.js': case '.jsx': return '🟨';
      case '.py': return '🐍';
      case '.go': return '🐹';
      case '.rs': return '🦀';
      case '.java': case '.kt': return '☕';
      case '.json': return '📋';
      case '.md': return '📝';
      default: return '📄';
    }
  }
}

window.FileExplorer = FileExplorer;
