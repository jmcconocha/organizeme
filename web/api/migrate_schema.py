from app.database import engine
from sqlalchemy import text

print("Fixing database schema manually...")

with engine.begin() as conn:
    # SQLite doesn't support DROP COLUMN directly with foreign keys
    # We need to recreate the tables
    
    # 1. Create temporary tables without owner_id/author_id
    print("Creating temporary tables...")
    
    # Backup and recreate projects
    conn.execute(text("""
        CREATE TABLE projects_new AS SELECT 
            id, name, domain, phase, complexity, tags, visibility,
            created_at, updated_at, local_path, git_remote_url, 
            detected_tech_stack, last_scanned, status, position
        FROM projects
    """))
    
    # Backup and recreate repositories
    conn.execute(text("""
        CREATE TABLE repositories_new AS SELECT 
            id, project_id, full_name, description, default_branch,
            stars, forks, open_issues, last_synced, created_at, updated_at
        FROM repositories
    """))
    
    # Backup and recreate notes
    conn.execute(text("""
        CREATE TABLE notes_new AS SELECT 
            id, project_id, content, created_at, updated_at
        FROM notes
    """))
    
    # Drop old tables
    print("Dropping old tables...")
    conn.execute(text("DROP TABLE activities"))
    conn.execute(text("DROP TABLE notes"))
    conn.execute(text("DROP TABLE repositories"))
    conn.execute(text("DROP TABLE projects"))
    conn.execute(text("DROP TABLE users"))
    
    # Rename new tables
    print("Renaming tables...")
    conn.execute(text("ALTER TABLE projects_new RENAME TO projects"))
    conn.execute(text("ALTER TABLE repositories_new RENAME TO repositories"))
    conn.execute(text("ALTER TABLE notes_new RENAME TO notes"))
    
    # Recreate activities table
    print("Recreating activities table...")
    conn.execute(text("""
        CREATE TABLE activities (
            id INTEGER PRIMARY KEY,
            repository_id INTEGER NOT NULL,
            type VARCHAR NOT NULL,
            title VARCHAR NOT NULL,
            url VARCHAR,
            created_at DATETIME NOT NULL,
            FOREIGN KEY(repository_id) REFERENCES repositories(id) ON DELETE CASCADE
        )
    """))
    
    print("Schema migration complete!")

print("Done!")
