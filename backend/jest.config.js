module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  collectCoverage: true,
  collectCoverageFrom: [
    "controllers/**/*.js",
    "routes/**/*.js",
    "services/**/*.js",
    "models/**/*.js",
    "middleware/**/*.js",
    "app.js",
    "!server.js"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  testTimeout: 30000
};
