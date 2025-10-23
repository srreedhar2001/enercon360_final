const express = require('express');
const router = express.Router();
const repWorkLogController = require('../controllers/repWorkLogController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get(
	'/representative/:repId/summary',
	repWorkLogController.getRepresentativeSummary.bind(repWorkLogController)
);
router.get(
	'/representative/:repId/month/:yearMonth',
	repWorkLogController.getRepresentativeMonthLogs.bind(repWorkLogController)
);
router.post('/', repWorkLogController.createWorkLog.bind(repWorkLogController));

module.exports = router;
