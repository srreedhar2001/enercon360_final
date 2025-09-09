const { PATTERNS, MESSAGES } = require('../constants');

class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

const userValidation = {
    validateMobile: (mobile) => {
        if (!mobile) {
            throw new ValidationError(MESSAGES.MISSING_FIELDS, 'mobile');
        }
        if (!PATTERNS.MOBILE.test(mobile)) {
            throw new ValidationError(MESSAGES.INVALID_MOBILE, 'mobile');
        }
        return true;
    },

    validateOTP: (otp) => {
        if (!otp) {
            throw new ValidationError(MESSAGES.MISSING_FIELDS, 'otp');
        }
        if (!PATTERNS.OTP.test(otp)) {
            throw new ValidationError(MESSAGES.INVALID_OTP, 'otp');
        }
        return true;
    },

    validateEmail: (email) => {
        if (!email) {
            throw new ValidationError(MESSAGES.MISSING_FIELDS, 'email');
        }
        if (!PATTERNS.EMAIL.test(email)) {
            throw new ValidationError(MESSAGES.INVALID_EMAIL, 'email');
        }
        return true;
    },

    validateUserData: (userData) => {
        const { name, mobile, email, designation_id } = userData;
        
        if (!name || !mobile || !email || !designation_id) {
            throw new ValidationError(MESSAGES.MISSING_FIELDS);
        }

        userValidation.validateMobile(mobile);
        userValidation.validateEmail(email);

        if (isNaN(designation_id)) {
            throw new ValidationError('Invalid designation', 'designation_id');
        }

        return true;
    },

    validateManagerAssignment: (designation_id, managerID) => {
        // Representatives must have a manager
        if (designation_id == 2 && !managerID) {
            throw new ValidationError('Representatives must be assigned to a manager', 'managerID');
        }
        
        // Non-representatives should not have a manager assigned
        if (designation_id != 2 && managerID) {
            throw new ValidationError('Only representatives can be assigned to managers', 'managerID');
        }

        return true;
    }
};

const authValidation = {
    validateLoginData: (loginData) => {
        const { mobile, email } = loginData;
        if (email) {
            userValidation.validateEmail(email);
        } else {
            userValidation.validateMobile(mobile);
        }
        return true;
    },

    validateOTPVerification: (otpData) => {
        const { mobile, email, otp } = otpData;
        if (email) {
            userValidation.validateEmail(email);
        } else {
            userValidation.validateMobile(mobile);
        }
        userValidation.validateOTP(otp);
        return true;
    }
};

module.exports = {
    ValidationError,
    userValidation,
    authValidation
};
