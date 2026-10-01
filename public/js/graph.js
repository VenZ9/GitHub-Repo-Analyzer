/* ==========================================================================
   Project DNA — Interactive Architecture Graph Renderer
   Custom SVG force-directed layout with drag, zoom, pan, minimap, and tracing.
   ========================================================================== */

const ROLE_COLORS = {
  entrypoint: '#10b981',
  route: '#3b82f6',
  controller: '#06b6d4',
  service: '#a855f7',
  model: '#f59e0b',
  middleware: '#f43f5e',
  component: '#ec4899',
  util: '#14b8a6',
  config: '#94a3b8',
  hook: '#8b5cf6'
};

let graphState = {
  nodes: [],
  edges: [],
  transform: { x: 0, y: 0, k: 1 },
  dragging: null,
  panning: false,
  panStart: null,
  selectedNode: null,
  highlightedNodes: new Set(),
  highlightedEdges: new Set(),
  tracePath: null
};

let svgEl, gEl, width, height;

function renderArchitectureGraph(graph, repo) {
  svgEl = document.getElementById('architectureSvg');
  const wrapper = document.getElementById('graphCanvasWrapper');
  width = wrapper.clientWidth;
  height = wrapper.clientHeight;

  svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svgEl.innerHTML = '';

  // Defs for arrow markers
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="18" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="#30363d" />
    </marker>
    <marker id="arrowhead-active" markerWidth="8" markerHeight="8" refX="18" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="#38bdf8" />
    </marker>
  `;
  svgEl.appendChild(defs);

  gEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svgEl.appendChild(gEl);

  // Initialize node positions in a circular layout
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const cx = width / 2, cy = height / 2;
  const radius = Math.min(width, height) * 0.35;

  graphState.nodes = nodes.map((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    return {
      ...n,
      x: cx + Math.cos(angle) * radius * (0.6 + Math.random() * 0.4),
      y: cy + Math.sin(angle) * radius * (0.6 + Math.random() * 0.4),
      vx: 0,
      vy: 0
    };
  });
  graphState.edges = edges;
  graphState.transform = { x: 0, y: 0, k: 1 };
  graphState.selectedNode = null;
  graphState.highlightedNodes = new Set();
  graphState.highlightedEdges = new Set();
  graphState.tracePath = null;

  drawGraph();
  runForceSimulation();
  initGraphInteractions();
}

function drawGraph() {
  gEl.innerHTML = '';
  const nodeMap = {};
  graphState.nodes.forEach(n => nodeMap[n.id] = n);

  // Draw edges
  const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  graphState.edges.forEach(e => {
    const src = nodeMap[e.source];
    const tgt = nodeMap[e.target];
    if (!src || !tgt) return;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', src.x);
    line.setAttribute('y1', src.y);
    line.setAttribute('x2', tgt.x);
    line.setAttribute('y2', tgt.y);
    line.setAttribute('stroke', '#30363d');
    line.setAttribute('stroke-width', '1.2');
    line.setAttribute('marker-end', 'url(#arrowhead)');
    line.setAttribute('opacity', '0.5');
    line.dataset.edgeId = e.id;
    edgeGroup.appendChild(line);
  });
  gEl.appendChild(edgeGroup);

  // Draw nodes
  const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  graphState.nodes.forEach(n => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${n.x}, ${n.y})`);
    g.dataset.nodeId = n.id;
    g.style.cursor = 'pointer';

    const r = 6 + Math.min(10, n.centrality / 10);
    const color = ROLE_COLORS[n.role] || '#94a3b8';

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', r);
    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', '#0d1117');
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('opacity', '0.9');
    g.appendChild(circle);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', r + 4);
    label.setAttribute('y', 3);
    label.setAttribute('fill', '#8b949e');
    label.setAttribute('font-size', '9');
    label.setAttribute('font-family', 'monospace');
    label.textContent = n.label;
    g.appendChild(label);

    g.addEventListener('click', (ev) => {
      ev.stopPropagation();
      handleNodeClick(n.id);
    });

    g.addEventListener('mouseenter', (ev) => showTooltip(ev, n));
    g.addEventListener('mouseleave', hideTooltip);

    nodeGroup.appendChild(g);
  });
  gEl.appendChild(nodeGroup);

  applyTransform();
  drawMinimap();
}

function applyTransform() {
  const t = graphState.transform;
  gEl.setAttribute('transform', `translate(${t.x}, ${t.y}) scale(${t.k})`);
}

