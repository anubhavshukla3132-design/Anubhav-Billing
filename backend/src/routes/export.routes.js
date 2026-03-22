const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);
router.get('/bills', exportController.exportBills);
router.get('/medicines', exportController.exportMedicines);

module.exports = router;
