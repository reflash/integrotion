module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testRegex: '(/__tests__/.*|(\\.|/)(spec))\\.[jt]sx?$',
  setupFiles: ['./src/inversify.config.ts']
};