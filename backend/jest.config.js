module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  collectCoverage: true,
  coverageDirectory: "coverage",

  testTimeout: 30000   // ✅ VERY IMPORTANT
};