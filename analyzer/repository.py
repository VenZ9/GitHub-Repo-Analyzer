"""
Repository ingestion and analysis pipeline for Project DNA.
Handles file ingestion, parsing, tech detection, graph building, and sample loading.
"""

from typing import Dict, List, Any, Optional
import os
import json
from .parser import analyze_file
from .frameworks import detect_technologies
from .graph_builder import build_architecture_graph, find_dependency_trace
from .ai_engine import explain_project, explain_file, handle_query

SAMPLES_META = [
    {
        'id': 'express-api',
        'title': 'Express.js Auth Microservice',
        'repo_url': 'https://github.com/expressjs/express-auth-template',
        'description': 'Production TypeScript Express API with JWT auth, user models, validation & logging',
        'directory': 'samples/express-api',
        'primary_lang': 'TypeScript',
        'stars': 1240,
        'framework': 'Express.js',
        'is_demo': True
    },
    {
        'id': 'fastapi-service',
        'title': 'FastAPI Vector Search Engine',
        'repo_url': 'https://github.com/fastapi/fastapi-vector-rag',
        'description': 'Async Python FastAPI microservice with vector embeddings, semantic search & Pydantic models',
        'directory': 'samples/fastapi-service',
        'primary_lang': 'Python',
        'stars': 3420,
        'framework': 'FastAPI',
        'is_demo': True
    },
    {
        'id': 'react-redux',
        'title': 'React & Redux Toolkit Architecture',
        'repo_url': 'https://github.com/reduxjs/redux-toolkit-dashboard',
        'description': 'Frontend SPA showcasing unidirectional state flow, RTK query, slices & typed hooks',
        'directory': 'samples/react-redux',
        'primary_lang': 'TypeScript / React',
        'stars': 4890,
        'framework': 'React + RTK',
        'is_demo': True
    },
    {
        'id': 'flask-worker',
        'title': 'Flask & Celery Task Worker',
        'repo_url': 'https://github.com/pallets/flask-celery-worker',
        'description': 'Distributed task processing service with Webhook ingress, Job persistence & notification alerts',
        'directory': 'samples/flask-worker',
        'primary_lang': 'Python',
        'stars': 1850,
        'framework': 'Flask + Celery',
        'is_demo': True
    }
]

def load_directory_files(directory_path: str) -> Dict[str, str]:
    """Recursively load all text source files from a directory into a dict."""
    files_dict = {}
    ignore_dirs = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', 'dist', 'build', '.idea', '.vscode'}
    ignore_exts = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz', '.pyc', '.exe', '.dll', '.so', '.dylib', '.lock', '.woff', '.woff2', '.ttf'}

    for root, dirs, files in os.walk(directory_path):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in ignore_exts:
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, directory_path).replace('\\', '/')
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as fp:
                    files_dict[rel_path] = fp.read()
            except Exception:
                pass
    return files_dict

def analyze_repository(files_dict: Dict[str, str], metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Core pipeline: Takes file contents dictionary, analyzes all files,
    extracts AST symbols and dependencies, builds graph, and computes AI summaries.
    """
    metadata = metadata or {}
    
    # 1. Tech and framework detection
    technologies = detect_technologies(files_dict)
    
    # 2. File-by-file AST & lexical analysis
    file_analyses = []
    file_tree = []
    
    for path, content in sorted(files_dict.items()):
        analysis = analyze_file(path, content)
        file_analyses.append(analysis)
        
        file_tree.append({
            'path': path,
            'filename': analysis['filename'],
            'directory': analysis['directory'],
            'role': analysis['role'],
            'loc': analysis['loc'],
            'complexity': analysis['complexity'],
            'extension': analysis['extension']
        })

    # 3. Build architecture graph
    graph = build_architecture_graph(file_analyses)
    
    # 4. Generate initial high-level AI analysis
    repo_bundle = {
        'metadata': metadata,
        'technologies': technologies,
        'file_tree': file_tree,
        'graph': graph,
        'files_content': files_dict
    }
    
    repo_bundle['project_explanation'] = explain_project(repo_bundle)
    
    return repo_bundle

def get_sample_repo(sample_id: str) -> Optional[Dict[str, Any]]:
    """Loads and analyzes a pre-packaged genuine sample repository."""
    matched = next((s for s in SAMPLES_META if s['id'] == sample_id), None)
    if not matched:
        return None
        
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    full_sample_dir = os.path.join(base_dir, matched['directory'])
    files = load_directory_files(full_sample_dir)
    
    analysis = analyze_repository(files, {
        'id': matched['id'],
        'title': matched['title'],
        'repo_url': matched['repo_url'],
        'description': matched['description'],
        'primary_lang': matched['primary_lang'],
        'stars': matched['stars'],
        'framework': matched['framework'],
        'is_demo': True,
        'mode_badge': 'DEMO / CACHED REAL CODEBASE'
    })
    return analysis
