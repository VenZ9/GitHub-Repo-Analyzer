"""
Architecture graph builder for Project DNA.
Resolves imports, constructs nodes and edges, calculates centrality & degree metrics,
clusters nodes by module/directory, and performs dependency tracing (BFS shortest path).
"""

from typing import Dict, List, Set, Any, Optional, Tuple
from collections import deque
import os
import posixpath

def normalize_path(p: str) -> str:
    """Normalize file path to POSIX standard."""
    return p.replace('\\', '/').lstrip('./')

def resolve_import_target(source_path: str, import_raw: str, all_file_paths: Set[str]) -> Optional[str]:
    """
    Given a source file path and a raw import string, resolve to an existing file in all_file_paths.
    Handles relative paths (./, ../), module aliases (@/, ~/, src/), and python module paths.
    """
    import_clean = import_raw.strip().split('?')[0].split('#')[0]
    source_dir = posixpath.dirname(normalize_path(source_path))
    
    # 1. Relative imports
    if import_clean.startswith('.'):
        combined = posixpath.normpath(posixpath.join(source_dir, import_clean))
        # Direct match
        if combined in all_file_paths:
            return combined
            
        # Try extensions
        common_exts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.mjs', '.cjs', '.json', '.go', '.rs']
        for ext in common_exts:
            if combined + ext in all_file_paths:
                return combined + ext
                
        # Try index files inside directory
        for ext in common_exts:
            index_path = posixpath.join(combined, 'index' + ext)
            if index_path in all_file_paths:
                return index_path
            init_py = posixpath.join(combined, '__init__.py')
            if init_py in all_file_paths:
                return init_py

    # 2. Path aliases (@/..., ~/)
    if import_clean.startswith(('@/', '~/')):
        alias_target = import_clean[2:]
        for prefix in ['', 'src/', 'app/']:
            candidate = posixpath.normpath(posixpath.join(prefix, alias_target))
            if candidate in all_file_paths:
                return candidate
            for ext in ['.ts', '.tsx', '.js', '.jsx', '.py']:
                if candidate + ext in all_file_paths:
                    return candidate + ext
                if posixpath.join(candidate, 'index' + ext) in all_file_paths:
                    return posixpath.join(candidate, 'index' + ext)

    # 3. Python package imports (e.g. app.core.config or app.services)
    py_candidate = import_clean.replace('.', '/')
    for prefix in ['', 'src/']:
        cand = posixpath.normpath(posixpath.join(prefix, py_candidate))
        if cand + '.py' in all_file_paths:
            return cand + '.py'
        if posixpath.join(cand, '__init__.py') in all_file_paths:
            return posixpath.join(cand, '__init__.py')

    # 4. Direct root/src match (e.g. 'src/utils/logger')
    for ext in ['', '.ts', '.js', '.py', '.tsx', '.jsx']:
        if import_clean + ext in all_file_paths:
            return import_clean + ext
        if 'src/' + import_clean + ext in all_file_paths:
            return 'src/' + import_clean + ext

    # 5. Fuzzy match on filename if distinct
    base = posixpath.basename(import_clean)
    matching = [p for p in all_file_paths if posixpath.basename(p).startswith(base)]
    if len(matching) == 1:
        return matching[0]

    return None

