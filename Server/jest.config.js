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
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  testTimeout: 10000,
  verbose: true,
};
