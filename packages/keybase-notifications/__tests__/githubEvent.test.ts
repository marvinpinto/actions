import {parseIntoQuotedString} from '../src/githubEvent';

describe('githubEvent parseIntoQuotedString function', () => {
  it('prepends a single quote char for single-line strings', () => {
    const input = 'Hello, this is a comment.';
    const output = parseIntoQuotedString(input);
    expect(output).toBe('> Hello, this is a comment.');
  });

  it('returns nothing when supplied with empty input', () => {
    const input = '';
    const output = parseIntoQuotedString(input);
    expect(output).toBe('');
  });

  it('is able to maintain the line spacing supplied originally, with quotes', () => {
    const input = 'Hello\n\nThis is a test!\n';
    const output = parseIntoQuotedString(input);
    expect(output).toBe('> Hello\n> \n> This is a test!');
  });
});
