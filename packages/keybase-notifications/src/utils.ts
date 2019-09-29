import {get} from 'lodash';
import axios from 'axios';
import querystring from 'querystring';
import * as fs from 'fs';

export async function getShortenedUrl(url): Promise<string> {
  try {
    const result = await axios.post('https://git.io', querystring.stringify({url: url}));
    const shortUrl = get(result, 'headers.location', null);
    if (!shortUrl) {
      console.error(`Unable to retrieve a shortened git url`);
      return url;
    }
    return shortUrl;
  } catch (error) {
    console.error(`Unable to retrieve a shortened git url: ${error.message}`);
    return url;
  }
}

export function dumpGitHubEventPayload() {
  const ghpath: string = process.env['GITHUB_EVENT_PATH'] || '';
  if (!ghpath) {
    throw new Error('Environment variable GITHUB_EVENT_PATH does not appear to be set.');
  }
  const contents = fs.readFileSync(ghpath, 'utf8');
  const jsonContent = JSON.parse(contents);
  console.log(`GitHub payload: ${JSON.stringify(jsonContent)}`);
}
