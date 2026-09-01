-- TYNEX HOSTING SERVER - DATABASE SCHEMA

-- Users Table (Stores authorized users and admins)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user', -- 'admin' or 'user'
    status VARCHAR(50) DEFAULT 'active', -- 'active' or 'banned'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table (Stores user projects info)
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    runtime VARCHAR(50) NOT NULL, -- 'python', 'node', 'html'
    status VARCHAR(50) DEFAULT 'CREATED', -- 'CREATED', 'RUNNING', 'STOPPED', 'FAILED'
    container_id VARCHAR(255),
    startup_command TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deployments Log Table
CREATE TABLE IF NOT EXISTS deployments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stopped_at TIMESTAMP,
    exit_code INTEGER
);

-- Environment Variables for Projects
CREATE TABLE IF NOT EXISTS environment_variables (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL
);