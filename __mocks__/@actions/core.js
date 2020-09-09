const core = jest.requireActual('@actions/core');

module.exports = {
  ...core,
  setSecret: jest.fn(),
  exportVariable: jest.fn(),
};
