const mongoose = require("mongoose");

const groupMarkSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    marks: { type: Number, required: true, min: 0, max: 100 },
    remarks: { type: String, trim: true }
  },
  { timestamps: true }
);

groupMarkSchema.index({ groupId: 1, teacherId: 1 }, { unique: true });

module.exports = mongoose.model("GroupMark", groupMarkSchema);

