const User = require("../models/User");

async function tryAllocateSupervisor({ teacherPreferenceIds }) {
  for (const teacherId of teacherPreferenceIds) {
    // Atomically increment only if under capacity
    // eslint-disable-next-line no-await-in-loop
    const teacher = await User.findOneAndUpdate(
      {
        _id: teacherId,
        role: "Teacher",
        $expr: { $lt: ["$assignedGroupsCount", "$teacherCapacity"] }
      },
      { $inc: { assignedGroupsCount: 1 } },
      { new: true }
    );
    if (teacher) {
      return { teacher };
    }
  }
  return { teacher: null };
}

module.exports = { tryAllocateSupervisor };

