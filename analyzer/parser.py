"""
Multi-language source code analyzer for Project DNA.
Parses JavaScript/TypeScript, Python, Go, Rust, Java/Kotlin, C#, PHP, and config files.
Extracts imports, exports, functions, classes, components, routes, and architectural role.
"""

from typing import Dict, List, Any, Optional
import os
import re
import ast

def classify_role(path: str, content: str) -> str:
    """Determine architectural role of a file based on path conventions and content semantics."""
    p_lower = path.lower()
    c_lower = content.lower()
    
    # Entrypoints
    if p_lower.endswith(('index.ts', 'index.js', 'main.py', 'server.js', 'app.ts', 'app.js', 'main.go', 'main.rs', 'program.cs', 'wsgi.py')):
        return 'entrypoint'
    
    # Configuration
    if p_lower.endswith(('package.json', 'tsconfig.json', 'pyproject.toml', 'cargo.toml', 'dockerfile', 'docker-compose.yml', '.env.example', 'pom.xml', 'build.gradle', 'requirements.txt')):
        return 'config'
    if 'config' in p_lower or 'settings' in p_lower:
        return 'config'
        
    # Middleware
    if 'middleware' in p_lower or 'interceptor' in p_lower:
        return 'middleware'
        
    # Routes and Endpoints
    if 'route' in p_lower or 'endpoint' in p_lower or 'router' in p_lower:
        return 'route'
    if any(p_lower.endswith(x) for x in ('route.ts', 'route.js', 'api.py', 'routes.py')):
        return 'route'
        
    # Controllers
    if 'controller' in p_lower:
        return 'controller'
        
    # Models and Database schemas
    if 'model' in p_lower or 'schema' in p_lower or 'entity' in p_lower or 'migration' in p_lower or 'db/' in p_lower:
        return 'model'
        
    # Services & Business Logic
    if 'service' in p_lower or 'manager' in p_lower or 'provider' in p_lower or 'repository' in p_lower:
        return 'service'
        
    # Components & UI Views
    if 'component' in p_lower or 'view' in p_lower or 'page' in p_lower or p_lower.endswith(('.tsx', '.jsx', '.vue', '.svelte')):
        return 'component'
        
    # Utilities & Helpers
    if 'util' in p_lower or 'helper' in p_lower or 'lib/' in p_lower or 'common' in p_lower or 'tool' in p_lower:
        return 'util'
        
    # Hooks
    if 'hook' in p_lower or p_lower.startswith('use'):
        return 'hook'

    # Fallback checks on content
    if re.search(r'@app\.(get|post|put|delete)|app\.(get|post|put|delete)|router\.(get|post)', content, re.IGNORECASE):
        return 'route'
    if re.search(r'class\s+\w+.*(Service|Manager|Client|Engine)', content):
        return 'service'
    if re.search(r'class\s+\w+.*(Model|Entity|Schema|Table)', content) or 'BaseModel' in content or 'models.Model' in content:
        return 'model'
    if re.search(r'function\s+[A-Z]\w*|const\s+[A-Z]\w*\s*=\s*\(.*=>.*<[A-Za-z]', content):
        return 'component'

    return 'util'

def parse_python(content: str, path: str) -> Dict[str, Any]:
    """Parse Python code using AST and regex fallback."""
    imports = []
    exports = []
    functions = []
    classes = []
    routes = []
    
    try:
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                mod = node.module or ''
                if node.level > 0:
                    mod = '.' * node.level + mod
                imports.append(mod)
                for alias in node.names:
                    exports.append(alias.name)
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                functions.append(node.name)
                # Check for route decorators
                for dec in node.decorator_list:
                    dec_str = ast.unparse(dec) if hasattr(ast, 'unparse') else ''
                    if any(x in dec_str for x in ['get', 'post', 'put', 'delete', 'patch', 'route']):
                        routes.append({'method': 'HTTP', 'handler': node.name, 'decorator': dec_str})
            elif isinstance(node, ast.ClassDef):
                classes.append(node.name)
    except Exception:
        # Fallback to regex
        for line in content.splitlines():
            line_str = line.strip()
            imp_m = re.match(r'^(?:from\s+([.\w]+)\s+import|import\s+([\w, ]+))', line_str)
            if imp_m:
                imports.append(imp_m.group(1) or imp_m.group(2).split(',')[0].strip())
            fn_m = re.match(r'^(?:async\s+)?def\s+([a-zA-Z_]\w*)', line_str)
            if fn_m:
                functions.append(fn_m.group(1))
            cl_m = re.match(r'^class\s+([a-zA-Z_]\w*)', line_str)
            if cl_m:
                classes.append(cl_m.group(1))
                
    return {
        'imports': list(dict.fromkeys(imports)),
        'exports': list(dict.fromkeys(classes + functions[:10])),
        'functions': list(dict.fromkeys(functions)),
        'classes': list(dict.fromkeys(classes)),
        'routes': routes,
        'components': []
    }

