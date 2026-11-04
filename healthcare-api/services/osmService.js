// ============================================
// OpenStreetMap Service - Overpass API
// Fetches nearby hospitals using real map data
// ============================================

const axios = require('axios');

// Primary and fallback Overpass API endpoints
const OVERPASS_ENDPOINTS = [
  process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const NOMINATIM_API_URL = process.env.NOMINATIM_API_URL || 'https://nominatim.openstreetmap.org';

/**
 * Calculate the Haversine distance between two coordinates (in km)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

/**
 * Build an Overpass QL query to find hospitals near a given location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radiusMeters - Search radius in meters
 * @returns {string} Overpass QL query string
 */
function buildHospitalQuery(lat, lon, radiusMeters) {
  return `
    [out:json][timeout:25];
    (
      nwr(around:${radiusMeters},${lat},${lon})["amenity"="hospital"];
      nwr(around:${radiusMeters},${lat},${lon})["healthcare"="hospital"];
    );
    out center;
  `;
}

/**
 * Fetch nearby hospitals from OpenStreetMap Overpass API
 * Tries multiple Overpass endpoints with retry logic
 * @param {number} lat - User's latitude
 * @param {number} lon - User's longitude
 * @param {number} radiusMeters - Search radius in meters (default: 10000)
 * @param {number} limit - Max number of results (default: 6)
 * @returns {Promise<Array>} Array of hospital objects
 */
async function fetchNearbyHospitals(lat, lon, radiusMeters = 10000, limit = 6) {
  const query = buildHospitalQuery(lat, lon, radiusMeters);
  let lastError = null;

  // Try each Overpass endpoint (primary + fallback)
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`[OSM] Trying Overpass endpoint: ${endpoint}`);

      const response = await axios.post(
        endpoint,
        `data=${encodeURIComponent(query)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'HealthcarePrototypeAPI/1.0 (hackathon-project)'
          },
          timeout: 45000 // 45 second timeout
        }
      );

      const elements = response.data.elements || [];

      // Deduplicate by name (Overpass can return both node + way for same hospital)
      const seen = new Set();
      const uniqueElements = elements.filter((el) => {
        const name = el.tags?.name;
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      });

      // Transform OSM elements into our hospital format
      const hospitals = uniqueElements.map((el, index) => {
        const hospLat = el.lat || el.center?.lat;
        const hospLon = el.lon || el.center?.lon;
        const tags = el.tags || {};

        // Build full address from OSM address tags
        const addressParts = [
          tags['addr:housenumber'],
          tags['addr:street'],
          tags['addr:suburb'] || tags['addr:neighbourhood'],
          tags['addr:city'] || tags['addr:district'],
          tags['addr:state'],
          tags['addr:postcode']
        ].filter(Boolean);

        const address = addressParts.length > 0
          ? addressParts.join(', ')
          : tags['addr:full'] || 'Address not available on OpenStreetMap';

        return {
          id: index + 1,
          osmId: el.id,
          name: tags.name || 'Unnamed Hospital',
          distanceKm: haversineDistance(lat, lon, hospLat, hospLon),
          address: address,
          contact: tags.phone || tags['contact:phone'] || 'Not available',
          website: tags.website || tags['contact:website'] || null,
          emergencyAvailable: tags.emergency === 'yes' || null,
          operatorType: tags['operator:type'] || tags.operator || null,
          wheelchairAccessible: tags.wheelchair || null,
          beds: tags.beds ? parseInt(tags.beds) : null,
          location: {
            latitude: hospLat,
            longitude: hospLon
          },
          source: 'OpenStreetMap'
        };
      });

      // Sort by distance (nearest first) and limit results
      hospitals.sort((a, b) => a.distanceKm - b.distanceKm);

      console.log(`[OSM] Found ${hospitals.length} hospitals from ${endpoint}`);
      return hospitals.slice(0, limit);

    } catch (error) {
      console.warn(`[OSM] Endpoint ${endpoint} failed: ${error.message}`);
      lastError = error;
      // Continue to next endpoint
    }
  }

  // If all endpoints fail, throw the last error
  throw new Error(
    `All Overpass API endpoints failed. Last error: ${lastError?.message}. ` +
    `This is usually a temporary issue - please try again in a few moments.`
  );
}

/**
 * Reverse geocode coordinates to get a human-readable address
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Address details
 */
async function reverseGeocode(lat, lon) {
  const response = await axios.get(`${NOMINATIM_API_URL}/reverse`, {
    params: {
      lat,
      lon,
      format: 'jsonv2',
      zoom: 18
    },
    headers: {
      'User-Agent': 'HealthcarePrototypeAPI/1.0 (hackathon-project)'
    },
    timeout: 10000
  });

  return {
    displayName: response.data.display_name,
    address: response.data.address,
    type: response.data.type
  };
}

module.exports = {
  fetchNearbyHospitals,
  reverseGeocode,
  haversineDistance
};
