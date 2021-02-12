import * as http from "http";
import * as https from "https";
import * as stream from "stream";
import { google } from "googleapis";
import { Octokit } from "@octokit/rest";
import * as env from "./env.js";
import FormData from "form-data";
import { buildOAuth2Client } from "./googleAuth.js";
import * as crypto from "crypto";

const {
  ZACC_GOOGLE_ENABLED,
  ZACC_GITHUB_ENABLED,
  ZACC_SLACK_ENABLED,
  ZACC_DRY_RUN,
} = env.booleans([
  "ZACC_GOOGLE_ENABLED",
  "ZACC_GITHUB_ENABLED",
  "ZACC_SLACK_ENABLED",
  "ZACC_DRY_RUN",
]);

const {
  ZACC_COMMAND,
  ZACC_ACCOUNT_EMAIL,
  ZACC_ACCOUNT_FIRST_NAME,
  ZACC_ACCOUNT_LAST_NAME,
  ZACC_ACCOUNT_GITHUB_HANDLE,
  ZACC_GOOGLE_OAUTH2_CLIENT_ID,
  ZACC_GOOGLE_OAUTH2_CLIENT_SECRET,
  ZACC_GOOGLE_OAUTH2_REDIRECT_URI,
  ZACC_GITHUB_TOKEN,
  ZACC_MAILGUN_DOMAIN,
  ZACC_MAILGUN_API_KEY,
  ZACC_MAILGUN_FROM,
} = env.strings([
  "ZACC_COMMAND",
  "ZACC_ACCOUNT_EMAIL",
  "ZACC_ACCOUNT_FIRST_NAME",
  "ZACC_ACCOUNT_LAST_NAME",
  "ZACC_ACCOUNT_GITHUB_HANDLE",
  "ZACC_GOOGLE_OAUTH2_CLIENT_ID",
  "ZACC_GOOGLE_OAUTH2_CLIENT_SECRET",
  "ZACC_GOOGLE_OAUTH2_REDIRECT_URI",
  "ZACC_GITHUB_TOKEN",
  "ZACC_MAILGUN_DOMAIN",
  "ZACC_MAILGUN_API_KEY",
  "ZACC_MAILGUN_FROM",
]);

const { ZACC_GOOGLE_SCOPES, ZACC_GITHUB_ORGS } = env.listsOfStrings([
  "ZACC_GOOGLE_SCOPES",
  "ZACC_GITHUB_ORGS",
]);

const { ZACC_MAILGUN_API_ROOT_URL } = env.urls(["ZACC_MAILGUN_API_ROOT_URL"]);

if (ZACC_COMMAND === "invite") {
  invite();
} else {
  console.log(`err: unknown command: ${ZACC_COMMAND}`);
}

async function invite() {
  await createGoogleAccount();
  await inviteToGitHub();
  await inviteToSlack();
}

async function createGoogleAccount() {
  if (!ZACC_GOOGLE_ENABLED) {
    console.log("Google > warn: ZACC_GOOGLE_ENABLED !== 'true'");
    return;
  }
  if (ZACC_GOOGLE_SCOPES.length === 0) {
    console.log("Google > err: ZACC_GOOGLE_SCOPES not set");
    return;
  }
  if (!ZACC_GOOGLE_OAUTH2_CLIENT_ID) {
    console.log("Google > err: ZACC_GOOGLE_OAUTH2_CLIENT_ID not set");
    return;
  }
  if (!ZACC_GOOGLE_OAUTH2_CLIENT_SECRET) {
    console.log("Google > err: ZACC_GOOGLE_OAUTH2_CLIENT_SECRET not set");
    return;
  }
  if (!ZACC_GOOGLE_OAUTH2_REDIRECT_URI) {
    console.log("Google > err: ZACC_GOOGLE_OAUTH2_REDIRECT_URI not set");
    return;
  }
  if (ZACC_ACCOUNT_EMAIL.length === 0) {
    console.log("Google > err: ZACC_ACCOUNT_EMAIL not set");
    return;
  }
  if (ZACC_ACCOUNT_FIRST_NAME.length === 0) {
    console.log("Google > err: ZACC_ACCOUNT_FIRST_NAME not set");
    return;
  }
  if (ZACC_ACCOUNT_LAST_NAME.length === 0) {
    console.log("Google > err: ZACC_ACCOUNT_LAST_NAME not set");
    return;
  }
  try {
    const auth = await buildOAuth2Client(ZACC_GOOGLE_SCOPES, {
      clientId: ZACC_GOOGLE_OAUTH2_CLIENT_ID,
      clientSecret: ZACC_GOOGLE_OAUTH2_CLIENT_SECRET,
      redirectUri: ZACC_GOOGLE_OAUTH2_REDIRECT_URI,
    });
    const password = hash(composeGooglePassword(new Date()));
    const requestBody = {
      primaryEmail: ZACC_ACCOUNT_EMAIL,
      password,
      hashFunction: "SHA-1",
      changePasswordAtNextLogin: true,
      name: {
        givenName: ZACC_ACCOUNT_FIRST_NAME,
        familyName: ZACC_ACCOUNT_LAST_NAME,
      },
    };
    if (ZACC_DRY_RUN) {
      console.log("Google > warn: ZACC_DRY_RUN !== 'true'");
      return;
    }
    await google.admin("directory_v1").users.insert({
      auth,
      requestBody,
    });
    console.log(`Google > ok: account created with password '${password}'`);
  } catch (err) {
    console.log(`Google > err: while contacting Google API: ${err.message}`);
  }
}

