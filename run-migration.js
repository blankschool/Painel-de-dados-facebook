// Quick script to run the migration
const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://phbwmfjrgadzybqpjnoi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const sql = fs.readFileSync('supabase/migrations/20260112160900_create_instagram_cache.sql', 'utf8');

const data = JSON.stringify({ query: sql });

const options = {
  hostname: 'phbwmfjrgadzybqpjnoi.supabase.co',
  port: 443,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Length': data.length,
    'Prefer': 'return=representation'
  }
};

const req = https.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(data);
req.end();
