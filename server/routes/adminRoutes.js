const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const {
  createUser,
  updateTeacherCapacity,
  updateTeacher,
  deleteTeacher,
  listTeachers,
  listStudents,
  updateStudent,
  deleteStudent,
  listAllGroups,
  listFlaggedGroups,
  resetGroupSupervisor,
  deleteGroup,
  overrideSupervisor,
  listOverrideLogs,
  exportGroupsExcel,
  getGroupSubmissions,
  getAllSubmissions
} = require("../controllers/adminController");

const router = express.Router();

router.use(protect, requireRole("Admin"));

router.post("/users", createUser);
router.patch("/teachers/:teacherId/capacity", updateTeacherCapacity);
router.patch("/teachers/:teacherId", updateTeacher);
router.delete("/teachers/:teacherId", deleteTeacher);
router.get("/teachers", listTeachers);
router.get("/students", listStudents);
router.patch("/students/:studentId", updateStudent);
router.delete("/students/:studentId", deleteStudent);

router.get("/groups", listAllGroups);
router.get("/groups/flagged", listFlaggedGroups);
router.get("/groups/:groupId/submissions", getGroupSubmissions);
router.patch("/groups/:groupId/reset-supervisor", resetGroupSupervisor);
router.delete("/groups/:groupId", deleteGroup);
router.patch("/groups/:groupId/override-supervisor", overrideSupervisor);

router.get("/submissions", getAllSubmissions);
router.get("/override-logs", listOverrideLogs);
router.get("/export/groups", exportGroupsExcel);

module.exports = router;

