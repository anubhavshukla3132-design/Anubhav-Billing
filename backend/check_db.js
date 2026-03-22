require('dotenv').config();
const mongoose = require('mongoose');
const Bill = require('./src/models/Bill');
const Patient = require('./src/models/Patient');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true }).then(async () => {
  console.log("Connected to MongoDB");
  const basePatients = await Patient.find();
  console.log("Base Patients count:", basePatients.length);

  const pipeline = [
    {
      $lookup: {
        from: 'bills',
        localField: '_id',
        foreignField: 'patient',
        as: 'bills'
      }
    },
    {
      $match: { 'bills.0': { $exists: true } }
    }
  ];
  
  const aggPatients = await Patient.aggregate(pipeline);
  console.log("Agg Patients count:", aggPatients.length);

  for (const p of basePatients) {
    const bills = await Bill.find({ patient: p._id });
    console.log(`- Patient: ${p.name}, ID: ${p._id}, Bills count: ${bills.length}`);
  }
  
  process.exit(0);
}).catch(console.error);
