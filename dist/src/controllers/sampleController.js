// Sample controller with basic CRUD operations
const itemService = require('../services/itemService');

const sampleController = {
  // GET all items
  getAll: async (req, res) => {
    try {
      const data = await itemService.getAllItems();
      
      res.status(200).json({
        success: true,
        data: data,
        count: data.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET single item by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const item = await itemService.getItemById(id);
      
      res.status(200).json({
        success: true,
        data: item
      });
    } catch (error) {
      const statusCode = error.message === 'Error fetching item: Item not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  },

  // POST create new item
  create: async (req, res) => {
    try {
      const { name, description } = req.body;
      
      const newItem = await itemService.createItem({ name, description });
      
      res.status(201).json({
        success: true,
        data: newItem,
        message: 'Item created successfully'
      });
    } catch (error) {
      const statusCode = error.message.includes('Name is required') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  },

  // PUT update item
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      
      const updatedItem = await itemService.updateItem(id, { name, description });
      
      res.status(200).json({
        success: true,
        data: updatedItem,
        message: 'Item updated successfully'
      });
    } catch (error) {
      const statusCode = error.message === 'Error updating item: Item not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  },

  // DELETE item
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      await itemService.deleteItem(id);
      
      res.status(200).json({
        success: true,
        message: `Item with ID ${id} deleted successfully`
      });
    } catch (error) {
      const statusCode = error.message === 'Error deleting item: Item not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = sampleController;
