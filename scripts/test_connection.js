import https from 'https';

const options = {
  hostname: 'keyryhpndrdpdhwilpfl.supabase.co',
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': 'sb_publishable_H0TIfG-ldA-B84xFvLkPig_29z4PGGw',
    'Authorization': 'Bearer sb_publishable_H0TIfG-ldA-B84xFvLkPig_29z4PGGw'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Response:', data.substring(0, 600));
  });
});

req.on('error', (e) => {
  console.log('Error:', e.message);
});

req.end();
