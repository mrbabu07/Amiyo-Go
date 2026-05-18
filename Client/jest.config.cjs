module.exports = {
  clearMocks: true,
  moduleFileExtensions: ["js", "jsx"],
  roots: ["<rootDir>/src"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  testEnvironment: "jsdom",
  testMatch: [
    "**/__tests__/**/*.test.js",
    "**/__tests__/**/*.test.jsx",
    "**/__tests__/**/*.spec.js",
    "**/__tests__/**/*.spec.jsx",
  ],
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest",
  },
};
