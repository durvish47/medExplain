// ============================================
// Healthcare Prototype API Server
// ============================================
// Uses LIVE data & Browser Geolocation:
//   1. HTML5 Browser Geolocation API - Client-side exact GPS
//   2. OpenStreetMap (Overpass API) - Nearby hospitals
//   3. GitHub Dataset - 570+ Tamil Nadu & India hospitals
//      (Zero hardcoding, Zero API keys needed!)
// ============================================

require('dotenv').config();

const path = require('path');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Import API service modules
const osmService = require('./services/osmService');
const githubDataset = require('./services/githubDatasetService');
const geoipService = require('./services/geoipService');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve HTML5 Browser Geolocation frontend
app.use(express.static(path.join(__dirname, 'public')));

// Trust proxy (needed for correct IP behind reverse proxy)
app.set('trust proxy', true);

// Default location: Chennai, Tamil Nadu
const DEFAULT_LAT = parseFloat(process.env.DEFAULT_LATITUDE) || 13.0827;
const DEFAULT_LON = parseFloat(process.env.DEFAULT_LONGITUDE) || 80.2707;
const DEFAULT_RADIUS = parseInt(process.env.SEARCH_RADIUS) || 10000;

// ============================================
// HTML5 Browser Geolocation Endpoints
// ============================================

/**
 * POST /api/location/browser
 * Receives exact coordinates from HTML5 navigator.geolocation.getCurrentPosition()
 * and returns location metadata + nearest hospitals
 * 
 * Body Parameters:
 *   - latitude  : Number (from browser)
 *   - longitude : Number (from browser)
 *   - accuracy  : Number (optional, in meters)
 *   - radius    : Number (optional, in meters, default 10000)
 */
app.post('/api/location/browser', async (req, res) => {
  try {
    const lat = parseFloat(req.body.latitude);
    const lon = parseFloat(req.body.longitude);
    const accuracy = req.body.accuracy ? parseFloat(req.body.accuracy) : null;
    const radius = parseInt(req.body.radius) || DEFAULT_RADIUS;
    const limit = parseInt(req.body.limit) || 6;

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid coordinates. Please provide valid numeric latitude and longitude from navigator.geolocation.'
      });
    }

    console.log(`[HTML5 Browser Geo] Location received: (${lat}, ${lon}), accuracy: ${accuracy}m`);

    // 1. Reverse geocode browser coordinates to human-readable address
    let addressDetails = null;
    try {
      addressDetails = await osmService.reverseGeocode(lat, lon);
    } catch (geoErr) {
      console.warn('[HTML5 Browser Geo] Reverse geocode failed:', geoErr.message);
    }

    // 2. Fetch nearby hospitals from OpenStreetMap
    let osmHospitals = [];
    try {
      osmHospitals = await osmService.fetchNearbyHospitals(lat, lon, radius, limit);
    } catch (osmErr) {
      console.warn('[HTML5 Browser Geo] OSM search failed:', osmErr.message);
    }

    // 3. Fetch nearby hospitals from official India dataset
    let datasetHospitals = [];
    try {
      datasetHospitals = await githubDataset.findNearbyFromDataset(lat, lon, radius / 1000, limit);
    } catch (dsErr) {
      console.warn('[HTML5 Browser Geo] Dataset search failed:', dsErr.message);
    }

    res.status(200).json({
      status: 'success',
      source: 'HTML5 Browser Geolocation API',
      browserCoordinates: {
        latitude: lat,
        longitude: lon,
        accuracyMeters: accuracy
      },
      resolvedAddress: addressDetails ? addressDetails.displayName : null,
      addressComponents: addressDetails ? addressDetails.address : null,
      nearbyHospitals: {
        openStreetMap: {
          count: osmHospitals.length,
          data: osmHospitals
        },
        officialDataset: {
          count: datasetHospitals.length,
          data: datasetHospitals
        }
      }
    });

  } catch (error) {
    console.error('[HTML5 Browser Geo] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process browser geolocation coordinates',
      error: error.message
    });
  }
});

// ============================================
// IP Geolocation Endpoints (User Location)
// ============================================

