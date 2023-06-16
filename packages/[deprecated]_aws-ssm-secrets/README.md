# AWS SSM Build Secrets for GitHub Actions

This action injects AWS SSM Parameter Store secrets as environment variables into your GitHub Actions builds.

It makes it easier to follow [Amazon IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) in respect to principle of least privilege and tracking credentials usage. Combined with the `aws-actions/configure-aws-credentials` action, this allows you to inject any combination of secrets from multiple stores, using different credential contexts.

## Contents

1. [Usage Examples](#usage-examples)
1. [Supported Parameters](#supported-parameters)
1. [Event Triggers](#event-triggers)
1. [Versioning](#versioning)
1. [How to get help](#how-to-get-help)
1. [License](#license)

> **NOTE**: The `marvinpinto/action-inject-ssm-secrets` repository is an automatically generated mirror of the [marvinpinto/actions](https://github.com/marvinpinto/actions) monorepo containing this and other actions. Please file issues and pull requests over there.

## Usage Examples

### Inject your production Cloudflare API tokens into a build

```yaml
---
name: "build-and-invalidate-cf-cache"

on:
  push:
    branches:
      - "master"

jobs:
  ci:
    runs-on: "ubuntu-latest"
    env:
      BUILD_STAGE: "production"

    steps:
      # ...

      - uses: "aws-actions/configure-aws-credentials@v1"
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: "us-east-1"
          role-to-assume: "arn:aws:iam::111111111111:role/build-and-deploy-website"
          role-duration-seconds: 1800 # 30 mins

      - uses: "marvinpinto/action-inject-ssm-secrets@latest"
        with:
          ssm_parameter: "/build-secrets/${{ env.BUILD_STAGE }}/cloudflare-account-id"
          env_variable_name: "cloudflare_account_id"

      - uses: "marvinpinto/action-inject-ssm-secrets@latest"
        with:
          ssm_parameter: "/build-secrets/${{ env.BUILD_STAGE }}/cloudflare-api-token"
          env_variable_name: "cloudflare_api_token"

      - name: "Build & Deploy"
        run: |
          echo "You will now have access to the CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables in all your subsequent build steps"
```

## Supported Parameters

| Parameter               | Description                                                          | Default |
| ----------------------- | -------------------------------------------------------------------- | ------- |
| `ssm_parameter`\*\*     | The AWS SSM parameter key to look up.                                | `null`  |
| `env_variable_name`\*\* | The corresponding environment variable name to assign the secret to. | `null`  |

### Notes:

- Parameters denoted with `**` are required.

## Versioning

Every commit that lands on master for this project triggers an automatic build as well as a tagged release called `latest`. If you don't wish to live on the bleeding edge you may use a stable release instead. See [releases](../../releases/latest) for the available versions.

```yaml
- uses: "marvinpinto/action-inject-ssm-secrets@<VERSION>"
```

## How to get help

The main [README](https://github.com/marvinpinto/actions/blob/master/README.md) for this project has a bunch of information related to debugging & submitting issues. If you're still stuck, try and get a hold of me on [keybase](https://keybase.io/marvinpinto) and I will do my best to help you out.

## License

The source code for this project is released under the [MIT License](/LICENSE). This project is not associated with GitHub or AWS.
