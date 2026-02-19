const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/asyncHandler");
const { signToken } = require("../utils/jwt");

function normalizeRoll(roll) {
  return String(roll || "").trim().toUpperCase();
}

const seedAdmin = asyncHandler(async (req, res) => {
  const { seedKey } = req.body || {};
  if (!seedKey || seedKey !== process.env.ADMIN_SEED_KEY) {
    return res.status(403).json({ message: "Invalid seed key" });
  }

  const rollNumber = normalizeRoll(process.env.ADMIN_ROLL || "ADMIN001");
  const name = process.env.ADMIN_NAME || "Admin";
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";

  const existing = await User.findOne({ rollNumber });
  if (existing) return res.json({ ok: true, message: "Admin already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({
    rollNumber,
    name,
    role: "Admin",
    passwordHash
  });

  return res.status(201).json({ ok: true, message: "Admin seeded", rollNumber });
});

const login = asyncHandler(async (req, res) => {
  const { rollNumber, password } = req.body || {};
  const roll = normalizeRoll(rollNumber);

  if (!roll || !password) {
    return res.status(400).json({ message: "rollNumber and password are required" });
  }

  const user = await User.findOne({ rollNumber: roll });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = signToken({ userId: user._id.toString(), role: user.role, rollNumber: user.rollNumber });
  return res.json({
    token,
    user: { id: user._id, rollNumber: user.rollNumber, name: user.name, role: user.role }
  });
});

module.exports = { seedAdmin, login };

