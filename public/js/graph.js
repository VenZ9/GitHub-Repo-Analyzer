/**
 * Project DNA — Interactive Architecture Graph Engine
 * High-performance SVG & Canvas Force-Directed / Layered Graph Renderer
 * Supports zoom, pan, node dragging, direct neighbor highlighting,
 * shortest-path dependency tracing, category filters, and minimap.
 */

class ArchitectureGraph {
  constructor(svgElement, minimapCanvasElement) {
    this.svg = svgElement;
    this.minimapCanvas = minimapCanvasElement;
    this.minimapCtx = minimapCanvasElement ? minimapCanvasElement.getContext('2d') : null;

    this.nodes = [];
    this.edges = [];
    this.clusters = [];
    this.activeFilter = 'all';
    this.isClustered = false;

    // Viewport State (Zoom & Pan)
    this.transform = { x: 0, y: 0, scale: 1 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };

    // Interaction State
    this.selectedNodeId = null;
    this.hoveredNodeId = null;
    this.traceMode = false;
    this.traceStartNode = null;
    this.traceEndNode = null;
    this.tracedPathNodes = new Set();
    this.tracedPathEdges = new Set();

    // Dragging State
    this.draggedNode = null;
    this.dragStart = { x: 0, y: 0 };

    // Callbacks
    this.onNodeSelect = null;
    this.onTraceComplete = null;

    // Setup SVG Container & Defs
    this._initSvgDefs();
    this._attachEventListeners();
  }

  _initSvgDefs() {
    this.svg.innerHTML = `
      <defs>
        <!-- Arrowhead Marker Default -->
        <marker id="arrow-default" viewBox="0 -5 10 10" refX="28" refY="0" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,-4L10,0L0,4" fill="#475569" />
        </marker>
        <!-- Arrowhead Marker Highlight Inbound -->
        <marker id="arrow-inbound" viewBox="0 -5 10 10" refX="28" refY="0" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,-4L10,0L0,4" fill="#38bdf8" />
        </marker>
        <!-- Arrowhead Marker Highlight Outbound -->
        <marker id="arrow-outbound" viewBox="0 -5 10 10" refX="28" refY="0" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,-4L10,0L0,4" fill="#a855f7" />
        </marker>
        <!-- Arrowhead Marker Trace Path -->
        <marker id="arrow-trace" viewBox="0 -5 10 10" refX="28" refY="0" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0,-4L10,0L0,4" fill="#f43f5e" />
        </marker>
        <!-- Glow Filter -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <g id="graphViewport" class="graph-viewport">
        <g id="clusterGroup"></g>
        <g id="edgeGroup"></g>
        <g id="nodeGroup"></g>
      </g>
    `;
    this.viewport = this.svg.querySelector('#graphViewport');
    this.clusterGroup = this.svg.querySelector('#clusterGroup');
    this.edgeGroup = this.svg.querySelector('#edgeGroup');
    this.nodeGroup = this.svg.querySelector('#nodeGroup');
  }

  setData(graphData) {
    this.nodes = (graphData.nodes || []).map(n => ({
      ...n,
      x: n.x || (Math.random() * 800 + 100),
      y: n.y || (Math.random() * 500 + 100),
      vx: 0,
      vy: 0
    }));
    this.edges = graphData.edges || [];
    this.clusters = graphData.clusters || [];
    this.selectedNodeId = null;
    this.tracedPathNodes.clear();
    this.tracedPathEdges.clear();

    // Compute Initial Layered Force Layout
    this._computeInitialLayout();
    this.render();
    this.fitView();
  }

