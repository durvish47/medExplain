import 'dotenv/config';
import http from 'http';
import https from 'https';
import os from 'os';
import selfsigned from 'selfsigned';
import { createApp } from './app.js';

const app = createApp();
const PORT = Number(process.env.PORT || 3000);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);
const HOST = '0.0.0.0';

// Discover local IPv4 for multi-device connections
const interfaces = os.networkInterfaces();
let localIp = '127.0.0.1';
for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      localIp = iface.address;
      break;
    }
  }
}

// 1. Start HTTP Server (Port 3000)
const httpServer = http.createServer(app);
httpServer.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`🩺 MedExplain API & Teleconsultation Live`);
  console.log(`====================================================`);
  console.log(`💻 Local Device:`);
  console.log(`   - Dashboard:        http://localhost:${PORT}`);
  console.log(`   - Teleconsultation: http://localhost:${PORT}/teleconsult.html`);
  console.log(`📱 2nd Device (Doctor/Patient on Phone or 2nd PC):`);
  console.log(`   - LAN HTTP:         http://${localIp}:${PORT}/teleconsult.html`);
  console.log(`====================================================`);
});

// 2. Start HTTPS Server (Port 3443) for Cross-Device Camera/Mic Permissions
try {
  const pems = await selfsigned.generate([
    { name: 'commonName', value: localIp },
    { name: 'organizationName', value: 'MedExplain Healthcare' }
  ], { days: 365 });

  const httpsServer = https.createServer({ key: pems.private, cert: pems.cert }, app);
  httpsServer.listen(HTTPS_PORT, HOST, () => {
    console.log(`🔒 Cross-Device HTTPS (Enables Mobile Camera & Mic):`);
    console.log(`   - HTTPS Teleconsult: https://${localIp}:${HTTPS_PORT}/teleconsult.html`);
    console.log(`   - Local HTTPS:       https://localhost:${HTTPS_PORT}/teleconsult.html`);
    console.log(`====================================================`);
  });
} catch (err) {
  console.warn('[HTTPS Server] Could not start HTTPS listener:', err.message);
}
