# Database Setup Instructions

## Prerequisites
- PostgreSQL 12 or higher installed
- Database server running

## Setup Steps

1. **Create the database** (if not exists):
```sql
CREATE DATABASE your_database_name;
```

2. **Run the schema script**:
```bash
psql -U postgres -d your_database_name -f schema.sql
```

Or using psql directly:
```bash
psql -U postgres -d your_database_name
\i schema.sql
```

3. **Update environment variables** in `frontend/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=postgres
DB_PASSWORD=your_password
```

## Schema Overview

The `projectweb` schema includes the following tables:

- **users**: User accounts with roles (ADMIN, AUTHOR, SELECTOR, APPLICANT)
- **simulations**: Assessment simulations created by authors
- **steps**: Individual steps/tasks within simulations
- **rubrics**: Evaluation criteria for subjective tasks
- **attempts**: Applicant attempts at simulations
- **responses**: Answers submitted by applicants
- **scores**: Detailed rubric-based scores
- **refresh_tokens**: JWT refresh token management

## Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE`
- UUIDs are used for all primary keys
- Foreign keys have appropriate CASCADE/SET NULL behaviors
- Indexes are created for common query patterns
- Triggers automatically update `updated_at` timestamps

## Creating Initial Admin User

After running the schema, you can create an admin user manually:

```sql
-- Hash password using bcrypt (use online tool or Node.js script)
-- Example hash for password "admin123": $2b$10$...
INSERT INTO projectweb.users (email, name, password_hash, role)
VALUES ('admin@example.com', 'Admin User', '$2b$10$...', 'ADMIN');
```

## Views

The schema includes helpful views:
- `simulations_with_counts`: Simulations with step counts
- `pending_attempts_view`: Attempts pending scoring


