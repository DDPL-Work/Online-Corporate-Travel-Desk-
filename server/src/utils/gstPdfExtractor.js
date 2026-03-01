const fs = require("fs");
const pdf = require("pdf-parse");

exports.extractGSTFromPdf = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);

  const text = data.text;

  // ───────── GSTIN ─────────
  const gstRegex = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/;

  const gstinMatch = text.match(gstRegex);

  // ───────── LEGAL NAME (Multiple Patterns) ─────────
  let legalName = null;

  const legalPatterns = [
    // 1. Legal Name CONSUMER UNITY AND TRUST SOCIETY
    /Legal Name\s+([^\n]+)/i,

    // 1. Legal Name of Business ABC Travels Pvt Ltd
    /Legal Name of Business\s+([^\n]+)/i,

    // Legal Name: ABC Travels Pvt Ltd
    /Legal Name\s*:\s*([^\n]+)/i,

    // Legal Name\nABC Travels Pvt Ltd
    /Legal Name\s*\n\s*([^\n]+)/i,

    /Legal Name of Business\s*:?[\s\n]*([^\n\r]+?)(?=\s*\d+\.|\s*Trade Name|\s*Constitution|$)/i,
    /Legal Name\s*:?[\s\n]*([^\n\r]+?)(?=\s*\d+\.|\s*Trade Name|\s*Constitution|$)/i,
  ];

  for (const pattern of legalPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      legalName = match[1].trim();
      break;
    }
  }

  // ───────── ADDRESS (Multiple Patterns) ─────────
  let address = null;

  const addressPatterns = [
    // Numbered format
    /Address of Principal Place of[\s\S]*?Business\s+([\s\S]*?)\n\s*\d+\./i,

    // Colon format
    /Address of Principal Place of Business\s*:\s*([\s\S]*?)(?=\n\s*\d+\.|\n\s*Nature|\n\s*Jurisdiction|$)/i,

    // Simpler fallback
    /Principal Place of Business\s+([\s\S]*?)\n\s*\d+\./i,
  ];

  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      address = match[1].replace(/\n/g, " ").replace(/\s+/g, " ").trim();
      break;
    }
  }

  return {
    gstin: gstinMatch ? gstinMatch[0] : null,
    legalName,
    address,
  };
};
