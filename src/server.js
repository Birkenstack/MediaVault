const app = require('./app');
const env = require('./config/env');
const { testConnection } = require('./config/db');

async function startServer() {
  try {
    await testConnection();
    app.listen(env.port, () => {
      console.log('MediaVault API listening on port ' + env.port);
    });
  } catch (error) {
    console.error('Failed to start MediaVault API:', error.message);
    process.exit(1);
  }
}

startServer();
