// Utility functions
const utils = {
  // Format date to readable string
  formatDate: (date) => {
    return new Date(date).toISOString().split('T')[0];
  },

  // Generate random ID
  generateId: () => {
    return Math.random().toString(36).substr(2, 9);
  },

  // Validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Capitalize first letter
  capitalize: (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  // Remove sensitive data from objects
  sanitizeObject: (obj, fieldsToRemove = ['password', 'token']) => {
    const sanitized = { ...obj };
    fieldsToRemove.forEach(field => {
      delete sanitized[field];
    });
    return sanitized;
  },

  // Database-related utilities
  
  // Escape SQL strings to prevent injection
  escapeSqlString: (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/'/g, "''");
  },

  // Validate database connection parameters
  validateDbConfig: (config) => {
    const required = ['host', 'user', 'name'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required database config: ${missing.join(', ')}`);
    }
    
    return true;
  },

  // Format MySQL datetime for display
  formatMysqlDateTime: (datetime) => {
    if (!datetime) return null;
    return new Date(datetime).toLocaleString();
  },

  // Pagination helper
  getPaginationParams: (req) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    
    return { page, limit, offset };
  },

  // Build pagination response
  buildPaginationResponse: (data, total, page, limit) => {
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }
};

module.exports = utils;
