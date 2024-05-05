# Collection of GitHub Actions

![unmaintained](http://img.shields.io/badge/status-unmaintained-red.png)

Generating release notes & automatically maintaining releases was much needed when GitHub Actions launched many years ago, but our ecosystem has evolved and there are much better alternatives these days.

For example, the [semantic-release](https://github.com/semantic-release/semantic-release) project + their associated [GitHub Action](https://github.com/semantic-release/github) gives you full control over when releases occur, changelog formatting, custom exec scripts, and much more. Another popular option is the [action-gh-release](https://github.com/softprops/action-gh-release) which also allows you to do many of the things this project originally enabled.


## Contents

1. [What are GitHub Actions](#what-are-github-actions)
1. [Actions in this Repository](#actions-in-this-repository)
1. [Development](#development)
1. [Debugging](#debugging)
1. [License](#license)

## What are GitHub Actions

[GitHub Actions](https://help.github.com/en/articles/about-github-actions) give you the flexibility to build out automated software development lifecycle workflows directly in your repository. Aside from building your own actions, the framework also allows you to use pre-built actions made by other developers.

This repository is a collection of said actions which you are free to re-use and modify!

## Actions in this Repository

- [GitHub Automatic Releases](https://github.com/marketplace/actions/automatic-releases) - automatically upload assets, generate changelogs, pre-releases, and so on.

## Deprecated Actions (Looking for Maintainers)

The following actions are deprecated and no longer actively maintained. We are currently looking for maintainers to take over these projects. If you are interested in contributing or becoming the new maintainer, please check out the [GitHub issue here](https://github.com/marvinpinto/actions/issues/660).

- [Keybase Notifications](https://github.com/marketplace/actions/keybase-build-notifications) - send GitHub notifications to Keybase Chat channels, teams, and DMs.
- [SSM Build Secrets](https://github.com/marketplace/actions/aws-ssm-build-secrets-for-github-actions) - inject AWS SSM Parameter Store secrets as environment variables into your GitHub Actions builds.

## Development

You will first of all need a recent enough version of [node](https://nodejs.org) as well as [yarn](https://yarnpkg.com). The node version used to build & test this project can be found [here](/.nvmrc). The `scripts` section under the root [package.json](/package.json) is a good place to get started.

```bash
yarn install
yarn build
yarn lint
yarn test
yarn lintfix  # automatic lint-fixing, during development
JEST_VERBOSE=yes yarn test  # useful for test output debugging
```

## Debugging

If you run into a issue you wish to report, it becomes a lot easier to trace the cause if debug logs are made available. You can [enable debug logs](https://github.com/actions/toolkit/blob/master/docs/action-debugging.md) in your GitHub repository by setting the `ACTIONS_STEP_DEBUG` secret to `true`.

After enabling debug logging you can link to the log in your issue. For private repositories you have the option of including the raw text log, or securely messaging it to me through [keybase](https://keybase.io/marvinpinto).

## License

The source code for this project is released under the [MIT License](/LICENSE). This project is not associated with GitHub.
