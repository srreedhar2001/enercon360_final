const { query } = require('../config/database');

class Item {
  constructor(id, name, description, createdAt = new Date(), updatedAt = new Date()) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Static methods for database operations
  static async findAll() {
    try {
      const sql = 'SELECT * FROM items ORDER BY created_at DESC';
      const results = await query(sql);
      return results.map(row => new Item(row.id, row.name, row.description, row.created_at, row.updated_at));
    } catch (error) {
      console.error('Error fetching all items:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const sql = 'SELECT * FROM items WHERE id = ?';
      const results = await query(sql, [id]);
      
      if (results.length === 0) {
        return null;
      }
      
      const row = results[0];
      return new Item(row.id, row.name, row.description, row.created_at, row.updated_at);
    } catch (error) {
      console.error('Error fetching item by ID:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const sql = 'INSERT INTO items (name, description) VALUES (?, ?)';
      const result = await query(sql, [data.name, data.description]);
      
      // Fetch the created item
      return await Item.findById(result.insertId);
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  async update(data) {
    try {
      const sql = 'UPDATE items SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      await query(sql, [
        data.name || this.name,
        data.description || this.description,
        this.id
      ]);
      
      // Update instance properties
      this.name = data.name || this.name;
      this.description = data.description || this.description;
      this.updatedAt = new Date();
      
      return this;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  async delete() {
    try {
      const sql = 'DELETE FROM items WHERE id = ?';
      const result = await query(sql, [this.id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }
}

module.exports = Item;
