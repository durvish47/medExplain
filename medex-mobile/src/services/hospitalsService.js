import { Platform } from 'react-native';
import { storageService } from './storageService';

const DEFAULT_LOCATION = { latitude:13.0827, longitude:80.2707 };

const backendUrl = async () => {
  const settings = await storageService.getSettings();
  if (Platform.OS === 'web') return settings.backendUrl && settings.backendUrl !== 'http://10.0.2.2:3000' ? settings.backendUrl : 'http://localhost:3000';
  return settings.backendUrl || 'http://10.0.2.2:3000';
};

const normalizeHospital = (hospital, index = 0) => ({
  id:hospital.id ?? hospital.osmId ?? `directory-${index}`,
  name:hospital.name || hospital.hospital_name || 'Healthcare facility',
  distanceKm:Number.isFinite(Number(hospital.distanceKm)) ? Number(hospital.distanceKm) : null,
  address:hospital.address || [hospital.city, hospital.district, hospital.state].filter(Boolean).join(', ') || 'Address unavailable',
  contact:hospital.contact || hospital.helpline || hospital.phone || null,
  rating:Number.isFinite(Number(hospital.rating)) ? Number(hospital.rating) : null,
  totalReviews:Number(hospital.totalReviews || hospital.total_reviews || 0),
  emergencyAvailable:Boolean(hospital.emergencyAvailable || hospital.emergency_available),
  location:hospital.location || (hospital.latitude && hospital.longitude ? { latitude:Number(hospital.latitude), longitude:Number(hospital.longitude) } : null),
  source:hospital.source || null,
  category:hospital.category || hospital.operatorType || null
});

const getJson = async (url) => {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Hospital service returned HTTP ${response.status}`);
  return body;
};

export const hospitalsService = {
  async getHospitals({ sortBy = 'distance', searchQuery = '', location = DEFAULT_LOCATION, radiusMeters = 25000, limit = 20 } = {}) {
    const base = await backendUrl();
    const params = new URLSearchParams({ lat:String(location?.latitude ?? DEFAULT_LOCATION.latitude), lon:String(location?.longitude ?? DEFAULT_LOCATION.longitude), radius:String(radiusMeters), limit:String(limit), sortBy });
    try {
      const live = await getJson(`${base}/api/hospitals?${params}`);
      let rows = (live.data || []).map(normalizeHospital);
      if (!rows.length) {
        const fallback = new URLSearchParams({ lat:params.get('lat'), lon:params.get('lon'), radius:String(Math.ceil(radiusMeters / 1000)), limit:String(limit) });
        const dataset = await getJson(`${base}/api/india/hospitals/nearby?${fallback}`);
        rows = (dataset.data || []).map(normalizeHospital);
      }
      const needle = searchQuery.trim().toLowerCase();
      if (needle) rows = rows.filter(row => `${row.name} ${row.address}`.toLowerCase().includes(needle));
      return { data:rows, source:live.source || 'Live OpenStreetMap and public hospital datasets', location:live.searchCoordinates || location };
    } catch (error) {
      throw new Error(`Could not load live nearby hospitals. ${error.message}`);
    }
  },

  async searchDirectory({ searchQuery = '', state = '', district = '', page = 1, limit = 20 } = {}) {
    const base = await backendUrl();
    const params = new URLSearchParams({ page:String(page), limit:String(limit) });
    if (searchQuery.trim()) params.set('name', searchQuery.trim());
    if (state.trim()) params.set('state', state.trim());
    if (district.trim()) params.set('district', district.trim());
    const result = await getJson(`${base}/api/india/hospitals?${params}`);
    return { data:(result.hospitals || []).map(normalizeHospital), pagination:result.pagination, source:result.source };
  },

  async getDirectoryStats() {
    const result = await getJson(`${await backendUrl()}/api/india/hospitals/stats`);
    return result.data;
  },

  async reverseGeocode(location) {
    const params = new URLSearchParams({ lat:String(location.latitude), lon:String(location.longitude) });
    const result = await getJson(`${await backendUrl()}/api/geocode/reverse?${params}`);
    return result.data?.displayName || result.data?.display_name || null;
  }
};
