const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const fs = require("fs");
const path = require("path");

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

// Load schema
const schemaPath = path.join(__dirname, "dna-profile.schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

// Compile schema (this validates the schema itself)
let validate;
try {
  validate = ajv.compile(schema);
  console.log("✅ Schema compiled successfully (schema is valid JSON Schema draft 2020-12)");
} catch (err) {
  console.error("❌ Schema compilation failed:", err.message);
  process.exit(1);
}

// Validate example data
const examplePath = path.join(__dirname, "examples", "full-profile.example.json");
const exampleData = JSON.parse(fs.readFileSync(examplePath, "utf-8"));

const valid = validate(exampleData);
if (valid) {
  console.log("✅ Example data (full-profile.example.json) passes validation");
} else {
  console.error("❌ Example data validation failed:");
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}

// Validate minimal profile (only required fields)
const minimalProfile = {
  meta: {
    profileId: "stu-minimal-001",
    schemaVersion: "1.1.1",
    createdAt: "2026-05-11T10:00:00+08:00",
    consentStatus: {
      profileEnabled: false
    }
  }
};

const minimalValid = validate(minimalProfile);
if (minimalValid) {
  console.log("✅ Minimal profile (only meta) passes validation");
} else {
  console.error("❌ Minimal profile validation failed:");
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}

// Test invalid data: missing required meta
const invalidProfile = {
  basicInfo: { gradeLevel: "初一" }
};

const invalidValid = validate(invalidProfile);
if (!invalidValid) {
  console.log("✅ Invalid profile (missing required meta) correctly rejected");
} else {
  console.error("❌ Invalid profile should have been rejected but passed");
  process.exit(1);
}

// Test invalid confidenceLevel enum
const invalidConfidence = {
  meta: {
    profileId: "stu-test-002",
    schemaVersion: "1.1.1",
    createdAt: "2026-05-11T10:00:00+08:00",
    consentStatus: { profileEnabled: true }
  },
  subjectMap: {
    weaknesses: [{
      subject: "数学",
      confidenceLevel: "probably_ok"
    }]
  }
};

const confValid = validate(invalidConfidence);
if (!confValid) {
  console.log("✅ Invalid confidenceLevel enum value correctly rejected");
} else {
  console.error("❌ Invalid confidenceLevel should have been rejected but passed");
  process.exit(1);
}

console.log("\n🎉 All validation tests passed!");
