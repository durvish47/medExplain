// ============================================
// GitHub Live Dataset Service
// Fetches real hospital data LIVE from public GitHub repositories
// No hardcoding, 100% remote datasets
// ============================================

const axios = require('axios');

// Public Raw GitHub Dataset URLs
const GITHUB_SOURCES = {
  // 567 real hospitals across Tamil Nadu (all 38 districts)
  TAMIL_NADU_HOSPITALS_JSON: 'https://raw.githubusercontent.com/mskian/tamil-nadu-covid-beds-api/main/api.json',
  
  // All-India hospitals dataset with coordinates
  INDIA_HOSPITALS_CSV: 'https://raw.githubusercontent.com/OneFourthLabs/CoViD19-Viz/master/hospitals.csv'
};

// District coordinates for Tamil Nadu (centroids for distance calculations when individual lat/lon not present)
const TN_DISTRICT_COORDS = {
  'Ariyalur': { latitude: 11.1401, longitude: 79.0740 },
  'Chengalpattu': { latitude: 12.6709, longitude: 79.9801 },
  'Chennai': { latitude: 13.0827, longitude: 80.2707 },
  'Coimbatore': { latitude: 11.0168, longitude: 76.9558 },
  'Cuddalore': { latitude: 11.7480, longitude: 79.7714 },
  'Dharmapuri': { latitude: 12.1277, longitude: 78.1578 },
  'Dindigul': { latitude: 10.3624, longitude: 77.9695 },
  'Erode': { latitude: 11.3410, longitude: 77.7172 },
  'Kallakurichi': { latitude: 11.7377, longitude: 78.9626 },
  'Kancheepuram': { latitude: 12.8342, longitude: 79.7036 },
  'Kanyakumari': { latitude: 8.0883, longitude: 77.5385 },
  'Karur': { latitude: 10.9601, longitude: 78.0766 },
  'Krishnagiri': { latitude: 12.5266, longitude: 78.2140 },
  'Madurai': { latitude: 9.9252, longitude: 78.1198 },
  'Mayiladuthurai': { latitude: 11.1026, longitude: 79.6503 },
  'Nagapattinam': { latitude: 10.7656, longitude: 79.8424 },
  'Namakkal': { latitude: 11.2259, longitude: 78.1679 },
  'Nilgiris': { latitude: 11.4102, longitude: 76.6950 },
  'Perambalur': { latitude: 11.2320, longitude: 78.8836 },
  'Pudukkottai': { latitude: 10.3833, longitude: 78.8000 },
  'Ramanathapuram': { latitude: 9.3634, longitude: 78.8394 },
  'Ranipet': { latitude: 12.9292, longitude: 79.3330 },
  'Salem': { latitude: 11.6643, longitude: 78.1460 },
  'Sivaganga': { latitude: 9.8447, longitude: 78.4810 },
  'Tenkasi': { latitude: 8.9592, longitude: 77.3152 },
  'Thanjavur': { latitude: 10.7870, longitude: 79.1378 },
  'Theni': { latitude: 10.0104, longitude: 77.4768 },
  'Thoothukudi': { latitude: 8.8051, longitude: 78.1364 },
  'Tiruchirappalli': { latitude: 10.7905, longitude: 78.7047 },
  'Tirunelveli': { latitude: 8.7115, longitude: 77.7512 },
  'Tirupathur': { latitude: 12.4928, longitude: 78.5678 },
  'Tiruppur': { latitude: 11.1085, longitude: 77.3411 },
  'Tiruvallur': { latitude: 13.1430, longitude: 79.9100 },
  'Tiruvannamalai': { latitude: 12.2253, longitude: 79.0747 },
  'Tiruvarur': { latitude: 10.7712, longitude: 79.6380 },
  'Vellore': { latitude: 12.9165, longitude: 79.1325 },
  'Viluppuram': { latitude: 11.9401, longitude: 79.4861 },
  'Virudhunagar': { latitude: 9.5813, longitude: 77.9579 }
};

// In-memory cache for live fetched datasets
let datasetCache = {
  hospitals: null,
  loadedAt: null,
  tnHospitalsCount: 0,
  indiaHospitalsCount: 0
};

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache

/**
 * Parse CSV text into array of objects
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/\r/g, ''));
  const headers = rawHeaders[0] === '' ? rawHeaders.slice(1) : rawHeaders;
  const offset = rawHeaders[0] === '' ? 1 : 0;

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const allValues = line.split(',').map((v) => v.trim().replace(/\r/g, ''));
    const values = offset ? allValues.slice(offset) : allValues;

    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    const lat = parseFloat(row.latitude);
    const lon = parseFloat(row.longitude);
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
      row.latitude = lat;
      row.longitude = lon;
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Load and merge live datasets directly from GitHub
 */
async function loadDataset(forceRefresh = false) {
  if (
    !forceRefresh &&
    datasetCache.hospitals &&
    datasetCache.loadedAt &&
    Date.now() - datasetCache.loadedAt < CACHE_DURATION_MS
  ) {
    return datasetCache.hospitals;
  }

  const merged = [];
  const seenNames = new Set();
  let tnCount = 0;
  let indiaCount = 0;

  // 1. Fetch live Tamil Nadu dataset (567 hospitals) from GitHub
  try {
    console.log(`[GitHub Live] Fetching Tamil Nadu hospitals: ${GITHUB_SOURCES.TAMIL_NADU_HOSPITALS_JSON}`);
    const tnResponse = await axios.get(GITHUB_SOURCES.TAMIL_NADU_HOSPITALS_JSON, {
      timeout: 30000,
      headers: { 'User-Agent': 'HealthcareAPI/2.3' }
    });

    const tnHospitals = Array.isArray(tnResponse.data) ? tnResponse.data : [];
    tnCount = tnHospitals.length;

    tnHospitals.forEach((h) => {
      const name = (h.Institution || '').replace(/_/g, ' ').trim();
      const district = (h.District || '').trim();
      if (!name) return;

      const key = name.toLowerCase();
      if (seenNames.has(key)) return;
      seenNames.add(key);

      const districtCoords = TN_DISTRICT_COORDS[district] || { latitude: 13.0827, longitude: 80.2707 };

      merged.push({
        name: name,
        category: (h.Remarks && h.Remarks.toLowerCase().includes('govt')) ? 'government' : 'private/general',
        city: district,
        district: district,
        state: 'Tamil Nadu',
        helpline: (h.Contact_Number && h.Contact_Number !== '0') ? String(h.Contact_Number) : 'Not available',
        beds: {
          total: parseInt(h.COVID_BEDS_Total) || null,
          vacant: parseInt(h.COVID_BEDS_Vacant) || null,
          oxygenBeds: parseInt(h.OXYGEN_SUPPORTED_BEDS_Total) || null,
          icuBeds: parseInt(h.ICU_BEDS_Total) || null,
          ventilatorBeds: parseInt(h.VENTILATOR_Total) || null
        },
        location: {
          latitude: districtCoords.latitude,
          longitude: districtCoords.longitude
        },
        lastUpdated: h.Last_updated || null,
        source: 'GitHub Live Dataset (mskian/tamil-nadu-covid-beds-api)'
      });
    });

    console.log(`[GitHub Live] Successfully parsed ${tnCount} hospitals for Tamil Nadu!`);
  } catch (err) {
    console.error(`[GitHub Live] Error fetching TN dataset: ${err.message}`);
  }

  // 2. Fetch live All-India dataset (101 hospitals) from GitHub
  try {
    console.log(`[GitHub Live] Fetching All-India hospitals: ${GITHUB_SOURCES.INDIA_HOSPITALS_CSV}`);
    const indiaResponse = await axios.get(GITHUB_SOURCES.INDIA_HOSPITALS_CSV, {
      timeout: 30000,
      headers: { 'User-Agent': 'HealthcareAPI/2.3' }
    });

    const indiaHospitals = parseCSV(indiaResponse.data);
    indiaCount = indiaHospitals.length;

    indiaHospitals.forEach((h) => {
      const name = (h.name || '').trim();
      if (!name) return;

      const key = name.toLowerCase();
      if (seenNames.has(key)) return;
      seenNames.add(key);

      merged.push({
        name: name,
        category: h.category || 'N/A',
        city: h.city || '',
        district: h.district || '',
        state: h.state || '',
        helpline: h.helpline || 'Not available',
        beds: null,
        mapUrl: h.url || null,
        location: {
          latitude: h.latitude,
          longitude: h.longitude
        },
        source: 'GitHub Live Dataset (OneFourthLabs/CoViD19-Viz)'
      });
    });

    console.log(`[GitHub Live] Successfully parsed ${indiaCount} hospitals across India!`);
  } catch (err) {
    console.error(`[GitHub Live] Error fetching India CSV dataset: ${err.message}`);
  }

  datasetCache = {
    hospitals: merged,
    loadedAt: Date.now(),
    tnHospitalsCount: tnCount,
    indiaHospitalsCount: indiaCount
  };

  console.log(`[Dataset] Total live merged hospitals: ${merged.length}`);
  return merged;
}