function runForceSimulation() {
  let iterations = 0;
  const maxIterations = 120;
  const nodeMap = {};
  graphState.nodes.forEach(n => nodeMap[n.id] = n);

  function tick() {
    if (iterations++ > maxIterations) return;

    // Repulsion between nodes
    for (let i = 0; i < graphState.nodes.length; i++) {
      for (let j = i + 1; j < graphState.nodes.length; j++) {
        const a = graphState.nodes[i];
        const b = graphState.nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 1800 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx; a.vy -= fy;
        b.vx += fx; b.vy += fy;
      }
    }

    // Attraction along edges
    graphState.edges.forEach(e => {
      const a = nodeMap[e.source];
      const b = nodeMap[e.target];
      if (!a || !b) return;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 90) * 0.02;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    });

    // Center gravity
    const cx = width / 2, cy = height / 2;
    graphState.nodes.forEach(n => {
      n.vx += (cx - n.x) * 0.002;
      n.vy += (cy - n.y) * 0.002;
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx;
      n.y += n.vy;
    });

    drawGraph();
    requestAnimationFrame(tick);
  }
  tick();
}

function initGraphInteractions() {
  const wrapper = document.getElementById('graphCanvasWrapper');

  // Zoom
  wrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;
    graphState.transform.k = Math.max(0.2, Math.min(3, graphState.transform.k * scaleFactor));
    applyTransform();
  }, { passive: false });

  // Pan
  wrapper.addEventListener('mousedown', (e) => {
    if (e.target.closest('[data-node-id]')) return;
    graphState.panning = true;
    graphState.panStart = { x: e.clientX - graphState.transform.x, y: e.clientY - graphState.transform.y };
  });

  window.addEventListener('mousemove', (e) => {
    if (graphState.panning) {
      graphState.transform.x = e.clientX - graphState.panStart.x;
      graphState.transform.y = e.clientY - graphState.panStart.y;
      applyTransform();
    }
  });

  window.addEventListener('mouseup', () => {
    graphState.panning = false;
  });

  // Zoom controls
  document.getElementById('btnZoomIn').addEventListener('click', () => {
    graphState.transform.k = Math.min(3, graphState.transform.k * 1.2);
    applyTransform();
  });
  document.getElementById('btnZoomOut').addEventListener('click', () => {
    graphState.transform.k = Math.max(0.2, graphState.transform.k * 0.8);
    applyTransform();
  });
  document.getElementById('btnFitView').addEventListener('click', () => {
    graphState.transform = { x: 0, y: 0, k: 1 };
    applyTransform();
  });
  document.getElementById('btnResetLayout').addEventListener('click', () => {
    if (AppState.currentRepo) renderArchitectureGraph(AppState.currentRepo.graph, AppState.currentRepo);
  });

  // Filter pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      AppState.activeFilter = pill.dataset.filter;
      applyFilter(AppState.activeFilter);
    });
  });

  // Trace mode
  document.getElementById('btnTraceMode').addEventListener('click', toggleTraceMode);
  document.getElementById('btnClearTrace').addEventListener('click', clearTrace);
  document.getElementById('btnCloseTrace').addEventListener('click', () => {
    document.getElementById('traceBanner').classList.add('hidden');
    clearTrace();
  });
}

function applyFilter(filter) {
  document.querySelectorAll('[data-node-id]').forEach(g => {
    const nodeId = g.dataset.nodeId;
    const node = graphState.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const visible = filter === 'all' || node.role === filter;
    g.style.opacity = visible ? '1' : '0.15';
  });
}

function handleNodeClick(nodeId) {
  if (AppState.traceMode) {
    handleTraceClick(nodeId);
    return;
  }
  selectNode(nodeId);
}

function selectNode(nodeId) {
  AppState.selectedNodeId = nodeId;
  graphState.selectedNode = nodeId;
  highlightConnections(nodeId);
  updateInspector(nodeId);
  
  // Sync file tree selection
  document.querySelectorAll('.tree-file').forEach(el => {
    el.classList.toggle('active', el.dataset.path === nodeId);
  });
}

function highlightConnections(nodeId) {
  const node = graphState.nodes.find(n => n.id === nodeId);
  if (!node) return;

  const connected = new Set([nodeId, ...(node.dependencies || []), ...(node.dependents || [])]);

  document.querySelectorAll('[data-node-id]').forEach(g => {
    const id = g.dataset.nodeId;
    g.style.opacity = connected.has(id) ? '1' : '0.2';
    const circle = g.querySelector('circle');
    if (circle) {
      circle.setAttribute('stroke', id === nodeId ? '#38bdf8' : '#0d1117');
      circle.setAttribute('stroke-width', id === nodeId ? '3' : '2');
    }
  });

  document.querySelectorAll('[data-edge-id]').forEach(line => {
    const [src, tgt] = line.dataset.edgeId.split('->');
    const active = src === nodeId || tgt === nodeId;
    line.setAttribute('stroke', active ? '#38bdf8' : '#30363d');
    line.setAttribute('opacity', active ? '0.9' : '0.15');
    line.setAttribute('marker-end', active ? 'url(#arrowhead-active)' : 'url(#arrowhead)');
  });
}

