#!/usr/bin/env node
import os from 'node:os';
import qrcode from 'qrcode-terminal';

const port = process.argv[2] ?? '5173';
const nets = os.networkInterfaces();
const lanUrls = [];
for (const list of Object.values(nets)) {
  for (const net of list ?? []) {
    if (net.family === 'IPv4' && !net.internal) {
      lanUrls.push(`http://${net.address}:${port}/`);
    }
  }
}

if (lanUrls.length === 0) {
  console.error('Aucune IP LAN détectée. Es-tu connecté à un réseau ?');
  process.exit(1);
}

const url = lanUrls[0];
console.log(`\n📱 Scanne sur ton téléphone : ${url}\n`);
qrcode.generate(url, { small: true });
