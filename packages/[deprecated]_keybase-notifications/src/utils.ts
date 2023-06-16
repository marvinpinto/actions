import axios from 'axios';
import querystring from 'querystring';
import * as fs from 'fs';
import * as core from '@actions/core';

export const getShortenedUrl = async (url: string): Promise<string> => {
  const baseUrl = process.env['JEST_MOCK_HTTP_PORT']
    ? `http://localhost:${process.env['JEST_MOCK_HTTP_PORT']}`
    : 'https://git.io';
  try {
    const result = await axios.post(baseUrl, querystring.stringify({url: url}));
    const shortUrl = result.headers?.location;
    if (!shortUrl) {
      core.error(`Unable to retrieve a shortened git url`);
      return url;
    }
    return shortUrl;
  } catch (error) {
    core.error(`Unable to retrieve a shortened git url: ${error.message}`);
    return url;
  }
};

export const dumpGitHubEventPayload = (): void => {
  const ghpath: string = process.env['GITHUB_EVENT_PATH'] || '';
  if (!ghpath) {
    throw new Error('Environment variable GITHUB_EVENT_PATH does not appear to be set.');
  }
  const contents = fs.readFileSync(ghpath, 'utf8');
  const jsonContent = JSON.parse(contents);
  core.info(`GitHub payload: ${JSON.stringify(jsonContent)}`);
};
