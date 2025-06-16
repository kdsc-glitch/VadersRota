#!/usr/bin/env node
// Local environment debugging script
// Run with: node local-debug.js

const fs = require('fs');
const path = require('path');

async function debugLocalSetup() {
  console.log('=== Local Environment Debug ===\n');

  // Check .env file
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file found');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check DATABASE_URL
    const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
    if (dbUrlMatch) {
      const dbUrl = dbUrlMatch[1].trim();
      console.log('✅ DATABASE_URL found');
      
      // Analyze the URL
      if (dbUrl.includes('neon.tech')) {
        console.log('❌ PROBLEM: Still using Neon Database URL');
        console.log('Fix: Update DATABASE_URL to point to your Docker PostgreSQL');
        console.log('Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/rota_management');
      } else if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
        console.log('✅ Using local database');
        
        if (dbUrl.includes(':443')) {
          console.log('❌ PROBLEM: Using port 443 (HTTPS) for database');
          console.log('Fix: Change to port 5432 for PostgreSQL');
        } else if (dbUrl.includes(':5432')) {
          console.log('✅ Using correct PostgreSQL port');
        }
      }
    } else {
      console.log('❌ DATABASE_URL not found in .env file');
    }
  } else {
    console.log('❌ .env file not found');
    console.log('Create .env file with: DATABASE_URL=postgresql://postgres:password@localhost:5432/rota_management');
  }

  // Check Docker container
  console.log('\n--- Docker Container Check ---');
  try {
    const { execSync } = require('child_process');
    const containers = execSync('docker ps --format "table {{.Names}}\t{{.Ports}}"', { encoding: 'utf8' });
    console.log(containers);
    
    if (containers.includes('5432')) {
      console.log('✅ PostgreSQL container appears to be running on port 5432');
    } else {
      console.log('❌ No PostgreSQL container found on port 5432');
      console.log('Start container with:');
      console.log('docker run --name rota-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=rota_management -p 5432:5432 -d postgres:15');
    }
  } catch (error) {
    console.log('❌ Docker not available or no containers running');
  }

  // Check package.json dependencies
  console.log('\n--- Dependencies Check ---');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (packageJson.dependencies['@neondatabase/serverless']) {
    console.log('❌ PROBLEM: @neondatabase/serverless still installed');
    console.log('Fix: npm uninstall @neondatabase/serverless');
  } else {
    console.log('✅ Neon database package removed');
  }

  if (packageJson.dependencies['pg']) {
    console.log('✅ PostgreSQL driver installed');
  } else {
    console.log('❌ PROBLEM: pg package not installed');
    console.log('Fix: npm install pg');
  }

  // Test database connection
  console.log('\n--- Database Connection Test ---');
  try {
    require('dotenv').config();
    const { Pool } = require('pg');
    
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not set');
      return;
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    console.log('Testing connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log('Current time from DB:', result.rows[0].now);
    client.release();
    await pool.end();
    
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('Fix: Check if Docker PostgreSQL container is running');
    }
    if (error.message.includes('password authentication failed')) {
      console.log('Fix: Check username/password in DATABASE_URL');
    }
    if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('Fix: Create database or check database name in URL');
    }
  }
}

debugLocalSetup().catch(console.error);