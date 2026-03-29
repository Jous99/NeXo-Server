'use strict';

/**
 * Global error handler for Fastify.
 * Maps service-layer error codes to HTTP status codes.
 */
function errorHandler(error, request, reply) {
    // Fastify validation errors
    if (error.validation) {
        return reply.code(400).send({
            ok:      false,
            error:   'Validation Error',
            details: error.validation,
        });
    }

    const codeMap = {
        'BAD_REQUEST':  400,
        'UNAUTHORIZED': 401,
        'FORBIDDEN':    403,
        'NOT_FOUND':    404,
        'CONFLICT':     409,
    };

    const status = codeMap[error.code] || error.statusCode || 500;

    if (status >= 500) {
        request.log.error(error);
    }

    return reply.code(status).send({
        ok:      false,
        error:   error.message || 'Internal Server Error',
    });
}

module.exports = errorHandler;
