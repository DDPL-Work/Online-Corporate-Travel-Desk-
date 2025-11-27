const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
const fs = require("fs");
const mime = require("mime-types"); // to detect content-type

// Ensure your .env includes:
// AWS_ACCESS_KEY_ID=
// AWS_SECRET_ACCESS_KEY=
// AWS_REGION=
// AWS_S3_BUCKET=

// Create S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload File to S3
 * @param {*} file — multer file object { path, originalname, buffer }
 */
exports.uploadFile = async (file) => {
  if (!file) throw new Error("No file received for upload");

  const fileContent = file.buffer || fs.readFileSync(file.path);
  const fileExt = path.extname(file.originalname);
  const contentType = mime.lookup(fileExt) || "application/octet-stream";

  const fileName = `corporate/kyc/${Date.now()}-${file.originalname}`;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileName,
    Body: fileContent,
    ContentType: contentType,
  };

  await s3.send(new PutObjectCommand(params));

  // Return public S3 URL
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
};


/**
 * Delete a file from S3
 */
exports.deleteFile = async (fileKey) => {
  if (!fileKey) return;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileKey,
  };

  await s3.send(new DeleteObjectCommand(params));
};
