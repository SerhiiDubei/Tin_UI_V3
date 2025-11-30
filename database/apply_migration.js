import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://zllrhtvxdxzkixwbuqyv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbHJodHZ4ZHh6a2l4d2J1cXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDgxNzQsImV4cCI6MjA3Njg4NDE3NH0.xgJ-nkvUTQ5YU_xF-yOkeBVoPbUsXAnRbGEOF5kMrOU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('📦 Reading migration file...');
  
  const migrationPath = join(__dirname, 'COMPLETE_MIGRATION.sql');
  const sql = readFileSync(migrationPath, 'utf8');
  
  console.log('🚀 Applying migration to Supabase...');
  console.log('Note: This requires service_role key for DDL operations');
  console.log('Please apply this migration manually in Supabase SQL Editor:');
  console.log('\n' + '='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60) + '\n');
  
  console.log('📝 Instructions:');
  console.log('1. Go to https://supabase.com/dashboard/project/zllrhtvxdxzkixwbuqyv/sql');
  console.log('2. Copy the SQL above');
  console.log('3. Paste and run it in the SQL Editor');
  console.log('4. Restart your backend server');
}

applyMigration().catch(console.error);
