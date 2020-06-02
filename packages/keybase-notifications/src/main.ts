import * as core from '@actions/core';
import * as github from '@actions/github';
import {getShortenedUrl} from './utils';
import axios from 'axios';
import qs from 'querystring';
import {parseGitTag} from '../../automatic-releases/src/utils';

enum JobStatus {
  SUCCESS = 'success',
  FAILED = 'failure',
  CANCELLED = 'cancelled',
  UNKNOWN = 'unknown',
}

enum BuildNotification {
  ALWAYS = 'always',
  NEVER = 'never',
}

type Args = {
  opensentinelToken: string;
  jobStatus: JobStatus;
  jobName: string;
  onSuccessNotification: BuildNotification;
  onFailureNotification: BuildNotification;
};

const getAndValidateArgs = (): Args => {
  const args = {
    opensentinelToken: core.getInput('opensentinel_token', {required: true}),
    jobStatus: JobStatus.UNKNOWN,
    jobName: '',
    onSuccessNotification: BuildNotification.ALWAYS,
    onFailureNotification: BuildNotification.ALWAYS,
  };

  const status = core.getInput('job_status', {required: true});
  core.debug(`Input job status: ${status}`);
  switch (status.toLowerCase()) {
    case JobStatus.SUCCESS:
      args.jobStatus = JobStatus.SUCCESS;
      break;
    case JobStatus.FAILED:
      args.jobStatus = JobStatus.FAILED;
      break;
    case JobStatus.CANCELLED:
      args.jobStatus = JobStatus.CANCELLED;
      break;
    default:
      // istanbul ignore next
      throw new Error(`Unexpected job status ${status}`);
  }

  const onSuccess = core.getInput('on_success');
  switch (onSuccess.toLowerCase()) {
    case BuildNotification.ALWAYS:
      args.onSuccessNotification = BuildNotification.ALWAYS;
      break;
    case BuildNotification.NEVER:
      args.onSuccessNotification = BuildNotification.NEVER;
      break;
  }

  const onFailure = core.getInput('on_failure');
  switch (onFailure.toLowerCase()) {
    case BuildNotification.ALWAYS:
      args.onFailureNotification = BuildNotification.ALWAYS;
      break;
    case BuildNotification.NEVER:
      args.onFailureNotification = BuildNotification.NEVER;
      break;
  }

  let name = core.getInput('job_name');
  if (!name) {
    name = process.env['GITHUB_WORKFLOW'] || '<unnamed>';
  }
  args.jobName = name;
  return args;
};

export const main = async () => {
  try {
    const defaultUrl = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/commit/${github.context.sha}/checks`;
    const args = getAndValidateArgs();

    // Short-circuit if the build passes & we don't need to notify
    if (args.jobStatus === JobStatus.SUCCESS && args.onSuccessNotification === BuildNotification.NEVER) {
      core.debug('Build passed & the user chose not to be notified');
      return;
    }

    // Short-circuit if the build fails & we don't need to notify
    if (args.jobStatus === JobStatus.FAILED && args.onFailureNotification === BuildNotification.NEVER) {
      core.debug('Build failed & the user chose not to be notified');
      return;
    }

    const shortUrl = await getShortenedUrl(defaultUrl);
    core.startGroup('Sending out Keybase build notification via opensentinal');

    let tagStr = parseGitTag(github.context.ref);
    if (tagStr) {
      tagStr = `(tag ${tagStr}) `;
    }

    let sender = github.context.payload.sender?.login;
    if (sender) {
      sender = `by \`${sender}\` `;
    }

    let repoStr = process.env['GITHUB_REPOSITORY'] || '';
    if (repoStr) {
      repoStr = `for repository \`${repoStr}\` `;
    }

    let msg = '';
    switch (args.jobStatus) {
      case JobStatus.SUCCESS:
        msg = `GitHub build **${args.jobName}** ${tagStr}${repoStr}completed successfully :tada: - ${shortUrl}`;
        break;
      case JobStatus.FAILED:
        msg = `GitHub build **${args.jobName}** ${tagStr}${repoStr}failed :rotating_light: - ${shortUrl}`;
        break;
      case JobStatus.CANCELLED:
        msg = `GitHub build **${args.jobName}** ${tagStr}${repoStr}was cancelled ${sender}:warning: - ${shortUrl}`;
        break;
    }

    // istanbul ignore next
    if (!msg) {
      core.info('Empty notification message, nothing to do here');
      core.endGroup();
      return;
    }

    core.debug(`Outbound message: ${msg}`);
    const params = qs.stringify({
      token: args.opensentinelToken,
    });
    const baseUrl = process.env['JEST_MOCK_HTTP_PORT']
      ? `http://localhost:${process.env['JEST_MOCK_HTTP_PORT']}`
      : 'https://automations.opensentinel.com';
    const url = `${baseUrl}/webhook?${params}`;
    await axios.post(url, msg, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
    core.endGroup();
  } catch (error) {
    // Never fail the build as a result of a notification error
    core.error(`Unable to send out build status notification - ${error}`);
    core.endGroup();
  }
};
