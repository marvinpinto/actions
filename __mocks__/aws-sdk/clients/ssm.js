export const mockGetParameter = jest.fn().mockImplementation(() => ({
  promise: jest.fn().mockResolvedValue({
    Parameter: {
      Value: 'super-secret-value',
    },
  }),
}));

export default jest.fn().mockImplementation(() => ({
  getParameter: mockGetParameter,
}));
