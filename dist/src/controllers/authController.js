const User = require('../models/User');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');
const { HTTP_STATUS, MESSAGES, DEFAULTS } = require('../constants');
const { authValidation, ValidationError } = require('../validations');
const { 
    generateOTP, 
    calculateOTPExpiry, 
    formatResponse, 
    formatErrorResponse, 
    sanitizeUser,
    asyncHandler 
} = require('../helpers');

class AuthController {
    // Generate JWT token
    static generateJWT(user) {
        const payload = {
            id: user.id,
            mobile: user.phone,
            name: user.name,
            email: user.emailID,
            designation_id: user.designation_id
        };

        return jwt.sign(
            payload,
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: DEFAULTS.JWT_EXPIRY }
        );
    }

    // Send OTP (Step 1)
    static async sendOTP(req, res) {
        try {
        const { mobile, email } = req.body;

            // Validate input
        authValidation.validateLoginData({ mobile, email });

            // Check if user exists in database
        const user = email ? await User.findByEmail(email) : await User.findByMobile(mobile);
            
            if (!user) {
                const { response, statusCode } = formatErrorResponse(
            new Error(MESSAGES.USER_NOT_FOUND),
                    HTTP_STATUS.NOT_FOUND
                );
                return res.status(statusCode).json(response);
            }

            // Generate OTP and expiry
            const otp = generateOTP();
            const otpExpiry = calculateOTPExpiry();

            console.log(`Generated OTP for ${email || mobile}: ${otp}`);

            // Update user with OTP
            await User.updateOtp(user.phone, otp, otpExpiry);

            // Send OTP via email
        if (user.emailID) {
                try {
            await emailService.sendOTP(user.emailID, otp, user.phone);
            console.log(`📧 OTP sent via email to ${user.emailID} for account ${email || user.phone}: ${otp}`);
                } catch (emailError) {
                    console.error('Failed to send OTP email:', emailError);
                    // Continue anyway as OTP is stored in database
                }
            }

            const { response, statusCode } = formatResponse(
                true,
                MESSAGES.OTP_SENT,
                { 
                    message: user.emailID 
                        ? `Verification code sent to your registered email${user.phone ? ` and +91-${user.phone}` : ''}`
                        : `Verification code sent to your registered contact`,
                    expiresIn: `${DEFAULTS.OTP_EXPIRY_MINUTES} minutes`
                },
                HTTP_STATUS.OK
            );
            return res.status(statusCode).json(response);
        } catch (error) {
            const { response, statusCode } = formatErrorResponse(error);
            return res.status(statusCode).json(response);
        }
    }

    // Verify OTP and login (Step 2)
    static async verifyOTP(req, res) {
        try {
            const { mobile, email, otp } = req.body;

            // Validate inputs
            authValidation.validateOTPVerification({ mobile, email, otp });

            // Verify OTP
            // Always verify against phone where OTP is stored
            let account = null;
            if (email) {
                account = await User.findByEmail(email);
            } else {
                account = await User.findByMobile(mobile);
            }
            if (!account) {
                const { response, statusCode } = formatErrorResponse(
                    new Error(MESSAGES.USER_NOT_FOUND),
                    HTTP_STATUS.NOT_FOUND
                );
                return res.status(statusCode).json(response);
            }
            const user = await User.verifyOtp(account.phone, otp);

            if (!user) {
                const { response, statusCode } = formatErrorResponse(
                    new Error(MESSAGES.INVALID_OTP),
                    HTTP_STATUS.BAD_REQUEST
                );
                return res.status(statusCode).json(response);
            }

            // Clear OTP after successful verification
            await User.clearOtp(account.phone);

            // Update last login
            await User.updateLastLogin(user.id);

            // Generate JWT token
            const token = AuthController.generateJWT(user);

            // Return comprehensive user info for auto-population
            const userData = sanitizeUser(user);
            
            const { response, statusCode } = formatResponse(
                true,
                MESSAGES.LOGIN_SUCCESS,
                {
                    token,
                    user: {
                        ...userData,
                        designation_name: user.designation_name,
                        managerID: user.managerID,
                        registered: user.registered
                    },
                    // Default redirect/action suggestions
                    defaultActions: {
                        redirectTo: '/order.html',
                        autoPopulate: true,
                        showDashboard: true
                    }
                },
                HTTP_STATUS.OK
            );
            return res.status(statusCode).json(response);
        } catch (error) {
            const { response, statusCode } = formatErrorResponse(error);
            return res.status(statusCode).json(response);
        }
    }

    // Get user profile
    static async getProfile(req, res) {
        try {
            const userId = req.user.id;
            
            const user = await User.findById(userId);
            
            if (!user) {
                const { response, statusCode } = formatErrorResponse(
                    new Error(MESSAGES.USER_NOT_FOUND),
                    HTTP_STATUS.NOT_FOUND
                );
                return res.status(statusCode).json(response);
            }

            const userData = sanitizeUser(user);
            
            const { response, statusCode } = formatResponse(
                true,
                'Profile retrieved successfully',
                { user: userData },
                HTTP_STATUS.OK
            );
            return res.status(statusCode).json(response);
        } catch (error) {
            const { response, statusCode } = formatErrorResponse(error);
            return res.status(statusCode).json(response);
        }
    }

    // Legacy method for backward compatibility - moved to middleware
    static async verifyToken(req, res, next) {
        console.warn('AuthController.verifyToken is deprecated. Use middleware instead.');
        const { verifyToken } = require('../middleware');
        return verifyToken(req, res, next);
    }
}

module.exports = AuthController;