def build_architecture_graph(file_analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Constructs the full architecture graph with nodes, edges, clusters, and metrics.
    """
    all_paths = {normalize_path(f['path']) for f in file_analyses}
    nodes_map: Dict[str, Dict[str, Any]] = {}
    edges_list: List[Dict[str, Any]] = []
    edges_set: Set[Tuple[str, str]] = set()
    
    in_degree: Dict[str, int] = {p: 0 for p in all_paths}
    out_degree: Dict[str, int] = {p: 0 for p in all_paths}
    in_neighbors: Dict[str, List[str]] = {p: [] for p in all_paths}
    out_neighbors: Dict[str, List[str]] = {p: [] for p in all_paths}

    # Initialize nodes
    for f in file_analyses:
        p = normalize_path(f['path'])
        nodes_map[p] = {
            'id': p,
            'label': f['filename'],
            'path': p,
            'directory': normalize_path(f['directory']),
            'role': f['role'],
            'loc': f['loc'],
            'size_bytes': f['size_bytes'],
            'complexity': f['complexity'],
            'extension': f['extension'],
            'functions': f['functions'],
            'classes': f['classes'],
            'exports': f['exports'],
            'routes': f['routes'],
            'components': f['components'],
            'inDegree': 0,
            'outDegree': 0,
            'centrality': 0,
            'dependencies': [],
            'dependents': []
        }

    # Resolve edges
    for f in file_analyses:
        source_p = normalize_path(f['path'])
        for imp in f['imports']:
            target_p = resolve_import_target(source_p, imp, all_paths)
            if target_p and target_p != source_p:
                edge_key = (source_p, target_p)
                if edge_key not in edges_set:
                    edges_set.add(edge_key)
                    
                    # Determine edge type
                    edge_type = 'imports'
                    s_role = nodes_map[source_p]['role']
                    t_role = nodes_map[target_p]['role']
                    if s_role in ('route', 'controller') and t_role == 'service':
                        edge_type = 'calls'
                    elif s_role == 'service' and t_role == 'model':
                        edge_type = 'persists'
                    elif s_role == 'entrypoint':
                        edge_type = 'initializes'
                        
                    edges_list.append({
                        'id': f"{source_p}->{target_p}",
                        'source': source_p,
                        'target': target_p,
                        'type': edge_type,
                        'raw': imp
                    })
                    
                    out_degree[source_p] += 1
                    in_degree[target_p] += 1
                    out_neighbors[source_p].append(target_p)
                    in_neighbors[target_p].append(source_p)

    # Compute Centrality (Degree + PageRank approximation)
    max_degree = max([in_degree[p] * 2 + out_degree[p] for p in all_paths] or [1])
    for p, node in nodes_map.items():
        node['inDegree'] = in_degree[p]
        node['outDegree'] = out_degree[p]
        node['dependencies'] = sorted(list(set(out_neighbors[p])))
        node['dependents'] = sorted(list(set(in_neighbors[p])))
        
        # Centrality score 0-100
        raw_score = (in_degree[p] * 2.5 + out_degree[p] + (node['complexity'] / 10))
        node['centrality'] = min(100, int((raw_score / max_degree) * 100))

    # Cluster nodes into groups (by module / functional layer)
    clusters: Dict[str, Dict[str, Any]] = {}
    for p, node in nodes_map.items():
        # High level group
        parts = p.split('/')
        if len(parts) > 1:
            group_name = parts[0] if parts[0] != 'src' else (parts[1] if len(parts) > 2 else parts[0])
        else:
            group_name = 'root'
            
        if group_name not in clusters:
            clusters[group_name] = {
                'id': group_name,
                'name': group_name.capitalize(),
                'nodeCount': 0,
                'nodes': [],
                'primaryRole': node['role']
            }
        clusters[group_name]['nodeCount'] += 1
        clusters[group_name]['nodes'].append(p)

    return {
        'nodes': list(nodes_map.values()),
        'edges': edges_list,
        'clusters': list(clusters.values()),
        'metrics': {
            'total_nodes': len(nodes_map),
            'total_edges': len(edges_list),
            'avg_dependencies_per_file': round(len(edges_list) / max(len(nodes_map), 1), 2),
            'max_in_degree': max(in_degree.values() or [0]),
            'isolated_nodes_count': sum(1 for p in all_paths if in_degree[p] == 0 and out_degree[p] == 0)
        }
    }

def find_dependency_trace(graph: Dict[str, Any], start_node_id: str, end_node_id: str) -> Dict[str, Any]:
    """
    BFS shortest path from start_node_id to end_node_id in directed dependency graph.
    Also checks reverse path if forward path doesn't exist.
    """
    nodes = {n['id']: n for n in graph.get('nodes', [])}
    if start_node_id not in nodes or end_node_id not in nodes:
        return {'found': False, 'message': 'One or both nodes do not exist in graph', 'path': [], 'edges': []}

    adj: Dict[str, List[str]] = {n['id']: [] for n in graph.get('nodes', [])}
    for e in graph.get('edges', []):
        if e['source'] in adj:
            adj[e['source']].append(e['target'])

    # BFS Forward
    queue = deque([[start_node_id]])
    visited = {start_node_id}
    forward_path = None

    while queue:
        current_path = queue.popleft()
        curr = current_path[-1]
        if curr == end_node_id:
            forward_path = current_path
            break
        for nxt in adj.get(curr, []):
            if nxt not in visited:
                visited.add(nxt)
                queue.append(current_path + [nxt])

    if forward_path:
        path_edges = []
        for i in range(len(forward_path) - 1):
            path_edges.append(f"{forward_path[i]}->{forward_path[i+1]}")
        return {
            'found': True,
            'direction': 'forward',
            'length': len(forward_path) - 1,
            'path': forward_path,
            'edges': path_edges,
            'description': f"Direct dependency chain ({len(forward_path)-1} hops) from {start_node_id} to {end_node_id}"
        }

    # BFS Backward (reverse)
    rev_adj: Dict[str, List[str]] = {n['id']: [] for n in graph.get('nodes', [])}
    for e in graph.get('edges', []):
        if e['target'] in rev_adj:
            rev_adj[e['target']].append(e['source'])

    queue = deque([[start_node_id]])
    visited = {start_node_id}
    reverse_path = None

    while queue:
        current_path = queue.popleft()
        curr = current_path[-1]
        if curr == end_node_id:
            reverse_path = current_path
            break
        for nxt in rev_adj.get(curr, []):
            if nxt not in visited:
                visited.add(nxt)
                queue.append(current_path + [nxt])

    if reverse_path:
        path_edges = []
        for i in range(len(reverse_path) - 1):
            path_edges.append(f"{reverse_path[i+1]}->{reverse_path[i]}")
        return {
            'found': True,
            'direction': 'reverse',
            'length': len(reverse_path) - 1,
            'path': reverse_path,
            'edges': path_edges,
            'description': f"Reverse dependency chain ({len(reverse_path)-1} hops): {end_node_id} depends transitively on {start_node_id}"
        }

    return {
        'found': False,
        'message': f"No dependency relationship found between {start_node_id} and {end_node_id}. They operate in decoupled subgraphs.",
        'path': [],
        'edges': []
    }
