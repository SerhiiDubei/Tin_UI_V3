/**
 * Automatic migration via Supabase REST API
 * Applies database schema using SQL statements
 */

import { readFileSync } from 'fs';
import fetch from 'node-fetch';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ffnmlfnzufddmecfpive.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_KEY not found in environment');
  process.exit(1);
}

async function executeSqlDirect(sql) {
  // Try to execute SQL via PostgREST
  // Note: This requires database URL with password
  console.log('⚠️  Direct SQL execution requires service_role key or database password');
  console.log('📋 Please apply migrations manually via Supabase Dashboard');
  console.log('');
  console.log('Instructions:');
  console.log('1. Open: https://ffnmlfnzufddmecfpive.supabase.co');
  console.log('2. Go to: SQL Editor');
  console.log('3. Copy SQL from: /home/user/webapp/database/APPLY_TO_SUPABASE.sql');
  console.log('4. Run the SQL');
  console.log('');
  
  return false;
}

async function checkTables() {
  console.log('🔍 Checking if tables exist...\n');
  
  const tables = [
    'projects',
    'sessions', 
    'weight_parameters',
    'content_v3',
    'agent_configs'
  ];
  
  let existCount = 0;
  
  for (const table of tables) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=0`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (response.ok) {
        console.log(`✅ ${table} - EXISTS`);
        existCount++;
      } else if (response.status === 404) {
        console.log(`❌ ${table} - NOT FOUND`);
      } else {
        console.log(`⚠️  ${table} - UNKNOWN (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${table} - ERROR: ${error.message}`);
    }
  }
  
  console.log('');
  console.log(`📊 Found ${existCount}/${tables.length} tables`);
  
  return existCount === tables.length;
}

async function main() {
  console.log('\n🚀 TIN_UI_V3 Database Migration Tool\n');
  console.log('='.repeat(60));
  
  // Check if tables already exist
  const tablesExist = await checkTables();
  
  if (tablesExist) {
    console.log('\n✅ All tables already exist!');
    console.log('📝 No migration needed.');
    return;
  }
  
  console.log('\n⚠️  Some tables are missing. Migration required.\n');
  
  // Load SQL file
  const sqlPath = new URL('../database/APPLY_TO_SUPABASE.sql', import.meta.url);
  const sql = readFileSync(sqlPath, 'utf-8');
  
  console.log('📄 SQL file loaded:');
  console.log(`   Size: ${(sql.length / 1024).toFixed(2)} KB`);
  console.log(`   Location: /home/user/webapp/database/APPLY_TO_SUPABASE.sql`);
  console.log('');
  
  // Try automatic migration
  const success = await executeSqlDirect(sql);
  
  if (!success) {
    console.log('❌ Automatic migration not available');
    console.log('');
    console.log('📖 Follow manual instructions in:');
    console.log('   /home/user/webapp/MIGRATION_INSTRUCTIONS.md');
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
