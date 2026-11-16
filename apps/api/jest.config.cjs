module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.jest.test.ts"],
  setupFiles: ["<rootDir>/src/tests/jest.setup.ts"],
  collectCoverageFrom: ["src/services/**/*.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: {
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
