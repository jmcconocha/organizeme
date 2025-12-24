"""
Folder scanner for discovering git repositories on local filesystem
"""
import os
import subprocess
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime


def is_git_repo(path: str) -> bool:
    """Check if a directory is a git repository"""
    git_dir = os.path.join(path, '.git')
    return os.path.isdir(git_dir)


def get_git_info(repo_path: str) -> Dict:
    """Extract git information from a repository"""
    info = {
        'branch': None,
        'remote_url': None,
        'last_commit': None
    }
    
    try:
        # Get current branch
        result = subprocess.run(
            ['git', '-C', repo_path, 'rev-parse', '--abbrev-ref', 'HEAD'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            info['branch'] = result.stdout.strip()
        
        # Get remote URL
        result = subprocess.run(
            ['git', '-C', repo_path, 'config', '--get', 'remote.origin.url'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            info['remote_url'] = result.stdout.strip()
        
        # Get last commit date
        result = subprocess.run(
            ['git', '-C', repo_path, 'log', '-1', '--format=%ci'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            info['last_commit'] = result.stdout.strip()
            
    except (subprocess.TimeoutExpired, Exception) as e:
        pass  # Git commands failed, return partial info
    
    return info


def detect_tech_stack(repo_path: str) -> Dict:
    """Detect technologies used in the repository"""
    tech_stack = {
        'languages': [],
        'frameworks': [],
        'tools': []
    }
    
    # Language detection based on common files
    if os.path.exists(os.path.join(repo_path, 'package.json')):
        tech_stack['languages'].append('JavaScript')
        try:
            with open(os.path.join(repo_path, 'package.json'), 'r') as f:
                pkg = json.load(f)
                deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
                
                if 'react' in deps:
                    tech_stack['frameworks'].append('React')
                if 'vue' in deps:
                    tech_stack['frameworks'].append('Vue')
                if 'angular' in deps or '@angular/core' in deps:
                    tech_stack['frameworks'].append('Angular')
                if 'next' in deps:
                    tech_stack['frameworks'].append('Next.js')
                if 'express' in deps:
                    tech_stack['frameworks'].append('Express')
                if 'typescript' in deps:
                    tech_stack['languages'].append('TypeScript')
        except:
            pass
    
    if os.path.exists(os.path.join(repo_path, 'requirements.txt')) or \
       os.path.exists(os.path.join(repo_path, 'setup.py')) or \
       os.path.exists(os.path.join(repo_path, 'pyproject.toml')):
        tech_stack['languages'].append('Python')
        
        # Check for Python frameworks
        try:
            req_files = ['requirements.txt', 'setup.py', 'pyproject.toml']
            content = ''
            for req_file in req_files:
                req_path = os.path.join(repo_path, req_file)
                if os.path.exists(req_path):
                    with open(req_path, 'r') as f:
                        content += f.read().lower()
            
            if 'django' in content:
                tech_stack['frameworks'].append('Django')
            if 'flask' in content:
                tech_stack['frameworks'].append('Flask')
            if 'fastapi' in content:
                tech_stack['frameworks'].append('FastAPI')
        except:
            pass
    
    if os.path.exists(os.path.join(repo_path, 'Cargo.toml')):
        tech_stack['languages'].append('Rust')
    
    if os.path.exists(os.path.join(repo_path, 'go.mod')):
        tech_stack['languages'].append('Go')
    
    if os.path.exists(os.path.join(repo_path, 'pom.xml')) or \
       os.path.exists(os.path.join(repo_path, 'build.gradle')):
        tech_stack['languages'].append('Java')
    
    if os.path.exists(os.path.join(repo_path, 'Gemfile')):
        tech_stack['languages'].append('Ruby')
        if os.path.exists(os.path.join(repo_path, 'config', 'application.rb')):
            tech_stack['frameworks'].append('Rails')
    
    if os.path.exists(os.path.join(repo_path, '.csproj')) or \
       any(f.endswith('.csproj') for f in os.listdir(repo_path) if os.path.isfile(os.path.join(repo_path, f))):
        tech_stack['languages'].append('C#')
        tech_stack['frameworks'].append('.NET')
    
    # Tool detection
    if os.path.exists(os.path.join(repo_path, 'Dockerfile')):
        tech_stack['tools'].append('Docker')
    
    if os.path.exists(os.path.join(repo_path, 'docker-compose.yml')) or \
       os.path.exists(os.path.join(repo_path, 'docker-compose.yaml')):
        tech_stack['tools'].append('Docker Compose')
    
    return tech_stack


def extract_readme_description(repo_path: str) -> Optional[str]:
    """Extract description from README file"""
    readme_files = ['README.md', 'README.txt', 'README', 'readme.md']
    
    for readme in readme_files:
        readme_path = os.path.join(repo_path, readme)
        if os.path.exists(readme_path):
            try:
                with open(readme_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Get first non-empty, non-title line (simple heuristic)
                    lines = [line.strip() for line in content.split('\n') if line.strip()]
                    for line in lines[1:4]:  # Check lines 2-4
                        if not line.startswith('#') and len(line) > 20:
                            return line[:200]  # First 200 chars
            except:
                pass
    
    return None


def scan_directory(root_path: str, max_depth: int = 3) -> List[Dict]:
    """
    Recursively scan a directory for git repositories
    
    Args:
        root_path: Starting directory path
        max_depth: Maximum recursion depth
    
    Returns:
        List of discovered repository information dictionaries
    """
    discovered_repos = []
    
    def _scan_recursive(path: str, current_depth: int):
        if current_depth > max_depth:
            return
        
        try:
            # Skip hidden directories except at root level
            if current_depth > 0 and os.path.basename(path).startswith('.'):
                return
            
            # Check if current directory is a git repo
            if is_git_repo(path):
                git_info = get_git_info(path)
                tech_stack = detect_tech_stack(path)
                description = extract_readme_description(path)
                
                repo_info = {
                    'name': os.path.basename(path),
                    'path': path,
                    'remote_url': git_info['remote_url'],
                    'branch': git_info['branch'],
                    'last_commit': git_info['last_commit'],
                    'tech_stack': tech_stack,
                    'description': description
                }
                
                discovered_repos.append(repo_info)
                return  # Don't scan subdirectories of a git repo
            
            # Continue scanning subdirectories
            try:
                for item in os.listdir(path):
                    item_path = os.path.join(path, item)
                    if os.path.isdir(item_path):
                        _scan_recursive(item_path, current_depth + 1)
            except PermissionError:
                pass  # Skip directories we can't access
                
        except Exception as e:
            pass  # Skip problematic directories
    
    _scan_recursive(root_path, 0)
    return discovered_repos
