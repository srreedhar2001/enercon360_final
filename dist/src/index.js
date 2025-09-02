const app = require('./app');
const config = require('./config/config');
const { testConnection } = require('./config/database');
const emailService = require('./services/emailService');

const BASE_PORT = Number(config.PORT) || 3000;

// Test database connection before starting the server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Test email service connection
    await emailService.verifyConnection();
    
    // Start the server with dev-friendly port retry
    const maxRetries = 5;
    let attempt = 0;
    let port = BASE_PORT;

    const listen = () => {
      const server = app.listen(port, () => {
        console.log(`🚀 Server is running on port ${port}`);
        console.log(`📱 Frontend demo: http://localhost:${port}`);
        console.log(`🔗 API endpoints: http://localhost:${port}/api`);
        console.log(`💾 Database: ${config.database.name} on ${config.database.host}`);
      });

      server.on('error', (err) => {
        if (
          err && err.code === 'EADDRINUSE' &&
          (process.env.NODE_ENV || 'development') !== 'production' &&
          attempt < maxRetries
        ) {
          attempt += 1;
          port += 1;
          console.warn(`Port ${port - 1} in use. Retrying on ${port} (attempt ${attempt}/${maxRetries})...`);
          setTimeout(listen, 200);
        } else {
          console.error('Failed to start server:', err);
          process.exit(1);
        }
      });
    };

    listen();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();