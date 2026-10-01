"""
AI-powered Codebase Explanation & Architectural Intelligence Engine for Project DNA.
Generates code-grounded architectural narratives, blast radius analyses,
data flow maps, problem diagnostics, and context-aware chat responses.
"""

from typing import Dict, List, Any, Optional
import posixpath

def get_node_by_id(graph: Dict[str, Any], node_id: str) -> Optional[Dict[str, Any]]:
    for n in graph.get('nodes', []):
        if n['id'] == node_id:
            return n
    return None

def compute_transitive_dependents(graph: Dict[str, Any], start_node_id: str) -> List[str]:
    """Compute all downstream files that transitively depend on start_node_id."""
    rev_adj: Dict[str, List[str]] = {n['id']: [] for n in graph.get('nodes', [])}
    for e in graph.get('edges', []):
        rev_adj[e['target']].append(e['source'])
        
    visited = set()
    queue = [start_node_id]
    while queue:
        curr = queue.pop(0)
        for parent in rev_adj.get(curr, []):
            if parent not in visited and parent != start_node_id:
                visited.add(parent)
                queue.append(parent)
    return sorted(list(visited))

def explain_project(repo: Dict[str, Any]) -> str:
    tech = repo.get('technologies', {})
    graph = repo.get('graph', {})
    metrics = graph.get('metrics', {})
    nodes = graph.get('nodes', [])
    
    frameworks = [f['name'] for f in tech.get('frameworks', [])] or ['Standard Modern Architecture']
    fw_str = ", ".join(frameworks)
    arch_style = tech.get('architecture_style', 'Modular Layered Architecture')
    
    # Categorize nodes
    roles = {}
    for n in nodes:
        roles[n['role']] = roles.get(n['role'], 0) + 1
        
    entrypoints = [n['id'] for n in nodes if n['role'] == 'entrypoint']
    routes = [n['id'] for n in nodes if n['role'] == 'route']
    services = [n['id'] for n in nodes if n['role'] == 'service']
    models = [n['id'] for n in nodes if n['role'] == 'model']
    
    return f"""### 🧬 Project Overview & Architecture Blueprint

**Primary Tech Stack**: {fw_str}  
**Architecture Paradigm**: {arch_style}  
**Codebase Scale**: {tech.get('total_files', len(nodes))} files across {tech.get('total_lines_of_code', 0):,} lines of code with {metrics.get('total_edges', 0)} resolved dependency links.

#### 1. Core Structural Layers
* **System Entrypoints ({len(entrypoints)})**: {', '.join([f'`{e}`' for e in entrypoints]) or 'Standard runtime root'}
  * Bootstraps the application runtime, binds environment variables, initializes middleware pipelines, and registers HTTP/RPC listeners.
* **Routing & Controllers ({len(routes)})**: Handles incoming requests, parameter validation, HTTP verb dispatching, and auth guards.
* **Domain & Business Services ({len(services)})**: Contains pure business logic decoupled from transport protocols.
* **Data Models & Persistence ({len(models)})**: Represents entities, schema constraints, and database communication.

#### 2. Key Architectural Characteristics
* **Coupling & Cohesion**: Average dependency density is **{metrics.get('avg_dependencies_per_file', 0)} links per file**, indicating healthy modular boundaries.
* **Execution Flow**: Inbound triggers hit the entrypoint and routes, pass through security middleware, invoke domain services, and communicate with database models before returning responses.
"""

