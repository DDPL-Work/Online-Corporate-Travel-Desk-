// models/Sequence.model.js

const mongoose = require("mongoose");

const sequenceSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  number: { type: Number, default: 0 }, // 000 → 999
  alpha: { type: String, default: "AAA" }, // AAA → ZZZ
});

module.exports = mongoose.model("Sequence", sequenceSchema);
