// Sample service layer - business logic goes here
const Item = require('../models/Item');

const itemService = {
  async getAllItems() {
    try {
      return await Item.findAll();
    } catch (error) {
      throw new Error(`Error fetching items: ${error.message}`);
    }
  },

  async getItemById(id) {
    try {
      const item = await Item.findById(id);
      if (!item) {
        throw new Error('Item not found');
      }
      return item;
    } catch (error) {
      throw new Error(`Error fetching item: ${error.message}`);
    }
  },

  async createItem(itemData) {
    try {
      // Validate data
      if (!itemData.name || itemData.name.trim() === '') {
        throw new Error('Name is required');
      }
      
      return await Item.create(itemData);
    } catch (error) {
      throw new Error(`Error creating item: ${error.message}`);
    }
  },

  async updateItem(id, itemData) {
    try {
      const item = await Item.findById(id);
      if (!item) {
        throw new Error('Item not found');
      }
      
      return await item.update(itemData);
    } catch (error) {
      throw new Error(`Error updating item: ${error.message}`);
    }
  },

  async deleteItem(id) {
    try {
      const item = await Item.findById(id);
      if (!item) {
        throw new Error('Item not found');
      }
      
      return await item.delete();
    } catch (error) {
      throw new Error(`Error deleting item: ${error.message}`);
    }
  }
};

module.exports = itemService;
