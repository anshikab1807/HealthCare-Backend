const { PGlite } = require('@electric-sql/pglite');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');
const path = require('path');
const fs = require('fs');
const net = require('net');

function isPortInUse(port = 5432, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

let dbInstance = null;
let serverInstance = null;

async function ensureDatabase() {
  const inUse = await isPortInUse(5432);
  if (inUse) {
    return;
  }

  const dataDir = path.join(__dirname, '..', 'prisma', 'pgdata');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  dbInstance = new PGlite(dataDir);
  await dbInstance.waitReady;

  const migrationPath = path.join(
    __dirname,
    '..',
    'prisma',
    'migrations',
    '20260101000000_init',
    'migration.sql'
  );
  if (fs.existsSync(migrationPath)) {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    try {
      await dbInstance.exec(sql);
    } catch (e) {
    }
  }

  serverInstance = new PGLiteSocketServer({
    db: dbInstance,
    port: 5432,
    host: '127.0.0.1'
  });

  await serverInstance.start();
}

module.exports = {
  ensureDatabase,
  isPortInUse
};
