# Zacc

CLI to create and remove user accounts across Zenika IT systems.

## Usage

- Clone this repo
- `npm install`
- Copy `example.env` to `.env`
- Fill `.env` with values for:
  - `ZACC_COMMAND`: only `invite` to create accounts is supported as of now.
  - `ZACC_DRY_RUN`: when `true`, Zacc does not send write requests to services.
- Fill `.env` with the required values for the services you want to use (see
  Supported services section below)
- `npm start`

## Supported services

Iconography: ➕ = account creation supported, ➖ = account removal supported.

### Google Workspace Account ➕

Set `ZACC_GOOGLE_ENABLED` to `true` to enable.

Required configuration:
- `ZACC_GOOGLE_OAUTH2_CLIENT_ID`, `ZACC_GOOGLE_OAUTH2_CLIENT_SECRET`,
  `ZACC_GOOGLE_OAUTH2_REDIRECT_URI`: configuration for the OAuth 2 client.
  Create an OAuth 2 client using the Google Cloud console and download its JSON
  file to get those values.

Required account fields: `ZACC_ACCOUNT_EMAIL`, `ZACC_ACCOUNT_FIRST_NAME`,
`ZACC_ACCOUNT_LAST_NAME`.

### GitHub Organization Membership ➕

Set `ZACC_GITHUB_ENABLED` to `true` to enable.

Required configuration:
- `ZACC_GITHUB_ORGS`: a comma-separated list of GitHub organization names.
- `ZACC_GITHUB_TOKEN`: a personal access token from a GitHub account that can
  manage membership of the organizations.

Required account fields: `ZACC_ACCOUNT_EMAIL`.

### Slack Workspace Membership ➕

Set `ZACC_SLACK_ENABLED` to `true` to enable.

Required configuration:
- `ZACC_MAILGUN_DOMAIN`, `ZACC_MAILGUN_API_ROOT_URL`,
`ZACC_MAILGUN_API_KEY`: configuration for sending emails through Mailgun.
- `ZACC_MAILGUN_FROM`: the email address used as the sender in the invitation
  email.

Required account fields: `ZACC_ACCOUNT_EMAIL`.
