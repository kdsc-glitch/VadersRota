// Database configuration checker
// Run with: node check-db-config.js

require('dotenv').config();

function checkDatabaseConfig() {
  console.log('=== Database Configuration Checker ===\n');
  
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    console.log('Create a .env file in your project root with:');
    console.log('DATABASE_URL=postgresql://your-connection-string');
    return;
  }

  console.log('✅ DATABASE_URL found');
  console.log('Format:', dbUrl.substring(0, 20) + '...' + dbUrl.substring(dbUrl.length - 20));
  
  // Check URL format
  if (dbUrl.includes('127.0.0.1') || dbUrl.includes('localhost')) {
    console.log('🔍 Detected local database configuration');
    
    if (dbUrl.includes(':443')) {
      console.error('❌ PROBLEM: Local database using port 443 (HTTPS port)');
      console.log('Fix: Change port to 5432 for PostgreSQL');
      console.log('Example: postgresql://user:pass@localhost:5432/dbname');
    }
  } else if (dbUrl.includes('neon.tech')) {
    console.log('🔍 Detected Neon database configuration');
    
    if (!dbUrl.includes('?sslmode=require')) {
      console.warn('⚠️  Missing SSL mode - add ?sslmode=require to end of URL');
    }
    
    if (dbUrl.startsWith('postgres://')) {
      console.warn('⚠️  Use postgresql:// instead of postgres:// for better compatibility');
    }
  }
  
  // Check for common issues
  const issues = [];
  
  if (dbUrl.includes('127.0.0.1:443')) {
    issues.push('Using HTTPS port (443) for database connection');
  }
  
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    issues.push('DATABASE_URL should start with postgresql:// or postgres://');
  }
  
  if (issues.length > 0) {
    console.log('\n❌ Issues found:');
    issues.forEach(issue => console.log(`  - ${issue}`));
    console.log('\nRecommended fix:');
    console.log('Update your .env file with correct DATABASE_URL format');
  } else {
    console.log('\n✅ DATABASE_URL format looks correct');
  }
}

checkDatabaseConfig();