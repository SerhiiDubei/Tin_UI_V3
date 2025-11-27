const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'ffnmlfnzufddmecfpive.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbm1sZm56dWZkZG1lY2ZwaXZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMDUwNDksImV4cCI6MjA3OTc4MTA0OX0.s70kB8AwTDFMEFFGFfm2WQi2PTVnDiPedOJt5l44TmI';

console.log('🔍 Attempting automatic DB migration via Supabase REST API...\n');

// Read the complete SQL file
const sqlContent = fs.readFileSync('./database/APPLY_TO_SUPABASE.sql', 'utf8');

console.log('📄 SQL file loaded successfully');
console.log(`📊 Total size: ${sqlContent.length} characters\n`);

// Try to execute via pg_query endpoint
const postData = JSON.stringify({
  query: sqlContent
});

const options = {
  hostname: SUPABASE_URL,
  port: 443,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Prefer': 'return=minimal',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🚀 Attempting to execute SQL via REST API...\n');

const req = https.request(options, (res) => {
  let body = '';
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log(`📡 Response status: ${res.statusCode}`);
    console.log(`📡 Response headers:`, JSON.stringify(res.headers, null, 2));
    
    if (body) {
      console.log(`📡 Response body:`, body);
    }
    
    if (res.statusCode === 404) {
      console.log('\n❌ Endpoint not found. Supabase does not expose SQL execution via REST API by default.');
      console.log('\n📋 MANUAL MIGRATION REQUIRED:');
      console.log('   1. Open: https://ffnmlfnzufddmecfpive.supabase.co');
      console.log('   2. Go to: SQL Editor');
      console.log('   3. Create a new query');
      console.log('   4. Copy entire content from: /home/user/webapp/database/APPLY_TO_SUPABASE.sql');
      console.log('   5. Click "Run" or press Ctrl+Enter');
      console.log('   6. Verify all tables are created');
      console.log('\n   Detailed instructions: /home/user/webapp/MIGRATION_INSTRUCTIONS.md\n');
    } else if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('\n✅ Migration may have succeeded! Verifying...');
    } else {
      console.log(`\n⚠️  Unexpected status code: ${res.statusCode}`);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\n📋 Please apply migrations manually (see above).\n');
});

req.write(postData);
req.end();
