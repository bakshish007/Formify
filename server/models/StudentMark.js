const mongoose = require("mongoose");

const studentMarkSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    marks: { type: Number, required: true, min: 0, max: 100 }
  },
  { timestamps: true }
);

studentMarkSchema.index({ groupId: 1, studentId: 1, teacherId: 1 }, { unique: true });

module.exports = mongoose.model("StudentMark", studentMarkSchema);
