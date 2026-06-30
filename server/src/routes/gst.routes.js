const express = require("express");
const multer = require("multer");
const { extractGSTFromPdf } = require("../utils/gstPdfExtractor");

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post(
  "/preview",
  upload.single("gstCertificate"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File required" });
      }

      const extracted = await extractGSTFromPdf(req.file.path);

      return res.json({
        success: true,
        data: extracted,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Extraction failed",
      });
    }
  },
);

module.exports = router;