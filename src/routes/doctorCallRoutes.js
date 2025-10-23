const express = require('express');
const router = express.Router();
const DoctorCallController = require('../controllers/doctorCallController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', DoctorCallController.list);
router.post('/', DoctorCallController.create);
router.get('/:id', DoctorCallController.get);
router.put('/:id', DoctorCallController.update);
router.patch('/:id/status', DoctorCallController.setStatus);

module.exports = router;