/**
 *
 * @param {string} content
 */
function hash(content) {
  const hash = crypto.createHash("sha1");
  hash.update(content);
  return hash.digest("hex");
}

/**
 *
 * @param {Date} date
 */
function composeGooglePassword(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `zenika${month}${year}`;
}

async function inviteToGitHub() {
  if (!ZACC_GITHUB_ENABLED) {
    console.log("GitHub > warn: ZACC_GITHUB_ENABLED !== 'true'");
    return;
  }
  if (ZACC_GITHUB_ORGS.length === 0) {
    console.log("GitHub > err: ZACC_GITHUB_ORGS not set");
    return;
  }
  if (!ZACC_GITHUB_TOKEN) {
    console.log("GitHub > err: ZACC_GITHUB_TOKEN not set");
    return;
  }
  for (const org of ZACC_GITHUB_ORGS) {
    await inviteToGitHubOrg(org);
  }
}

/**
 *
 * @param {string} org
 */
async function inviteToGitHubOrg(org) {
  if (!ZACC_ACCOUNT_GITHUB_HANDLE) {
    console.log("GitHub > err: ZACC_ACCOUNT_GITHUB_HANDLE not set");
    return;
  }
  if (ZACC_DRY_RUN) {
    console.log("GitHub > ${org} > warn: ZACC_DRY_RUN !== 'true'");
    return;
  }
  const octokit = new Octokit({ auth: ZACC_GITHUB_TOKEN });
  try {
    await octokit.orgs.createInvitation({
      org,
      email: ZACC_ACCOUNT_EMAIL,
      role: "direct_member",
    });
    console.log(`GitHub > ${org} > ok: invite sent`);
  } catch (err) {
    console.log(
      `GitHub > ${org} > err: while contacting GitHub API: ${err.message}`
    );
  }
}

async function inviteToSlack() {
  if (!ZACC_SLACK_ENABLED) {
    console.log("Slack > warn: ZACC_SLACK_ENABLED !== 'true'");
    return;
  }
  if (!ZACC_MAILGUN_DOMAIN) {
    console.log("Slack > err: ZACC_MAILGUN_DOMAIN not set");
    return;
  }
  if (!ZACC_MAILGUN_API_ROOT_URL) {
    console.log("Slack > err: ZACC_MAILGUN_API_ROOT_URL not set");
    return;
  }
  if (!ZACC_MAILGUN_API_KEY) {
    console.log("Slack > err: ZACC_MAILGUN_API_KEY not set");
    return;
  }
  if (!ZACC_MAILGUN_FROM) {
    console.log("Slack > err: ZACC_MAILGUN_FROM not set");
    return;
  }
  if (!ZACC_ACCOUNT_EMAIL) {
    console.log("Slack > err: ZACC_ACCOUNT_EMAIL not set");
    return;
  }
  if (ZACC_DRY_RUN) {
    console.log("Slack > warn: ZACC_DRY_RUN !== 'true'");
    return;
  }
  try {
    const formData = new FormData();
    formData.append("from", ZACC_MAILGUN_FROM);
    formData.append("to", ZACC_ACCOUNT_EMAIL);
    formData.append(
      "subject",
      "Welcome to Zenika! Please join our Slack Workspace"
    );
    formData.append(
      "text",
      "go to https://zenika.slack.com and register with your Zenika email address"
    );
    const response = await httpRequest(
      `${ZACC_MAILGUN_API_ROOT_URL}/${ZACC_MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        auth: `api:${ZACC_MAILGUN_API_KEY}`,
        headers: {
          "Content-Type": "multipart/form-data",
          ...formData.getHeaders(),
        },
      },
      formData
    );
    if (response.statusCode && response.statusCode < 400) {
      console.log("Slack > ok: invite sent");
    } else {
      const message = await readBody(response);
      console.log(
        `Slack > err: Mailgun API responded with status ${response.statusCode}: ${message}`
      );
    }
  } catch (err) {
    console.log(`Slack > err: while contacting Mailgun API: ${err.message}`);
  }
}

/**
 *
 * @param {string | URL} url
 * @param {https.RequestOptions} options
 * @param {stream.Readable} body
 */
function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options);
    req.on("response", resolve);
    req.on("error", reject);
    body.pipe(req);
    req.end();
  });
}

/**
 *
 * @param {http.IncomingMessage} response
 */
async function readBody(response) {
  let body = "";
  for await (const chunk of response) {
    body += chunk;
  }
  return body.replace("\n", "");
}
