# Local Development Setup Guide

## Database Configuration Issue

Your error shows Neon Database trying to connect to `127.0.0.1:443` instead of Neon's servers. This indicates a DATABASE_URL configuration problem.

## Fix Your DATABASE_URL

### Option 1: Neon Database (Current Setup)
Your DATABASE_URL should look like:
```
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require
```

**Check your .env file:**
1. Ensure DATABASE_URL starts with `postgresql://` (not `postgres://`)
2. Contains your actual Neon endpoint (not localhost)
3. Includes `?sslmode=require` at the end

### Option 2: Switch to Local PostgreSQL
If you prefer local development:

1. **Install PostgreSQL locally:**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql
```

2. **Create database:**
```bash
sudo -u postgres createdb rota_management
sudo -u postgres psql -c "CREATE USER rotauser WITH PASSWORD 'password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE rota_management TO rotauser;"
```

3. **Update .env:**
```
DATABASE_URL=postgresql://rotauser:password@localhost:5432/rota_management
```

4. **Update db.ts for local PostgreSQL:**
```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
```

### Option 3: Docker PostgreSQL
```bash
docker run --name rota-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=rota_management -p 5432:5432 -d postgres:15
```

Then use: `DATABASE_URL=postgresql://postgres:password@localhost:5432/rota_management`

## Next Steps

1. Choose your preferred database option
2. Update your .env file with correct DATABASE_URL
3. Run database migrations: `npm run db:push`
4. Test the connection

The most likely fix is correcting your Neon DATABASE_URL format in your .env file.