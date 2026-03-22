const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' }, // optional
  name: { type: String, required: true },
  packing: { type: String },
  batchNo: { type: String },
  exp: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  mrp: { type: Number },
  discount: { type: Number },
  price: { type: Number }, // usually mrp
  total: { type: Number, required: true }
});

const billSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  billDate: { type: String }, // e.g. "22/03/2026"
  doctorName: { type: String },
  prescription: { type: String },
  items: [billItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  finalTotal: { type: Number, required: true },
  upiQrCodeUrl: { type: String }, 
  createdBy: { type: String, required: true }, // e.g., 'Admin'
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Bill', billSchema);
