import {get} from 'lodash';
import axios from 'axios';
import querystring from 'querystring';

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
