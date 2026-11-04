// ============================================
// Healthcare Prototype API Server
// ============================================
// Features:
//   1. Agora 1-on-1 Video Teleconsultation with Adaptive Bitrate
//   2. HTML5 Browser Geolocation API - Client-side exact GPS
//   3. OpenStreetMap (Overpass API) - Nearby hospitals
//   4. GitHub Dataset - 570+ Tamil Nadu & India hospitals
// ============================================

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

require('dotenv').config();

const path = require('path');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Import API service modules
const osmService = require('./services/osmService');
const githubDataset = require('./services/githubDatasetService');
const geoipService = require('./services/geoipService');
const agoraService = require('./services/agoraService');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve HTML5 Browser Frontend (Dashboard & Video Teleconsultation)
app.use(express.static(path.join(__dirname, 'public')));

// Trust proxy for IP handling
app.set('trust proxy', true);

// Default location: Chennai, Tamil Nadu
const DEFAULT_LAT = parseFloat(process.env.DEFAULT_LATITUDE) || 13.0827;
const DEFAULT_LON = parseFloat(process.env.DEFAULT_LONGITUDE) || 80.2707;
const DEFAULT_RADIUS = parseInt(process.env.SEARCH_RADIUS) || 10000;

// ============================================
// Agora Video Teleconsultation Endpoints
// ============================================

/**
 * GET /api/agora/token
 * Generate an RTC token for 1-on-1 teleconsultation
 * 
 * Query Parameters:
 *   - channelName : Name of the consultation room (default: 'rural-teleconsult-1')
 *   - uid         : Numeric user ID or 0 for auto-assign (default: 0)
 *   - role        : 'publisher' (doctor/patient) or 'subscriber' (default: 'publisher')
 *   - expireTime  : Expiration in seconds (default: 3600)
 */
app.get('/api/agora/token', (req, res) => {
  try {
    const channelName = req.query.channelName || 'rural-teleconsult-1';
    const uid = req.query.uid || 0;
    const role = req.query.role || 'publisher';
    const expireTime = parseInt(req.query.expireTime, 10) || 3600;

    const tokenData = agoraService.generateRtcToken(channelName, uid, role, expireTime);

    res.status(200).json({
      status: 'success',
      message: 'Agora RTC token generated successfully',
      data: tokenData
    });
  } catch (error) {
    console.error('[Agora Token] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/agora/config
 * Returns public Agora configuration for client setup
 */
app.get('/api/agora/config', (req, res) => {
  res.status(200).json({
    status: 'success',
    appId: agoraService.AGORA_APP_ID,
    defaultChannel: 'rural-teleconsult-1',
    adaptiveBitrateSettings: {
      dualStreamMode: true,
      lowStreamProfile: {
        width: 160,
        height: 120,
        framerate: 15,
        bitrate: 45 // 144p resolution @ 45kbps for rural connectivity
      },
      fallbackOption: 2 // Automatically switch to audio-only if network cannot sustain even 144p
    }
  });
});

// ============================================
// HTML5 Browser Geolocation Endpoints
// ============================================

/**
 * POST /api/location/browser
 * Receives exact coordinates from HTML5 navigator.geolocation.getCurrentPosition()
 * and returns location metadata + nearest hospitals
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
// OpenStreetMap Endpoints (Hospital Search)
// ============================================

/**
 * GET /api/hospitals
 * Fetch nearby hospitals from OpenStreetMap (LIVE data)
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
        message: `Hospital with OSM ID ${osmId} not found within the search area.`
      });
    }

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
// GitHub Live Dataset Endpoints (570+ TN & India)
// ============================================

/**
 * GET /api/india/hospitals
 * Search hospitals from the live GitHub datasets
 */
app.get('/api/india/hospitals', async (req, res) => {
  try {
    const { state, city, district, name, category, page, limit } = req.query;

    const results = await githubDataset.searchHospitals({
      state, city, district, name, category,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    });

    res.status(200).json({
      status: 'success',
      source: 'GitHub Live Dataset (India Hospitals)',
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
 * Find nearest hospitals from the live dataset to a given location
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
 * Get statistics about the live hospitals dataset
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
    version: '3.0.0',
    description: 'Healthcare Prototype API - Agora Video Teleconsultation & Live Datasets',
    features: {
      agoraTeleconsultation: {
        status: 'active',
        appId: agoraService.AGORA_APP_ID,
        adaptiveBitrate: 'enabled (144p fallback + audio-only fallback)',
        endpoints: ['/api/agora/token', '/api/agora/config'],
        teleconsultUrl: 'http://localhost:' + PORT + '/teleconsult.html'
      },
      html5BrowserGeolocation: {
        status: 'active',
        url: 'http://localhost:' + PORT + '/',
        endpoint: '/api/location/browser'
      },
      openStreetMap: {
        status: 'active',
        endpoint: '/api/hospitals'
      },
      indiaHospitalsDataset: {
        status: 'active',
        endpoints: [
          '/api/india/hospitals',
          '/api/india/hospitals/nearby',
          '/api/india/hospitals/stats'
        ]
      }
    }
  });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log('');
  console.log('============================================');
  console.log(`  Healthcare Prototype API v3.0`);
  console.log(`  Server running at http://localhost:${PORT}`);
  console.log(`  📹 Teleconsultation UI: http://localhost:${PORT}/teleconsult.html`);
  console.log(`  🌐 Hospital Finder UI:  http://localhost:${PORT}/`);
  console.log(`  🔑 Agora App ID: ${agoraService.AGORA_APP_ID}`);
  console.log('============================================');
  console.log('');
  console.log('  Available Endpoints:');
  console.log('  -------------------------------------------');
  console.log('  [AGORA]   GET  /api/agora/token                - Generate secure Agora RTC token');
  console.log('  [AGORA]   GET  /api/agora/config               - Agora adaptive bitrate config');
  console.log('  [WEB UI]  GET  /teleconsult.html               - 1-on-1 Video Teleconsultation UI');
  console.log('  [WEB UI]  GET  /                               - HTML5 Hospital Finder Dashboard');
  console.log('  [BROWSER] POST /api/location/browser           - Process browser coordinates');
  console.log('  [OSM]     GET  /api/hospitals                   - Nearby hospitals (OpenStreetMap)');
  console.log('  [DATASET] GET  /api/india/hospitals             - Search India hospital directory');
  console.log('  [DATASET] GET  /api/india/hospitals/nearby      - Nearest India hospitals by lat/lon');
  console.log('  [DATASET] GET  /api/india/hospitals/stats       - Dataset statistics');
  console.log('  [SYS]     GET  /api/health                     - API health check');
  console.log('');

  // Pre-load the dataset in background
  githubDataset.loadDataset().catch((err) => {
    console.warn('[GitHub Dataset] Pre-load failed (will retry on first request):', err.message);
  });
});
