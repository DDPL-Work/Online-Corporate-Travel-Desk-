// middleware/cloudinaryUpload.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isBlog = file.fieldname === "featured_image" || file.fieldname === "image";
    return {
      folder: isBlog ? "blogs" : "travel-documents",
      allowed_formats: ["jpg", "png", "jpeg", "webp", "pdf"],
      transformation: isBlog ? [{ width: 1200, height: 630, crop: "limit" }] : undefined,
    };
  },
});

const upload = multer({ storage });

module.exports = upload;