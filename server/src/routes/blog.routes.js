const express = require("express");
const {
  createBlog,
  deleteBlog,
  getOneBlog,
  getAllBlogs,
  updateBlog,
} = require("../controllers/blog.controller");
const router = express.Router();

const { verifyToken } = require("../middleware/auth.middleware");
const cloudinaryUpload = require("../middleware/cloudinaryUpload");

router.post("/create", verifyToken, cloudinaryUpload.single("featured_image"), createBlog);
router.post("/upload-editor-image", verifyToken, cloudinaryUpload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }
  // req.file.path will be the cloudinary URL when using multer-storage-cloudinary
  res.status(200).json({ success: true, url: req.file.path });
});
router.get("/all", getAllBlogs);
router.get("/one", getOneBlog);
router.delete("/delete/:id", verifyToken, deleteBlog);
router.put("/update/:id", verifyToken, cloudinaryUpload.single("featured_image"), updateBlog);

module.exports = router;