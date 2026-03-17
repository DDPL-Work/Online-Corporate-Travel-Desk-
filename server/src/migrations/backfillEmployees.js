const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({ role: 'employee' });
  for (const u of users) {
    const exists = await Employee.findOne({ userId: u._id });
    if (!exists) {
      await Employee.create({
        userId: u._id,
        corporateId: u.corporateId,
        name: `${u.name.firstName || ''} ${u.name.lastName || ''}`.trim() || u.email.split('@')[0],
        email: u.email,
        mobile: '',
        department: '',
        designation: '',
        status: 'active'
      });
      console.log('Created Employee for', u.email);
    }
  }
  console.log('Done');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
