import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Initializes and returns an OAuth2 client configured with application credentials
 */
export const createOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  if (!clientId || !clientSecret) throw new Error('Google Calendar sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the backend environment.');

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

/**
 * Generates the Google consent screen URL for Calendar permissions
 */
export const getAuthUrl = (state) => {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Requests refresh_token
    prompt: 'consent',      // Forces consent to ensure refresh_token is returned
    scope: SCOPES,
    state
  });
};

/**
 * Exchanges authorization code for access and refresh tokens
 */
export const getTokensFromCode = async (code) => {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

/**
 * Helper to build an authenticated OAuth2 client from provided tokens or headers
 * Can accept tokens from:
 * 1. Explicit tokens object { access_token, refresh_token }
 * 2. Authorization header ("Bearer <token>") or x-google-refresh-token header
 * 3. Default environment variables (GOOGLE_REFRESH_TOKEN)
 */
export const getAuthenticatedClient = (reqTokens = {}) => {
  const oauth2Client = createOAuth2Client();

  const accessToken = reqTokens.access_token || reqTokens.accessToken;
  const refreshToken = reqTokens.refresh_token || reqTokens.refreshToken || process.env.GOOGLE_REFRESH_TOKEN;

  if (!accessToken && !refreshToken) {
    throw new Error('Google Calendar authorization required. Please provide access_token or refresh_token.');
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  return oauth2Client;
};
