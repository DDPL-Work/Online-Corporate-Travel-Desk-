// models/Project.model.js

const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corporate",
      required: true,
      index: true, 
    },

    projectName: {
      type: String,
      required: true,
      trim: true,
      index: true, 
    },

    projectCodeId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    clientName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "travel-admin",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