def parse_javascript_typescript(content: str, path: str) -> Dict[str, Any]:
    """Parse JavaScript and TypeScript files using regex lexical patterns."""
    imports = []
    exports = []
    functions = []
    classes = []
    routes = []
    components = []
    
    # Imports: import ... from '...'; or require('...')
    import_patterns = [
        r'''(?:import|export)\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]''',
        r'''require\s*\(\s*['"]([^'"]+)['"]\s*\)''',
        r'''import\s*\(\s*['"]([^'"]+)['"]\s*\)'''
    ]
    for pat in import_patterns:
        for match in re.finditer(pat, content):
            imports.append(match.group(1))
            
    # Exports
    export_patterns = [
        r'''export\s+default\s+(?:class|function)?\s*([a-zA-Z0-9_$]+)''',
        r'''export\s+(?:const|let|var|function|class|interface|type)\s+([a-zA-Z0-9_$]+)''',
        r'''export\s*\{\s*([a-zA-Z0-9_$,\s]+)\s*\}''',
        r'''module\.exports\s*=\s*(?:\{[^}]*\}|([a-zA-Z0-9_$]+))'''
    ]
    for pat in export_patterns:
        for match in re.finditer(pat, content):
            val = match.group(1)
            if val:
                for v in val.split(','):
                    name = v.strip().split(' as ')[-1].strip()
                    if name and name not in ('{', '}'):
                        exports.append(name)

    # Functions
    fn_patterns = [
        r'''(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(''',
        r'''(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>''',
        r'''(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?[a-zA-Z0-9_$]+\s*=>''',
        r'''([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*:\s*[A-Za-z0-9_<>[\]|&]+\s*\{'''
    ]
    for pat in fn_patterns:
        for match in re.finditer(pat, content):
            name = match.group(1)
            if name not in ('if', 'for', 'while', 'switch', 'catch'):
                functions.append(name)
                
    # Classes / Interfaces
    cl_patterns = [
        r'''(?:export\s+)?class\s+([a-zA-Z0-9_$]+)''',
        r'''(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)''',
        r'''(?:export\s+)?type\s+([a-zA-Z0-9_$]+)\s*='''
    ]
    for pat in cl_patterns:
        for match in re.finditer(pat, content):
            classes.append(match.group(1))

    # React Components (functions starting with Uppercase returning JSX or .tsx/.jsx)
    if path.endswith(('.tsx', '.jsx')) or 'React' in content or '<' in content:
        for fn in functions:
            if fn[0].isupper():
                components.append(fn)

    # Routes (Express / Next.js)
    route_patterns = [
        r'''(?:app|router)\.(get|post|put|delete|patch|use)\s*\(\s*['"]([^'"]+)['"]''',
        r'''@(?:Get|Post|Put|Delete|Patch)\s*\(\s*['"]([^'"]+)['"]'''
    ]
    for pat in route_patterns:
        for match in re.finditer(pat, content, re.IGNORECASE):
            routes.append({
                'method': match.group(1).upper(),
                'path': match.group(2)
            })

    return {
        'imports': list(dict.fromkeys(imports)),
        'exports': list(dict.fromkeys(exports)),
        'functions': list(dict.fromkeys(functions)),
        'classes': list(dict.fromkeys(classes)),
        'routes': routes,
        'components': list(dict.fromkeys(components))
    }