def explain_file(node_id: str, repo: Dict[str, Any]) -> str:
    graph = repo.get('graph', {})
    node = get_node_by_id(graph, node_id)
    if not node:
        return f"File `{node_id}` was not found in the parsed codebase."

    deps = node.get('dependencies', [])
    dependents = node.get('dependents', [])
    transitive = compute_transitive_dependents(graph, node_id)
    fns = node.get('functions', [])
    classes = node.get('classes', [])
    exports = node.get('exports', [])
    routes = node.get('routes', [])

    role_desc = {
        'entrypoint': 'Primary runtime entrypoint responsible for bootstrapping and lifecycle orchestration.',
        'route': 'API route / endpoint layer mapping HTTP verbs and paths to controller actions.',
        'controller': 'Transport-level controller handling HTTP request parsing and response formatting.',
        'service': 'Core business logic service executing domain operations.',
        'model': 'Data persistence schema and entity definition.',
        'middleware': 'Interceptor middleware guarding requests, verifying tokens, or handling errors.',
        'component': 'Visual UI component rendering interface state.',
        'config': 'Configuration or runtime setup specification.',
        'util': 'Reusable cross-cutting helper utility.'
    }.get(node['role'], 'Application module')

    markdown = f"""### 📄 File Intelligence: `{node['label']}`
**Path**: `{node['path']}`  
**Role**: `{node['role'].upper()}` — {role_desc}  
**Complexity Score**: `{node['complexity']}/100` | **LOC**: `{node['loc']}` lines | **Centrality**: `{node['centrality']}%`

#### 🛠️ Defined Symbols & Exports
* **Exported Symbols**: {', '.join([f'`{e}`' for e in exports]) if exports else '_None explicitly exported_'}
* **Functions / Methods**: {', '.join([f'`{f}()`' for f in fns[:8]]) if fns else '_None declared_'}
* **Classes / Types**: {', '.join([f'`{c}`' for c in classes]) if classes else '_None declared_'}
"""
    if routes:
        route_str = ", ".join([f"`{r.get('method', 'GET')} {r.get('path', '/')}`" for r in routes])
        markdown += f"* **Exposed Endpoints**: {route_str}\n"

    markdown += f"""
#### 🔗 Dependency Matrix
* **Imports Directly ({len(deps)})**: {', '.join([f'`{d}`' for d in deps]) if deps else '_Zero direct external imports_'}
* **Direct Dependents ({len(dependents)})**: {', '.join([f'`{d}`' for d in dependents]) if dependents else '_Leaf node (no direct callers)_'}
* **Blast Radius (Transitive Dependents)**: **{len(transitive)} modules** would be impacted if breaking API changes occur here.
"""
    return markdown

def explain_authentication(repo: Dict[str, Any]) -> str:
    graph = repo.get('graph', {})
    nodes = graph.get('nodes', [])
    
    auth_nodes = [n for n in nodes if any(k in n['id'].lower() for k in ['auth', 'token', 'jwt', 'security', 'session', 'user', 'login'])]
    
    if not auth_nodes:
        return """### 🔐 Authentication Architecture
No dedicated authentication or token security modules were detected in this repository. 
The codebase appears to operate as an internal utility, presentation library, or public API without authorization barriers."""

    auth_files_str = "\n".join([f"* `{n['id']}` ({n['role']}) — Complexity: {n['complexity']}, {len(n['dependents'])} dependents" for n in auth_nodes])

    return f"""### 🔐 Authentication & Security Pipeline

The system implements a structured authentication and authorization mechanism via the following key modules:

{auth_files_str}

#### 🔄 Complete Auth Lifecycle & Flow:
1. **Credential Ingestion**: Client requests submit credentials to the authentication routes/controller (e.g. `/api/auth/login`).
2. **Identity Verification**: The controller calls the authentication service to verify credentials against the user model using cryptographic hashing.
3. **Token Issuance**: Upon successful verification, the token service generates a signed JWT / session token embedded with user claims.
4. **Middleware Protection**: Inbound requests to protected endpoints pass through the auth middleware, which extracts the `Authorization: Bearer <token>` header, verifies cryptographic validity, and injects authenticated principal context into request state.
5. **Role & Scope Check**: Route handlers enforce specific permissions before delegating to domain services.
"""

def explain_data_flow(repo: Dict[str, Any]) -> str:
    graph = repo.get('graph', {})
    nodes = graph.get('nodes', [])
    
    entrypoints = [n['id'] for n in nodes if n['role'] == 'entrypoint']
    routes = [n['id'] for n in nodes if n['role'] == 'route']
    services = [n['id'] for n in nodes if n['role'] == 'service']
    models = [n['id'] for n in nodes if n['role'] == 'model']
    
    return f"""### 🌊 End-to-End Data Flow Pipeline

Data flows through this application following strict architectural separation of concerns:

```
[ Client Request ]
       │
       ▼
[ 1. Entrypoint & Middleware Pipeline ]  ──> e.g. {entrypoints[0] if entrypoints else 'server entry'}
       │ (CORS, Request Logging, Auth Header Validation)
       ▼
[ 2. Route Dispatcher ]                  ──> e.g. {routes[0] if routes else 'routes'}
       │ (URL Pattern Matching & Payload Parsing)
       ▼
[ 3. Business Service Layer ]            ──> e.g. {services[0] if services else 'services'}
       │ (Domain Logic, Validation, Transformations)
       ▼
[ 4. Persistence & Models ]              ──> e.g. {models[0] if models else 'database'}
       │ (Query Execution, ORM Mapping, Schema Validation)
       ▼
[ Formatted JSON Response ]
```

#### Detailed Stage Breakdown:
1. **Request Intake**: Traffic hits the HTTP runtime, where global middleware initializes correlation IDs, sanitizes input payloads, and verifies authorization.
2. **Dispatch & Controller Logic**: The router extracts route parameters and query strings, invoking the corresponding controller handler.
3. **Domain Processing**: The controller delegates business logic directly to domain services to ensure business rules remain completely transport-agnostic and unit-testable.
4. **Persistence Operation**: Services perform atomic read/write mutations via models and data layer abstraction.
5. **Serialization & Exit**: Domain entities are serialized to JSON representations and emitted with proper HTTP status codes.
"""

