const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const {
  listMyGroups,
  getLatestSubmissionForGroup,
  getAllSubmissionsForGroup,
  getMyMarks,
  upsertStudentMark
} = require("../controllers/teacherController");

const router = express.Router();

router.use(protect, requireRole("Teacher"));

router.get("/groups", listMyGroups);
router.get("/groups/:groupId/submissions/latest", getLatestSubmissionForGroup);
router.get("/groups/:groupId/submissions", getAllSubmissionsForGroup);
router.get("/groups/:groupId/marks", getMyMarks);
router.patch("/groups/:groupId/marks/:studentId", upsertStudentMark);

module.exports = router;

