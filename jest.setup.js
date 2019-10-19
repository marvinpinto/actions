// Suppress global console output
global.console = {
  log: process.env['JEST_VERBOSE'] ? console.log : jest.fn(),
  error: console.error,
  warn: console.warn,
  info: process.env['JEST_VERBOSE'] ? console.log : jest.fn(),
  debug: process.env['JEST_VERBOSE'] ? console.debug : jest.fn(),
};

// Suppress GitHub actions core.* calls
const processStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (str, encoding, cb) => {
  if (process.env['JEST_VERBOSE']) {
    return processStdoutWrite(str, encoding, cb);
  }
};
