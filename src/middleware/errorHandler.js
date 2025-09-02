const { HTTP_STATUS, MESSAGES } = require('../constants');
const { formatErrorResponse } = require('../helpers');
const { ValidationError } = require('../validations');

const errorHandler = (error, req, res, next) => {
    console.error('Error Handler:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        body: req.body
    });

    // Handle validation errors
    if (error instanceof ValidationError) {
        const { response, statusCode } = formatErrorResponse(error, HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        const { response, statusCode } = formatErrorResponse(
            new Error(MESSAGES.INVALID_TOKEN),
            HTTP_STATUS.UNAUTHORIZED
        );
        return res.status(statusCode).json(response);
    }

    if (error.name === 'TokenExpiredError') {
        const { response, statusCode } = formatErrorResponse(
            new Error('Token has expired'),
            HTTP_STATUS.UNAUTHORIZED
        );
        return res.status(statusCode).json(response);
    }

    // Handle database errors
    if (error.code === 'ER_DUP_ENTRY') {
        const { response, statusCode } = formatErrorResponse(
            new Error(MESSAGES.USER_ALREADY_EXISTS),
            HTTP_STATUS.CONFLICT
        );
        return res.status(statusCode).json(response);
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        const { response, statusCode } = formatErrorResponse(
            new Error('Referenced record does not exist'),
            HTTP_STATUS.BAD_REQUEST
        );
        return res.status(statusCode).json(response);
    }

    // Handle other known errors
    if (error.status) {
        const { response, statusCode } = formatErrorResponse(error, error.status);
        return res.status(statusCode).json(response);
    }

    // Default error response
    const { response, statusCode } = formatErrorResponse(
        new Error(MESSAGES.SERVER_ERROR),
        HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    return res.status(statusCode).json(response);
};

const notFoundHandler = (req, res) => {
    const { response, statusCode } = formatErrorResponse(
        new Error(`Route ${req.method} ${req.url} not found`),
        HTTP_STATUS.NOT_FOUND
    );
    return res.status(statusCode).json(response);
};

module.exports = {
    errorHandler,
    notFoundHandler
};
