const mongoose = require("mongoose");
const crypto = require("crypto");

const GROUP_STATUSES = ["Allocated", "Pending"];

const groupSchema = new mongoose.Schema(
  {
    groupId: { type: String, required: true, unique: true, index: true },
    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    memberRollNumbers: [{ type: String, trim: true, uppercase: true, index: true }],
    expectedPartnerRollNumbers: [{ type: String, trim: true, uppercase: true, index: true }],

    universalProjectTitle: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    techStack: { type: String, required: true, trim: true },
    projectDescription: { type: String, trim: true },
    expectedOutcomes: { type: String, trim: true },
    sdgMapping: { type: String, trim: true },
    projectDomainOther: { type: String, trim: true },

    teacherPreferences: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    assignedSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    status: { type: String, enum: GROUP_STATUSES, default: "Pending", index: true },
    flaggedForAdmin: { type: Boolean, default: false, index: true },
    flagReason: { type: String, trim: true }
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

groupSchema.pre("validate", function preValidate(next) {
  if (!this.groupId) this.groupId = `G-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  next();
});

module.exports = mongoose.model("Group", groupSchema);
module.exports.GROUP_STATUSES = GROUP_STATUSES;