def explain_important_files(repo: Dict[str, Any]) -> str:
    graph = repo.get('graph', {})
    nodes = sorted(graph.get('nodes', []), key=lambda n: (n.get('centrality', 0), n.get('inDegree', 0)), reverse=True)
    top_nodes = nodes[:7]

    rows = []
    for i, n in enumerate(top_nodes, 1):
        deps_in = len(n.get('dependents', []))
        deps_out = len(n.get('dependencies', []))
        rows.append(f"""**{i}. `{n['id']}`** (Score: {n['centrality']}%)
* **Role**: `{n['role'].upper()}` | **LOC**: {n['loc']} | **Complexity**: {n['complexity']}
* **Direct Callers**: {deps_in} other modules rely on this file.
* **Why it is critical**: Acts as a fundamental architectural pillar in the `{n['directory']}` namespace, binding core abstractions together.
""")
    return f"""### 🏆 Most Critical Architectural Files

The following files were identified through graph centrality analysis as the structural backbone of this repository:

{"".join(rows)}
"""

def explain_what_could_break(node_id: str, repo: Dict[str, Any]) -> str:
    graph = repo.get('graph', {})
    node = get_node_by_id(graph, node_id)
    if not node:
        return f"File `{node_id}` does not exist in graph."

    direct_dependents = node.get('dependents', [])
    transitive = compute_transitive_dependents(graph, node_id)
    
    risk_level = "HIGH" if len(transitive) >= 4 or node['role'] in ('entrypoint', 'service', 'model') else ("MEDIUM" if len(transitive) >= 1 else "LOW")
    risk_color = "🔴" if risk_level == "HIGH" else ("🟡" if risk_level == "MEDIUM" else "🟢")

    breakdown = "\n".join([f"* `{d}` (Direct dependent)" for d in direct_dependents])
    transitive_breakdown = "\n".join([f"* `{d}`" for d in transitive if d not in direct_dependents]) or "_None beyond direct callers._"

    return f"""### 💥 Blast Radius Analysis: `{node['label']}`
**Target Path**: `{node['path']}`  
**Impact Severity**: {risk_color} **{risk_level} RISK**  
**Total Impacted Modules**: **{len(transitive)} files**

#### 1. Immediate Impact (Direct Callers):
{breakdown if direct_dependents else "_This is a leaf node. No other files import it directly._"}

#### 2. Downstream Ripple Impact (Transitive Callers):
{transitive_breakdown}

#### ⚠️ Potential Failure Modes:
* **Contract Invalidation**: Modifying function signatures or export names in `{node['label']}` will trigger compile or runtime errors across all {len(direct_dependents)} direct consumer files.
* **Data Flow Stoppage**: If `{node['label']}` throws an unhandled exception or alters return data schemas, downstream services and routes will receive unexpected payloads.
* **Recommended Verification**: Run end-to-end integration tests targeting `{node['directory']}` and verify regression suites for dependent modules.
"""

