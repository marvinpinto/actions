/* eslint-disable jest/no-focused-tests,jest/no-export */

const skipSmokeTestsLocally = () => {
  if (process.env['GITHUB_ACTIONS'] !== 'true') {
    test.only('only run on the CI server', () => {
      console.warn(
        '[SKIP] Smoke tests only run on the CI server. Set the env variable GITHUB_ACTIONS to "true" to run these tests locally',
      );
    });
  }
};

export default skipSmokeTestsLocally;
