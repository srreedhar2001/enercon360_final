const { query: dbQuery } = require('../config/database');
const invoiceService = require('../services/invoiceService');

class OrderController {
    // Get all orders with order details
    async getAllOrders(req, res) {
        try {
            const { status } = req.query;
            
            // Build the query based on status filter
            let query = `
                SELECT 
                    o.*,
                    c.CounterName as counterName,
                    c.phone as counterPhone,
                    c.address as counterAddress,
                    city.city as counterCity,
                    city.district as counterDistrict,
                    city.state as counterState,
                    u.name as userName
                FROM orders o
                LEFT JOIN counters c ON o.counterID = c.id
                LEFT JOIN city ON c.CityID = city.id
                LEFT JOIN users u ON o.user_id = u.id
            `;
            
            let queryParams = [];
            
            // Add WHERE clause for status filtering
            if (status && status !== 'all') {
                query += ` WHERE o.status = ?`;
                queryParams.push(status);
            }
            
            query += ` ORDER BY o.orderDate DESC, o.id DESC`;
            
            const orders = await dbQuery(query, queryParams);
            
            // Get order details for each order
            for (let order of orders) {
                const orderDetailsQuery = `
                    SELECT 
                        od.*,
                        p.name as productName,
                        p.sku as productSku,
                        p.description as productDescription
                    FROM orderdetails od
                    LEFT JOIN product p ON od.productId = p.id
                    WHERE od.orderId = ?
                    ORDER BY od.id
                `;
                
                const orderDetails = await dbQuery(orderDetailsQuery, [order.id]);
                order.orderDetails = orderDetails;
                order.itemCount = orderDetails.length;
                order.totalQuantity = orderDetails.reduce((sum, item) => sum + (item.qty || 0), 0);
            }
            
            return res.status(200).json({
                success: true,
                message: 'Orders retrieved successfully',
                data: orders,
                count: orders.length
            });
            
        } catch (error) {
            console.error('Error fetching orders:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch orders',
                error: error.message
            });
        }
    }

    // Get order by ID with details
    async getOrderById(req, res) {
        try {
            const { id } = req.params;
            
            const orderQuery = `
                SELECT 
                    o.*,
                    c.CounterName as counterName,
                    c.phone as counterPhone,
                    c.address as counterAddress,
                    city.city as counterCity,
                    city.district as counterDistrict,
                    city.state as counterState,
                    u.name as userName
                FROM orders o
                LEFT JOIN counters c ON o.counterID = c.id
                LEFT JOIN city ON c.CityID = city.id
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.id = ?
            `;
            
            const orders = await dbQuery(orderQuery, [id]);
            
            if (orders.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
            
            const order = orders[0];
            
            // Get order details
            const orderDetailsQuery = `
                SELECT 
                    od.*,
                    p.name as productName,
                    p.sku as productSku,
                    p.description as productDescription
                FROM orderdetails od
                LEFT JOIN product p ON od.productId = p.id
                WHERE od.orderId = ?
                ORDER BY od.id
            `;
            
            const orderDetails = await dbQuery(orderDetailsQuery, [id]);
            order.orderDetails = orderDetails;
            order.itemCount = orderDetails.length;
            order.totalQuantity = orderDetails.reduce((sum, item) => sum + (item.qty || 0), 0);
            
            return res.status(200).json({
                success: true,
                message: 'Order retrieved successfully',
                data: order
            });
            
        } catch (error) {
            console.error('Error fetching order:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch order',
                error: error.message
            });
        }
    }

    // Create new order
    async createOrder(req, res) {
        try {
            const {
                counterID,
                orderDate,
                subTotal,
                totalCGST,
                totalSGST,
                grandTotal,
                paymentReceived,
                orderDetails
            } = req.body;

            // Validation
            if (!counterID || !orderDetails || !Array.isArray(orderDetails) || orderDetails.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: counterID and orderDetails array'
                });
            }

            // Validate counter exists
            const counterCheck = await dbQuery('SELECT id FROM counters WHERE id = ?', [counterID]);
            if (counterCheck.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid counter ID'
                });
            }

            // Create order
            const orderQuery = `
                INSERT INTO orders (
                    counterID, orderDate, subTotal, totalCGST, totalSGST, 
                    grandTotal, paymentReceived, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `;
            
            const orderResult = await dbQuery(orderQuery, [
                counterID,
                orderDate || new Date().toISOString().split('T')[0],
                subTotal || 0,
                totalCGST || 0,
                totalSGST || 0,
                grandTotal || 0,
                paymentReceived || 0
            ]);

            const orderId = orderResult.insertId;

            // Create order details
            for (const detail of orderDetails) {
                const detailQuery = `
                    INSERT INTO orderdetails (
                        orderId, productId, qty, freeQty, offerPrice, total, 
                        cgst, sgst, discount, createdAt, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `;
                
                await dbQuery(detailQuery, [
                    orderId,
                    detail.productID,
                    detail.quantity || 1,
                    detail.freeQty || 0,
                    detail.rate || 0,
                    detail.totalAmount || 0,
                    detail.cgst || 0,
                    detail.sgst || 0,
                    detail.discount || 0 // Use discount from frontend
                ]);
            }

            // Fetch the created order with all details - simplified approach
            const fetchOrderQuery = `
                SELECT 
                    o.*,
                    c.CounterName as counterName,
                    c.phone as counterPhone,
                    c.address as counterAddress,
                    city.city as counterCity,
                    city.district as counterDistrict,
                    city.state as counterState,
                    u.name as userName
                FROM orders o
                LEFT JOIN counters c ON o.counterID = c.id
                LEFT JOIN city ON c.CityID = city.id
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.id = ?
            `;
            
            const orders = await dbQuery(fetchOrderQuery, [orderId]);
            const newOrderData = orders[0];
            
            if (newOrderData) {
                const orderDetailsQuery = `
                    SELECT 
                        od.*,
                        p.name as productName,
                        p.sku as productSku,
                        p.description as productDescription
                    FROM orderdetails od
                    LEFT JOIN product p ON od.productId = p.id
                    WHERE od.orderId = ?
                    ORDER BY od.id
                `;
                
                const orderDetails = await dbQuery(orderDetailsQuery, [orderId]);
                newOrderData.orderDetails = orderDetails;
                newOrderData.itemCount = orderDetails.length;
                newOrderData.totalQuantity = orderDetails.reduce((sum, item) => sum + (item.qty || 0), 0);
            }

            // Generate invoice
            let invoiceInfo = null;
            try {
                // Get counter information for invoice
                const counterQuery = `
                    SELECT c.*, city.city, city.state 
                    FROM counters c 
                    LEFT JOIN city ON c.CityID = city.id 
                    WHERE c.id = ?
                `;
                const counterResult = await dbQuery(counterQuery, [newOrderData.counterID]);
                const counter = counterResult[0] || {};

                // Prepare invoice data
                const invoiceData = {
                    order: newOrderData,
                    orderDetails: newOrderData.orderDetails,
                    counter: counter
                };

                // Generate invoice file
                invoiceInfo = await invoiceService.generateInvoiceFile(invoiceData);
                
                // Update order with invoice filename
                await dbQuery(
                    'UPDATE orders SET invoiceFileName = ? WHERE id = ?', 
                    [invoiceInfo.fileName, orderId]
                );
                
                newOrderData.invoiceFileName = invoiceInfo.fileName;
                newOrderData.invoiceUrl = invoiceInfo.url;
                
            } catch (invoiceError) {
                console.error('Error generating invoice:', invoiceError);
                // Don't fail the order creation if invoice generation fails
            }

            return res.status(201).json({
                success: true,
                message: 'Order and invoice created successfully',
                data: newOrderData,
                invoice: invoiceInfo
            });

        } catch (error) {
            console.error('Error creating order:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create order',
                error: error.message
            });
        }
    }

    // Update order (header + optional line items)
    async updateOrder(req, res) {
        try {
            const { id } = req.params;
            const {
                counterID,
                orderDate,
                subTotal,
                totalCGST,
                totalSGST,
                grandTotal,
                paymentReceived,
                orderDetails
            } = req.body;

            // Check if order exists
            const existingOrder = await dbQuery('SELECT id FROM orders WHERE id = ?', [id]);
            if (existingOrder.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Basic header update first
            const updateQuery = `
                UPDATE orders SET 
                    counterID = ?, orderDate = ?, subTotal = ?, totalCGST = ?, 
                    totalSGST = ?, grandTotal = ?, paymentReceived = ?, updatedAt = NOW()
                WHERE id = ?
            `;

            await dbQuery(updateQuery, [
                counterID ?? null,
                orderDate ?? null,
                subTotal ?? 0,
                totalCGST ?? 0,
                totalSGST ?? 0,
                grandTotal ?? 0,
                paymentReceived ?? 0,
                id
            ]);

            // If orderDetails provided, replace them
            if (Array.isArray(orderDetails)) {
                // Delete existing details
                await dbQuery('DELETE FROM orderdetails WHERE orderId = ?', [id]);

                // Insert new details
                for (const detail of orderDetails) {
                    const detailQuery = `
                        INSERT INTO orderdetails (
                            orderId, productId, qty, freeQty, offerPrice, total, 
                            cgst, sgst, discount, createdAt, updatedAt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    `;
                    await dbQuery(detailQuery, [
                        id,
                        detail.productID || detail.productId,
                        detail.quantity || detail.qty || 1,
                        detail.freeQty || 0,
                        detail.rate || detail.offerPrice || 0,
                        detail.totalAmount || detail.amount || 0,
                        detail.cgst || 0,
                        detail.sgst || 0,
                        detail.discount || 0
                    ]);
                }
            }

            // Fetch updated order - simplified approach
            const fetchUpdatedOrderQuery = `
                SELECT 
                    o.*,
                    c.CounterName as counterName,
                    c.phone as counterPhone,
                    c.address as counterAddress,
                    city.city as counterCity,
                    city.district as counterDistrict,
                    city.state as counterState,
                    u.name as userName
                FROM orders o
                LEFT JOIN counters c ON o.counterID = c.id
                LEFT JOIN city ON c.CityID = city.id
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.id = ?
            `;
            
            const orders = await dbQuery(fetchUpdatedOrderQuery, [id]);
            const updatedOrderData = orders[0];
            
            if (updatedOrderData) {
                const orderDetailsQuery = `
                    SELECT 
                        od.*,
                        p.name as productName,
                        p.sku as productSku,
                        p.description as productDescription
                    FROM orderdetails od
                    LEFT JOIN product p ON od.productId = p.id
                    WHERE od.orderId = ?
                    ORDER BY od.id
                `;
                
                const orderDetails = await dbQuery(orderDetailsQuery, [id]);
                updatedOrderData.orderDetails = orderDetails;
                updatedOrderData.itemCount = orderDetails.length;
                updatedOrderData.totalQuantity = orderDetails.reduce((sum, item) => sum + (item.qty || 0), 0);
            }

            // Generate fresh invoice after update
            let invoiceInfo = null;
            try {
                // Get counter information for invoice
                const counterQuery = `
                    SELECT c.*, city.city, city.state 
                    FROM counters c 
                    LEFT JOIN city ON c.CityID = city.id 
                    WHERE c.id = ?
                `;
                const counterResult = await dbQuery(counterQuery, [updatedOrderData.counterID]);
                const counter = counterResult[0] || {};

                const invoiceData = {
                    order: updatedOrderData,
                    orderDetails: updatedOrderData.orderDetails || [],
                    counter
                };

                invoiceInfo = await invoiceService.generateInvoiceFile(invoiceData);

                await dbQuery(
                    'UPDATE orders SET invoiceFileName = ?, updatedAt = NOW() WHERE id = ?',
                    [invoiceInfo.fileName, id]
                );

                updatedOrderData.invoiceFileName = invoiceInfo.fileName;
                updatedOrderData.invoiceUrl = invoiceInfo.url;
            } catch (invoiceError) {
                console.error('Error generating invoice on update:', invoiceError);
                // Do not fail the update if invoice generation fails
            }

            return res.status(200).json({
                success: true,
                message: 'Order updated successfully',
                data: updatedOrderData,
                invoice: invoiceInfo
            });

        } catch (error) {
            console.error('Error updating order:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update order',
                error: error.message
            });
        }
    }

    // Delete order
    async deleteOrder(req, res) {
        try {
            const { id } = req.params;

            // Check if order exists
            const existingOrder = await dbQuery('SELECT id FROM orders WHERE id = ?', [id]);
            if (existingOrder.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Delete order details first (foreign key constraint)
            await dbQuery('DELETE FROM orderdetails WHERE orderId = ?', [id]);
            
            // Delete order
            await dbQuery('DELETE FROM orders WHERE id = ?', [id]);

            return res.status(200).json({
                success: true,
                message: 'Order deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting order:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete order',
                error: error.message
            });
        }
    }

    // Helper method to get order by ID (internal use)
    async getOrderByIdInternal(id) {
        const orderQuery = `
            SELECT 
                o.*,
                c.CounterName as counterName,
                c.phone as counterPhone,
                c.address as counterAddress,
                city.city as counterCity,
                city.district as counterDistrict,
                city.state as counterState,
                u.name as userName
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id
            LEFT JOIN city ON c.CityID = city.id
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `;
        
        const orders = await dbQuery(orderQuery, [id]);
        const order = orders[0];
        
        if (order) {
            const orderDetailsQuery = `
                SELECT 
                    od.*,
                    p.name as productName,
                    p.sku as productSku,
                    p.description as productDescription
                FROM orderdetails od
                LEFT JOIN product p ON od.productId = p.id
                WHERE od.orderId = ?
                ORDER BY od.id
            `;
            
            const orderDetails = await dbQuery(orderDetailsQuery, [id]);
            order.orderDetails = orderDetails;
            order.itemCount = orderDetails.length;
            order.totalQuantity = orderDetails.reduce((sum, item) => sum + (item.qty || 0), 0);
        }
        
        return order;
    }

    // Get orders by counter
    async getOrdersByCounter(req, res) {
        try {
            const { counterId } = req.params;
            
            const query = `
                SELECT 
                    o.*,
                    c.CounterName as counterName,
                    u.name as userName
                FROM orders o
                LEFT JOIN counters c ON o.counterID = c.id
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.counterID = ?
                ORDER BY o.orderDate DESC, o.id DESC
            `;
            
            const orders = await dbQuery(query, [counterId]);
            
            return res.status(200).json({
                success: true,
                message: 'Orders retrieved successfully',
                data: orders,
                count: orders.length
            });
            
        } catch (error) {
            console.error('Error fetching orders by counter:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch orders',
                error: error.message
            });
        }
    }

    // Download invoice
    async downloadInvoice(req, res) {
        try {
            const { fileName } = req.params;
            
            // Security check - ensure filename is safe and is a PDF
            if (!fileName || fileName.includes('..') || !fileName.endsWith('.pdf')) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid invoice filename'
                });
            }

            const invoiceFilePath = await invoiceService.getInvoice(fileName);
            
            // Set proper headers for PDF
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
            
            // Stream the PDF file
            const fs = require('fs');
            const fileStream = fs.createReadStream(invoiceFilePath);
            fileStream.pipe(res);
            
        } catch (error) {
            console.error('Error downloading invoice:', error);
            return res.status(404).json({
                success: false,
                message: 'Invoice not found',
                error: error.message
            });
        }
    }
}

module.exports = new OrderController();
