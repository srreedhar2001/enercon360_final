require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: (() => {
    const useProd = (process.env.USE_PROD_DB || '').toLowerCase() === 'true';
    const prod = {
      host: process.env.DB_HOST_PROD || process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER_PROD || process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD_PROD || process.env.DB_PASS || '',
      name: process.env.DB_NAME_PROD || process.env.DB_NAME || 'enercondb',
      port: process.env.DB_PORT_PROD || process.env.DB_PORT || 3306,
      isProd: true,
      profile: 'production'
    };
    const local = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      name: process.env.DB_NAME || 'enercondb',
      port: process.env.DB_PORT || 3306,
      isProd: false,
      profile: 'local'
    };
    return useProd ? prod : local;
  })(),

  // Email Configuration
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key'
  }
};