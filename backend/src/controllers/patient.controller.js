const Patient = require('../models/Patient');
const Bill = require('../models/Bill');

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private
const getPatients = async (req, res) => {
  try {
    const search = req.query.search || '';
    const pipeline = [];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Lookup bills for the patient
    pipeline.push({
      $lookup: {
        from: 'bills',
        localField: '_id',
        foreignField: 'patient',
        as: 'bills'
      }
    });

    // Only keep patients with at least 1 bill
    pipeline.push({
      $match: {
        bills: { $ne: [] }
      }
    });

    // Remove the large bills array from the payload, we just needed it for filtering
    pipeline.push({
      $project: {
        bills: 0
      }
    });

    pipeline.push({ $sort: { createdAt: -1 } });

    const patients = await Patient.aggregate(pipeline);
    res.json(patients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
};

// @desc    Get single patient with billing history
// @route   GET /api/patients/:id/history
// @access  Private
const getPatientHistory = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const bills = await Bill.find({ patient: req.params.id }).sort({ createdAt: -1 });
    
    // Calculate LTV
    const totalSpent = bills.reduce((sum, bill) => sum + (bill.finalTotal || 0), 0);

    res.json({
      patient,
      totalSpent,
      history: bills
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch patient history' });
  }
};

module.exports = {
  getPatients,
  getPatientHistory
};
