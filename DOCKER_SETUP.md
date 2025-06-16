# Docker PostgreSQL Setup

## Quick Start

1. **Start PostgreSQL container:**
```bash
docker run --name rota-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=rota_management \
  -p 5432:5432 \
  -d postgres:15
```

2. **Create .env file:**
```bash
echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/rota_management" > .env
```

3. **Push database schema:**
```bash
npm run db:push
```

4. **Start the application:**
```bash
npm run dev
```

## Verify Connection

Check if your container is running:
```bash
docker ps
```

Test database connection:
```bash
docker exec -it rota-postgres psql -U postgres -d rota_management -c "\dt"
```

## Troubleshooting

If port 5432 is busy:
```bash
docker run --name rota-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=rota_management \
  -p 5433:5432 \
  -d postgres:15
```

Then use: `DATABASE_URL=postgresql://postgres:password@localhost:5433/rota_management`