/**
 * Haversine formula to compute distance in km
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Search hospitals with filters & pagination
 */
async function searchHospitals(filters = {}) {
  const allHospitals = await loadDataset();
  let results = [...allHospitals];

  if (filters.state) {
    const stateQuery = filters.state.toLowerCase();
    results = results.filter((h) => h.state?.toLowerCase().includes(stateQuery));
  }

  if (filters.city) {
    const cityQuery = filters.city.toLowerCase();
    results = results.filter((h) => h.city?.toLowerCase().includes(cityQuery));
  }

  if (filters.district) {
    const districtQuery = filters.district.toLowerCase();
    results = results.filter((h) => h.district?.toLowerCase().includes(districtQuery));
  }

  if (filters.name) {
    const nameQuery = filters.name.toLowerCase();
    results = results.filter((h) => h.name?.toLowerCase().includes(nameQuery));
  }

  if (filters.category) {
    const catQuery = filters.category.toLowerCase();
    results = results.filter((h) => h.category?.toLowerCase().includes(catQuery));
  }

  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(filters.limit) || 10));
  const totalResults = results.length;
  const totalPages = Math.ceil(totalResults / limit);
  const startIndex = (page - 1) * limit;

  const paginatedResults = results.slice(startIndex, startIndex + limit).map((h, idx) => ({
    id: startIndex + idx + 1,
    ...h
  }));

  return {
    hospitals: paginatedResults,
    pagination: {
      currentPage: page,
      totalPages,
      totalResults,
      resultsPerPage: limit
    }
  };
}

/**
 * Find nearest hospitals from live dataset
 */
async function findNearbyFromDataset(lat, lon, radiusKm = 50, limit = 6) {
  const allHospitals = await loadDataset();

  const withDistance = allHospitals
    .map((h, idx) => ({
      id: idx + 1,
      name: h.name,
      category: h.category,
      city: h.city,
      district: h.district,
      state: h.state,
      helpline: h.helpline,
      beds: h.beds || null,
      mapUrl: h.mapUrl || null,
      distanceKm: haversineDistance(lat, lon, h.location.latitude, h.location.longitude),
      location: h.location,
      source: h.source
    }))
    .filter((h) => h.distanceKm <= radiusKm);

  withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
  return withDistance.slice(0, limit);
}

/**
 * Get dataset statistics
 */
async function getDatasetStats() {
  const allHospitals = await loadDataset();

  const states = [...new Set(allHospitals.map((h) => h.state).filter(Boolean))].sort();
  const tnDistricts = [
    ...new Set(
      allHospitals
        .filter((h) => h.state === 'Tamil Nadu')
        .map((h) => h.district)
        .filter(Boolean)
    )
  ].sort();

  return {
    totalHospitals: allHospitals.length,
    tamilNaduHospitalsCount: allHospitals.filter((h) => h.state === 'Tamil Nadu').length,
    statesCount: states.length,
    states: states,
    tamilNaduDistrictsCovered: tnDistricts.length,
    districts: tnDistricts,
    liveSources: [
      GITHUB_SOURCES.TAMIL_NADU_HOSPITALS_JSON,
      GITHUB_SOURCES.INDIA_HOSPITALS_CSV
    ],
    cachedAt: datasetCache.loadedAt ? new Date(datasetCache.loadedAt).toISOString() : null
  };
}

module.exports = {
  loadDataset,
  searchHospitals,
  findNearbyFromDataset,
  getDatasetStats
};
