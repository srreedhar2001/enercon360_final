const express = require('express');
const AuthController = require('../controllers/authController');

const router = express.Router();

// Authentication routes
router.post('/send-otp', AuthController.sendOTP);
router.post('/verify-otp', AuthController.verifyOTP);

// Protected routes
router.get('/profile', AuthController.verifyToken, AuthController.getProfile);

module.exports = router;
