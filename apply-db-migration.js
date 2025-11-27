const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'https://ffnmlfnzufddmecfpive.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbm1sZm56dWZkZG1lY2ZwaXZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMDUwNDksImV4cCI6MjA3OTc4MTA0OX0.s70kB8AwTDFMEFFGFfm2WQi2PTVnDiPedOJt5l44TmI';

// Read SQL file
const sqlContent = fs.readFileSync('./database/APPLY_TO_SUPABASE.sql', 'utf8');

// Split by semicolons and filter out empty statements
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

// Execute statements sequentially
async function executeSQL(sql, index) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    
    const options = {
      hostname: 'ffnmlfnzufddmecfpive.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve({ success: true, index, status: res.statusCode });
        } else {
          resolve({ success: false, index, status: res.statusCode, body });
        }
      });
    });

    req.on('error', (error) => {
      reject({ success: false, index, error: error.message });
    });

    req.write(data);
    req.end();
  });
}

// Main execution
(async () => {
  console.log('🚀 Starting database migration...\n');
  
  let success = 0;
  let failed = 0;

  for (let i = 0; i < Math.min(5, statements.length); i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    
    console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);
    
    try {
      const result = await executeSQL(stmt, i);
      if (result.success) {
        console.log(`✅ Success`);
        success++;
      } else {
        console.log(`⚠️  Status ${result.status}: ${result.body || 'Unknown error'}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ Error: ${error.error || error.message}`);
      failed++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n📈 Migration Summary:`);
  console.log(`   ✅ Success: ${success}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Total: ${statements.length} statements`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some migrations failed. Manual application may be required.');
    console.log('   Please open: https://ffnmlfnzufddmecfpive.supabase.co');
    console.log('   Go to: SQL Editor');
    console.log('   Copy SQL from: /home/user/webapp/database/APPLY_TO_SUPABASE.sql');
  }
})();
