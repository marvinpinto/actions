# Keybase Chat Notifications

This action allows you to post messages to [Keybase Chat](https://keybase.io/blog/keybase-chat) channels, teams, and DMs. It sends messages using a Keybase paperkey and the corresponding Keybase username.

![Keybase default GitHub notification](images/keybase-gh-notification-example.png)

## Contents

1. [Using the Action](#using-the-action)
1. [Parameters](#parameters)
1. [Supported GitHub Events](#supported-github-events)
1. [Filtering Notifications](#filtering-notifications)
1. [Versioning](#versioning)
1. [How to get help](#how-to-get-help)
1. [License](#license)

## Using the Action

You will need a Keybase paperkey and its corresponding username. It is probably a good idea to create a dedicated Keybase account for this purpose, or at the very least generate a dedicated paperkey on your existing account. This makes it easier to revoke if needed.

### Pull Request Notifications Example

```yaml
name: "keybase"

on:
  pull_request:
    types:
      - "opened"
      - "closed"
      - "reopened"
      - "synchronize"

jobs:
  keybase:
    runs-on: "ubuntu-latest"
    steps:
      - uses: "marvinpinto/actions/packages/keybase-notifications@latest"
        with:
          keybase_username: "${{ secrets.KeybaseUsername }}"
          keybase_paper_key: "${{ secrets.KeybasePaperKey }}" # "fancy regular ..."
          keybase_team_name: "${{ secrets.KeybaseTeamName }}" # "keybasefriends"
          keybase_topic_name: "${{ secrets.KeybaseTopicName }}" # "general"
```

### Private Messaging

```yaml
jobs:
  keybase:
    runs-on: "ubuntu-latest"
    steps:
      - uses: "marvinpinto/actions/packages/keybase-notifications@latest"
        with:
          keybase_username: "${{ secrets.KeybaseUsername }}"
          keybase_paper_key: "${{ secrets.KeybasePaperKey }}" # "fancy regular ..."
          keybase_channel: "${{ secrets.KeybaseChannel }}" # "you,robot,chris"
```

### Custom Notification Message

```yaml
jobs:
  keybase:
    runs-on: "ubuntu-latest"
    steps:
      - uses: "marvinpinto/actions/packages/keybase-notifications@latest"
        with:
          message: "Hey there, world!"
          keybase_username: "${{ secrets.KeybaseUsername }}"
          keybase_paper_key: "${{ secrets.KeybasePaperKey }}" # "fancy regular ..."
          keybase_team_name: "${{ secrets.KeybaseTeamName }}" # "keybasefriends"
          keybase_topic_name: "${{ secrets.KeybaseTopicName }}" # "general"
```

## Parameters

| Parameter               | Description                                 | Default |
| ----------------------- | ------------------------------------------- | ------- |
| `keybase_username`\*\*  | Keybase username, e.g. `spacedrop`          | `null`  |
| `keybase_paper_key`\*\* | Keybase Paper Key, e.g. `fancy regular ...` | `null`  |
| `keybase_channel`       | Peer channels, e.g. `you,robot,chris`       | `null`  |
| `keybase_team_name`     | Keybase Team Name, e.g. `keybasefriends`    | `null`  |
| `keybase_topic_name`    | Team channel, e.g. `general`                | `null`  |

### Notes:

- Parameters denoted with `**` are required.
- `keybase_team_name` and `keybase_topic_name` are required for messaging within team chat rooms.
- `keybase_channel` is required for peer-to-peer messages.

## Supported GitHub Events

The following events are supported in this action. Everything else gets silently ignored. Have a read through the [Events that trigger workflows](https://help.github.com/en/articles/events-that-trigger-workflows) document for more information on how this works.

```yaml
on:
  watch: # when someone stars a repository
    types:
      - "started"
  push: # when someone pushes to a repository branch
  pull_request:
    types:
      - "opened"
      - "closed"
      - "reopened"
      - "synchronize"
  commit_comment:
  issues:
    types:
      - "opened"
      - "edited"
      - "closed"
      - "reopened"
  issue_comment:
    types:
      - "created"
      - "edited"
      - "deleted"
```

## Filtering Notifications

You can cut down on chat noise by applying filters to events that trigger this action. For example, you can send a Keybase chat notification only when someone pushes to the `master` branch.

```yaml
on:
  push:
    branches:
      - master
```

Read through the [GitHub documentation](https://help.github.com/en/articles/workflow-syntax-for-github-actions) for advanced examples.

## Versioning

Every commit that lands on master for this project triggers an automatic build as well as a tagged release called `latest`. If you don't wish to live on the bleeding edge you may use a stable release instead. See [releases](https://github.com/marvinpinto/actions/releases) for the available versions.

```yaml
- uses: "marvinpinto/actions/packages/keybase-notifications@<VERSION>"
```

## How to get help

The main [README](../../README.md) for this project has a bunch of information related to debugging & submitting issues. If you're still stuck, try and get a hold of me on [keybase](https://keybase.io/marvinpinto) and I'll do my best.

## License

The source code for this project is released under the [MIT License](/LICENSE). This project is not associated with Keybase or GitHub.
