// HTTP Status Codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
};

// API Response Messages
const MESSAGES = {
    // Success Messages
    LOGIN_SUCCESS: 'Login successful',
    USER_CREATED: 'User created successfully',
    USER_UPDATED: 'User updated successfully',
    USER_DELETED: 'User deleted successfully',
    OTP_SENT: 'Verification code sent successfully',
    
    // Error Messages
    INVALID_CREDENTIALS: 'Invalid credentials',
    INVALID_OTP: 'Invalid or expired verification code',
    OTP_EXPIRED: 'OTP has expired. Please request a new one.',
    OTP_ALREADY_USED: 'This OTP has already been used. Please request a new one.',
    OTP_MISMATCH: 'Invalid OTP. Please check and try again.',
    USER_NOT_FOUND: 'User not found',
    USER_ALREADY_EXISTS: 'User already exists',
    MOBILE_NOT_REGISTERED: 'Mobile number not registered. Please contact administrator.',
    ACCESS_DENIED: 'Access denied. No token provided.',
    INVALID_TOKEN: 'Invalid token',
    MISSING_FIELDS: 'Required fields are missing',
    INVALID_MOBILE: 'Please enter a valid Indian mobile number',
    INVALID_EMAIL: 'Please enter a valid email address',
    NETWORK_ERROR: 'Network error. Please try again.',
    SERVER_ERROR: 'Internal server error'
};

// Validation Patterns
const PATTERNS = {
    MOBILE: /^[6-9]\d{9}$/,
    OTP: /^\d{6}$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
};

// Default Configuration
const DEFAULTS = {
    OTP_EXPIRY_MINUTES: 5,
    JWT_EXPIRY: '24h',
    PAGE_SIZE: 10,
    MAX_LOGIN_ATTEMPTS: 5
};

// User Designations
const DESIGNATIONS = {
    ADMIN: 4,
    MANAGER: 1,
    REPRESENTATIVE: 2,
    USER: 3
};

// Database Tables
const TABLES = {
    USERS: 'users',
    DESIGNATION: 'designation',
    ITEMS: 'items'
};

module.exports = {
    HTTP_STATUS,
    MESSAGES,
    PATTERNS,
    DEFAULTS,
    DESIGNATIONS,
    TABLES
};
