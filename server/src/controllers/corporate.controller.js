const Corporate = require('../models/Corporate');
const s3 = require('../config/aws'); // wrapper for S3 uploads

exports.createCorporate = async (req, res, next) => {
  // validate input with Joi
  const { name, registeredAddress, primaryContact, ssoType, domain } = req.body;
  const corp = new Corporate({
    name, registeredAddress, domain,
    sso: { type: ssoType, enabled: !!ssoType }
  });

  // upload files if present (req.files.gst, req.files.pan)
  if (req.files?.gst) {
    corp.kyc.gstUrl = await s3.uploadFile(req.files.gst);
  }
  if (req.files?.pan) {
    corp.kyc.panUrl = await s3.uploadFile(req.files.pan);
  }

  await corp.save();
  // send notification to travel company admins for manual verification
  res.status(201).json({ corporate: corp });
};
