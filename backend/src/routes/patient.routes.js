const express = require('express');
const router = express.Router();
const { getPatients, getPatientHistory } = require('../controllers/patient.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);
router.get('/', getPatients);
router.get('/:id/history', getPatientHistory);

module.exports = router;
