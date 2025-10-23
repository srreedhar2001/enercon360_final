const express = require('express');
const router = express.Router();
const drWorkLogController = require('../controllers/drWorkLogController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get(
  '/representative/:repId/summary',
  drWorkLogController.getRepresentativeSummary.bind(drWorkLogController)
);

router.get(
  '/representative/:repId/month/:yearMonth',
  drWorkLogController.getRepresentativeMonthLogs.bind(drWorkLogController)
);

router.post('/', drWorkLogController.createDoctorLog.bind(drWorkLogController));

module.exports = router;
