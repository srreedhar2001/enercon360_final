const jwt = require('jsonwebtoken');
const { HTTP_STATUS, MESSAGES } = require('../constants');
const { formatErrorResponse, logRequest } = require('../helpers');

const verifyToken = (req, res, next) => {
    try {
        logRequest(req);
        
        const token = req.headers.authorization?.split(' ')[1] || req.headers['x-access-token'];
        
        if (!token) {
            const { response, statusCode } = formatErrorResponse(
                new Error(MESSAGES.ACCESS_DENIED),
                HTTP_STATUS.UNAUTHORIZED
            );
            return res.status(statusCode).json(response);
        }

        // Handle demo mode token
        if (token === 'demo-token-for-development') {
            req.user = {
                id: 1,
                mobile: '9999999999',
                name: 'Demo User',
                role: 'admin',
                isDemo: true
            };
            console.log('Demo mode token accepted');
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        
        console.log('Token verified successfully for user:', decoded.mobile);
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        
        const { response, statusCode } = formatErrorResponse(
            new Error(MESSAGES.INVALID_TOKEN),
            HTTP_STATUS.UNAUTHORIZED
        );
        return res.status(statusCode).json(response);
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        try {
            const userRole = req.user?.designation_id;
            
            if (!userRole || !roles.includes(userRole)) {
                const { response, statusCode } = formatErrorResponse(
                    new Error('Insufficient permissions'),
                    HTTP_STATUS.FORBIDDEN
                );
                return res.status(statusCode).json(response);
            }
            
            next();
        } catch (error) {
            const { response, statusCode } = formatErrorResponse(error, HTTP_STATUS.FORBIDDEN);
            return res.status(statusCode).json(response);
        }
    };
};

const optionalAuth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.headers['x-access-token'];
        
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded;
            } catch (error) {
                // Invalid token, but continue without user context
                console.warn('Optional auth - invalid token:', error.message);
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

module.exports = {
    verifyToken,
    requireRole,
    optionalAuth
};