/**
 * GET /api/location
 * Auto-detect user's location from their IP address
 * 
 * Query Parameters:
 *   - ip : Specific IP to lookup (optional, auto-detects if omitted)
 */
app.get('/api/location', async (req, res) => {
  try {
    const clientIP = req.query.ip || geoipService.getClientIP(req);

    console.log(`[GeoIP] Location request for IP: ${clientIP}`);

    const location = await geoipService.detectLocation(
      // Don't send localhost/private IPs to the API (let it auto-detect)
      clientIP === '::1' || clientIP === '127.0.0.1' || clientIP.startsWith('192.168')
        ? ''
        : clientIP
    );

    res.status(200).json({
      status: 'success',
      source: `IP Geolocation (${location.provider})`,
      data: location
    });
  } catch (error) {
    console.error('[GeoIP] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to detect location from IP',
      error: error.message
    });
  }
});

/**
 * GET /api/hospitals/auto
 * Auto-detect user location via IP and find nearby hospitals
 * Combines IP geolocation + OpenStreetMap hospital search
 * 
 * Query Parameters:
 *   - radius : Search radius in meters (default: 10000)
 *   - limit  : Max results (default: 6)
 */
app.get('/api/hospitals/auto', async (req, res) => {
  try {
    const radius = parseInt(req.query.radius) || DEFAULT_RADIUS;
    const limit = parseInt(req.query.limit) || 6;
    const clientIP = geoipService.getClientIP(req);

    // Step 1: Detect location from IP
    console.log(`[Auto] Detecting location for IP: ${clientIP}`);
    const location = await geoipService.detectLocation(
      clientIP === '::1' || clientIP === '127.0.0.1' || clientIP.startsWith('192.168')
        ? ''
        : clientIP
    );

    const lat = location.latitude;
    const lon = location.longitude;

    console.log(`[Auto] Location: ${location.city}, ${location.state} (${lat}, ${lon})`);

    // Step 2: Find nearby hospitals from OpenStreetMap
    let osmHospitals = [];
    try {
      osmHospitals = await osmService.fetchNearbyHospitals(lat, lon, radius, limit);
    } catch (osmError) {
      console.warn('[Auto] OSM search failed:', osmError.message);
    }

    // Step 3: Also find nearby from India dataset
    let datasetHospitals = [];
    try {
      datasetHospitals = await githubDataset.findNearbyFromDataset(lat, lon, radius / 1000, limit);
    } catch (dsError) {
      console.warn('[Auto] Dataset search failed:', dsError.message);
    }

    res.status(200).json({
      status: 'success',
      detectedLocation: {
        ip: location.ip,
        city: location.city,
        state: location.state,
        country: location.country,
        pincode: location.pincode,
        coordinates: { latitude: lat, longitude: lon }
      },
      searchRadiusMeters: radius,
      osmHospitals: {
        source: 'OpenStreetMap (Overpass API)',
        count: osmHospitals.length,
        data: osmHospitals
      },
      indiaDatasetHospitals: {
        source: 'India Hospital Directory (GitHub + Local)',
        count: datasetHospitals.length,
        data: datasetHospitals
      }
    });
  } catch (error) {
    console.error('[Auto] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to auto-detect location and find hospitals',
      error: error.message
    });
  }
});

// ============================================
// OpenStreetMap Endpoints (Hospital Search)
// ============================================

/**
 * GET /api/hospitals
 * Fetch nearby hospitals from OpenStreetMap (LIVE data)
 * 
 * Query Parameters:
 *   - lat       : User's latitude (default: Chennai 13.0827)
 *   - lon       : User's longitude (default: Chennai 80.2707)
 *   - radius    : Search radius in meters (default: 10000)
 *   - limit     : Max results to return (default: 6)
 *   - sortBy    : Sort by "distance" (default) or "name"
 */
