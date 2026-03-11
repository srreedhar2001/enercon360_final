const crypto = require('crypto');
const { DEFAULTS, HTTP_STATUS } = require('../constants');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateSecureToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

const formatMobile = (mobile) => {
    // Remove any non-digit characters and ensure 10 digits
    const cleaned = mobile.replace(/\D/g, '');
    return cleaned.length === 10 ? cleaned : null;
};

const formatResponse = (success, message, data = null, statusCode = HTTP_STATUS.OK) => {
    const response = {
        success,
        message,
        timestamp: new Date().toISOString()
    };
    
    if (data !== null) {
        response.data = data;
    }
    
    return { response, statusCode };
};

const formatErrorResponse = (error, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR) => {
    console.error('Error:', error);
    
    return formatResponse(
        false,
        error.message || 'An unexpected error occurred',
        null,
        statusCode
    );
};

const sanitizeUser = (user) => {
    if (!user) return null;
    
    // Remove sensitive fields
    const { password, otp, otpExpiry, ...sanitizedUser } = user;
    return sanitizedUser;
};

const sanitizeUsers = (users) => {
    if (!Array.isArray(users)) return [];
    return users.map(sanitizeUser);
};

const isOTPExpired = (otpExpiry) => {
    if (!otpExpiry) return true;
    return new Date() > new Date(otpExpiry);
};

const calculateOTPExpiry = () => {
    const now = new Date();
    return new Date(now.getTime() + DEFAULTS.OTP_EXPIRY_MINUTES * 60 * 1000);
};

const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const logRequest = (req) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, {
        body: req.body,
        query: req.query,
        headers: {
            'user-agent': req.headers['user-agent'],
            'content-type': req.headers['content-type']
        }
    });
};

module.exports = {
    generateOTP,
    generateSecureToken,
    formatMobile,
    formatResponse,
    formatErrorResponse,
    sanitizeUser,
    sanitizeUsers,
    isOTPExpired,
    calculateOTPExpiry,
    asyncHandler,
    delay,
    logRequest
};
