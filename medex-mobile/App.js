import React, { useState, useCallback } from 'react';
import { Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { colors, borderRadius } from './src/theme/colors';
import { AmbientHealthBackground } from './src/components/AmbientHealthBackground';
import { HomeScreen } from './src/screens/HomeScreen';
import { MedExplainScreen } from './src/screens/MedExplainScreen';
import { MedRemindScreen } from './src/screens/MedRemindScreen';
import { MedLexiconScreen } from './src/screens/MedLexiconScreen';
import { HospitalsScreen } from './src/screens/HospitalsScreen';
import { InsuranceScreen } from './src/screens/InsuranceScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AuthFlow } from './src/auth/AuthFlow';
import { storageService } from './src/services/storageService';
// NativeWind: loads Tailwind's base/components/utilities for className props
import './global.css';

const TABS = [
  { id: 'home', label: 'Home', icon: 'grid-outline', active: 'grid' },
  { id: 'explain', label: 'Reports', icon: 'document-text-outline', active: 'document-text' },
  { id: 'remind', label: 'Medicines', icon: 'medkit-outline', active: 'medkit' },
  { id: 'lexicon', label: 'Library', icon: 'book-outline', active: 'book' },
  { id: 'hospitals', label: 'Care', icon: 'location-outline', active: 'location' },
  { id: 'insurance', label: 'Insurance', icon: 'shield-checkmark-outline', active: 'shield-checkmark' },
  { id: 'settings', label: 'Profile', icon: 'person-outline', active: 'person' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  // null until the user finishes signup/login + onboarding
  const [user, setUser] = useState(null);

  // Persist signup/onboarding data into the settings profile so
  // SettingsScreen picks it up automatically on mount.
  const handleAuthComplete = useCallback(async (authResult) => {
    const { role, profile, email } = authResult;

    if (profile) {
      // Save the complete profile payload plus role and email.
      // full_name is mapped to name for the settings display.
      const profileData = {
        ...profile,
        role: role || '',
      };
      if (profile.full_name) profileData.name = profile.full_name;
      if (email) profileData.email = email;
      if (profile.emergencyContactName != null) {
        profileData.emergencyContactName = String(profile.emergencyContactName).trim();
      } else if (profile.emergency_contact_name != null) {
        profileData.emergencyContactName = String(profile.emergency_contact_name).trim();
      }
      if (profile.emergencyContactPhone != null) {
        profileData.emergencyContactPhone = String(profile.emergencyContactPhone).trim();
      } else if (profile.emergency_contact_phone != null) {
        profileData.emergencyContactPhone = String(profile.emergency_contact_phone).trim();
      }

      await storageService.saveUserProfile(profileData);
    } else if (email) {
      // Login-only flow: persist the email and verified database role
      await storageService.saveUserProfile({ email, role: role || '' });
    }

    setUser(authResult);
  }, []);
  const screens = {
    home: <HomeScreen onNavigate={setActiveTab} />,
    explain: <MedExplainScreen />,
    remind: <MedRemindScreen />,
    lexicon: <MedLexiconScreen />,
    hospitals: <HospitalsScreen />,
    insurance: <InsuranceScreen />,
    settings: <SettingsScreen onLogout={() => setUser(null)} />,
  };

  // Show the auth + onboarding flow before the main app
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ExpoStatusBar style="dark" backgroundColor={colors.bgMuted} />
        <AuthFlow onComplete={handleAuthComplete} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="dark" backgroundColor={colors.bgMuted} />
      <AmbientHealthBackground />
      <View style={styles.screenContainer}>{screens[activeTab] || screens.home}</View>
      <View style={styles.navWrap}>
        <View style={styles.navBar}>
          {TABS.map(tab => {
            const selected = activeTab === tab.id;
            return <TouchableOpacity key={tab.id} style={styles.navItem} onPress={() => setActiveTab(tab.id)} activeOpacity={0.72} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={tab.label}>
              <View style={[styles.navIconBox, selected && styles.navIconBoxActive]}><Ionicons name={selected ? tab.active : tab.icon} size={19} color={selected ? '#FFFFFF' : colors.textMuted} /></View>
              <Text numberOfLines={1} style={[styles.navLabel, selected && styles.navLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>;
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgMuted, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  screenContainer: { flex: 1 },
  navWrap: { paddingHorizontal: 12, paddingTop: 7, paddingBottom: Platform.OS === 'web' ? 9 : 5, backgroundColor: 'rgba(243,248,246,0.96)' },
  navBar: { minHeight: 58, borderRadius: borderRadius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 3, shadowColor: '#17453D', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0, paddingVertical: 4 },
  navIconBox: { width: 31, height: 29, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  navIconBoxActive: { backgroundColor: colors.primary },
  navLabel: { fontSize: 9, fontWeight: '600', color: colors.textMuted, marginTop: 1 },
  navLabelActive: { color: colors.primaryDark, fontWeight: '800' },
});
