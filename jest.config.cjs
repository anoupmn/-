module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/*.spec.ts'],
  passWithNoTests: true,
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/mock-wx.ts'],
  moduleNameMapper: {
    '^tests/helpers/(.*)$': '<rootDir>/tests/helpers/$1'
  }
};