def parse_go(content: str, path: str) -> Dict[str, Any]:
    """Parse Go source files."""
    imports = []
    functions = []
    classes = []
    routes = []
    
    # Imports
    m_block = re.search(r'import\s*\((.*?)\)', content, re.DOTALL)
    if m_block:
        for line in m_block.group(1).splitlines():
            line = line.strip().strip('"')
            if line:
                imports.append(line.split()[-1].strip('"'))
    else:
        for match in re.finditer(r'import\s+"([^"]+)"', content):
            imports.append(match.group(1))
            
    # Functions
    for match in re.finditer(r'func\s+(?:\([^)]+\)\s+)?([A-Z]\w*|[a-z]\w*)\s*\(', content):
        functions.append(match.group(1))
        
    # Types / Structs
    for match in re.finditer(r'type\s+([A-Za-z0-9_]+)\s+(?:struct|interface)', content):
        classes.append(match.group(1))
        
    # Routes (Gin/Fiber/Echo)
    for match in re.finditer(r'\.(GET|POST|PUT|DELETE)\s*\(\s*"([^"]+)"', content):
        routes.append({'method': match.group(1), 'path': match.group(2)})
        
    return {
        'imports': list(dict.fromkeys(imports)),
        'exports': [f for f in functions if f[0].isupper()] + [c for c in classes if c[0].isupper()],
        'functions': functions,
        'classes': classes,
        'routes': routes,
        'components': []
    }

def parse_rust(content: str, path: str) -> Dict[str, Any]:
    """Parse Rust source files."""
    imports = []
    functions = []
    classes = []
    
    for match in re.finditer(r'use\s+([^;]+);', content):
        imports.append(match.group(1).strip())
    for match in re.finditer(r'(?:pub\s+)?fn\s+([a-zA-Z0-9_]+)\s*\(', content):
        functions.append(match.group(1))
    for match in re.finditer(r'(?:pub\s+)?(?:struct|enum|trait)\s+([a-zA-Z0-9_]+)', content):
        classes.append(match.group(1))
        
    return {
        'imports': list(dict.fromkeys(imports)),
        'exports': [f for f in functions if f.startswith('pub')] + classes,
        'functions': functions,
        'classes': classes,
        'routes': [],
        'components': []
    }

def parse_java_kotlin(content: str, path: str) -> Dict[str, Any]:
    """Parse Java and Kotlin files."""
    imports = []
    functions = []
    classes = []
    routes = []
    
    for match in re.finditer(r'import\s+([^;]+);?', content):
        imports.append(match.group(1).strip())
    for match in re.finditer(r'(?:public|private|protected|internal)?\s*(?:fun|void|[A-Za-z0-9_<>[\]]+)\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*[{;]', content):
        name = match.group(1)
        if name not in ('if', 'while', 'for', 'switch', 'catch', 'class', 'interface'):
            functions.append(name)
    for match in re.finditer(r'(?:class|interface|data class|enum class)\s+([a-zA-Z0-9_]+)', content):
        classes.append(match.group(1))
        
    for match in re.finditer(r'@(?:Get|Post|Put|Delete)Mapping\s*\(\s*(?:value\s*=\s*)?["\']([^"\']+)["\']', content):
        routes.append({'method': 'HTTP', 'path': match.group(1)})
        
    return {
        'imports': list(dict.fromkeys(imports)),
        'exports': classes,
        'functions': functions,
        'classes': classes,
        'routes': routes,
        'components': []
    }

def analyze_file(path: str, content: str) -> Dict[str, Any]:
    """Analyze a single file and return its complete structural metadata."""
    loc = len(content.splitlines())
    role = classify_role(path, content)
    
    # Calculate simple complexity score (branches, loops, functions)
    branch_count = len(re.findall(r'\b(if|else|switch|case|for|while|try|catch|except|\?\?|&&|\|\|)\b', content))
    complexity = max(1, min(100, int((branch_count * 1.5) + (loc / 25))))
    
    ext = os.path.splitext(path)[1].lower()
    
    if ext in ('.py',):
        parsed = parse_python(content, path)
    elif ext in ('.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'):
        parsed = parse_javascript_typescript(content, path)
    elif ext in ('.go',):
        parsed = parse_go(content, path)
    elif ext in ('.rs',):
        parsed = parse_rust(content, path)
    elif ext in ('.java', '.kt', '.kts'):
        parsed = parse_java_kotlin(content, path)
    else:
        # Fallback or config
        parsed = {
            'imports': [],
            'exports': [],
            'functions': [],
            'classes': [],
            'routes': [],
            'components': []
        }

    return {
        'path': path,
        'filename': os.path.basename(path),
        'directory': os.path.dirname(path) or '.',
        'extension': ext,
        'role': role,
        'loc': loc,
        'size_bytes': len(content),
        'complexity': complexity,
        'imports': parsed['imports'],
        'exports': parsed['exports'],
        'functions': parsed['functions'],
        'classes': parsed['classes'],
        'routes': parsed['routes'],
        'components': parsed['components']
    }
