const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const {
  submitProject,
  getMyGroup,
  uploadMyFiles,
  getLatestMySubmission,
  listTeachers
} = require("../controllers/studentController");

const router = express.Router();

router.use(protect, requireRole("Student"));

router.get("/me", getMyGroup);
router.get("/submissions/latest", getLatestMySubmission);
router.get("/teachers", listTeachers);
router.post(
  "/submit",
  upload.fields([
    { name: "synopsis", maxCount: 1 },
    { name: "presentation", maxCount: 1 }
  ]),
  submitProject
);
router.post(
  "/upload",
  upload.fields([
    { name: "synopsis", maxCount: 1 },
    { name: "presentation", maxCount: 1 }
  ]),
  uploadMyFiles
);

module.exports = router;