app.get('/api/hospitals', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || DEFAULT_LAT;
    const lon = parseFloat(req.query.lon) || DEFAULT_LON;
    const radius = parseInt(req.query.radius) || DEFAULT_RADIUS;
    const limit = parseInt(req.query.limit) || 6;
    const sortBy = req.query.sortBy || 'distance';

    console.log(`[OSM] Searching hospitals near (${lat}, ${lon}), radius: ${radius}m`);

    let hospitals = await osmService.fetchNearbyHospitals(lat, lon, radius, limit);

    if (sortBy === 'name') {
      hospitals.sort((a, b) => a.name.localeCompare(b.name));
    }

    res.status(200).json({
      status: 'success',
      source: 'OpenStreetMap (Overpass API)',
      searchLocation: { latitude: lat, longitude: lon },
      searchRadiusMeters: radius,
      count: hospitals.length,
      data: hospitals
    });
  } catch (error) {
    console.error('[OSM] Error fetching hospitals:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch nearby hospitals from OpenStreetMap',
      error: error.message
    });
  }
});

/**
 * GET /api/hospitals/:osmId
 * Get details of a specific hospital by its OpenStreetMap ID
 */
app.get('/api/hospitals/:osmId', async (req, res) => {
  try {
    const osmId = req.params.osmId;
    const lat = parseFloat(req.query.lat) || DEFAULT_LAT;
    const lon = parseFloat(req.query.lon) || DEFAULT_LON;
    const radius = parseInt(req.query.radius) || DEFAULT_RADIUS;

    const hospitals = await osmService.fetchNearbyHospitals(lat, lon, radius, 50);
    const hospital = hospitals.find((h) => String(h.osmId) === String(osmId));

    if (!hospital) {
      return res.status(404).json({
        status: 'fail',
        message: `Hospital with OSM ID ${osmId} not found within the search area. Try increasing the radius.`
      });
    }

    // Enrich with reverse geocoding
    try {
      const geoData = await osmService.reverseGeocode(
        hospital.location.latitude,
        hospital.location.longitude
      );
      hospital.detailedAddress = geoData.displayName;
      hospital.addressComponents = geoData.address;
    } catch (geoError) {
      console.warn('[Nominatim] Reverse geocode failed:', geoError.message);
    }

    res.status(200).json({
      status: 'success',
      source: 'OpenStreetMap',
      data: hospital
    });
  } catch (error) {
    console.error('[OSM] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch hospital details',
      error: error.message
    });
  }
});

// ============================================
// GitHub Dataset Endpoints (India Hospitals)
// ============================================

/**
 * GET /api/india/hospitals
 * Search hospitals from the India hospitals dataset
 * 
 * Query Parameters:
 *   - state     : Filter by state (e.g., "Tamil Nadu", "Delhi")
 *   - city      : Filter by city (e.g., "Chennai")
 *   - district  : Filter by district
 *   - name      : Search by hospital name (partial match)
 *   - category  : "government" or "private"
 *   - page      : Page number (default: 1)
 *   - limit     : Results per page (default: 10, max: 50)
 */
app.get('/api/india/hospitals', async (req, res) => {
  try {
    const { state, city, district, name, category, page, limit } = req.query;

    console.log('[GitHub Dataset] Searching hospitals:', { state, city, district, name, category });

    const results = await githubDataset.searchHospitals({
      state, city, district, name, category,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    });

    res.status(200).json({
      status: 'success',
      source: 'GitHub Live Dataset (India Hospitals)',
      datasetUrl: 'https://github.com/OneFourthLabs/CoViD19-Viz',
      ...results
    });
  } catch (error) {
    console.error('[GitHub Dataset] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch hospitals from GitHub dataset',
      error: error.message
    });
  }
});

/**
 * GET /api/india/hospitals/nearby
 * Find nearest hospitals from the India dataset to a given location
 * 
 * Query Parameters:
 *   - lat       : Latitude (required)
 *   - lon       : Longitude (required)
 *   - radius    : Search radius in km (default: 50)
 *   - limit     : Max results (default: 6)
 */
app.get('/api/india/hospitals/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide valid "lat" and "lon" query parameters'
      });
    }

    const radiusKm = parseInt(req.query.radius) || 50;
    const limit = parseInt(req.query.limit) || 6;

    console.log(`[GitHub Dataset] Finding nearby hospitals to (${lat}, ${lon}), radius: ${radiusKm}km`);

    const hospitals = await githubDataset.findNearbyFromDataset(lat, lon, radiusKm, limit);

    res.status(200).json({
      status: 'success',
      source: 'GitHub Live Dataset (India Hospitals)',
      searchLocation: { latitude: lat, longitude: lon },
      searchRadiusKm: radiusKm,
      count: hospitals.length,
      data: hospitals
    });
  } catch (error) {
    console.error('[GitHub Dataset] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to find nearby hospitals from dataset',
      error: error.message
    });
  }
});

