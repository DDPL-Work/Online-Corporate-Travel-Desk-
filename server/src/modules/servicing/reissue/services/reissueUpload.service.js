const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const cloudinary = require("../../../../config/cloudinary");

const uploadsRoot = path.resolve(process.cwd(), "uploads", "reissue");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const sanitizeName = (value = "") =>
  String(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const getProvider = () => {
  const explicit = String(process.env.REISSUE_UPLOAD_PROVIDER || "").trim().toLowerCase();
  if (explicit) return explicit;

  if (
    process.env.SPACES_BUCKET &&
    process.env.SPACES_ENDPOINT &&
    process.env.SPACES_ACCESS_KEY_ID &&
    process.env.SPACES_SECRET_ACCESS_KEY
  ) {
    return "spaces";
  }

  if (
    process.env.AWS_S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION
  ) {
    return "s3";
  }

  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    return "cloudinary";
  }

  return "local";
};

const buildRemoteS3Client = (provider) => {
  if (provider === "spaces") {
    return new S3Client({
      region: process.env.SPACES_REGION || "us-east-1",
      endpoint: process.env.SPACES_ENDPOINT,
      forcePathStyle: false,
      credentials: {
        accessKeyId: process.env.SPACES_ACCESS_KEY_ID,
        secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY,
      },
    });
  }

  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

class ReissueUploadService {
  async uploadArtifact(file, type) {
    if (!file) throw new Error("File is required");

    const provider = getProvider();

    if (provider === "cloudinary") {
      return this.uploadToCloudinary(file, type);
    }

    if (provider === "s3" || provider === "spaces") {
      return this.uploadToObjectStorage(file, type, provider);
    }

    return this.uploadToLocal(file, type);
  }

  async uploadToCloudinary(file, type) {
    if (file.path && /^https?:\/\//.test(file.path)) {
      return {
        url: file.path,
        publicId: file.filename || file.public_id || "",
        fileName: file.originalname || file.display_name || `${type}.pdf`,
        mimeType: file.mimetype,
        size: file.size,
        storageProvider: "cloudinary",
      };
    }

    const result = await cloudinary.uploader.upload(file.path, {
      folder: `servicing/reissue/${type}`,
      resource_type: "auto",
      use_filename: true,
      unique_filename: true,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      fileName: file.originalname || result.original_filename,
      mimeType: file.mimetype,
      size: file.size,
      storageProvider: "cloudinary",
    };
  }

  async uploadToObjectStorage(file, type, provider) {
    const client = buildRemoteS3Client(provider);
    const bucket =
      provider === "spaces" ? process.env.SPACES_BUCKET : process.env.AWS_S3_BUCKET;
    const region =
      provider === "spaces"
        ? process.env.SPACES_REGION || "us-east-1"
        : process.env.AWS_REGION;
    const key = [
      "servicing",
      "reissue",
      type,
      `${Date.now()}-${sanitizeName(file.originalname || `${type}.pdf`)}`,
    ].join("/");

    const body = file.buffer || fs.readFileSync(file.path);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: file.mimetype || "application/octet-stream",
      }),
    );

    const url =
      provider === "spaces"
        ? `${String(process.env.SPACES_CDN_URL || process.env.SPACES_ENDPOINT).replace(/\/$/, "")}/${key}`
        : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return {
      url,
      publicId: key,
      fileName: file.originalname || `${type}.pdf`,
      mimeType: file.mimetype,
      size: file.size,
      storageProvider: provider,
    };
  }

  async uploadToLocal(file, type) {
    const targetDir = path.join(uploadsRoot, type);
    ensureDir(targetDir);

    const extension = path.extname(file.originalname || file.filename || "") || ".bin";
    const fileName = `${Date.now()}-${sanitizeName(path.basename(file.originalname || file.filename || type, extension))}${extension}`;
    const targetPath = path.join(targetDir, fileName);

    if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, targetPath);
    } else {
      throw new Error("Uploaded file content is missing");
    }

    return {
      url: null,
      publicId: null,
      localPath: targetPath,
      fileName: file.originalname || fileName,
      mimeType: file.mimetype,
      size: file.size,
      storageProvider: "local",
    };
  }
}

module.exports = new ReissueUploadService();
