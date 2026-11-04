import { getAuthUrl, getTokensFromCode } from '../config/google.js';

/**
 * Returns Google OAuth2 authorization URL
 */
export const getGoogleAuthUrl = (req, res) => {
  try {
    const state = String(req.query.state || '');
    if (!/^medex-[A-Za-z0-9-]{16,220}$/.test(state)) return res.status(400).json({success:false,message:'A valid OAuth state value is required.'});
    const url = getAuthUrl(state);
    return res.status(200).json({
      success: true,
      message: 'Authenticate with Google Calendar via this URL',
      authUrl: url
    });
  } catch (error) {
    const unconfigured=error.message?.includes('not configured');
    return res.status(unconfigured?503:500).json({
      success: false,
      message: unconfigured ? error.message : 'Failed to generate Google Auth URL',
      error: error.message
    });
  }
};

/**
 * Handles OAuth callback when redirected by Google
 */
export const handleGoogleCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Authorization code missing in callback query'
    });
  }

  const state=String(req.query.state||'');
  if (!/^medex-[A-Za-z0-9-]{16,220}$/.test(state)) return res.status(400).send('Invalid OAuth state. Return to MedEx and start sign-in again.');
  const safeCode=encodeURIComponent(String(code));
  const safeState=encodeURIComponent(state);
  res.setHeader('Cross-Origin-Opener-Policy','unsafe-none');
  res.setHeader('Cross-Origin-Embedder-Policy','unsafe-none');
  res.status(200).type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>MedEx Calendar connected</title></head><body style="font-family:system-ui;text-align:center;padding:3rem;color:#164e48"><h2>Google Calendar authorized</h2><p>Return to MedEx to finish connecting your calendar.</p><a id="continue" href="medex://calendar-auth?code=${safeCode}&state=${safeState}">Return to MedEx</a><script>const payload={type:'MEDEX_GOOGLE_CALENDAR',code:${JSON.stringify(String(code))},state:${JSON.stringify(state)}};if(window.opener){window.opener.postMessage(payload,'*');setTimeout(()=>window.close(),250)}else{document.getElementById('continue').click()}</script></body></html>`);
};

/**
 * Exchanges authorization code received by a mobile/SPA frontend for tokens
 */
export const exchangeCode = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Authorization code is required in request body.'
    });
  }

  try {
    const tokens = await getTokensFromCode(code);
    return res.status(200).json({
      success: true,
      tokens
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error exchanging authorization code',
      error: error.message
    });
  }
};