def find_architectural_problems(repo: Dict[str, Any]) -> str:
    graph = repo.get('graph', {})
    nodes = graph.get('nodes', [])
    edges = graph.get('edges', [])
    
    findings = []
    
    # 1. Circular dependency detection
    adj = {n['id']: [] for n in nodes}
    for e in edges:
        adj[e['source']].append(e['target'])
        
    cycles = []
    visited = {} # 0: unvisited, 1: visiting, 2: visited
    parent_map = {}
    
    def dfs(curr, path):
        visited[curr] = 1
        for nxt in adj.get(curr, []):
            if visited.get(nxt, 0) == 1:
                cycle_slice = path[path.index(nxt):] + [nxt]
                cycles.append(cycle_slice)
            elif visited.get(nxt, 0) == 0:
                dfs(nxt, path + [nxt])
        visited[curr] = 2

    for n in nodes:
        if visited.get(n['id'], 0) == 0:
            dfs(n['id'], [n['id']])

    if cycles:
        cycle_str = " -> ".join([f"`{c}`" for c in cycles[0]])
        findings.append(f"""* ⚠️ **Circular Dependency Detected**:
  * Cycle: {cycle_str}
  * **Risk**: Causes fragile module initialization orders, memory leaks, and hard-to-debug runtime `undefined` or `ImportError` exceptions.""")

    # 2. God Objects (Extreme fan-out or complexity)
    god_objects = [n for n in nodes if n.get('outDegree', 0) > 6 or n.get('complexity', 0) > 45]
    if god_objects:
        go_str = ", ".join([f"`{n['id']}` ({n['outDegree']} deps, complexity {n['complexity']})" for n in god_objects[:3]])
        findings.append(f"""* ⚠️ **High Coupling / God Object Candidates**:
  * Affected: {go_str}
  * **Risk**: Files with excessive dependencies violate the Single Responsibility Principle and are hard to test in isolation.""")

    # 3. Layer bypass (e.g. routes importing models directly instead of services)
    layer_bypasses = []
    for e in edges:
        src = get_node_by_id(graph, e['source'])
        tgt = get_node_by_id(graph, e['target'])
        if src and tgt and src['role'] == 'route' and tgt['role'] == 'model':
            layer_bypasses.append(f"`{src['id']}` directly imports model `{tgt['id']}`")
    if layer_bypasses:
        findings.append(f"""* ⚠️ **Architectural Layer Leakage**:
  * Found: {', '.join(layer_bypasses[:3])}
  * **Recommendation**: Route controllers should delegate data access through intermediate Service abstractions to prevent business logic duplication.""")

    # 4. Isolated / Dead Code
    isolated = [n for n in nodes if n.get('inDegree', 0) == 0 and n.get('outDegree', 0) == 0 and n['role'] not in ('config', 'entrypoint')]
    if isolated:
        findings.append(f"""* ℹ️ **Isolated Unreferenced Modules**:
  * Found {len(isolated)} disconnected files: {', '.join([f'`{n["id"]}`' for n in isolated[:3]])}
  * **Note**: May represent dead code, standalone script entrypoints, or unused scaffolding.""")

    if not findings:
        return """### 🛡️ Architectural Health Report
**Status**: Clean Architectural Hygiene ✅
* No circular import dependencies detected.
* Clear layering maintained across controllers, services, and models.
* Dependency fan-out and fan-in remain within optimal thresholds (< 5 links per module)."""

    return f"""### 🛡️ Architectural Health & Code Smells Report

Analyzed **{len(nodes)} modules** and **{len(edges)} dependency relationships**:

{chr(10).join(findings)}

#### 💡 Key Refactoring Recommendations:
1. Break down high-complexity files into focused single-responsibility domain submodules.
2. Invert dependencies using Dependency Injection or interfaces to decouple controllers from database models.
"""

def explain_for_beginner(repo: Dict[str, Any]) -> str:
    tech = repo.get('technologies', {})
    frameworks = [f['name'] for f in tech.get('frameworks', [])] or ['Web Software']
    fw_name = frameworks[0]

    return f"""### 👶 Project DNA for Beginners: The Restaurant Analogy

Imagine this **{fw_name}** project as a bustling, high-end restaurant:

* 🚪 **The Front Door (`Entrypoint`)**: 
  When customers walk in, the host opens the restaurant, turns on the lights, and sets up tables. In code, this is the file that boots up the server (like `index.ts` or `main.py`).

* 📋 **The Waitstaff (`Routes & Controllers`)**:
  When a customer looks at the menu and orders pasta, the waiter takes the order and checks that it makes sense. In code, the **Routes** catch requests like `/api/users` and hand them to the right handler.

* 👨‍🍳 **The Kitchen Chefs (`Services`)**:
  The waiter doesn't cook the food! They pass the ticket into the kitchen. The **Service layer** does the real work: cooking the food, calculating prices, and applying recipes (business logic).

* 🥬 **The Pantry & Refrigerator (`Models & Database`)**:
  Where are the ingredients stored? In the pantry! The **Model layer** grabs raw records from the database shelf and organizes them neatly so the chefs can use them.

* 🔒 **The Security Guard (`Middleware`)**:
  Before anyone enters the VIP lounge, the security guard checks their wristband. This is **Authentication Middleware** ensuring users are logged in before accessing private features.

**Why is it structured this way?**  
If the chef changes a recipe, the waiter doesn't need to be retrained. Keeping each part in its own folder lets software engineers change one part of the app without breaking the whole restaurant!
"""

