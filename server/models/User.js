const mongoose = require("mongoose");

const ROLES = ["Student", "Teacher", "Admin"];

const userSchema = new mongoose.Schema(
  {
    rollNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },

    // Teacher-only
    teacherCapacity: { type: Number, default: 0, min: 0 },
    assignedGroupsCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;

