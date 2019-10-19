# Collection of GitHub Actions

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

- [Keybase Notifications](packages/keybase-notifications) - send GitHub notifications to Keybase Chat channels, teams, and DMs.
- [GitHub Automatic Releases](packages/automatic-releases) - automatically upload assets, generate changelogs, pre-releases, and so on.

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
