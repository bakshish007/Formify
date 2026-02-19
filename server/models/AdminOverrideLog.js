const mongoose = require("mongoose");

const adminOverrideLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    action: { type: String, required: true, trim: true },
    from: { type: mongoose.Schema.Types.Mixed },
    to: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminOverrideLog", adminOverrideLogSchema);

