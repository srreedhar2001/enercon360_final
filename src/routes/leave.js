const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { verifyToken } = require('../middleware');

// Leave Types Routes
router.get('/types', verifyToken, leaveController.getLeaveTypes);
router.post('/types', verifyToken, leaveController.createLeaveType);
router.put('/types/:id', verifyToken, leaveController.updateLeaveType);

// Leave Balance Routes
router.get('/balance', verifyToken, leaveController.getLeaveBalance);
router.get('/balance/:userId', verifyToken, leaveController.getLeaveBalance);
router.post('/balance/initialize', verifyToken, leaveController.initializeLeaveBalances);

// Leave Request Routes
router.post('/requests', verifyToken, leaveController.createLeaveRequest);
router.get('/requests', verifyToken, leaveController.getLeaveRequests);
router.get('/requests/:userId', verifyToken, leaveController.getLeaveRequests);
router.get('/requests/all/list', verifyToken, leaveController.getAllLeaveRequests);
router.delete('/requests/:id', verifyToken, leaveController.deleteLeaveRequest);

// Leave Summary
router.get('/summary', verifyToken, leaveController.getLeaveSummary);
router.get('/summary/:userId', verifyToken, leaveController.getLeaveSummary);

module.exports = router;
