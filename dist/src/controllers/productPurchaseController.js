const ProductPurchase = require('../models/ProductPurchase');

// Get all product purchases
const getAllPurchases = async (req, res) => {
    try {
        const purchases = await ProductPurchase.findAll();
        return res.json({ success: true, data: purchases });
    } catch (error) {
        console.error('Error fetching product purchases:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch product purchases' });
    }
};

// Get single product purchase by ID
const getPurchaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const purchase = await ProductPurchase.findById(id);
        
        if (!purchase) {
            return res.status(404).json({ success: false, message: 'Purchase not found' });
        }
        
        return res.json({ success: true, data: purchase });
    } catch (error) {
        console.error('Error fetching product purchase:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch product purchase' });
    }
};

// Create new product purchase
const createPurchase = async (req, res) => {
    try {
        const data = req.body;
        
        // Validate required fields
        if (!data.ProductName || !data.ProductCategoryID || !data.Qty || !data.productsValue) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: ProductName, ProductCategoryID, Qty, productsValue' 
            });
        }
        
        const insertId = await ProductPurchase.create(data);
        return res.status(201).json({ 
            success: true, 
            message: 'Product purchase created successfully',
            data: { id: insertId }
        });
    } catch (error) {
        console.error('Error creating product purchase:', error);
        return res.status(500).json({ success: false, message: 'Failed to create product purchase' });
    }
};

// Update product purchase
const updatePurchase = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        
        const success = await ProductPurchase.update(id, data);
        
        if (!success) {
            return res.status(404).json({ success: false, message: 'Purchase not found' });
        }
        
        return res.json({ success: true, message: 'Product purchase updated successfully' });
    } catch (error) {
        console.error('Error updating product purchase:', error);
        return res.status(500).json({ success: false, message: 'Failed to update product purchase' });
    }
};

// Delete product purchase
const deletePurchase = async (req, res) => {
    try {
        const { id } = req.params;
        
        const success = await ProductPurchase.delete(id);
        
        if (!success) {
            return res.status(404).json({ success: false, message: 'Purchase not found' });
        }
        
        return res.json({ success: true, message: 'Product purchase deleted successfully' });
    } catch (error) {
        console.error('Error deleting product purchase:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete product purchase' });
    }
};

module.exports = {
    getAllPurchases,
    getPurchaseById,
    createPurchase,
    updatePurchase,
    deletePurchase
};
