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
import { DatePickerField } from '../components/DatePickerField';
import {
  GENDER_OPTIONS,
  SPECIALITY_OPTIONS,
  QUALIFICATION_OPTIONS,
  AVAILABILITY_OPTIONS,
} from '../auth/profileSchemas';

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

export const SettingsScreen = ({ onLogout }) => {
  // Profile
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [role, setRole] = useState('');

  // Patient-specific
  const [dob, setDob] = useState('');
  const [occupation, setOccupation] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [isSmoker, setIsSmoker] = useState(null);
  const [isDrinker, setIsDrinker] = useState(null);
  const [govtId, setGovtId] = useState('');

  // Doctor-specific
  const [regNumber, setRegNumber] = useState('');
  const [stateMedicalCouncil, setStateMedicalCouncil] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [yoe, setYoe] = useState('');
  const [highestQualification, setHighestQualification] = useState('');
  const [hospital, setHospital] = useState('');
  const [availability, setAvailability] = useState('');

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
    setRole(profile.role || '');
    setDob(profile.dob || '');
    setOccupation(profile.occupation || '');
    setHeight(profile.height != null ? String(profile.height) : '');
    setWeight(profile.weight != null ? String(profile.weight) : '');
    setIsSmoker(profile.is_smoker ?? null);
    setIsDrinker(profile.is_drinker ?? null);
    setGovtId(profile.govt_id || '');
    setRegNumber(profile.reg_number || '');
    setStateMedicalCouncil(profile.state_medical_council || '');
    setSpeciality(profile.speciality || '');
    setYoe(profile.yoe != null ? String(profile.yoe) : '');
    setHighestQualification(profile.highest_qualification || '');
    setHospital(profile.hospital || '');
    setAvailability(profile.availability || '');
    setEmergencyName(profile.emergencyContactName || '');
    setEmergencyPhone(profile.emergencyContactPhone || '');

    const prefs = await storageService.getUserPreferences();
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

  // ────────────────────────────────
  // Save
  // ────────────────────────────────
  const handleSave = async () => {
    await storageService.saveUserProfile({
      // `name` is the display name; `full_name` is the field signup writes, so keep both in sync
      name: name.trim(),
      full_name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      bloodGroup: bloodGroup.trim(),
      age: age.trim(),
      gender: gender.trim(),
      role,
      dob: dob.trim(),
      govt_id: govtId.trim(),
      occupation: occupation.trim(),
      // Numeric fields are stored as numbers, matching the signup payload
      height: height.trim() ? Number(height.trim()) : '',
      weight: weight.trim() ? Number(weight.trim()) : '',
      is_smoker: isSmoker,
      is_drinker: isDrinker,
      reg_number: regNumber.trim(),
      state_medical_council: stateMedicalCouncil.trim(),
      speciality,
      yoe: yoe.trim() ? Number(yoe.trim()) : '',
      highest_qualification: highestQualification,
      hospital: hospital.trim(),
      availability,
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

                {/* Profile */}
        <SectionCard icon="person-circle-outline" title="My Profile">
          {role ? (
            <View style={styles.roleBadge}>
              <Ionicons name={role === 'doctor' ? 'medical-outline' : 'heart-outline'} size={13} color={colors.primary} />
              <Text style={styles.roleBadgeText}>{role === 'doctor' ? 'Doctor' : 'Patient'}</Text>
            </View>
          ) : null}

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

          <FieldLabel label="Gender" />
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((g) => (
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

          <FieldLabel label="Government ID Number" />
          <TextInput
            style={styles.input}
            placeholder="ID number"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            value={govtId}
            onChangeText={setGovtId}
          />

          {/* Patient-specific fields */}
          {role !== 'doctor' ? (
            <>
              <View style={styles.inlineRow}>
                <View style={styles.inlineHalf}>
                  <FieldLabel label="Date of Birth" />
                  <DatePickerField
                    value={dob}
                    onChange={setDob}
                    variant="settings"
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={[styles.inlineHalf, { marginLeft: 8 }]}>
                  <FieldLabel label="Occupation" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Teacher"
                    placeholderTextColor={colors.textMuted}
                    value={occupation}
                    onChangeText={setOccupation}
                  />
                </View>
              </View>

              <View style={styles.inlineRow}>
                <View style={styles.inlineHalf}>
                  <FieldLabel label="Height (cm)" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 170"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={height}
                    onChangeText={setHeight}
                  />
                </View>
                <View style={[styles.inlineHalf, { marginLeft: 8 }]}>
                  <FieldLabel label="Weight (kg)" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 65.5"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={weight}
                    onChangeText={setWeight}
                  />
                </View>
              </View>

              <View style={styles.inlineRow}>
                <View style={styles.inlineHalf}>
                  <FieldLabel label="Do you smoke?" />
                  <View style={styles.genderRow}>
                    {['Yes', 'No'].map((opt) => {
                      const val = opt === 'Yes';
                      return (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.langChip, isSmoker === val && styles.langChipActive]}
                          onPress={() => setIsSmoker(val)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.langChipText, isSmoker === val && styles.langChipTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <View style={[styles.inlineHalf, { marginLeft: 8 }]}>
                  <FieldLabel label="Do you drink alcohol?" />
                  <View style={styles.genderRow}>
                    {['Yes', 'No'].map((opt) => {
                      const val = opt === 'Yes';
                      return (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.langChip, isDrinker === val && styles.langChipActive]}
                          onPress={() => setIsDrinker(val)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.langChipText, isDrinker === val && styles.langChipTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </>
          ) : null}

          {/* Doctor-specific fields */}
          {role === 'doctor' ? (
            <>
              <View style={styles.inlineRow}>
                <View style={styles.inlineHalf}>
                  <FieldLabel label="Registration Number" />
                  <TextInput
                    style={styles.input}
                    placeholder="Medical council reg. no."
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    value={regNumber}
                    onChangeText={setRegNumber}
                  />
                </View>
                <View style={[styles.inlineHalf, { marginLeft: 8 }]}>
                  <FieldLabel label="State Medical Council" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Tamil Nadu Medical Council"
                    placeholderTextColor={colors.textMuted}
                    value={stateMedicalCouncil}
                    onChangeText={setStateMedicalCouncil}
                  />
                </View>
              </View>

              <FieldLabel label="Speciality" />
              <View style={styles.chipWrap}>
                {SPECIALITY_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.langChip, styles.chipAuto, speciality === s && styles.langChipActive]}
                    onPress={() => setSpeciality(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.langChipText, speciality === s && styles.langChipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inlineRow}>
                <View style={styles.inlineHalf}>
                  <FieldLabel label="Years of Experience" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 8"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={yoe}
                    onChangeText={setYoe}
                  />
                </View>
                <View style={[styles.inlineHalf, { marginLeft: 8 }]}>
                  <FieldLabel label="Hospital / Clinic" />
                  <TextInput
                    style={styles.input}
                    placeholder="Where you practise"
                    placeholderTextColor={colors.textMuted}
                    value={hospital}
                    onChangeText={setHospital}
                  />
                </View>
              </View>

              <FieldLabel label="Highest Qualification" />
              <View style={styles.genderRow}>
                {QUALIFICATION_OPTIONS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.langChip, highestQualification === q && styles.langChipActive]}
                    onPress={() => setHighestQualification(q)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.langChipText, highestQualification === q && styles.langChipTextActive]}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FieldLabel label="Availability" />
              <View style={styles.genderRow}>
                {AVAILABILITY_OPTIONS.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.langChip, availability === a && styles.langChipActive]}
                    onPress={() => setAvailability(a)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.langChipText, availability === a && styles.langChipTextActive]}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}
        </SectionCard>

{/* ── Emergency Contact ── */}
        <SectionCard icon="alert-circle-outline" iconColor={colors.danger} title="Emergency Contact">
          <Text style={styles.cardSub}>This contact will be shown during emergency SOS situations.</Text>

          {!emergencyName.trim() && !emergencyPhone.trim() ? (
            <View style={styles.emergencyPromptBanner}>
              <View style={styles.emergencyPromptIconWrap}>
                <Ionicons name="warning-outline" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emergencyPromptTitle}>No emergency contact added</Text>
                <Text style={styles.emergencyPromptText}>
                  Please add a trusted contact person and phone number below so they can be reached in case of an emergency SOS situation.
                </Text>
              </View>
            </View>
          ) : !emergencyName.trim() || !emergencyPhone.trim() ? (
            <View style={styles.emergencyPromptBanner}>
              <View style={styles.emergencyPromptIconWrap}>
                <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emergencyPromptTitle}>Incomplete emergency contact</Text>
                <Text style={styles.emergencyPromptText}>
                  Please provide both a contact name and a phone number to ensure emergency alerts can reach them.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emergencySuccessBanner}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
              <Text style={styles.emergencySuccessText}>Emergency contact configured for SOS alerts</Text>
            </View>
          )}

          <FieldLabel label="Contact Name" />
          <TextInput
            style={styles.input}
            placeholder="Enter emergency contact name"
            placeholderTextColor={colors.textMuted}
            value={emergencyName}
            onChangeText={setEmergencyName}
          />

          <FieldLabel label="Contact Phone" />
          <TextInput
            style={styles.input}
            placeholder="Enter contact phone number"
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

        {/* Logout Button */}
        {onLogout ? (
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        ) : null}

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
  inlineRow: {
    flexDirection: 'row',
  },
  inlineHalf: {
    flex: 1,
  },

  // Gender / Lang chips
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: spacing.xs,
    gap: 4,
  },
  chipAuto: {
    flex: 0,
    paddingHorizontal: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.bgHighlight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: spacing.sm,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  emergencyPromptBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: '#F3D7A4',
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm + 2,
    gap: 10,
  },
  emergencyPromptIconWrap: {
    marginTop: 2,
  },
  emergencyPromptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 2,
  },
  emergencyPromptText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#875114',
  },
  emergencySuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: '#BDE6D4',
    borderRadius: borderRadius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: spacing.sm,
    gap: 8,
  },
  emergencySuccessText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
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
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 13,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
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
