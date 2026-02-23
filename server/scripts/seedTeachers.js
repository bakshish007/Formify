/* Seed teachers into MongoDB. Uses MONGO_URI from server/.env */

const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const { connectDb } = require("../config/db");
const User = require("../models/User");

const TEACHERS = [
  { rollNumber: "KULVINDER", name: "DR. KULVINDER SINGH MANN" },
  { rollNumber: "AKSHAY", name: "DR. AKSHAY GIRDHAR" },
  { rollNumber: "AMIT", name: "DR. AMIT KAMRA" },
  { rollNumber: "KAMALJIT", name: "DR. KAMALJIT KAUR DHILLON" },
  { rollNumber: "PANKAJ", name: "DR. PANKAJ BHAMBRI" },
  { rollNumber: "PRADEEP", name: "DR. PRADEEP JASWAL" },
  { rollNumber: "SANDEEP", name: "DR. SANDEEP KUMAR SINGLA" },
  { rollNumber: "JAGDEEP", name: "DR. JAGDEEP SINGH" },
  { rollNumber: "RUPINDER", name: "ER. RUPINDER KAUR" },
  { rollNumber: "AMANPREET", name: "AMANPREET KAUR" },
  { rollNumber: "PALWINDER", name: "DR. PALWINDER KAUR BHANGU" },
  { rollNumber: "RANDEEP", name: "DR. RANDEEP KAUR" },
  { rollNumber: "SIDHARATH", name: "DR. SIDHARATH JAIN" },
  { rollNumber: "MOHANJIT", name: "DR. MOHANJIT KAUR KANG" },
  { rollNumber: "SACHIN", name: "DR. SACHIN BAGGA" },
  { rollNumber: "HIMANI", name: "ER. HIMANI SHARMA" },
  { rollNumber: "SARABMEET", name: "ER. SARABMEET SINGH MASSON" },
  { rollNumber: "GITANJALI", name: "GITANJALI" },
  { rollNumber: "HARJOT", name: "HARJOT KAUR GILL" },
  { rollNumber: "HARPREET", name: "HARPREET KAUR" },
  { rollNumber: "JASLEEN", name: "JASLEEN KAUR" },
  { rollNumber: "JASPREET", name: "JASPREET KAUR" },
  { rollNumber: "NEHA", name: "NEHA GUPTA" },
  { rollNumber: "PARMINDER", name: "PARMINDER KAUR WADHWA" },
  { rollNumber: "RANJODH", name: "RANJODH KAUR" },
  { rollNumber: "SAKSHI", name: "SAKSHI DHIMAN" },
  { rollNumber: "VANDNA", name: "VANDNA" }
];

const PASSWORD = "gndec";
const TEACHER_CAPACITY = 5;

async function main() {
  dotenv.config({ path: path.join(__dirname, "..", ".env") });

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("Missing MONGO_URI in server/.env");
    process.exit(1);
  }

  await connectDb(uri);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log("Seeding teachers...");
  for (const t of TEACHERS) {
    const updated = await User.findOneAndUpdate(
      { rollNumber: t.rollNumber },
      {
        $set: {
          name: t.name,
          role: "Teacher",
          teacherCapacity: TEACHER_CAPACITY
        },
        $setOnInsert: {
          passwordHash
        }
      },
      { new: true, upsert: true }
    );
    console.log(`  ${updated.rollNumber} — ${updated.name}`);
  }

  console.log(`\nDone. All teachers use password: ${PASSWORD}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed", err);
  process.exit(1);
});
