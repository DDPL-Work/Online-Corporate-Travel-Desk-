// utils/ocr.js
const Tesseract = require("tesseract.js");

exports.extractTextFromImage = async (fileUrl) => {
  const { data } = await Tesseract.recognize(fileUrl, "eng", {
    logger: (m) => console.log(m),
  });

  return data.text;
};