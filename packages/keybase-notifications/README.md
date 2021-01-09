# Keybase Build Notifications

This action allows you to post GitHub build notifications to [Keybase Chat](https://keybase.io/blog/keybase-chat) channels, teams, and DMs. It sends messages via the [opensentinel API](https://www.opensentinel.com), using your `token` value.

![Keybase default GitHub notification](images/keybase-gh-notification-example.png)

## Contents

1. [Using the Action](#using-the-action)
1. [Parameters](#parameters)
1. [What about other GitHub events?](#what-about-other-github-events)
1. [Filtering Notifications](#filtering-notifications)
1. [Versioning](#versioning)
1. [How to get help](#how-to-get-help)
1. [License](#license)

> **NOTE**: The `marvinpinto/action-keybase-notifications` repository is an automatically generated mirror of the [marvinpinto/actions](https://github.com/marvinpinto/actions) monorepo containing this and other actions. Please file issues and pull requests over there.

## Using the Action

You will need an opensentinel automation API token in order to use this action. Create an account and go through the [Keybase setup information](https://www.opensentinel.com/docs/integrations/keybase). This action utilizes a **Generic Webhook** token.

For reference, opensentinel automation wbhook URLs for Keybase look something like:

```text
https://automations.opensentinel.com/webhook?token=<OSL_TOKEN>
```

### Build notifications for CI Tests

```yaml
name: CI Tests

on:
  push:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      # ...
      - name: Build & test
        run: echo "done!"

      # Add the notification step as the last one
      - uses: marvinpinto/action-keybase-notifications@latest
        if: always()
        with:
          job_status: ${{ job.status }}
          opensentinel_token: ${{ secrets.OSL_TOKEN }}
          on_success: never
          on_failure: always
```

This will send you a Keybase chat notification whenever a CI build fails but not when it passes (if you wanted to reduce channel noise). The `if: always()` stanza above ensures that the notification step [runs no matter what](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/contexts-and-expression-syntax-for-github-actions#job-status-check-functions).

### Build notifications for releases

```yaml
on:
  push:
    tags:
      - "v*"

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      # ...
      - name: Build & test
        run: echo "done!"

      - name: Deploy to production
        run: echo "+1"

      - uses: marvinpinto/action-keybase-notifications@latest
        if: always()
        with:
          job_status: ${{ job.status }}
          job_name: Production Release
          opensentinel_token: ${{ secrets.OSL_TOKEN }}
```

This will send you a notification message to let you know if the production release was successful or not.

## Parameters

| Parameter                | Description                                          | Default       |
| ------------------------ | ---------------------------------------------------- | ------------- |
| `opensentinel_token`\*\* | URL querystring value for token                      | `null`        |
| `job_status`\*\*         | GitHub Actions job status - use `${{ job.status }}`  | `null`        |
| `job_name`               | Display name to use in the chat message              | Workflow name |
| `on_success`             | When a build passes, notify you "always" or "never"? | `always`      |
| `on_failure`             | When a build fails, notify you "always" or "never"?  | `always`      |

### Notes:

- Parameters denoted with `**` are required.

## What about other GitHub events?

The opensentinel system itself handles other GitHub events directly. This action is primarily geared toward sending build + other ad-hoc messages.

This action will do its hardest to **NOT fail the build** as a result of a processing error (network/permissions/etc).

If you're still interested in receiving Keybase notifications for other GitHub events (`push`, `pull_request`, etc), set up a **GitHub Notification** webhook with [opensentinel](https://www.opensentinel.com/docs/handlers/github-notification) and add that to your repository.

## Filtering Notifications

You can cut down on chat noise by applying filters to events that trigger this action. For example, you can send a Keybase build notification only when someone pushes to the `master` branch.

```yaml
on:
  push:
    branches:
      - master
```

Read through the [GitHub documentation](https://help.github.com/en/articles/workflow-syntax-for-github-actions) for advanced examples.

## Versioning

Every commit that lands on master for this project triggers an automatic build as well as a tagged release called `latest`. If you don't wish to live on the bleeding edge you may use a stable release instead. See [releases](../../releases/latest) for the available versions.

```yaml
- uses: marvinpinto/action-keybase-notifications@<VERSION>
```

## How to get help

The main [README](https://github.com/marvinpinto/actions/blob/master/README.md) for this project has a bunch of information related to debugging & submitting issues. opensentinel help is available through a few [support channels](https://www.opensentinel.com/docs/general/contact) and if you're still stuck, try and get a hold of me on [keybase](https://keybase.io/marvinpinto) and I will do my best to help you out.

## License

The source code for this project is released under the [MIT License](/LICENSE). This project is not associated with Keybase or GitHub.
