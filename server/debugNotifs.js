const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Notification = require('./src/models/Notification');
  const Employee = require('./src/models/User');

  const employee = await Employee.findOne({ role: 'employee' });
  console.log('Employee:', employee.name);

  const notifs = await Notification.find({
    corporateId: employee.corporateId,
    $or: [
      { recipient: employee._id },
      { recipientRole: employee.role }
    ]
  }).limit(5);

  console.log('Notifications count for employee:', await Notification.countDocuments({ corporateId: employee.corporateId, $or: [{ recipient: employee._id }, { recipientRole: employee.role }] }));

  console.log('Sample notifs:', notifs.map(n => ({
    title: n.title,
    recipient: n.recipient,
    recipientRole: n.recipientRole
  })));

  process.exit(0);
});
