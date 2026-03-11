const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getMyAccess, listDesignations, listModules, getDesignationPermissions, setDesignationPermissions } = require('../controllers/accessController');

router.use(verifyToken);

// GET /api/access/me -> { modules: [...] }
router.get('/me', getMyAccess);

// Admin-ish endpoints: list designations and modules
router.get('/designations', listDesignations);
router.get('/modules', listModules);

// Permissions by designation
router.get('/permissions/:designationId', getDesignationPermissions);
router.post('/permissions/:designationId', setDesignationPermissions);

module.exports = router;