  _computeInitialLayout() {
    const width = this.svg.clientWidth || 900;
    const height = this.svg.clientHeight || 600;

    // Role-based hierarchy ranking for structured layout
    const roleRank = {
      'entrypoint': 0,
      'config': 0,
      'middleware': 1,
      'route': 1,
      'controller': 2,
      'component': 2,
      'service': 3,
      'model': 4,
      'util': 4
    };

    // Group nodes by rank
    const ranks = {};
    this.nodes.forEach(node => {
      const r = roleRank[node.role] !== undefined ? roleRank[node.role] : 2;
      if (!ranks[r]) ranks[r] = [];
      ranks[r].push(node);
    });

    // Space ranks horizontally or vertically
    const rankKeys = Object.keys(ranks).sort();
    const rankStepY = (height - 180) / Math.max(rankKeys.length - 1, 1);

    rankKeys.forEach((rk, rIndex) => {
      const rowNodes = ranks[rk];
      const stepX = (width - 160) / Math.max(rowNodes.length + 1, 2);
      rowNodes.forEach((node, cIndex) => {
        node.x = 80 + stepX * (cIndex + 1) + (Math.random() * 20 - 10);
        node.y = 90 + rankStepY * rIndex + (Math.random() * 20 - 10);
      });
    });

    // Run simple relaxation simulation for organic spacing
    for (let iter = 0; iter < 45; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const a = this.nodes[i];
          const b = this.nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);
          if (dist < 180) {
            const force = (180 - dist) / dist * 0.15;
            a.x -= dx * force;
            a.y -= dy * force;
            b.x += dx * force;
            b.y += dy * force;
          }
        }
      }

      // Edge spring attraction
      const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
      this.edges.forEach(edge => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (src && tgt) {
          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desired = 140;
          const force = (dist - desired) * 0.03;
          src.x += (dx / dist) * force;
          src.y += (dy / dist) * force;
          tgt.x -= (dx / dist) * force;
          tgt.y -= (dy / dist) * force;
        }
      });
    }
  }

  render() {
    this._renderClusters();
    this._renderEdges();
    this._renderNodes();
    this._updateTransform();
    this._renderMinimap();
  }

  _renderClusters() {
    this.clusterGroup.innerHTML = '';
    if (!this.isClustered) return;

    // Group nodes by directory cluster
    const clusterBounds = new Map();
    this.nodes.forEach(node => {
      const cl = node.directory || 'root';
      if (!clusterBounds.has(cl)) {
        clusterBounds.set(cl, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, nodes: [] });
      }
      const b = clusterBounds.get(cl);
      b.minX = Math.min(b.minX, node.x);
      b.maxX = Math.max(b.maxX, node.x);
      b.minY = Math.min(b.minY, node.y);
      b.maxY = Math.max(b.maxY, node.y);
      b.nodes.push(node);
    });

    clusterBounds.forEach((bounds, clusterName) => {
      if (bounds.nodes.length <= 1) return;
      const pad = 40;
      const w = bounds.maxX - bounds.minX + pad * 2;
      const h = bounds.maxY - bounds.minY + pad * 2;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', bounds.minX - pad);
      rect.setAttribute('y', bounds.minY - pad);
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('rx', 16);
      rect.setAttribute('fill', 'rgba(30, 41, 59, 0.4)');
      rect.setAttribute('stroke', '#334155');
      rect.setAttribute('stroke-dasharray', '4 4');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', bounds.minX - pad + 14);
      text.setAttribute('y', bounds.minY - pad + 20);
      text.setAttribute('fill', '#94a3b8');
      text.setAttribute('font-size', '11px');
      text.setAttribute('font-family', 'monospace');
      text.textContent = `📁 ${clusterName}/ (${bounds.nodes.length})`;

      this.clusterGroup.appendChild(rect);
      this.clusterGroup.appendChild(text);
    });
  }

  _renderEdges() {
    this.edgeGroup.innerHTML = '';
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

    this.edges.forEach(edge => {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) return;

      // Filter visibility
      if (!this._isNodeVisible(src) || !this._isNodeVisible(tgt)) return;

      // Determine edge state (normal, dimmed, inbound highlight, outbound highlight, traced)
      let strokeColor = '#334155';
      let strokeWidth = '1.5';
      let markerEnd = 'url(#arrow-default)';
      let opacity = '0.6';
      let isAnimated = false;

      const isTracedEdge = this.tracedPathEdges.has(edge.id) || this.tracedPathEdges.has(`${edge.target}->${edge.source}`);

      if (isTracedEdge) {
        strokeColor = '#f43f5e';
        strokeWidth = '3';
        markerEnd = 'url(#arrow-trace)';
        opacity = '1';
        isAnimated = true;
      } else if (this.selectedNodeId) {
        if (edge.source === this.selectedNodeId) {
          // Outbound dependency (source -> target)
          strokeColor = '#a855f7';
          strokeWidth = '2.5';
          markerEnd = 'url(#arrow-outbound)';
          opacity = '1';
        } else if (edge.target === this.selectedNodeId) {
          // Inbound dependent (source -> selected)
          strokeColor = '#38bdf8';
          strokeWidth = '2.5';
          markerEnd = 'url(#arrow-inbound)';
          opacity = '1';
        } else {
          // Dimmed
          opacity = '0.12';
        }
      }

      // Curved bezier path
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const cx = (src.x + tgt.x) / 2 - dy * 0.1;
      const cy = (src.y + tgt.y) / 2 + dx * 0.1;
      const d = `M ${src.x} ${src.y} Q ${cx} ${cy} ${tgt.x} ${tgt.y}`;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', strokeColor);
      path.setAttribute('stroke-width', strokeWidth);
      path.setAttribute('marker-end', markerEnd);
      path.setAttribute('opacity', opacity);
      path.setAttribute('data-edge-id', edge.id);

      if (isAnimated) {
        path.setAttribute('stroke-dasharray', '6 3');
        path.style.animation = 'dash 1s linear infinite';
      }

      this.edgeGroup.appendChild(path);
    });
  }

  _renderNodes() {
    this.nodeGroup.innerHTML = '';
    const selectedNode = this.nodes.find(n => n.id === this.selectedNodeId);

    const directNeighbors = new Set();
    if (selectedNode) {
      (selectedNode.dependencies || []).forEach(d => directNeighbors.add(d));
      (selectedNode.dependents || []).forEach(d => directNeighbors.add(d));
    }

    this.nodes.forEach(node => {
      if (!this._isNodeVisible(node)) return;

      const isSelected = node.id === this.selectedNodeId;
      const isNeighbor = directNeighbors.has(node.id);
      const isTraced = this.tracedPathNodes.has(node.id);
      const isDimmed = this.selectedNodeId && !isSelected && !isNeighbor && !isTraced;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `graph-node ${node.role} ${isSelected ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''}`);
      g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
      g.setAttribute('data-id', node.id);

      const roleColors = {
        'entrypoint': '#10b981',
        'route': '#3b82f6',
        'controller': '#06b6d4',
        'service': '#a855f7',
        'model': '#f59e0b',
        'middleware': '#f43f5e',
        'component': '#ec4899',
        'util': '#14b8a6',
        'config': '#94a3b8'
      };
      const color = roleColors[node.role] || '#64748b';

      // Outer glow for selected or traced node
      if (isSelected || isTraced) {
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        glow.setAttribute('r', '26');
        glow.setAttribute('fill', isTraced ? 'rgba(244, 63, 94, 0.3)' : 'rgba(56, 189, 248, 0.3)');
        glow.setAttribute('filter', 'url(#glow)');
        g.appendChild(glow);
      }

      // Main Node Circle
      const radius = Math.min(22, Math.max(14, 12 + Math.sqrt(node.loc || 10)));
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', radius);
      circle.setAttribute('fill', isSelected ? color : '#161b22');
      circle.setAttribute('stroke', color);
      circle.setAttribute('stroke-width', isSelected ? '3.5' : (isNeighbor ? '2.5' : '1.8'));
      circle.setAttribute('class', 'node-circle');
      g.appendChild(circle);

      // Icon / Role Letter inside circle
      const initial = node.role ? node.role[0].toUpperCase() : 'F';
      const iconText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      iconText.setAttribute('text-anchor', 'middle');
      iconText.setAttribute('dy', '4');
      iconText.setAttribute('font-size', '10px');
      iconText.setAttribute('font-weight', '700');
      iconText.setAttribute('fill', isSelected ? '#ffffff' : color);
      iconText.textContent = initial;
      g.appendChild(iconText);

      // Label below circle
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dy', radius + 14);
      label.setAttribute('font-size', '11px');
      label.setAttribute('font-weight', isSelected ? '700' : '500');
      label.setAttribute('fill', isSelected ? '#ffffff' : '#cbd5e1');
      label.setAttribute('class', 'node-label');
      label.textContent = node.label;
      g.appendChild(label);

      // Sub-label (directory)
      const subLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      subLabel.setAttribute('text-anchor', 'middle');
      subLabel.setAttribute('dy', radius + 26);
      subLabel.setAttribute('font-size', '9px');
      subLabel.setAttribute('fill', '#64748b');
      subLabel.textContent = node.directory ? `${node.directory}/` : '';
      g.appendChild(subLabel);

      this.nodeGroup.appendChild(g);
    });
  }

  _isNodeVisible(node) {
    if (this.activeFilter === 'all') return true;
    return node.role === this.activeFilter;
  }

  _attachEventListeners() {
    const wrapper = this.svg.parentElement;

    // Pan & Drag Handler
    wrapper.addEventListener('mousedown', (e) => {
      const nodeElem = e.target.closest('.graph-node');
      if (nodeElem) {
        const nodeId = nodeElem.getAttribute('data-id');
        this.draggedNode = this.nodes.find(n => n.id === nodeId);
        this.dragStart = { x: e.clientX, y: e.clientY };
        e.stopPropagation();
      } else {
        this.isPanning = true;
        this.panStart = { x: e.clientX - this.transform.x, y: e.clientY - this.transform.y };
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.draggedNode) {
        const dx = (e.clientX - this.dragStart.x) / this.transform.scale;
        const dy = (e.clientY - this.dragStart.y) / this.transform.scale;
        this.draggedNode.x += dx;
        this.draggedNode.y += dy;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.render();
      } else if (this.isPanning) {
        this.transform.x = e.clientX - this.panStart.x;
        this.transform.y = e.clientY - this.panStart.y;
        this._updateTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      this.draggedNode = null;
      this.isPanning = false;
      this._renderMinimap();
    });

    // Zoom on Wheel
    wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const newScale = Math.min(3.5, Math.max(0.25, this.transform.scale * zoomFactor));

      const rect = wrapper.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
      this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
      this.transform.scale = newScale;

      this._updateTransform();
      this._renderMinimap();
    }, { passive: false });

    // Node Click Handler
    wrapper.addEventListener('click', (e) => {
      const nodeElem = e.target.closest('.graph-node');
      if (nodeElem) {
        const nodeId = nodeElem.getAttribute('data-id');
        this.handleNodeClick(nodeId);
      }
    });

    // Node Hover Tooltip
    const tooltip = document.getElementById('graphTooltip');
    wrapper.addEventListener('mouseover', (e) => {
      const nodeElem = e.target.closest('.graph-node');
      if (nodeElem && tooltip) {
        const nodeId = nodeElem.getAttribute('data-id');
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
          tooltip.innerHTML = `
            <div style="font-weight:600; color:#38bdf8;">${node.label}</div>
            <div style="font-size:10px; color:#94a3b8; font-family:monospace;">${node.path}</div>
            <div style="margin-top:4px; font-size:10px; display:flex; gap:8px;">
              <span>Role: <strong>${node.role.toUpperCase()}</strong></span>
              <span>LOC: <strong>${node.loc}</strong></span>
              <span>Deps: <strong>${node.outDegree}</strong></span>
              <span>Callers: <strong>${node.inDegree}</strong></span>
            </div>
          `;
          tooltip.classList.remove('hidden');
        }
      }
    });

    wrapper.addEventListener('mousemove', (e) => {
      if (tooltip && !tooltip.classList.contains('hidden')) {
        const rect = wrapper.getBoundingClientRect();
        tooltip.style.left = `${e.clientX - rect.left + 15}px`;
        tooltip.style.top = `${e.clientY - rect.top + 15}px`;
      }
    });

    wrapper.addEventListener('mouseout', (e) => {
      if (e.target.closest('.graph-node') && tooltip) {
        tooltip.classList.add('hidden');
      }
    });
  }

  handleNodeClick(nodeId) {
    if (this.traceMode) {
      if (!this.traceStartNode) {
        this.traceStartNode = nodeId;
        if (this.onTraceStep) this.onTraceStep('start', nodeId);
      } else if (!this.traceEndNode && nodeId !== this.traceStartNode) {
        this.traceEndNode = nodeId;
        if (this.onTraceStep) this.onTraceStep('end', nodeId);
      }
      return;
    }

    this.selectNode(nodeId);
  }

  selectNode(nodeId) {
    this.selectedNodeId = (this.selectedNodeId === nodeId) ? null : nodeId;
    this.render();
    if (this.onNodeSelect) {
      this.onNodeSelect(this.selectedNodeId);
    }
  }

  setFilter(filterName) {
    this.activeFilter = filterName;
    this.render();
  }

  toggleClustering() {
    this.isClustered = !this.isClustered;
    this.render();
    return this.isClustered;
  }

  zoomIn() {
    this.transform.scale = Math.min(3.5, this.transform.scale * 1.25);
    this._updateTransform();
    this._renderMinimap();
  }

  zoomOut() {
    this.transform.scale = Math.max(0.25, this.transform.scale * 0.8);
    this._updateTransform();
    this._renderMinimap();
  }

  fitView() {
    if (!this.nodes.length) return;
    const w = this.svg.clientWidth || 900;
    const h = this.svg.clientHeight || 600;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });

    const graphW = maxX - minX + 160;
    const graphH = maxY - minY + 160;
    const scale = Math.min(1.4, Math.max(0.35, Math.min(w / graphW, h / graphH) * 0.85));

    this.transform.scale = scale;
    this.transform.x = (w - (minX + maxX) * scale) / 2;
    this.transform.y = (h - (minY + maxY) * scale) / 2;

    this._updateTransform();
    this._renderMinimap();
  }

  focusNode(nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    this.selectNode(nodeId);

    const w = this.svg.clientWidth || 900;
    const h = this.svg.clientHeight || 600;
    this.transform.scale = 1.2;
    this.transform.x = w / 2 - node.x * 1.2;
    this.transform.y = h / 2 - node.y * 1.2;
    this._updateTransform();
    this._renderMinimap();
  }

  setTracePath(pathNodes, pathEdges) {
    this.tracedPathNodes = new Set(pathNodes || []);
    this.tracedPathEdges = new Set(pathEdges || []);
    this.render();
  }

  clearTrace() {
    this.traceStartNode = null;
    this.traceEndNode = null;
    this.tracedPathNodes.clear();
    this.tracedPathEdges.clear();
    this.render();
  }

  _updateTransform() {
    if (this.viewport) {
      this.viewport.setAttribute('transform', `translate(${this.transform.x}, ${this.transform.y}) scale(${this.transform.scale})`);
    }
  }

  _renderMinimap() {
    if (!this.minimapCtx || !this.nodes.length) return;
    const ctx = this.minimapCtx;
    const cw = this.minimapCanvas.width;
    const ch = this.minimapCanvas.height;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, cw, ch);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });

    const pad = 60;
    const gw = (maxX - minX + pad * 2) || 1;
    const gh = (maxY - minY + pad * 2) || 1;
    const scale = Math.min(cw / gw, ch / gh);

    // Draw Edges on Minimap
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    this.edges.forEach(e => {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (s && t) {
        const sx = (s.x - minX + pad) * scale;
        const sy = (s.y - minY + pad) * scale;
        const tx = (t.x - minX + pad) * scale;
        const ty = (t.y - minY + pad) * scale;
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
      }
    });
    ctx.stroke();

    // Draw Nodes on Minimap
    this.nodes.forEach(n => {
      const nx = (n.x - minX + pad) * scale;
      const ny = (n.y - minY + pad) * scale;
      ctx.fillStyle = (n.id === this.selectedNodeId) ? '#38bdf8' : '#64748b';
      ctx.beginPath();
      ctx.arc(nx, ny, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Viewport Camera Box
    const svgW = this.svg.clientWidth || 900;
    const svgH = this.svg.clientHeight || 600;
    const viewLeft = (-this.transform.x / this.transform.scale - minX + pad) * scale;
    const viewTop = (-this.transform.y / this.transform.scale - minY + pad) * scale;
    const viewW = (svgW / this.transform.scale) * scale;
    const viewH = (svgH / this.transform.scale) * scale;

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(viewLeft, viewTop, viewW, viewH);
  }
}

window.ArchitectureGraph = ArchitectureGraph;
