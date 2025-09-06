const Product = require('../models/Product');
const Category = require('../models/Category');
const GST = require('../models/Gst');

// Get all products
const getAllProducts = async (req, res) => {
    try {
        const products = await Product.findAll();
        const formattedProducts = products.map(product => Product.formatForFrontend(product));
        
        res.json({
            success: true,
            products: formattedProducts
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get product by ID
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const formattedProduct = Product.formatForFrontend(product);
        
        res.json({
            success: true,
            message: 'Product retrieved successfully',
            data: formattedProduct
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Create new product
const createProduct = async (req, res) => {
    try {
    const { name, sku, category, categoryId, description, brand, weight, dimensions, price, stock, status, manufacturingPrice, expDate, gstId, gst_id } = req.body;

        // Basic validation
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Product name is required'
            });
        }

        // Check if SKU already exists
        if (sku) {
            const existingProduct = await Product.findBySku(sku);
            if (existingProduct) {
                return res.status(400).json({
                    success: false,
                    message: 'Product with this SKU already exists'
                });
            }
        }

        // Convert frontend data to database format
        const productData = Product.formatForDatabase({
            name,
            sku,
            // prefer categoryId if provided; otherwise keep legacy category string
            ...(categoryId ? { category: categoryId } : { category }),
            description,
            brand,
            weight,
            dimensions,
            price,
            manufacturingPrice,
            stock,
            expDate,
            status,
            // accept either gstId or gst_id
            ...(gstId !== undefined ? { gstId } : {}),
            ...(gst_id !== undefined ? { gst_id } : {})
        });

        // Create product
        const productId = await Product.create(productData);
        const newProduct = await Product.findById(productId);
        const formattedProduct = Product.formatForFrontend(newProduct);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product: formattedProduct
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update product
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
    const { categoryId, gstId, gst_id, ...rest } = req.body;
    // Normalize categoryId and gstId into canonical keys the model expects
    const updateData = {
        ...rest,
        ...(categoryId ? { category: categoryId } : {}),
        ...(gstId !== undefined ? { gstId } : {}),
        ...(gst_id !== undefined ? { gst_id } : {})
    };

        // Check if product exists
        const existingProduct = await Product.findById(id);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if SKU already exists (excluding current product)
        if (updateData.sku && updateData.sku !== existingProduct.sku) {
            const skuExists = await Product.findBySku(updateData.sku);
            if (skuExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Product with this SKU already exists'
                });
            }
        }

        // Convert frontend data to database format
        const formattedData = Product.formatForDatabase(updateData);

        // Update product
        const updated = await Product.update(id, formattedData);
        
        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No changes made to product'
            });
        }

        const updatedProduct = await Product.findById(id);
        const formattedProduct = Product.formatForFrontend(updatedProduct);

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: formattedProduct
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Delete product
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if product exists
        const existingProduct = await Product.findById(id);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Delete product
        const deleted = await Product.delete(id);
        
        if (!deleted) {
            return res.status(400).json({
                success: false,
                message: 'Failed to delete product'
            });
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Search products
const searchProducts = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const products = await Product.search(q);
        const formattedProducts = products.map(product => Product.formatForFrontend(product));
        
        res.json({
            success: true,
            products: formattedProducts
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get products by category
const getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const products = await Product.findByCategory(category);
        const formattedProducts = products.map(product => Product.formatForFrontend(product));
        
        res.json({
            success: true,
            message: 'Products retrieved successfully',
            data: formattedProducts
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get all categories (only from productcategory)
const getCategories = async (req, res) => {
    try {
        const categories = await Category.findAll();
        return res.json({ success: true, categories });
    } catch (error) {
        console.error('Error fetching categories from productcategory:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};

// Get GST list from gst table
const getGSTList = async (req, res) => {
    try {
        const rows = await GST.findAll();
        // Map into a friendly shape but keep flexible for unknown schemas
        const gsts = (rows || []).map(r => {
            const cg = r.cgst ?? r.cGst ?? r.cg ?? null;
            const sg = r.sgst ?? r.sGst ?? r.sg ?? null;
            const rate = r.rate ?? r.percentage ?? r.percent ?? null;
            const total_gst = r.total_gst ?? r.totalGST ?? r.total ?? (
                (cg != null && sg != null) ? (Number(cg) + Number(sg)) : rate
            );
            return {
                id: r.id,
                name: r.name || r.gst_name || r.label || r.code || (rate != null ? `${rate}%` : `GST ${r.id}`),
                rate: rate ?? null,
                total_gst: total_gst ?? null
            };
        });
        return res.json({ success: true, gsts });
    } catch (error) {
        console.error('Error fetching GST list:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch GST list' });
    }
};

// Get product image
const getProductImage = async (req, res) => {
    try {
        const { id } = req.params;
        const imageBuffer = await Product.getProductImage(id);
        
        if (!imageBuffer) {
            return res.status(404).json({
                success: false,
                message: 'Product image not found'
            });
        }

        res.set('Content-Type', 'image/jpeg');
        res.send(imageBuffer);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update product image (expects { image: dataUrlOrBase64 })
const updateProductImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { image } = req.body || {};
        if (!image) {
            return res.status(400).json({ success: false, message: 'Image is required' });
        }

        // Handle data URL or raw base64
        let base64 = image;
        const commaIdx = image.indexOf(',');
        if (image.startsWith('data:') && commaIdx !== -1) {
            base64 = image.substring(commaIdx + 1);
        }
        const buffer = Buffer.from(base64, 'base64');
        const ok = await Product.updateProductImage(id, buffer);
        if (!ok) {
            return res.status(400).json({ success: false, message: 'Failed to update product image' });
        }
        res.json({ success: true, message: 'Product image updated' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    getProductsByCategory,
    getCategories,
    getProductImage,
    updateProductImage,
    getGSTList
};
