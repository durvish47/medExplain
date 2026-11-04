// ============================================
// Agora Token & Teleconsultation Service
// Generates secure dynamic RTC tokens for Agora WebRTC
// ============================================

import agoraPkg from 'agora-token';
const { RtcTokenBuilder, RtcRole } = agoraPkg;

export const AGORA_APP_ID = process.env.AGORA_APP_ID || '';
export const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';

/**
 * Generate RTC Token for Agora 1-on-1 video call
 * @param {string} channelName - Name of the teleconsultation room
 * @param {number|string} uid - User ID (0 for auto-assign)
 * @param {string} role - 'publisher' (doctor/patient) or 'subscriber'
 * @param {number} expireTimeInSeconds - Token validity in seconds (default: 3600s = 1hr)
 * @returns {Object} Token and metadata
 */
export function generateRtcToken(channelName, uid = 0, role = 'publisher', expireTimeInSeconds = 3600) {
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    throw new Error('Agora App ID or App Certificate is missing in environment variables.');
  }

  if (!channelName) {
    throw new Error('channelName is required to generate Agora RTC token.');
  }

  // Set role: publisher (broadcaster/host) or subscriber (audience)
  const rtcRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

  // Calculate privilege expiration timestamp
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + parseInt(expireTimeInSeconds, 10);

  let token;
  const numericUid = parseInt(uid, 10);

  if (!isNaN(numericUid)) {
    // Integer UID token
    token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      numericUid,
      rtcRole,
      privilegeExpiredTs,
      privilegeExpiredTs
    );
  } else {
    // String user account token
    token = RtcTokenBuilder.buildTokenWithUserAccount(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      String(uid),
      rtcRole,
      privilegeExpiredTs,
      privilegeExpiredTs
    );
  }

  return {
    token,
    appId: AGORA_APP_ID,
    channelName,
    uid: !isNaN(numericUid) ? numericUid : String(uid),
    role,
    expiresIn: expireTimeInSeconds,
    expiresAt: new Date(privilegeExpiredTs * 1000).toISOString()
  };
}

export default {
  generateRtcToken,
  AGORA_APP_ID,
  AGORA_APP_CERTIFICATE
};
