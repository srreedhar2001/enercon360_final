const express = require('express');
const router = express.Router();
const UserLogController = require('../controllers/userLogController');
const { verifyToken } = require('../middleware');

router.use(verifyToken);

router.get('/', UserLogController.list);

module.exports = router;
