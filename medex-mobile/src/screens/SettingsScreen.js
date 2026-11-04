import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { Header } from '../components/Header';
import { storageService } from '../services/storageService';
import { supabase } from '../config/supabase';
import { signInWithEmail, signUpWithEmail, signUpWithGoogle, signOut } from '../services/userService';

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

const SectionCard = ({ icon, iconColor, title, children }) => (
  <View style={styles.card}>
    <View style={styles.cardTitleRow}>
      <Ionicons name={icon} size={18} color={iconColor || colors.primary} />
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const FieldLabel = ({ label }) => (
  <Text style={styles.inputLabel}>{label}</Text>
);

const SettingRow = ({ icon, label, value, onValueChange, disabled }) => (
  <View style={styles.toggleRow}>
    <View style={styles.toggleLeft}>
      {icon && <Ionicons name={icon} size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />}
      <Text style={styles.toggleLabel}>{label}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.border, true: colors.primaryLight }}
      thumbColor={value ? colors.primary : '#ccc'}
    />
  </View>
);

const LangChip = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.langChip, selected && styles.langChipActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.langChipText, selected && styles.langChipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

// ──────────────────────────────────────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────────────────────────────────────

export const SettingsScreen = () => {
  // Profile
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Notifications
  const [doseReminders, setDoseReminders] = useState(true);
  const [appointmentAlerts, setAppointmentAlerts] = useState(true);
  const [soundVibration, setSoundVibration] = useState(true);

  // Appearance
  const [language, setLanguage] = useState('both');
  const [darkMode, setDarkMode] = useState(false);

  // Privacy
  const [biometricLock, setBiometricLock] = useState(false);
  const [allowCloudAI, setAllowCloudAI] = useState(true);
  const [includeProfileInVisitSummary, setIncludeProfileInVisitSummary] = useState(false);

  // Meal timings
  const [breakfast, setBreakfast] = useState('08:30');
  const [lunch, setLunch] = useState('13:00');
  const [dinner, setDinner] = useState('20:30');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountUser, setAccountUser] = useState(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [backendUrl, setBackendUrl] = useState('');

  // ────────────────────────────────
  // Load persisted data on mount
  // ────────────────────────────────
  const loadData = useCallback(async () => {
    const profile = await storageService.getUserProfile();
    setName(profile.name || '');
    setEmail(profile.email || '');
    setPhone(profile.phone || '');
    setBloodGroup(profile.bloodGroup || '');
    setAge(profile.age || '');
    setGender(profile.gender || '');
    setEmergencyName(profile.emergencyContactName || '');
    setEmergencyPhone(profile.emergencyContactPhone || '');

    const prefs = await storageService.getUserPreferences();
    const settings = await storageService.getSettings();
    setBackendUrl(settings.backendUrl || 'http://10.0.2.2:3000');
    setDoseReminders(prefs.doseReminders ?? true);
    setAppointmentAlerts(prefs.appointmentAlerts ?? true);
    setSoundVibration(prefs.soundVibration ?? true);
    setLanguage(prefs.language || 'both');
    setDarkMode(prefs.darkMode ?? false);
    setBiometricLock(false);
    setAllowCloudAI(prefs.allowCloudAI ?? true);
    setIncludeProfileInVisitSummary(prefs.includeProfileInVisitSummary ?? false);
    setBreakfast(prefs.breakfastTime || '08:30');
    setLunch(prefs.lunchTime || '13:00');
    setDinner(prefs.dinnerTime || '20:30');
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => setAccountUser(data.session?.user || null));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session)=>setAccountUser(session?.user||null));
    const acceptOAuthUrl = async (url) => {
      const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1] || '');
      const access_token=params.get('access_token'), refresh_token=params.get('refresh_token');
      const code=params.get('code');
      if(access_token && refresh_token) await supabase.auth.setSession({access_token,refresh_token});
      else if(code) await supabase.auth.exchangeCodeForSession(code);
    };
    const listener=Linking.addEventListener('url',({url})=>acceptOAuthUrl(url));
    Linking.getInitialURL().then(url=>url&&acceptOAuthUrl(url));
    if(Platform.OS==='web' && globalThis.location?.href) acceptOAuthUrl(globalThis.location.href).then(()=>{if(globalThis.history && (globalThis.location.search.includes('code=') || globalThis.location.hash.includes('access_token='))) globalThis.history.replaceState({},'',globalThis.location.pathname);});
    return ()=>{subscription.unsubscribe();listener.remove();};
  },[]);

  const submitAccount = async (fn) => {
    if(!email.trim() || !accountPassword) { Alert.alert('Account','Enter your email and password.'); return; }
    setAccountBusy(true);
    try { const {error}=await fn(email.trim(),accountPassword); if(error) throw error; setAccountPassword(''); Alert.alert('Account',createAccount?'Check your email if verification is enabled.':'Signed in successfully.'); }
    catch(e){Alert.alert('Account',e.message||'Could not complete account request.');}
    finally{setAccountBusy(false);}
  };
  const handleGoogleAccount = async () => {
    setAccountBusy(true);
    try { const redirectTo=Platform.OS==='web' ? `${globalThis.location.origin}/` : 'medex://auth/callback'; const {data,error}=await signUpWithGoogle(redirectTo); if(error) throw error; if(!data?.url) throw new Error('Supabase did not return a Google sign-in URL.'); if(Platform.OS==='web' && globalThis.location) globalThis.location.assign(data.url); else await Linking.openURL(data.url); }
    catch(e){Alert.alert('Google sign-in',e.message||'Could not start Google sign-in.');} finally{setAccountBusy(false);}
  };

  // ────────────────────────────────
  // Save
  // ────────────────────────────────
  const handleSave = async () => {
    await storageService.saveUserProfile({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      bloodGroup: bloodGroup.trim(),
      age: age.trim(),
      gender: gender.trim(),
      emergencyContactName: emergencyName.trim(),
      emergencyContactPhone: emergencyPhone.trim(),
    });

    await storageService.saveUserPreferences({
      doseReminders,
      appointmentAlerts,
      soundVibration,
      language,
      darkMode,
      biometricLock,
      allowCloudAI,
      includeProfileInVisitSummary,
      breakfastTime: breakfast.trim(),
      lunchTime: lunch.trim(),
      dinnerTime: dinner.trim(),
    });
    await storageService.saveSettings({ backendUrl:backendUrl.trim().replace(/\/$/, '') });

    Alert.alert('Saved', 'Your profile and preferences have been updated.', [{ text: 'OK' }]);
  };

  // ────────────────────────────────
  // Clear health data
  // ────────────────────────────────
  const handleClearData = () => {
    Alert.alert(
      'Delete Local Health Data',
      'This removes your profile, reports, prescriptions, visits, dose history, and saved AI connection keys from this device. Display and reminder preferences are kept. It does not delete information already sent to an AI provider. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            const cleared = await storageService.clearAllHealthData();
            Alert.alert(cleared ? 'Done' : 'Could not clear data', cleared ? 'Your local health records, profile, and saved AI connection keys were deleted.' : 'Please try again.');
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const data = await storageService.exportHealthData();
      const message = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web' && globalThis.document && globalThis.URL?.createObjectURL) {
        const fileUrl = globalThis.URL.createObjectURL(new Blob([message], { type: 'application/json' }));
        const link = globalThis.document.createElement('a');
        link.href = fileUrl;
        link.download = 'medex-health-data.json';
        link.click();
        globalThis.URL.revokeObjectURL(fileUrl);
        Alert.alert('Export ready', 'Your MedEx health data was downloaded as a JSON file.');
        return;
      }
      await Share.share({
        title: 'MedEx health data export',
        message: Platform.OS === 'ios' ? message : `MedEx health data export\n\n${message}`
      });
    } catch (error) {
      Alert.alert('Export unavailable', error.message || 'Could not open the share sheet.');
    }
  };

  // ────────────────────────────────
  // Render
  // ────────────────────────────────
  return (
    <View style={styles.container}>
      <Header
        title="Settings"
        subtitle="Profile, Notifications & Preferences"
        icon="settings"
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>

        <SectionCard icon="cloud-outline" title="MedEx Account">
          {!supabase ? <Text style={styles.cardSub}>Cloud account access needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in medex-mobile/.env.</Text> : accountUser ? <><Text style={styles.cardSub}>Signed in as {accountUser.email}. Your reports and health records remain on this device.</Text><TouchableOpacity style={styles.secondaryButton} onPress={async()=>{const {error}=await signOut();if(error)Alert.alert('Sign out',error.message);}}><Text style={styles.secondaryButtonText}>Sign out</Text></TouchableOpacity></> : <>
            <Text style={styles.cardSub}>Sign in to your account. Local health records are not uploaded by signing in.</Text>
            <TextInput style={styles.input} placeholder="Email address" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail}/>
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.textMuted} secureTextEntry value={accountPassword} onChangeText={setAccountPassword}/>
            <TouchableOpacity style={styles.saveBtn} disabled={accountBusy} onPress={()=>submitAccount(createAccount?signUpWithEmail:signInWithEmail)}><Text style={styles.saveBtnText}>{accountBusy?'Please wait…':createAccount?'Create account':'Sign in'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} disabled={accountBusy} onPress={handleGoogleAccount}><Text style={styles.secondaryButtonText}>Continue with Google</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>setCreateAccount(v=>!v)}><Text style={styles.linkText}>{createAccount?'Already have an account? Sign in':'New to MedEx? Create an account'}</Text></TouchableOpacity>
          </>}
        </SectionCard>

        <SectionCard icon="server-outline" title="MedEx Service Connection">
          <Text style={styles.cardSub}>Set the backend address reachable from this device. On a physical phone, use your computer’s LAN address (for example, http://192.168.1.20:3000).</Text>
          <TextInput style={styles.input} value={backendUrl} onChangeText={setBackendUrl} autoCapitalize="none" keyboardType="url" placeholder="http://localhost:3000" placeholderTextColor={colors.textMuted}/>
        </SectionCard>

        {/* ── Profile ── */}
        <SectionCard icon="person-circle-outline" title="My Profile">
          <FieldLabel label="Full Name" />
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <FieldLabel label="Email Address" />
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <FieldLabel label="Phone Number" />
          <TextInput
            style={styles.input}
            placeholder="+91 XXXXX XXXXX"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <View style={styles.inlineRow}>
            <View style={styles.inlineHalf}>
              <FieldLabel label="Blood Group" />
              <TextInput
                style={styles.input}
                placeholder="e.g. O+"
                placeholderTextColor={colors.textMuted}
                value={bloodGroup}
                onChangeText={setBloodGroup}
              />
            </View>
            <View style={[styles.inlineHalf, { marginLeft: 8 }]}>
              <FieldLabel label="Age" />
              <TextInput
                style={styles.input}
                placeholder="e.g. 35"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={age}
                onChangeText={setAge}
              />
            </View>
          </View>

          <FieldLabel label="Gender" />
          <View style={styles.genderRow}>
            {['Male', 'Female', 'Other'].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.langChip, gender === g && styles.langChipActive]}
                onPress={() => setGender(g)}
                activeOpacity={0.7}
              >
                <Text style={[styles.langChipText, gender === g && styles.langChipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>

        {/* ── Emergency Contact ── */}
        <SectionCard icon="alert-circle-outline" iconColor={colors.danger} title="Emergency Contact">
          <Text style={styles.cardSub}>This contact will be shown during emergency SOS situations.</Text>

          <FieldLabel label="Contact Name" />
          <TextInput
            style={styles.input}
            placeholder="e.g. Kavitha (Spouse)"
            placeholderTextColor={colors.textMuted}
            value={emergencyName}
            onChangeText={setEmergencyName}
          />

          <FieldLabel label="Contact Phone" />
          <TextInput
            style={styles.input}
            placeholder="+91 XXXXX XXXXX"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
          />
        </SectionCard>

        {/* ── Notifications ── */}
        <SectionCard icon="notifications-outline" iconColor={colors.secondary} title="Notifications & Alerts">
          <SettingRow
            icon="medkit-outline"
            label="Dose Reminders"
            value={doseReminders}
            onValueChange={setDoseReminders}
          />
          <SettingRow
            icon="calendar-outline"
            label="Appointment Alerts"
            value={appointmentAlerts}
            onValueChange={setAppointmentAlerts}
          />
          <SettingRow
            icon="volume-high-outline"
            label="Sound & Vibration"
            value={soundVibration}
            onValueChange={setSoundVibration}
          />
        </SectionCard>

        {/* ── Meal Timings ── */}
        <SectionCard icon="time-outline" iconColor={colors.secondary} title="Meal Timings for Dose Alarms">
          <Text style={styles.cardSub}>Alarms trigger before / after meals based on these times.</Text>
          <View style={styles.mealRow}>
            <View style={{ flex: 1, marginRight: 4 }}>
              <FieldLabel label="Breakfast" />
              <TextInput
                style={styles.input}
                placeholder="08:30"
                placeholderTextColor={colors.textMuted}
                value={breakfast}
                onChangeText={setBreakfast}
              />
            </View>
            <View style={{ flex: 1, marginHorizontal: 4 }}>
              <FieldLabel label="Lunch" />
              <TextInput
                style={styles.input}
                placeholder="13:00"
                placeholderTextColor={colors.textMuted}
                value={lunch}
                onChangeText={setLunch}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 4 }}>
              <FieldLabel label="Dinner" />
              <TextInput
                style={styles.input}
                placeholder="20:30"
                placeholderTextColor={colors.textMuted}
                value={dinner}
                onChangeText={setDinner}
              />
            </View>
          </View>
        </SectionCard>

        {/* ── Appearance ── */}
        <SectionCard icon="color-palette-outline" iconColor={colors.primaryDark} title="Appearance & Language">
          <FieldLabel label="Display Language" />
          <View style={styles.langRow}>
            <LangChip label="English" selected={language === 'en'} onPress={() => setLanguage('en')} />
            <LangChip label="தமிழ்" selected={language === 'ta'} onPress={() => setLanguage('ta')} />
            <LangChip label="Bilingual" selected={language === 'both'} onPress={() => setLanguage('both')} />
          </View>

          <SettingRow
            icon="moon-outline"
            label="Dark Mode"
            value={darkMode}
            onValueChange={setDarkMode}
          />
        </SectionCard>

        {/* ── Privacy & Security ── */}
        <SectionCard icon="shield-checkmark-outline" iconColor={colors.primaryDark} title="Privacy & Security">
          <SettingRow
            icon="finger-print-outline"
            label="Biometric Lock (not active yet)"
            value={false}
            disabled
          />
          <Text style={styles.privacyDetail}>This build does not yet lock the app with biometrics.</Text>

          <TouchableOpacity style={styles.dangerRow} onPress={handleClearData} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={styles.dangerText}>Delete local health data, profile & AI keys</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ── Privacy & AI Transparency ── */}
        <SectionCard icon="eye-outline" iconColor={colors.secondary} title="Privacy & AI Transparency">
          <Text style={styles.cardSub}>Choose whether health information can be sent to the services that analyze it. Your choice is saved with your preferences.</Text>
          <SettingRow
            icon="cloud-upload-outline"
            label="Allow cloud AI processing"
            value={allowCloudAI}
            onValueChange={setAllowCloudAI}
          />
          <Text style={styles.privacyDetail}>When enabled, report PDFs and prescription images are sent to your configured MedEx backend for processing; pasted report text is sent to Groq. Turn this off to block new cloud analysis requests. Built-in sample reports remain available.</Text>
          <SettingRow
            icon="person-outline"
            label="Include profile details in visit summaries"
            value={includeProfileInVisitSummary}
            onValueChange={setIncludeProfileInVisitSummary}
          />
          <Text style={styles.privacyDetail}>Off by default. If enabled, new summaries include only your name, age, gender, and blood group. Summaries are prepared on your device and shown before sharing; summaries already saved are not changed by this setting.</Text>
          <View style={styles.dataNotice}>
            <Ionicons name="phone-portrait-outline" size={16} color={colors.primary} />
            <Text style={styles.dataNoticeText}>Saved reports, prescriptions, appointments, and profile details stay in this app’s storage on this device; MedEx does not currently sync them to an account. Content you submit for analysis is sent to the service named above. Review its privacy terms before sending sensitive information.</Text>
          </View>
          <TouchableOpacity style={styles.exportRow} onPress={handleExportData} activeOpacity={0.72}>
            <Ionicons name="download-outline" size={17} color={colors.primary} />
            <Text style={styles.exportText}>Export my health data</Text>
            <Ionicons name="share-outline" size={15} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </SectionCard>

        {/* ── About ── */}
        <SectionCard icon="information-circle-outline" title="About">
          <TouchableOpacity
            style={styles.aboutRow}
            onPress={() => Linking.openURL('https://github.com/durvish47/medExplain')}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-github" size={16} color={colors.textSecondary} />
            <Text style={styles.aboutRowText}>Source Code on GitHub</Text>
            <Ionicons name="open-outline" size={14} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutRow} activeOpacity={0.7}>
            <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.aboutRowText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutRow} activeOpacity={0.7}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.aboutRowText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </SectionCard>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Ionicons name="checkmark-circle" size={20} color={colors.textWhite} />
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>

        {/* App Info Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>MedEx v1.0.0</Text>
          <Text style={styles.footerSub}>MedExplain · MedRemind · MedLexicon · Healthcare Finder</Text>
          <Text style={styles.footerSub}>Made with ❤️ for better health</Text>
        </View>

      </ScrollView>
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: { flex: 1 },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: 48,
  },

  // Card
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 8,
  },
  cardSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },

  // Inputs
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.bgHighlight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: 13,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  secondaryButton:{alignItems:'center',padding:11,borderRadius:borderRadius.sm,borderWidth:1,borderColor:colors.border,marginTop:spacing.xs,marginBottom:spacing.xs},
  secondaryButtonText:{fontSize:13,fontWeight:'700',color:colors.primaryDark},
  linkText:{textAlign:'center',color:colors.primaryDark,fontSize:12,fontWeight:'700',paddingVertical:spacing.sm},
  inlineRow: {
    flexDirection: 'row',
  },
  inlineHalf: {
    flex: 1,
  },

  // Gender / Lang chips
  genderRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  langRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  langChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgHighlight,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  langChipTextActive: {
    color: colors.textWhite,
    fontWeight: '700',
  },

  // Toggles
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },

  // Meal timings
  mealRow: {
    flexDirection: 'row',
  },

  // Danger action
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  dangerText: {
    fontSize: 13,
    color: colors.danger,
    marginLeft: 8,
    fontWeight: '600',
  },
  privacyDetail: { fontSize: 11, lineHeight: 16, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: 2 },
  dataNotice: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.sm, marginTop: spacing.xs, borderRadius: borderRadius.sm, backgroundColor: colors.bgHighlight, gap: 7 },
  dataNoticeText: { flex: 1, fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  exportRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, gap: 8 },
  exportText: { fontSize: 13, color: colors.primaryDark, fontWeight: '700' },

  // About rows
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aboutRowText: {
    fontSize: 13,
    color: colors.textPrimary,
    marginLeft: 10,
  },

  // Save button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textWhite,
    marginLeft: 8,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  footerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  footerSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
    textAlign: 'center',
  },
});
