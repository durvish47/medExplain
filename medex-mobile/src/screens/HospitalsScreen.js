import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { storageService } from '../services/storageService';
import { colors, spacing, borderRadius } from '../theme/colors';
import { Header } from '../components/Header';
import { HospitalCard } from '../components/HospitalCard';
import { hospitalsService } from '../services/hospitalsService';
import { EMERGENCY_HELPLINES } from '../data/mockData';
import { Ionicons } from '@expo/vector-icons';

export const HospitalsScreen = () => {
  const [hospitals, setHospitals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('distance'); // 'distance', 'rating'
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [mode, setMode] = useState('nearby');
  const [location, setLocation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [directoryState, setDirectoryState] = useState('Tamil Nadu');
  const [directoryDistrict, setDirectoryDistrict] = useState('');
  const [room, setRoom] = useState('medex-consult');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    setBusy(true); setError('');
    const request = mode === 'nearby'
      ? hospitalsService.getHospitals({ sortBy, searchQuery, location: location || undefined })
      : hospitalsService.searchDirectory({ searchQuery, state:directoryState, district:directoryDistrict });
    request.then(result => {
      if (!active) return;
      const rows = Array.isArray(result) ? result : result.data || [];
      setHospitals(emergencyOnly ? rows.filter(item => item.emergencyAvailable) : rows);
    }).catch(e => { if (active) { setHospitals([]); setError(e.message); } })
      .finally(() => { if (active) setBusy(false); });
    if (mode === 'directory' && !stats) hospitalsService.getDirectoryStats().then(setStats).catch(() => {});
    return () => { active = false; };
  }, [mode,sortBy,emergencyOnly,searchQuery,location,directoryState,directoryDistrict]);

  const useMyLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Location permission was not granted.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude:pos.coords.latitude, longitude:pos.coords.longitude });
    } catch (e) { Alert.alert('Location unavailable', e.message || 'Could not access your location.'); }
  };

  const joinConsult = async () => {
    try {
      const settings = await storageService.getSettings();
      const base = Platform.OS === 'web' ? (settings.backendUrl && !settings.backendUrl.includes('10.0.2.2') ? settings.backendUrl : 'http://localhost:3000') : (settings.backendUrl || 'http://10.0.2.2:3000');
      const response = await fetch(`${base}/api/agora/config`);
      const config = await response.json();
      if (!response.ok || !config.configured) throw new Error('Video visits are not configured on the MedEx server yet. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE in the server environment.');
      const url = `${base}/teleconsult.html?room=${encodeURIComponent(room.trim() || 'medex-consult')}&role=patient`;
      await Linking.openURL(url);
    } catch (e) { Alert.alert('Video consultation unavailable', e.message); }
  };

  const handleDialEmergency = (number) => {
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate call.');
    });
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Hospitals & Care" 
        subtitle="Tamil Nadu Hospitals & 24/7 Emergency Care"
        icon="business"
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.consultCard}>
          <View style={{ flex:1 }}><Text style={styles.consultTitle}>Video consultation</Text><Text style={styles.emptySub}>Start a secure browser-based visit with your care team.</Text></View>
          <TextInput value={room} onChangeText={setRoom} placeholder="Visit room name" style={styles.roomInput} />
          <TouchableOpacity style={styles.consultButton} onPress={joinConsult}><Ionicons name="videocam" size={17} color="#fff"/><Text style={styles.consultButtonText}>Join visit</Text></TouchableOpacity>
        </View>
        {/* Emergency SOS Banner */}
        <View style={styles.sosBanner}>
          <View style={styles.sosHeader}>
            <Ionicons name="warning" size={20} color={colors.danger} />
            <Text style={styles.sosTitle}>Emergency 24/7 Hotlines</Text>
          </View>
          <View style={styles.helplineRow}>
            {EMERGENCY_HELPLINES.map((hl, idx) => (
              <TouchableOpacity 
                key={idx}
                style={styles.sosButton}
                onPress={() => handleDialEmergency(hl.number)}
                activeOpacity={0.8}
              >
                <View style={styles.sosNumberCircle}>
                  <Text style={styles.sosNumberText}>{hl.number}</Text>
                </View>
                <Text style={styles.sosNameText}>{hl.name}</Text>
                <Text style={styles.sosCallLabel}>Tap to call</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Search & Filters */}
        <View style={styles.filterSection}>
          <View style={styles.controlsRow}>
            {['nearby','directory'].map(value => <TouchableOpacity key={value} style={[styles.sortBtn, mode===value && styles.sortBtnActive]} onPress={()=>setMode(value)}><Text style={[styles.sortText,mode===value&&styles.sortTextActive]}>{value==='nearby'?'Nearby':'India directory'}</Text></TouchableOpacity>)}
            {mode==='nearby' && <TouchableOpacity style={styles.sortBtn} onPress={useMyLocation}><Ionicons name="locate" size={15} color={colors.primary}/><Text style={styles.sortText}>Use my location</Text></TouchableOpacity>}
          </View>
          {mode==='directory' && <View style={styles.controlsRow}><TextInput style={styles.directoryInput} value={directoryState} onChangeText={setDirectoryState} placeholder="State"/><TextInput style={styles.directoryInput} value={directoryDistrict} onChangeText={setDirectoryDistrict} placeholder="District (optional)"/></View>}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search hospitals or area..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.controlsRow}>
            <View style={styles.sortToggleRow}>
              <TouchableOpacity 
                style={[styles.sortBtn, sortBy === 'distance' && styles.sortBtnActive]}
                onPress={() => setSortBy('distance')}
              >
                <Ionicons name="navigate-outline" size={13} color={sortBy === 'distance' ? colors.textWhite : colors.textSecondary} />
                <Text style={[styles.sortText, sortBy === 'distance' && styles.sortTextActive]}>Nearest</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.sortBtn, sortBy === 'rating' && styles.sortBtnActive]}
                onPress={() => setSortBy('rating')}
              >
                <Ionicons name="star" size={13} color={sortBy === 'rating' ? '#F59E0B' : colors.textSecondary} />
                <Text style={[styles.sortText, sortBy === 'rating' && styles.sortTextActive]}>Top Rated</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.emergencyToggle, emergencyOnly && styles.emergencyToggleActive]}
              onPress={() => setEmergencyOnly(!emergencyOnly)}
            >
              <Ionicons 
                name={emergencyOnly ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={emergencyOnly ? colors.danger : colors.textSecondary} 
              />
              <Text style={[styles.emergencyToggleText, emergencyOnly && styles.emergencyToggleTextActive]}>
                24/7 ER Only
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hospital Cards List */}
        <View style={styles.listSection}>
          <Text style={styles.resultsCount}>
            {busy ? 'Searching hospitals…' : `Found ${hospitals.length} hospital${hospitals.length !== 1 ? 's' : ''}`}{stats?.totalHospitals ? ` · ${stats.totalHospitals.toLocaleString()} in directory` : ''}
          </Text>

          {busy && <ActivityIndicator color={colors.primary} style={{ margin: spacing.md }} />}
          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {hospitals.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="business-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Hospitals Found</Text>
              <Text style={styles.emptySub}>Try searching a different hospital name or area.</Text>
            </View>
          ) : (
            hospitals.map(hospital => (
              <HospitalCard key={hospital.id} hospital={hospital} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: 40
  },
  sosBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  sosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  sosTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.danger,
    marginLeft: 6
  },
  helplineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  sosButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },
  sosNumberCircle: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  sosNumberText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textWhite
  },
  sosNameText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    height: 26
  },
  sosCallLabel: {
    fontSize: 9,
    color: colors.danger,
    fontWeight: '700',
    marginTop: 2
  },
  filterSection: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgHighlight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sortToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgHighlight,
    borderRadius: borderRadius.sm,
    padding: 2
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: borderRadius.sm
  },
  sortBtnActive: {
    backgroundColor: colors.primary
  },
  sortText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4
  },
  sortTextActive: {
    color: colors.textWhite,
    fontWeight: '700'
  },
  emergencyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgHighlight,
    borderWidth: 1,
    borderColor: colors.border
  },
  emergencyToggleActive: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2'
  },
  emergencyToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4
  },
  emergencyToggleTextActive: {
    color: colors.danger,
    fontWeight: '700'
  },
  listSection: {},
  resultsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2
  },
  consultCard:{backgroundColor:'#E9F8F4',borderRadius:borderRadius.md,padding:spacing.md,marginBottom:spacing.md,borderWidth:1,borderColor:'#B7E8DA'},
  consultTitle:{fontSize:16,fontWeight:'800',color:colors.primaryDark,marginBottom:4},
  roomInput:{backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:borderRadius.sm,padding:10,marginTop:spacing.sm,color:colors.textPrimary},
  consultButton:{flexDirection:'row',justifyContent:'center',alignItems:'center',backgroundColor:colors.primary,borderRadius:borderRadius.sm,padding:12,marginTop:spacing.sm,gap:8},
  consultButtonText:{fontSize:13,fontWeight:'700',color:'#fff'},
  directoryInput:{flex:1,backgroundColor:colors.bgHighlight,borderWidth:1,borderColor:colors.border,borderRadius:borderRadius.sm,padding:9,color:colors.textPrimary,marginVertical:spacing.xs},
  errorText:{color:colors.danger,marginBottom:spacing.sm}
});
