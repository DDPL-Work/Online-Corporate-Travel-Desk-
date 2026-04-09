const Corporate = require('../models/Corporate');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/* =====================================================
   GET ALL USERS UNDER CORPORATE
===================================================== */
exports.getCorporateUsers = asyncHandler(async (req, res) => {
  const corporateId = req.user.corporateId;

  const users = await User.find({ corporateId })
    .select('-password -passwordResetToken -passwordResetExpires')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, users, "Corporate users fetched")
  );
});

/* =====================================================
   ACTIVATE / DEACTIVATE USER
   (Employee OR Travel Admin)
===================================================== */
exports.toggleUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const corporateId = req.user.corporateId;

  const user = await User.findOne({ _id: userId, corporateId });

  if (!user) throw new ApiError(404, "User not found");

  if (user.role === 'corporate-super-admin')
    throw new ApiError(403, "Cannot deactivate corporate super admin");

  user.isActive = !user.isActive;
  await user.save();

  res.status(200).json(
    new ApiResponse(
      200,
      user,
      `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
    )
  );
});

/* =====================================================
   UPDATE TRAVEL ADMIN (Change Secondary Email)
===================================================== */
exports.changeTravelAdmin = asyncHandler(async (req, res) => {
  const { email, name, mobile } = req.body;
  const corporateId = req.user.corporateId;

  if (!email) throw new ApiError(400, "Travel admin email required");

  const corporate = await Corporate.findById(corporateId);
  if (!corporate) throw new ApiError(404, "Corporate not found");

  const oldEmail = corporate.secondaryContact?.email?.toLowerCase();
  const newEmail = email.toLowerCase();

  // 1️⃣ Update corporate secondary contact
  corporate.secondaryContact = {
    email: newEmail,
    name: name || '',
    mobile: mobile || ''
  };

  await corporate.save();

  // 2️⃣ Demote old travel admin (if exists)
  if (oldEmail) {
    const oldUser = await User.findOne({ email: oldEmail, corporateId });
    if (oldUser && oldUser.role === 'travel-admin') {
      oldUser.role = 'employee';
      await oldUser.save();
    }
  }

  // 3️⃣ Promote or create new travel admin
  let newUser = await User.findOne({ email: newEmail, corporateId });

  if (newUser) {
    newUser.role = 'travel-admin';
    newUser.isActive = true;
    await newUser.save();
  } else {
    newUser = await User.create({
      email: newEmail,
      corporateId,
      role: 'travel-admin',
      isActive: true,
      name: {
        firstName: name?.split(' ')[0] || '',
        lastName: name?.split(' ').slice(1).join(' ') || ''
      }
    });
  }

  res.status(200).json(
    new ApiResponse(200, newUser, "Travel admin updated successfully")
  );
});

/* =====================================================
   UPDATE TRAVEL POLICY
===================================================== */
exports.updateTravelPolicy = asyncHandler(async (req, res) => {
  const corporateId = req.user.corporateId;
  const corporate = await Corporate.findById(corporateId);

  if (!corporate) throw new ApiError(404, "Corporate not found");

  corporate.travelPolicy = {
    ...corporate.travelPolicy,
    ...req.body
  };

  await corporate.save();

  res.status(200).json(
    new ApiResponse(200, corporate.travelPolicy, "Travel policy updated")
  );
});

/* =====================================================
   GET CORPORATE DASHBOARD DATA
===================================================== */
exports.getCorporateDashboard = asyncHandler(async (req, res) => {
  const corporateId = req.user.corporateId;

  const corporate = await Corporate.findById(corporateId);
  if (!corporate) throw new ApiError(404, "Corporate not found");

  const userCount = await User.countDocuments({ corporateId });
  const employeeCount = await User.countDocuments({ corporateId, role: 'employee' });
  const travelAdminCount = await User.countDocuments({ corporateId, role: 'travel-admin' });

  res.status(200).json(
    new ApiResponse(200, {
      corporate,
      userCount,
      employeeCount,
      travelAdminCount
    }, "Dashboard data fetched")
  );
});
