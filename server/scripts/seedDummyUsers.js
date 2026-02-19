/* Seed some dummy users into MongoDB (Atlas or local).
 * Uses MONGO_URI from server/.env
 */

const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const { connectDb } = require("../config/db");
const User = require("../models/User");

async function main() {
  dotenv.config({ path: path.join(__dirname, "..", ".env") });

  const uri = process.env.MONGO_URI;
  if (!uri) {
    // eslint-disable-next-line no-console
    console.error("Missing MONGO_URI in server/.env");
    process.exit(1);
  }

  await connectDb(uri);

  const password = "Password@123";
  const passwordHash = await bcrypt.hash(password, 10);

  const dummyUsers = [
    // Admin
    {
      rollNumber: "ADMIN001",
      name: "Admin User",
      role: "Admin"
    },
    // Teachers
    {
      rollNumber: "TCH1001",
      name: "Prof. Alice Mentor",
      role: "Teacher",
      teacherCapacity: 5
    },
    {
      rollNumber: "TCH1002",
      name: "Prof. Bob Guide",
      role: "Teacher",
      teacherCapacity: 5
    },
    {
      rollNumber: "TCH1003",
      name: "Prof. Carol Supervisor",
      role: "Teacher",
      teacherCapacity: 4
    },
    // Students
    {
      rollNumber: "STU2001",
      name: "Student One",
      role: "Student"
    },
    {
      rollNumber: "STU2002",
      name: "Student Two",
      role: "Student"
    },
    {
      rollNumber: "STU2003",
      name: "Student Three",
      role: "Student"
    },
    {
      rollNumber: "STU2004",
      name: "Student Four",
      role: "Student"
    }
  ];

  // Upsert by rollNumber so script is idempotent
  // eslint-disable-next-line no-console
  console.log("Seeding dummy users...");
  for (const u of dummyUsers) {
    // eslint-disable-next-line no-await-in-loop
    const updated = await User.findOneAndUpdate(
      { rollNumber: u.rollNumber },
      {
        $set: {
          name: u.name,
          role: u.role,
          teacherCapacity: u.teacherCapacity || 0
        },
        $setOnInsert: {
          passwordHash
        }
      },
      { new: true, upsert: true }
    );
    // eslint-disable-next-line no-console
    console.log(`  ${updated.rollNumber} (${updated.role})`);
  }

  // eslint-disable-next-line no-console
  console.log(`All dummy users share password: ${password}`);

  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Seed failed", err);
  process.exit(1);
});

