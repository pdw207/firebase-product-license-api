## Firebase Functions for License Management

### Overview

This project contains a set of Firebase Cloud Functions designed for user management, token handling, and a summarization feature. The functions interact with external services and Firebase's own authentication and database systems.

### Setup

Before deploying these functions, ensure you have the following:

- Firebase CLI installed and set up.
- Firebase project initialized.
- All necessary dependencies installed.
- Run `npm install` to install dependencies:

### Functions Description

- **createUser:** Handles user creation, including verifying captcha before proceeding.
- **generateToken:** Generates a new token for a user.
- **refreshToken:** Refreshes a user's token.
- **revokeRefreshTokens:** Revokes all refresh tokens issued to a user.

### Usage

Deploy the functions to your Firebase project using the Firebase CLI:

```
firebase deploy --only functions
```

After deployment, the functions can be triggered via HTTPS requests to their respective endpoints.

### Examples

#### Creating a New User

Send a POST request to the createUser endpoint with the necessary user data and captcha response.

#### Generating a Token

Send a POST request to the generateToken endpoint with the required authentication details.

#### Refreshing a Token

Send a POST request to the refreshToken endpoint with the current token information.

#### Revoking Refresh Tokens

Send a POST request to the revokeRefreshTokens endpoint with the user's ID.
