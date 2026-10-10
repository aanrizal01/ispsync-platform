const http = require('http');

function provision(tenant_slug, company, email) {
  const data = JSON.stringify({
    tenant_slug,
    company,
    short_name: tenant_slug.toUpperCase(),
    email,
    password: 'rahasia123',
    pic_name: 'Administrator',
    phone: '081234567890',
    address: 'Jakarta',
    plan: 'Enterprise FTTX'
  });

  const req = http.request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/v1/internal/tenants/provision',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': 'ispsync-carrier-super-secret-key-2026-production-hmac-99a8f27c3d14',
      'Content-Length': Buffer.byteLength(data)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log(tenant_slug + ' status:', res.statusCode, body));
  });
  req.on('error', console.error);
  req.write(data);
  req.end();
}

provision('ispmu', 'PT. Mitra Usaha Data', 'admin@ispmu.ispsync.id');
provision('dev', 'Laboratorium ISPSYNC R&D', 'admin@dev.ispsync.id');
