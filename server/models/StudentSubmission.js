const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    originalName: String,
    filename: String,
    mimetype: String,
    size: Number,
    path: String
  },
  { _id: false }
);

const studentSubmissionSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },

    name: { type: String, trim: true },
    universityRollNo: { type: String, trim: true, uppercase: true },
    mobile: { type: String, trim: true },
    member1Roll: { type: String, trim: true, uppercase: true },
    member2Roll: { type: String, trim: true, uppercase: true },
    member1Name: { type: String, trim: true },
    member2Name: { type: String, trim: true },
    projectDomain: { type: String, trim: true },
    projectDomainOther: { type: String, trim: true },
    tentativeProjectTitle: { type: String, trim: true },
    projectDescription: { type: String, trim: true },
    technologyStack: { type: String, trim: true },
    expectedOutcomes: { type: String, trim: true },
    previousExperience: { type: String, trim: true },
    agreement: { type: Boolean },
    sdgMapping: { type: String, trim: true },
    supervisorPreference: { type: String, trim: true, uppercase: true },
    teacherPreferences: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: { type: String, trim: true },

    synopsisFile: fileSchema,
    presentationFile: fileSchema,

    submissionTimestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentSubmission", studentSubmissionSchema);

