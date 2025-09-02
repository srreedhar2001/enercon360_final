const express = require('express');
const path = require('path');

// Import routes
const sampleRoutes = require('./routes/sampleRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/productRoutes');
const counterRoutes = require('./routes/counterRoutes');
const cityRoutes = require('./routes/cityRoutes');
const representativeRoutes = require('./routes/representativeRoutes');
const orderRoutes = require('./routes/orderRoutes');
const collectionsRoutes = require('./routes/collectionsRoutes');
const paymentsRoutes = require('./routes/paymentsRoutes');
const accessRoutes = require('./routes/accessRoutes');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware');

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Redirect root to /login before static serving so it always takes effect
app.get('/', (req, res) => {
    return res.redirect(302, '/login');
});

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Serve invoice files
app.use('/invoices', express.static(path.join(__dirname, '../invoices')));

// Set view engine (optional - for server-side rendering)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/counters', counterRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/representatives', representativeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/sample', sampleRoutes);

// Quietly handle Chrome DevTools /.well-known requests to avoid noisy 404s
app.use('/.well-known', (req, res) => {
    res.sendStatus(204); // No Content
});

// Quietly handle favicon requests to avoid 404 noise in logs
app.get('/favicon.ico', (req, res) => {
    res.sendStatus(204); // No Content
});

// Friendly route alias for login without .html
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Error handling middleware (must be after all routes)
app.use(errorHandler);

// 404 handler (must be last)
app.use(notFoundHandler);

module.exports = app;