/**
 * GET /api/india/hospitals/stats
 * Get statistics about the India hospitals dataset
 */
app.get('/api/india/hospitals/stats', async (req, res) => {
  try {
    const stats = await githubDataset.getDatasetStats();

    res.status(200).json({
      status: 'success',
      source: 'GitHub Live Dataset (India Hospitals)',
      data: stats
    });
  } catch (error) {
    console.error('[GitHub Dataset] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dataset stats',
      error: error.message
    });
  }
});

// ============================================
// Utility Endpoints
// ============================================

/**
 * GET /api/geocode/reverse
 * Reverse geocode coordinates to a human-readable address
 */
app.get('/api/geocode/reverse', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide valid "lat" and "lon" query parameters'
      });
    }

    const result = await osmService.reverseGeocode(lat, lon);

    res.status(200).json({
      status: 'success',
      source: 'OpenStreetMap (Nominatim)',
      data: result
    });
  } catch (error) {
    console.error('[Nominatim] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reverse geocode coordinates',
      error: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint showing API status
 */
app.get('/api/health', async (req, res) => {
  res.status(200).json({
    status: 'running',
    version: '2.4.0',
    description: 'Healthcare Prototype API - HTML5 Browser Geolocation & Live Datasets',
    features: {
      html5BrowserGeolocation: {
        status: 'active',
        description: 'Client-side navigator.geolocation.getCurrentPosition() UI dashboard',
        url: 'http://localhost:' + PORT + '/',
        endpoint: '/api/location/browser'
      },
      openStreetMap: {
        status: 'active',
        description: 'Nearby hospital search via Overpass API',
        authRequired: false,
        endpoint: '/api/hospitals'
      },
      indiaHospitalsDataset: {
        status: 'active',
        description: '570+ Tamil Nadu & India hospitals from GitHub datasets',
        authRequired: false,
        endpoints: [
          '/api/india/hospitals',
          '/api/india/hospitals/nearby',
          '/api/india/hospitals/stats'
        ]
      },
      reverseGeocode: {
        status: 'active',
        description: 'Reverse geocoding via Nominatim API',
        authRequired: false,
        endpoint: '/api/geocode/reverse'
      }
    },
    defaultLocation: {
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LON,
      description: 'Chennai, Tamil Nadu'
    }
  });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log('');
  console.log('============================================');
  console.log(`  Healthcare Prototype API v2.4`);
  console.log(`  Server running at http://localhost:${PORT}`);
  console.log(`  🌐 HTML5 Geolocation Dashboard: http://localhost:${PORT}/`);
  console.log(`  🔓 No API keys needed — 100% free!`);
  console.log('============================================');
  console.log('');
  console.log('  Available Endpoints:');
  console.log('  -------------------------------------------');
  console.log('  [WEB UI]  GET  /                              - HTML5 Browser Geolocation Finder UI');
  console.log('  [BROWSER] POST /api/location/browser          - Process HTML5 browser coordinates');
  console.log('  [OSM]     GET  /api/hospitals                  - Nearby hospitals (OpenStreetMap)');
  console.log('  [OSM]     GET  /api/hospitals/:osmId           - Hospital details by OSM ID');
  console.log('  [DATASET] GET  /api/india/hospitals            - Search India hospital directory');
  console.log('  [DATASET] GET  /api/india/hospitals/nearby     - Nearest India hospitals by lat/lon');
  console.log('  [DATASET] GET  /api/india/hospitals/stats      - Dataset statistics');
  console.log('  [GEO]     GET  /api/geocode/reverse            - Reverse geocode lat/lon');
  console.log('  [SYS]     GET  /api/health                    - API health check');
  console.log('');

  // Pre-load the dataset in background
  githubDataset.loadDataset().catch((err) => {
    console.warn('[GitHub Dataset] Pre-load failed (will retry on first request):', err.message);
  });
});
