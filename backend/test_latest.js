const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });
const Bill = require('./src/models/Bill');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const latest = await Bill.findOne().sort({ createdAt: -1 }).lean();
    console.log(JSON.stringify(latest, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
