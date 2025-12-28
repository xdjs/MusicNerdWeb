// Manual mock for next-auth
module.exports = {
  default: jest.fn(),
  getServerSession: jest.fn().mockResolvedValue(null),
};