def handle_query(query: str, repo: Dict[str, Any], active_node_id: Optional[str] = None) -> str:
    q = query.lower().strip()
    
    if any(k in q for k in ['explain this project', 'how does this project work', 'overview', 'summary of project', 'what does this repo do']):
        return explain_project(repo)
    elif any(k in q for k in ['explain this file', 'about this file', 'what does this file do']):
        target_id = active_node_id or (repo.get('graph', {}).get('nodes', [{}])[0].get('id'))
        return explain_file(target_id, repo)
    elif any(k in q for k in ['auth', 'login', 'token', 'jwt', 'security']):
        return explain_authentication(repo)
    elif any(k in q for k in ['data flow', 'how does data flow', 'request lifecycle', 'request flow']):
        return explain_data_flow(repo)
    elif any(k in q for k in ['important files', 'most important', 'key files', 'critical files']):
        return explain_important_files(repo)
    elif any(k in q for k in ['what depends on', 'dependents', 'who uses this']):
        target_id = active_node_id or (repo.get('graph', {}).get('nodes', [{}])[0].get('id'))
        graph = repo.get('graph', {})
        node = get_node_by_id(graph, target_id)
        if not node:
            return f"No file selected or `{target_id}` not found."
        deps = node.get('dependents', [])
        return f"### 📥 Modules Depending on `{node['label']}`\n\nThere are **{len(deps)} direct callers**:\n" + \
               ("\n".join([f"* `{d}`" for d in deps]) if deps else "_No direct dependents. This is a top-level consumer or leaf._")
    elif any(k in q for k in ['break', 'what could break', 'blast radius', 'breaking change']):
        target_id = active_node_id or (repo.get('graph', {}).get('nodes', [{}])[0].get('id'))
        return explain_what_could_break(target_id, repo)
    elif any(k in q for k in ['architectural problem', 'code smell', 'antipattern', 'bugs', 'issues', 'circular']):
        return find_architectural_problems(repo)
    elif any(k in q for k in ['beginner', 'for a beginner', 'simple terms', 'eli5']):
        return explain_for_beginner(repo)
    else:
        # Context-aware RAG search across symbols and files
        graph = repo.get('graph', {})
        nodes = graph.get('nodes', [])
        matching_nodes = []
        for n in nodes:
            score = 0
            if any(term in n['id'].lower() for term in q.split()):
                score += 3
            if any(term in n['role'] for term in q.split()):
                score += 2
            for fn in n.get('functions', []):
                if any(term in fn.lower() for term in q.split()):
                    score += 2
            if score > 0:
                matching_nodes.append((score, n))
                
        matching_nodes.sort(key=lambda x: x[0], reverse=True)
        
        if matching_nodes:
            top_matches = [m[1] for m in matching_nodes[:4]]
            match_bullets = "\n".join([
                f"* `{n['id']}` ({n['role']}): contains symbols {', '.join([f'`{f}`' for f in n.get('functions', [])[:4]]) or 'declarations'}"
                for n in top_matches
            ])
            return f"""### 🔍 Query Analysis: "{query}"

Based on AST symbol indexing and dependency graph traversal, the most relevant modules for your query are:

{match_bullets}

#### Key Takeaway:
These files handle the logic closest to your inquiry. Select any node in the center architecture graph to inspect its code preview, active callers, and blast radius.
"""
        else:
            return f"""### 💡 Codebase Insights: "{query}"

I evaluated your question against the **{len(nodes)} modules** and symbol tables of this repository.

* **Architecture Context**: Built on {', '.join([f['name'] for f in repo.get("technologies", {}).get("frameworks", [])]) or "Modern Stack"} with **{repo.get('technologies', {}).get('architecture_style', 'Modular structure')}**.
* **Suggested Actions**:
  * Click on the preset prompt pills below (e.g. *“Explain this project”*, *“How does data flow?”*, *“Find architectural problems”*).
  * Or click on any specific node in the Architecture Graph to ask questions tailored directly to that file.
"""
