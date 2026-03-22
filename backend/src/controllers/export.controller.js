const Bill = require('../models/Bill');
const Medicine = require('../models/Medicine');
const { Parser } = require('json2csv');

exports.exportBills = async (req, res) => {
  try {
    const bills = await Bill.find().populate('patient').sort({ createdAt: -1 });
    const formattedBills = bills.map(bill => ({
      'Invoice No': bill.invoiceNumber,
      'Date': new Date(bill.createdAt).toLocaleDateString(),
      'Patient Name': bill.patient?.name || 'Walk-in',
      'Patient Mobile': bill.patient?.phone || 'N/A',
      'Doctor Name': bill.doctorName || 'N/A',
      'Total Amount': bill.finalTotal.toFixed(2),
      'Created By': bill.createdBy
    }));

    const json2csv = new Parser();
    const csv = json2csv.parse(formattedBills);

    res.header('Content-Type', 'text/csv');
    res.attachment('Anubhav_Billing_Invoices.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Export Bills Error:', error);
    res.status(500).json({ error: 'Failed to export bills' });
  }
};

exports.exportMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ name: 1 });
    const formattedMeds = medicines.map(med => ({
      'Medicine Name': med.name,
      'Stock Remaining': med.stock,
      'MRP (₹)': med.price,
      'Packing': med.packing || '',
      'Batch No': med.batchNo || '',
      'Expiry': med.exp || '',
      'Created On': new Date(med.createdAt).toLocaleDateString()
    }));

    const json2csv = new Parser();
    const csv = json2csv.parse(formattedMeds);

    res.header('Content-Type', 'text/csv');
    res.attachment('Anubhav_Billing_Inventory.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Export Medicines Error:', error);
    res.status(500).json({ error: 'Failed to export medicines' });
  }
};
