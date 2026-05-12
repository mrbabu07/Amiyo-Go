module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "controllers/**/*.js",
    "middleware/**/*.js",
    "models/**/*.js",
    "utils/**/*.js",
    "!**/__tests__/**",
    "!**/node_modules/**",
  ],
  testMatch: [
    "**/__tests__/**/*.test.js",
    "**/?(*.)+(spec|test).js",
  ],
  // Keep coverage reporting enabled without failing the suite until broader
  // controller/model integration tests are added.
  testTimeout: 10000,
  verbose: true,
};
