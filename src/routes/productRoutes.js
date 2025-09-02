const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    getProductsByCategory,
    getCategories,
    getProductImage,
    updateProductImage
} = require('../controllers/productController');

// Import auth middleware
const { verifyToken } = require('../middleware/auth');

// Development middleware bypass
const devBypass = (req, res, next) => {
    if (process.env.NODE_ENV === 'development' && req.headers.authorization === 'Bearer demo-token-for-development') {
        req.user = { id: 1, phone: '1234567890' }; // Mock user for demo
        return next();
    }
    return verifyToken(req, res, next);
};

// Public image route
router.get('/image/:id', getProductImage);

// Protected routes - require authentication (use devBypass in development)
router.get('/categories', devBypass, getCategories);
router.get('/', devBypass, getAllProducts);
router.get('/search', devBypass, searchProducts);
router.get('/category/:category', devBypass, getProductsByCategory);
router.get('/:id', devBypass, getProductById);
router.post('/', devBypass, createProduct);
router.put('/:id', devBypass, updateProduct);
router.put('/:id/image', devBypass, updateProductImage);
router.delete('/:id', devBypass, deleteProduct);

module.exports = router;
