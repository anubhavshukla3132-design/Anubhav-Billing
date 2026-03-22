const express = require('express');
const router = express.Router();
const { searchMedicines, addMedicine, getMedicines, updateMedicine, deleteMedicine } = require('../controllers/medicine.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// Protect all medicine routes
router.use(requireAuth);

router.get('/', getMedicines);
router.get('/search', searchMedicines);
router.post('/', addMedicine);
router.put('/:id', updateMedicine);
router.delete('/:id', deleteMedicine);

module.exports = router;