function toggleTraceMode() {
  AppState.traceMode = !AppState.traceMode;
  const banner = document.getElementById('traceBanner');
  const btn = document.getElementById('btnTraceMode');
  
  if (AppState.traceMode) {
    banner.classList.remove('hidden');
    btn.classList.add('active');
    AppState.traceStart = null;
    AppState.traceEnd = null;
    document.getElementById('traceStatusText').textContent = 'Click Node 1 (Source) then Node 2 (Target) to inspect the dependency path.';
  } else {
    banner.classList.add('hidden');
    btn.classList.remove('active');
    clearTrace();
  }
}

async function handleTraceClick(nodeId) {
  if (!AppState.traceStart) {
    AppState.traceStart = nodeId;
    document.getElementById('traceStatusText').textContent = `Source: ${nodeId}. Now click the target node.`;
  } else if (!AppState.traceEnd && nodeId !== AppState.traceStart) {
    AppState.traceEnd = nodeId;
    await executeTrace(AppState.traceStart, AppState.traceEnd);
  }
}

async function executeTrace(start, end) {
  try {
    const result = await apiPost('/api/trace', {
      repo_id: AppState.currentRepoId,
      start_node: start,
      end_node: end,
      custom_files: AppState.customFiles
    });

    if (result.found) {
      document.getElementById('traceStatusText').textContent = result.description;
      highlightTracePath(result.path);
    } else {
      document.getElementById('traceStatusText').textContent = result.message;
    }
  } catch (err) {
    document.getElementById('traceStatusText').textContent = `Trace error: ${err.message}`;
  }
}

function highlightTracePath(path) {
  const pathSet = new Set(path);
  document.querySelectorAll('[data-node-id]').forEach(g => {
    const id = g.dataset.nodeId;
    g.style.opacity = pathSet.has(id) ? '1' : '0.1';
    const circle = g.querySelector('circle');
    if (circle && pathSet.has(id)) {
      circle.setAttribute('stroke', '#a855f7');
      circle.setAttribute('stroke-width', '3');
    }
  });

  const edgeSet = new Set();
  for (let i = 0; i < path.length - 1; i++) {
    edgeSet.add(`${path[i]}->${path[i + 1]}`);
    edgeSet.add(`${path[i + 1]}->${path[i]}`);
  }

  document.querySelectorAll('[data-edge-id]').forEach(line => {
    const active = edgeSet.has(line.dataset.edgeId);
    line.setAttribute('stroke', active ? '#a855f7' : '#30363d');
    line.setAttribute('stroke-width', active ? '2.5' : '1.2');
    line.setAttribute('opacity', active ? '1' : '0.1');
  });
}

function clearTrace() {
  AppState.traceStart = null;
  AppState.traceEnd = null;
  if (AppState.selectedNodeId) {
    highlightConnections(AppState.selectedNodeId);
  } else {
    document.querySelectorAll('[data-node-id]').forEach(g => {
      g.style.opacity = '1';
      const circle = g.querySelector('circle');
      if (circle) { circle.setAttribute('stroke', '#0d1117'); circle.setAttribute('stroke-width', '2'); }
    });
    document.querySelectorAll('[data-edge-id]').forEach(line => {
      line.setAttribute('stroke', '#30363d');
      line.setAttribute('stroke-width', '1.2');
      line.setAttribute('opacity', '0.5');
    });
  }
}

function showTooltip(ev, node) {
  const tooltip = document.getElementById('graphTooltip');
  tooltip.innerHTML = `<strong>${node.label}</strong><br><span style="color:#8b949e">${node.role} · ${node.loc} LOC · centrality ${node.centrality}%</span>`;
  tooltip.classList.remove('hidden');
  const wrapper = document.getElementById('graphCanvasWrapper');
  const rect = wrapper.getBoundingClientRect();
  tooltip.style.left = `${ev.clientX - rect.left + 12}px`;
  tooltip.style.top = `${ev.clientY - rect.top + 12}px`;
}

function hideTooltip() {
  document.getElementById('graphTooltip').classList.add('hidden');
}

function drawMinimap() {
  const canvas = document.getElementById('minimapCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const scaleX = canvas.width / width;
  const scaleY = canvas.height / height;
  
  graphState.nodes.forEach(n => {
    ctx.fillStyle = ROLE_COLORS[n.role] || '#94a3b8';
    ctx.beginPath();
    ctx.arc(n.x * scaleX, n.y * scaleY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
}
