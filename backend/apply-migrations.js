/**
 * Apply database migrations to Supabase
 * This script reads SQL file and executes it via Supabase client
 */

import { readFileSync } from 'fs';
import { supabase } from './src/db/supabase.js';

const SQL_FILE = '../database/APPLY_TO_SUPABASE.sql';

async function applyMigrations() {
  console.log('\n🚀 Applying database migrations to Supabase...\n');
  
  try {
    // Read SQL file
    const sql = readFileSync(new URL(SQL_FILE, import.meta.url), 'utf-8');
    
    console.log('📄 SQL file loaded');
    console.log(`📊 Size: ${(sql.length / 1024).toFixed(2)} KB`);
    console.log('');
    
    // Split SQL into statements (rough split by semicolon)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements`);
    console.log('');
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (!statement || statement.startsWith('--')) continue;
      
      // Get statement type for logging
      const statementType = statement.split(' ')[0].toUpperCase();
      const preview = statement.substring(0, 60).replace(/\n/g, ' ');
      
      process.stdout.write(`[${i + 1}/${statements.length}] ${statementType}: ${preview}...`);
      
      try {
        // Execute using RPC (raw SQL)
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        
        if (error) {
          // Some errors are expected (like "already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('duplicate')) {
            console.log(' ⚠️ SKIP');
          } else {
            console.log(' ❌ ERROR');
            console.error('   Error:', error.message);
            errorCount++;
          }
        } else {
          console.log(' ✅');
          successCount++;
        }
      } catch (err) {
        console.log(' ❌ ERROR');
        console.error('   Error:', err.message);
        errorCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 Migration Results:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${statements.length}`);
    console.log('='.repeat(60));
    
    if (errorCount === 0) {
      console.log('\n🎉 All migrations applied successfully!');
    } else {
      console.log('\n⚠️  Some migrations failed. Check errors above.');
    }
    
    // Test connection
    console.log('\n🔍 Testing database connection...');
    const { data, error } = await supabase.from('projects').select('count');
    
    if (error) {
      console.error('❌ Connection test failed:', error.message);
    } else {
      console.log('✅ Database connection working!');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migrations
applyMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
