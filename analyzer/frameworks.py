"""
Framework and tech stack detection for Project DNA.
Detects frameworks, libraries, runtime environments, and architecture patterns.
"""

from typing import Dict, List, Set, Any
import json
import re

def detect_technologies(files_dict: Dict[str, str]) -> Dict[str, Any]:
    """
    files_dict: mapping from relative file path to string file content.
    Returns detected frameworks, languages, runtime, architecture paradigm, and tags.
    """
    detected_frameworks = []
    detected_libraries = []
    languages = {}
    total_loc = 0
    total_bytes = 0
    
    file_ext_map = {
        '.js': 'JavaScript',
        '.jsx': 'JavaScript (React)',
        '.ts': 'TypeScript',
        '.tsx': 'TypeScript (React)',
        '.py': 'Python',
        '.go': 'Go',
        '.rs': 'Rust',
        '.java': 'Java',
        '.kt': 'Kotlin',
        '.kts': 'Kotlin',
        '.cs': 'C#',
        '.php': 'PHP',
        '.json': 'JSON',
        '.yaml': 'YAML',
        '.yml': 'YAML',
        '.toml': 'TOML',
        '.md': 'Markdown',
        '.html': 'HTML',
        '.css': 'CSS',
        '.scss': 'SCSS',
        '.sql': 'SQL',
        '.sh': 'Shell',
    }
    
    for path, content in files_dict.items():
        size = len(content)
        total_bytes += size
        loc = len(content.splitlines())
        total_loc += loc
        
        ext = None
        for k in file_ext_map:
            if path.endswith(k):
                ext = file_ext_map[k]
                break
        if ext:
            languages[ext] = languages.get(ext, 0) + loc

    # Parse package.json if present
    pkg_content = files_dict.get('package.json')
    deps = set()
    if pkg_content:
        try:
            pkg = json.loads(pkg_content)
            deps.update(pkg.get('dependencies', {}).keys())
            deps.update(pkg.get('devDependencies', {}).keys())
        except Exception:
            pass

    # Check for Python requirements / pyproject
    req_content = files_dict.get('requirements.txt', '') + files_dict.get('pyproject.toml', '')
    
    # Framework detection rules
    if 'next' in deps or any('pages/' in p or 'app/' in p for p in files_dict if 'next' in p or p.endswith(('page.tsx', 'page.jsx', 'route.ts', 'layout.tsx'))):
        detected_frameworks.append({'name': 'Next.js', 'category': 'Fullstack / React Framework', 'icon': 'nextjs'})
    elif 'react' in deps or any('react' in content.lower() for path, content in files_dict.items() if path.endswith(('.jsx', '.tsx'))):
        detected_frameworks.append({'name': 'React', 'category': 'UI Library', 'icon': 'react'})

    if 'express' in deps or any('require("express")' in c or 'from "express"' in c or "from 'express'" in c for c in files_dict.values()):
        detected_frameworks.append({'name': 'Express.js', 'category': 'Node.js Web Framework', 'icon': 'node'})
        
    if '@nestjs/core' in deps or any('@Injectable' in c and '@Controller' in c for c in files_dict.values()):
        detected_frameworks.append({'name': 'NestJS', 'category': 'Enterprise Node Framework', 'icon': 'nestjs'})

    if '@reduxjs/toolkit' in deps or 'redux' in deps:
        detected_libraries.append('Redux Toolkit')
    if 'zustand' in deps:
        detected_libraries.append('Zustand')
    if 'tailwindcss' in deps or 'tailwind.config.js' in files_dict:
        detected_libraries.append('Tailwind CSS')

    # Python frameworks
    if 'fastapi' in req_content.lower() or any('from fastapi' in c or 'import fastapi' in c for c in files_dict.values()):
        detected_frameworks.append({'name': 'FastAPI', 'category': 'Modern Python Async Web API', 'icon': 'fastapi'})
    if 'flask' in req_content.lower() or any('from flask' in c or 'import flask' in c for c in files_dict.values()):
        detected_frameworks.append({'name': 'Flask', 'category': 'Python WSGI Microframework', 'icon': 'flask'})
    if 'django' in req_content.lower() or any('django' in p for p in files_dict) or 'manage.py' in files_dict:
        detected_frameworks.append({'name': 'Django', 'category': 'Python Batteries-Included Web Framework', 'icon': 'django'})
        
    # Java / Kotlin Spring Boot
    if any('spring-boot' in c for c in files_dict.values()) or any('@SpringBootApplication' in c for c in files_dict.values()):
        detected_frameworks.append({'name': 'Spring Boot', 'category': 'Enterprise Java/Kotlin Framework', 'icon': 'spring'})

    # Android / Kotlin
    if any('com.android.application' in c for c in files_dict.values()) or 'AndroidManifest.xml' in files_dict:
        detected_frameworks.append({'name': 'Android (Kotlin/Java)', 'category': 'Mobile OS Framework', 'icon': 'android'})

    # Go Gin / Fiber
    if any('github.com/gin-gonic/gin' in c for c in files_dict.values()):
        detected_frameworks.append({'name': 'Gin', 'category': 'Go Web Framework', 'icon': 'go'})
    if any('github.com/gofiber/fiber' in c for c in files_dict.values()):
        detected_frameworks.append({'name': 'Fiber', 'category': 'Go Web Framework', 'icon': 'go'})

    # Rust Actix / Axum
    if any('actix_web' in c for c in files_dict.values()):
        detected_frameworks.append({'name': 'Actix Web', 'category': 'Rust Async Web Framework', 'icon': 'rust'})
    if any('axum' in c for c in files_dict.values()):
        detected_frameworks.append({'name': 'Axum', 'category': 'Rust Web Framework', 'icon': 'rust'})

    # Architecture style heuristic
    paths = list(files_dict.keys())
    architecture_style = "Modular"
    if any('routes' in p or 'controllers' in p or 'services' in p or 'models' in p for p in paths):
        architecture_style = "Layered Architecture (Routes -> Controllers -> Services -> Models)"
    elif any('components' in p or 'views' in p for p in paths) and any('store' in p or 'slices' in p for p in paths):
        architecture_style = "Unidirectional Data Flow / Component-State Architecture"
    elif any('api/' in p for p in paths) and any('core/' in p or 'db/' in p for p in paths):
        architecture_style = "Clean Microservice API Architecture"

    # Normalize language percentages
    lang_percentages = {}
    if total_loc > 0:
        for lang, count in sorted(languages.items(), key=lambda x: x[1], reverse=True):
            pct = round((count / total_loc) * 100, 1)
            if pct >= 1.0:
                lang_percentages[lang] = pct

    return {
        'frameworks': detected_frameworks,
        'libraries': detected_libraries,
        'languages': lang_percentages,
        'total_files': len(files_dict),
        'total_lines_of_code': total_loc,
        'total_size_bytes': total_bytes,
        'architecture_style': architecture_style
    }
