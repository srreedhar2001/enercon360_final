const User = require('../models/User');

const getAllUsers = async (req, res) => {
    try {
        const users = await User.getAll();
        res.json({
            success: true,
            message: 'Users retrieved successfully',
            data: users
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User retrieved successfully',
            data: user
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const createUser = async (req, res) => {
    try {
        const { name, mobile, email, username, designation_id, managerID, salary, allowance, registered } = req.body;

        // Basic validation
        if (!name || !mobile || !email || !designation_id) {
            return res.status(400).json({
                success: false,
                message: 'Required fields are missing'
            });
        }

        // Create user
        const userId = await User.createComplete({
            name,
            mobile,
            email,
            username: username || mobile,
            designation_id,
            managerID: designation_id == 2 ? managerID : null,
            salary: salary || 0,
            allowance: allowance || 0,
            registered: registered !== undefined ? registered : 1
        });

        const newUser = await User.findById(userId);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: newUser
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, mobile, email, username, designation_id, managerID, salary, allowance, registered } = req.body;

        // Check if user exists
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user
        await User.update(id, {
            name,
            mobile,
            email,
            username: username || mobile,
            designation_id,
            managerID: designation_id == 2 ? managerID : null,
            salary: salary || 0,
            allowance: allowance || 0,
            registered: registered !== undefined ? registered : existingUser.registered
        });

        const updatedUser = await User.findById(id);

        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete user
        await User.delete(id);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getUsersByDesignation = async (req, res) => {
    try {
        const { designation_id } = req.params;
        
        const users = await User.getByDesignation(designation_id);

        res.json({
            success: true,
            message: 'Users retrieved successfully',
            data: users
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUsersByDesignation
};
