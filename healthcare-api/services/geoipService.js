// ============================================
// IP Geolocation Service
// Detects user location from their IP address
// Uses free ip-api.com (no API key needed)
// ============================================

const axios = require('axios');

// Free IP geolocation APIs (no key needed)
const GEO_APIS = [
  {
    name: 'ip-api.com',
    url: 'http://ip-api.com/json/',
    parse: (data) => ({
      ip: data.query,
      latitude: data.lat,
      longitude: data.lon,
      city: data.city,
      district: data.district || null,
      state: data.regionName,
      country: data.country,
      countryCode: data.countryCode,
      pincode: data.zip,
      isp: data.isp,
      timezone: data.timezone
    })
  },
  {
    name: 'ipapi.co',
    url: 'https://ipapi.co/json/',
    parse: (data) => ({
      ip: data.ip,
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      district: null,
      state: data.region,
      country: data.country_name,
      countryCode: data.country_code,
      pincode: data.postal,
      isp: data.org,
      timezone: data.timezone
    })
  }
];

// Cache to avoid hitting rate limits
let locationCache = {};
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Extract the client's real IP from the request
 * Handles proxies and forwarded headers
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || '';
}

/**
 * Detect user location from their IP address
 * @param {string} ip - IP address (optional, auto-detects if empty)
 * @returns {Promise<Object>} Location data
 */
async function detectLocation(ip = '') {
  // Check cache
  const cacheKey = ip || 'auto';
  if (
    locationCache[cacheKey] &&
    Date.now() - locationCache[cacheKey].cachedAt < CACHE_DURATION_MS
  ) {
    return { ...locationCache[cacheKey].data, cached: true };
  }

  let lastError = null;

  for (const api of GEO_APIS) {
    try {
      const url = ip ? `${api.url}${ip}` : api.url;

      console.log(`[GeoIP] Detecting location via ${api.name}...`);

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'HealthcarePrototypeAPI/2.1 (hackathon-project)'
        }
      });

      // ip-api.com returns status field
      if (response.data.status === 'fail') {
        throw new Error(response.data.message || 'IP lookup failed');
      }

      const location = api.parse(response.data);
      location.provider = api.name;

      // Cache it
      locationCache[cacheKey] = {
        data: location,
        cachedAt: Date.now()
      };

      console.log(`[GeoIP] Location detected: ${location.city}, ${location.state}, ${location.country}`);
      return location;

    } catch (error) {
      console.warn(`[GeoIP] ${api.name} failed: ${error.message}`);
      lastError = error;
    }
  }

  throw new Error(
    `Failed to detect location from IP. Last error: ${lastError?.message}`
  );
}

module.exports = {
  getClientIP,
  detectLocation
};
