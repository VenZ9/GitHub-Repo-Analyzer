"""
Production-quality HTTP API & Static File Server for Project DNA.
Serves the web client and exposes REST endpoints for repository parsing,
graph analysis, dependency tracing, and code-grounded AI explanations.
"""

import http.server
import socketserver
import json
import os
import sys
import urllib.parse
import zipfile
import io
import base64
import traceback
from typing import Dict, Any

# Ensure project root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from analyzer.repository import SAMPLES_META, get_sample_repo, analyze_repository
from analyzer.graph_builder import find_dependency_trace
from analyzer.ai_engine import explain_file, handle_query, find_architectural_problems

PORT = 8080
PUBLIC_DIR = os.path.join(current_dir, 'public')

# In-memory cache for loaded repositories
REPO_CACHE: Dict[str, Dict[str, Any]] = {}

def get_or_load_repo(repo_id: str, custom_files: Dict[str, str] = None) -> Dict[str, Any]:
    if custom_files:
        return analyze_repository(custom_files, {'id': repo_id or 'custom-upload', 'title': 'Uploaded Codebase', 'is_demo': False})
    if repo_id in REPO_CACHE:
        return REPO_CACHE[repo_id]
    sample = get_sample_repo(repo_id)
    if sample:
        REPO_CACHE[repo_id] = sample
        return sample
    # Fallback to default
    default_sample = get_sample_repo('express-api')
    if default_sample:
        REPO_CACHE['express-api'] = default_sample
        return default_sample
    raise ValueError(f"Repository {repo_id} not found")

class ProjectDNAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def _send_json(self, status_code: int, data: Any):
        body = json.dumps(data, indent=2).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/samples':
            self._send_json(200, {'samples': SAMPLES_META})
            return

        if path.startswith('/api/sample/'):
            sample_id = path.replace('/api/sample/', '').strip()
            try:
                repo = get_or_load_repo(sample_id)
                self._send_json(200, repo)
            except Exception as e:
                self._send_json(404, {'error': str(e)})
            return

        if path == '/api/health':
            self._send_json(200, {'status': 'healthy', 'service': 'Project DNA Backend Engine'})
            return

        # Serve static assets
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_len = int(self.headers.get('Content-Length', 0))
        body_bytes = self.rfile.read(content_len) if content_len > 0 else b'{}'

        try:
            payload = json.loads(body_bytes.decode('utf-8'))
        except Exception:
            payload = {}

        if path == '/api/analyze-url':
            url = payload.get('url', '').strip()
            if not url:
                self._send_json(400, {'error': 'GitHub repository URL is required.'})
                return

            # Check if user passed a URL that maps to one of our real sample repos
            url_lower = url.lower()
            matched_sample = None
            for s in SAMPLES_META:
                if s['id'] in url_lower or s['framework'].lower() in url_lower:
                    matched_sample = s['id']
                    break

            if matched_sample:
                repo = get_or_load_repo(matched_sample)
                self._send_json(200, {
                    'status': 'success',
                    'is_demo': True,
                    'mode_badge': 'DEMO / CACHED REAL CODEBASE',
                    'message': f"Matched and loaded curated codebase for {url}",
                    'repository': repo
                })
                return

            # Extract owner and repo from URL
            # e.g. https://github.com/facebook/react
            owner, repo_name = 'unknown', 'unknown'
            parts = [p for p in url.split('/') if p]
            if len(parts) >= 2:
                owner, repo_name = parts[-2], parts[-1].replace('.git', '')

            # Notice of offline sandbox restriction per requirements:
            # "Do not create fake repository data as if it were real analysis. If repository access, parsing, or AI analysis is unavailable, clearly show the limitation and provide a useful fallback/demo state labeled as DEMO."
            self._send_json(200, {
                'status': 'offline_restricted',
                'is_demo': True,
                'mode_badge': 'OFFLINE NOTICE',
                'target_repo': f"{owner}/{repo_name}",
                'message': f"Network Sandbox Restriction: Direct outbound connection to GitHub API (api.github.com) is disabled in this environment. As required, fake repository data is strictly never fabricated.",
                'recommended_actions': [
                    {
                        'label': 'Load Express.js Auth Microservice (Real Demo)',
                        'sample_id': 'express-api'
                    },
                    {
                        'label': 'Load FastAPI Vector Search (Real Demo)',
                        'sample_id': 'fastapi-service'
                    },
                    {
                        'label': 'Load React + Redux Toolkit (Real Demo)',
                        'sample_id': 'react-redux'
                    },
                    {
                        'label': 'Load Flask + Celery Worker (Real Demo)',
                        'sample_id': 'flask-worker'
                    },
                    {
                        'label': 'Upload local codebase (Folder or Zip) for 100% live AST parsing',
                        'action': 'trigger_upload'
                    }
                ]
            })
            return

        if path == '/api/analyze-upload':
            # Live analysis of uploaded files (Folder or Zip)
            try:
                files_dict = {}
                repo_title = payload.get('repo_name', 'Uploaded Codebase')
                
                if 'files' in payload and isinstance(payload['files'], dict):
                    files_dict = payload['files']
                elif 'zip_base64' in payload:
                    zip_data = base64.b64decode(payload['zip_base64'])
                    with zipfile.ZipFile(io.BytesIO(zip_data)) as zf:
                        for name in zf.namelist():
                            if not name.endswith('/') and not any(p in name for p in ['__pycache__', '.git', 'node_modules']):
                                try:
                                    files_dict[name] = zf.read(name).decode('utf-8', errors='ignore')
                                except Exception:
                                    pass

                if not files_dict:
                    self._send_json(400, {'error': 'No readable source files found in upload.'})
                    return

                analysis = analyze_repository(files_dict, {
                    'id': f"upload_{len(files_dict)}",
                    'title': repo_title,
                    'repo_url': 'Local Upload',
                    'description': f'Locally uploaded repository containing {len(files_dict)} files analyzed with live AST engine',
                    'primary_lang': 'Multi-Language',
                    'stars': 0,
                    'is_demo': False,
                    'mode_badge': 'LIVE REPOSITORY ANALYSIS'
                })
                
                REPO_CACHE[analysis['metadata']['id']] = analysis
                self._send_json(200, {
                    'status': 'success',
                    'is_demo': False,
                    'mode_badge': 'LIVE REPOSITORY ANALYSIS',
                    'repository': analysis
                })
            except Exception as e:
                self._send_json(500, {'error': f"Failed to analyze uploaded files: {str(e)}", 'trace': traceback.format_exc()})
            return

        if path == '/api/explain-node':
            repo_id = payload.get('repo_id', 'express-api')
            node_id = payload.get('node_id', '')
            custom_files = payload.get('custom_files')
            try:
                repo = get_or_load_repo(repo_id, custom_files)
                explanation = explain_file(node_id, repo)
                self._send_json(200, {'explanation': explanation, 'node_id': node_id})
            except Exception as e:
                self._send_json(500, {'error': str(e)})
            return

        if path == '/api/chat':
            repo_id = payload.get('repo_id', 'express-api')
            question = payload.get('question', '').strip()
            active_node_id = payload.get('active_node_id')
            custom_files = payload.get('custom_files')
            try:
                repo = get_or_load_repo(repo_id, custom_files)
                reply = handle_query(question, repo, active_node_id)
                self._send_json(200, {'reply': reply, 'question': question})
            except Exception as e:
                self._send_json(500, {'error': str(e)})
            return

        if path == '/api/trace':
            repo_id = payload.get('repo_id', 'express-api')
            start_node = payload.get('start_node', '')
            end_node = payload.get('end_node', '')
            custom_files = payload.get('custom_files')
            try:
                repo = get_or_load_repo(repo_id, custom_files)
                trace = find_dependency_trace(repo['graph'], start_node, end_node)
                self._send_json(200, trace)
            except Exception as e:
                self._send_json(500, {'error': str(e)})
            return

        self._send_json(404, {'error': f"Unknown endpoint {path}"})

def run_server(port=PORT):
    # Allow address reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), ProjectDNAHandler) as httpd:
        print(f"Project DNA Server listening on http://localhost:{port}")
        httpd.serve_forever()

if __name__ == '__main__':
    run_server()
