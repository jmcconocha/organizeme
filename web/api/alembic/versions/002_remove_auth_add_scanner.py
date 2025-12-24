"""Remove authentication and add folder scanning features

Revision ID: 002_remove_auth_add_scanner
Revises: 
Create Date: 2024-01-15

Changes:
- Add scanner/kanban fields to projects
- Create tasks and scans tables
- Gracefully handle existing/missing columns
"""
from alembic import op
import sqlalchemy as sa

revision = '002_remove_auth_add_scanner'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Get connection outside of batch_alter_table
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Check projects columns
    projects_cols = {col['name'] for col in inspector.get_columns('projects')} if 'projects' in existing_tables else set()
    
    # Add columns to projects if they don't exist
    if 'projects' in existing_tables:
        with op.batch_alter_table('projects', schema=None) as batch_op:
            if 'local_path' not in projects_cols:
                batch_op.add_column(sa.Column('local_path', sa.String(), nullable=True))
            if 'git_remote_url' not in projects_cols:
                batch_op.add_column(sa.Column('git_remote_url', sa.String(), nullable=True))
            if 'detected_tech_stack' not in projects_cols:
                batch_op.add_column(sa.Column('detected_tech_stack', sa.JSON(), nullable=True))
            if 'last_scanned' not in projects_cols:
                batch_op.add_column(sa.Column('last_scanned', sa.DateTime(), nullable=True))
            if 'status' not in projects_cols:
                batch_op.add_column(sa.Column('status', sa.String(), nullable=False, server_default='backlog'))
            if 'position' not in projects_cols:
                batch_op.add_column(sa.Column('position', sa.Integer(), nullable=False, server_default='0'))
    
    # Remove owner_id from repositories if it exists
    if 'repositories' in existing_tables:
        repos_cols = {col['name'] for col in inspector.get_columns('repositories')}
        if 'owner_id' in repos_cols:
            with op.batch_alter_table('repositories', schema=None) as batch_op:
                batch_op.drop_column('owner_id')
    
    # Remove author_id from notes if it exists
    if 'notes' in existing_tables:
        notes_cols = {col['name'] for col in inspector.get_columns('notes')}
        if 'author_id' in notes_cols:
            with op.batch_alter_table('notes', schema=None) as batch_op:
                batch_op.drop_column('author_id')
    
    # Create tasks table if it doesn't exist
    if 'tasks' not in existing_tables:
        op.create_table(
            'tasks',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('project_id', sa.Integer(), nullable=False),
            sa.Column('title', sa.String(), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('status', sa.String(), nullable=False),
            sa.Column('position', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_tasks_project_id'), 'tasks', ['project_id'], unique=False)
    
    # Create scans table if it doesn't exist
    if 'scans' not in existing_tables:
        op.create_table(
            'scans',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('path', sa.String(), nullable=False),
            sa.Column('max_depth', sa.Integer(), nullable=False),
            sa.Column('results_count', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
    
    # Drop users table if it exists
    if 'users' in existing_tables:
        try:
            op.drop_table('users')
        except:
            pass


def downgrade():
    # Recreate users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('github_token_encrypted', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    
    # Drop scans table
    op.drop_table('scans')
    
    # Drop tasks table
    op.drop_index(op.f('ix_tasks_project_id'), table_name='tasks')
    op.drop_table('tasks')
    
    # Add back author_id to notes
    with op.batch_alter_table('notes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('author_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_notes_author_id_users', 'users', ['author_id'], ['id'])
    
    # Add back owner_id to repositories
    with op.batch_alter_table('repositories', schema=None) as batch_op:
        batch_op.add_column(sa.Column('owner_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_repositories_owner_id_users', 'users', ['owner_id'], ['id'])
    
    # Remove new columns from projects
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.drop_column('position')
        batch_op.drop_column('status')
        batch_op.drop_column('last_scanned')
        batch_op.drop_column('detected_tech_stack')
        batch_op.drop_column('git_remote_url')
        batch_op.drop_column('local_path')
