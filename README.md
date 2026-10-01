# Project DNA — Architecture Intelligence & Graph Visualization

A production-quality developer tool that analyzes codebases to generate an interactive architecture graph and code-grounded AI explanations.

## Features
- **Interactive Architecture Graph**: SVG force layout, node dragging, zoom, pan, minimap, direct dependency highlighting, and cluster grouping.
- **Shortest-Path Dependency Tracer**: BFS pathfinding highlighting transitive dependency chains between any two modules.
- **Multi-Language AST & Lexical Parsing**: Supports JavaScript, TypeScript, Python, Go, Rust, Java, Kotlin, C#, and PHP.
- **Framework Detection**: Detects Express.js, Next.js, React, FastAPI, Flask, Django, Spring Boot, Android, etc.
- **Code Inspector**: Detailed symbol exports, LOC, complexity score, centrality rating, and syntax-highlighted source code preview.
- **AI File Intelligence**: Blast radius calculator and failure mode analysis.
- **AI Repository Chat**: Grounded Q&A with preset prompt pills (data flow, auth, important files, code smells, beginner ELI5 analogy).
- **Offline Integrity**: 4 pre-packaged real codebases (Express, FastAPI, React+Redux, Flask) with honest sandbox notices and local folder/zip upload support.

## Getting Started
Run the Python HTTP & API server:
```bash
python3 server.py
```
Open your browser at:
```
http://localhost:8080
```
