require('dotenv').config();
const { ensureDatabase } = require('./db');
const app = require('./app');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await ensureDatabase();

    app.listen(PORT, () => {
      console.log(`Healthcare Backend server listening on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
