import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Modal,
  TextInput,
  Platform,
  Share
} from 'react-native';
import { colors, spacing, borderRadius } from '../theme/colors';
import { Header } from '../components/Header';
import { MedicineCard } from '../components/MedicineCard';
import { storageService } from '../services/storageService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const makeVisitSummary = (data, discussion) => {
  const { visit, profile, reports, prescriptions, includeProfile } = data;
  const medicines = prescriptions.flatMap(prescription => (prescription.medicines || []).map(medicine => ({
    ...medicine,
    extractionUnreviewed: medicine.aiTransparency?.reviewedByUser === false || prescription.aiTransparency?.reviewedByUser === false
  })));
  const latestReports = [...reports].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 3);
  const lines = [
    'MEDEX · DOCTOR VISIT SUMMARY',
    'Patient-prepared information for discussion with a clinician.',
    '',
    `Appointment: ${visit.date || 'Date not set'} at ${visit.time || 'Time not set'}`,
    `Doctor: ${visit.doctorName || 'Not provided'}`,
    `Clinic: ${visit.clinicName || 'Not provided'}`,
  ];
  if (includeProfile) {
    const details = [profile.name, profile.age ? `${profile.age} years` : '', profile.gender, profile.bloodGroup ? `Blood group ${profile.bloodGroup}` : ''].filter(Boolean);
    if (details.length) lines.push('', `Patient details: ${details.join(' · ')}`);
  }
  if (visit.notes) lines.push('', `Appointment notes: ${visit.notes}`);
  if (discussion.trim()) lines.push('', `What I want to discuss: ${discussion.trim()}`);
  lines.push('', 'CURRENT MEDICINES');
  if (!medicines.length) lines.push('No saved medicines.');
  medicines.forEach(medicine => {
    const schedule = [medicine.dosage, medicine.frequencyNotation, medicine.durationDays ? `${medicine.durationDays} days` : ''].filter(Boolean).join(' · ');
    const extracted = medicine.extractionUnreviewed ? ' (extracted; please verify)' : '';
    lines.push(`• ${medicine.name || 'Medicine'}${schedule ? ` — ${schedule}` : ''}${extracted}`);
  });
  lines.push('', 'RECENT REPORTS');
  if (!latestReports.length) lines.push('No saved reports.');
  latestReports.forEach(report => {
    lines.push(`• ${report.date || 'Date unknown'} · ${report.title || 'Lab report'}${report.urgency ? ` · ${report.urgency}` : ''}`);
    const notableMetrics = (report.metrics || []).filter(metric => metric.status && metric.status !== 'NORMAL').slice(0, 4);
    if (notableMetrics.length) lines.push(`  Results to discuss: ${notableMetrics.map(metric => `${metric.name}: ${metric.value} ${metric.unit || ''} (${metric.status})`).join('; ')}`);
    else if (report.abnormal_findings?.length) lines.push(`  Findings: ${report.abnormal_findings.slice(0, 2).map(item => item.finding_en || item.finding).filter(Boolean).join('; ')}`);
  });
  lines.push('', 'Please bring the original reports and prescription. Verify extracted medicine details with your clinician.', 'This summary is assembled on this device from saved records and your notes; no new AI request is made. It is not a diagnosis or treatment recommendation.');
  return lines.join('\n');
};

export const MedRemindScreen = () => {
  const [loading, setLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [doseHistory, setDoseHistory] = useState({});
  const [mealTimings, setMealTimings] = useState({ breakfastTime: '08:30', lunchTime: '13:00', dinnerTime: '20:30' });
  const [checkups, setCheckups] = useState([]);
  const [summaryVisit, setSummaryVisit] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryDiscussion, setSummaryDiscussion] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summarySaving, setSummarySaving] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [calendarTokens, setCalendarTokens] = useState(null);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const calendarStateRef = useRef('');
  const calendarPopupRef = useRef(null);
  
  // Custom medicine modal
  const [modalVisible, setModalVisible] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('1 tablet');
  const [newMedDuration, setNewMedDuration] = useState('5');
  const [newMedFoodTiming, setNewMedFoodTiming] = useState('after_food');
  const [timingMorning, setTimingMorning] = useState(true);
  const [timingNoon, setTimingNoon] = useState(false);
  const [timingNight, setTimingNight] = useState(true);

  // Checkup modal
  const [checkupModalVisible, setCheckupModalVisible] = useState(false);
  const [docName, setDocName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [checkupDate, setCheckupDate] = useState('2026-11-05');
  const [checkupNotes, setCheckupNotes] = useState('Follow up consultation');

  const todayKey = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, []);

  const backendBase = async () => {
    const settings=await storageService.getSettings();
    return Platform.OS==='web' ? (settings.backendUrl && !settings.backendUrl.includes('10.0.2.2') ? settings.backendUrl : 'http://localhost:3000') : (settings.backendUrl || 'http://10.0.2.2:3000');
  };
  const exchangeCalendarCode = async (code,state) => {
    if(!code || !state || state!==calendarStateRef.current) return;
    setCalendarBusy(true); setCalendarError('');
    try {
      const base=await backendBase();
      const response=await fetch(`${base}/api/auth/google/exchange`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
      const result=await response.json();
      if(!response.ok || !result.success || !result.tokens?.refresh_token) throw new Error(result.message||'Google did not return offline calendar access. Try connecting again.');
      setCalendarTokens(result.tokens); calendarStateRef.current='';
      Alert.alert('Calendar connected','Google Calendar is connected for this app session. Scanned medicine reminders will only be added after you confirm them.');
    } catch(e){setCalendarError(e.message); Alert.alert('Calendar sign-in failed',e.message);} finally{setCalendarBusy(false);}
  };
  useEffect(()=>{
    if(Platform.OS==='web'){
      const onMessage=(event)=>{const expectedOrigin=calendarPopupRef.current?.origin;if(event.data?.type==='MEDEX_GOOGLE_CALENDAR' && event.origin===expectedOrigin) exchangeCalendarCode(event.data.code,event.data.state);};
      globalThis.addEventListener?.('message',onMessage);
      return ()=>globalThis.removeEventListener?.('message',onMessage);
    }
    const onUrl=({url})=>{const query=url.split('?')[1]||'';const params=new URLSearchParams(query);if(url.startsWith('medex://calendar-auth')) exchangeCalendarCode(params.get('code'),params.get('state'));};
    const listener=Linking.addEventListener('url',onUrl);
    Linking.getInitialURL().then(url=>url&&onUrl({url}));
    return ()=>listener.remove();
  },[]);

  const connectGoogleCalendar = async () => {
    setCalendarBusy(true);setCalendarError('');
    const state=`medex-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    calendarStateRef.current=state;
    try {
      let popup=null;
      if(Platform.OS==='web' && globalThis.window){popup=globalThis.window.open('about:blank','medex-google-calendar','width=520,height=700');if(!popup)throw new Error('Allow pop-ups for MedEx, then try again.');calendarPopupRef.current={window:popup,origin:new URL(await backendBase()).origin};}
      const base=await backendBase();
      const response=await fetch(`${base}/api/auth/google/url?state=${encodeURIComponent(state)}`);
      const result=await response.json();
      if(!response.ok || !result.authUrl) throw new Error(result.message||'Google Calendar sign-in is not configured.');
      if(popup) popup.location.href=result.authUrl; else await Linking.openURL(result.authUrl);
    } catch(e){calendarStateRef.current='';if(calendarPopupRef.current?.window)calendarPopupRef.current.window.close();calendarPopupRef.current=null;setCalendarError(e.message);Alert.alert('Google Calendar',e.message);}
    finally{setCalendarBusy(false);}
  };
  const scheduleMedicinesInCalendar = async () => {
    if(!calendarTokens){Alert.alert('Connect Google Calendar','Connect your account first to add reminders to Google Calendar.');return;}
    if(!allMedicines.length){Alert.alert('No medicines','Add or scan medicines before scheduling reminders.');return;}
    Alert.alert('Review before scheduling','Have you checked every medicine name, strength, dose, and timing against the original prescription?',[
      {text:'Review first',style:'cancel'},
      {text:'I reviewed them',onPress:async()=>{setCalendarBusy(true);try{const response=await fetch(`${await backendBase()}/api/prescriptions/schedule`,{method:'POST',headers:{'Content-Type':'application/json','x-google-refresh-token':calendarTokens.refresh_token},body:JSON.stringify({medicines:allMedicines,timeZone:'Asia/Kolkata',...mealTimings})});const result=await response.json();if(!response.ok||!result.success)throw new Error(result.message||'Calendar reminders could not be created.');Alert.alert('Calendar reminders',result.message||'Reminders were added to Google Calendar.');}catch(e){Alert.alert('Could not schedule',e.message);}finally{setCalendarBusy(false);}}}
    ]);
  };

  const loadData = async () => {
    const p = await storageService.getPrescriptions();
    setPrescriptions(p);
    const dh = await storageService.getDoseHistory();
    setDoseHistory(dh);
    const mt = await storageService.getMealTimings();
    setMealTimings(mt);
    const chk = await storageService.getCheckups();
    setCheckups(chk);
  };

  const handleScanPrescription = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to scan prescriptions.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        processPrescriptionFile(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handlePickPrescriptionImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        processPrescriptionFile(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const processPrescriptionFile = async (file) => {
    setLoading(true);
    try {
      const privacyPreferences = await storageService.getUserPreferences();
      if (!privacyPreferences.allowCloudAI) {
        throw new Error('Cloud processing is turned off. Enable it in Settings → Privacy & AI to scan a prescription.');
      }
      const settings = await storageService.getSettings();
      const serviceUrl = Platform.OS === 'web'
        ? (settings.backendUrl && settings.backendUrl !== 'http://10.0.2.2:3000' ? settings.backendUrl : 'http://localhost:3000')
        : (settings.backendUrl || 'http://10.0.2.2:3000');
      const formData = new FormData();
      if (Platform.OS === 'web' && file.file) {
        formData.append('prescription', file.file, file.name || 'prescription-image');
      } else {
        formData.append('prescription', {
          uri: file.uri,
          name: file.name || 'prescription-image.jpg',
          type: file.mimeType || file.type || 'image/jpeg'
        });
      }
      const response = await fetch(`${serviceUrl}/api/prescriptions/parse`, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || 'Prescription could not be read. Check that the MedRemind service is running.');
      }
      const parsed = {
        ...result.data,
        id: 'rx-' + Date.now(),
        prescriptionDate: result.data.prescriptionDate || todayKey,
        aiTransparency: {
          kind: 'extraction',
          source: 'Uploaded prescription image',
          provider: result.data.pipeline || 'Configured MedEx prescription service',
          remoteProcessing: true,
          createdAt: new Date().toISOString(),
          reviewedByUser: false
        },
        medicines: (result.data.medicines || []).map((medicine, index) => ({
          id: medicine.id || `med-${Date.now()}-${index}`,
          ...medicine
        }))
      };
      const updated = await storageService.savePrescription(parsed);
      setPrescriptions(updated);

      if (parsed.doctorCheckup?.mentioned) {
        const newChk = {
          id: 'chk-' + Date.now(),
          doctorName: parsed.doctorName || 'Doctor',
          clinicName: parsed.clinicOrHospital || 'Clinic',
          date: parsed.doctorCheckup.suggestedDate || todayKey,
          time: '10:00 AM',
          notes: parsed.doctorCheckup.instructions || 'Review consultation'
        };
        const updatedCheckups = await storageService.saveCheckup(newChk);
        setCheckups(updatedCheckups);
      }

      Alert.alert('Prescription read', `Found ${parsed.medicines?.length || 0} medicines. Review the details and add reminders as needed.`);
    } catch (e) {
      Alert.alert('Processing Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTaken = async (medId) => {
    const updated = await storageService.toggleDoseTaken(todayKey, medId);
    setDoseHistory({ ...updated });
  };

  const handleAddCustomMedicine = async () => {
    if (!newMedName.trim()) {
      Alert.alert('Required', 'Please enter medicine name');
      return;
    }

    const newMed = {
      id: 'med-' + Date.now(),
      name: newMedName.trim(),
      dosage: newMedDosage,
      durationDays: parseInt(newMedDuration, 10) || 5,
      foodTiming: newMedFoodTiming,
      frequencyNotation: `${timingMorning ? '1' : '0'}-${timingNoon ? '1' : '0'}-${timingNight ? '1' : '0'}`,
      timings: {
        breakfast: timingMorning,
        lunch: timingNoon,
        dinner: timingNight
      },
      specialInstructions: 'Custom patient dose'
    };

    let targetPrescription = prescriptions[0];
    if (!targetPrescription) {
      targetPrescription = {
        id: 'rx-' + Date.now(),
        doctorName: 'Self Added',
        clinicOrHospital: 'Personal Medicines',
        prescriptionDate: todayKey,
        medicines: []
      };
    }

    const updatedPrescription = {
      ...targetPrescription,
      medicines: [newMed, ...(targetPrescription.medicines || [])]
    };

    const updatedList = await storageService.savePrescription(updatedPrescription);
    setPrescriptions(updatedList);
    setModalVisible(false);
    setNewMedName('');
    Alert.alert('Saved', 'Medicine reminder added successfully.');
  };

  const handleAddDoctorCheckup = async () => {
    if (!docName.trim()) {
      Alert.alert('Required', 'Please enter doctor or clinic name');
      return;
    }

    const chk = {
      id: 'chk-' + Date.now(),
      doctorName: docName.trim(),
      clinicName: clinicName.trim() || 'Health Center',
      date: checkupDate,
      time: '10:00 AM',
      notes: checkupNotes
    };

    const updated = await storageService.saveCheckup(chk);
    setCheckups(updated);
    setCheckupModalVisible(false);
    setDocName('');
    setClinicName('');
    if (calendarTokens) {
      try {
        const response=await fetch(`${await backendBase()}/api/checkups/schedule`,{method:'POST',headers:{'Content-Type':'application/json','x-google-refresh-token':calendarTokens.refresh_token},body:JSON.stringify({doctorName:chk.doctorName,clinicName:chk.clinicName,appointmentDateTime:`${chk.date}T10:00:00`,timeZone:'Asia/Kolkata',notes:chk.notes})});
        const result=await response.json();
        if(!response.ok||!result.success) throw new Error(result.message||'Calendar sync failed.');
        Alert.alert('Checkup Scheduled','Appointment saved on this device and added to Google Calendar.');
      } catch(e) { Alert.alert('Saved on this device',`The appointment was saved locally, but Google Calendar sync failed: ${e.message}`); }
    } else Alert.alert('Checkup Scheduled', 'Doctor appointment saved on this device. Connect Google Calendar to sync it there.');
  };

  const openVisitSummary = async (visit) => {
    setSummaryVisit(visit);
    setSummaryDiscussion(visit.visitDiscussion || '');
    setSummaryData(null);
    setSummaryModalVisible(true);
    setSummaryLoading(true);
    try {
      const [profile, reports, savedPrescriptions, preferences] = await Promise.all([
        storageService.getUserProfile(), storageService.getReports(), storageService.getPrescriptions(), storageService.getUserPreferences()
      ]);
      setSummaryData({ visit, profile, reports, prescriptions: savedPrescriptions, includeProfile: preferences.includeProfileInVisitSummary });
    } catch {
      Alert.alert('Could not prepare summary', 'Some saved health information could not be loaded.');
      setSummaryModalVisible(false);
    } finally {
      setSummaryLoading(false);
    }
  };

  const saveVisitNotes = async () => {
    if (!summaryVisit) return;
    setSummarySaving(true);
    try {
      const preparedAt = new Date().toISOString();
      const visitSummary = summaryData ? makeVisitSummary(summaryData, summaryDiscussion) : summaryVisit.visitSummary;
      const updated = await storageService.saveCheckup({ ...summaryVisit, visitDiscussion: summaryDiscussion.trim(), visitSummary, summaryPreparedAt: preparedAt });
      setCheckups(updated);
      setSummaryVisit({ ...summaryVisit, visitDiscussion: summaryDiscussion.trim(), visitSummary, summaryPreparedAt: preparedAt });
      Alert.alert('Saved', 'This visit summary and your notes were saved on this device.');
    } catch (error) {
      Alert.alert('Could not save', error.message || 'Please try again.');
    } finally {
      setSummarySaving(false);
    }
  };

  const shareVisitSummary = async () => {
    if (!summaryData) return;
    try {
      const message = makeVisitSummary(summaryData, summaryDiscussion);
      if (Platform.OS === 'web' && !globalThis.navigator?.share && globalThis.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(message);
        Alert.alert('Copied', 'The visit summary was copied. Paste it into a message or document to share.');
        return;
      }
      await Share.share({ title: 'MedEx doctor visit summary', message });
    } catch (error) {
      Alert.alert('Could not share summary', error.message || 'Please try again.');
    }
  };

  // Compile all active medicines across prescriptions
  const allMedicines = prescriptions.flatMap(p => p.medicines || []);
  const todayDoses = doseHistory[todayKey] || {};

  return (
    <View style={styles.container}>
      <Header 
        title="MedRemind" 
        subtitle="Smart Prescription Reader & Dose Tracker"
        icon="alarm"
        rightAction={
          <TouchableOpacity 
            style={styles.addMedHeaderBtn}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={20} color={colors.textWhite} />
            <Text style={styles.addMedHeaderText}>Add Dose</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.calendarCard}>
          <View style={{flex:1}}><Text style={styles.calendarTitle}>Google Calendar</Text><Text style={styles.calendarCaption}>{calendarTokens?'Connected for this session':'Connect to add medicine reminders after reviewing your schedule.'}</Text></View>
          <TouchableOpacity disabled={calendarBusy} style={styles.calendarButton} onPress={calendarTokens?scheduleMedicinesInCalendar:connectGoogleCalendar}><Text style={styles.calendarButtonText}>{calendarBusy?'Please wait…':calendarTokens?'Schedule reminders':'Connect Google'}</Text></TouchableOpacity>
          {!!calendarError && <Text style={styles.calendarError}>{calendarError}</Text>}
        </View>
        {/* Prescription Scanner Banner */}
        <View style={styles.scanBanner}>
          <View style={styles.scanTextArea}>
            <Text style={styles.scanTitle}>Scan Prescription (மருந்துச் சீட்டு)</Text>
            <Text style={styles.scanSub}>Prescription images are sent to MedEx for OCR and AI extraction. Confirm every medicine and dose with your doctor or pharmacist.</Text>
          </View>
          <View style={styles.scanBtnRow}>
            <TouchableOpacity style={styles.cameraBtn} onPress={handleScanPrescription} activeOpacity={0.8}>
              <Ionicons name="camera" size={18} color={colors.textWhite} />
              <Text style={styles.cameraBtnText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.galleryBtn} onPress={handlePickPrescriptionImage} activeOpacity={0.8}>
              <Ionicons name="image-outline" size={18} color={colors.primaryDark} />
              <Text style={styles.galleryBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Reading your prescription…</Text>
          </View>
        )}

        {/* Meal Timings Summary Strip */}
        <View style={styles.mealStrip}>
          <View style={styles.mealItem}>
            <Ionicons name="sunny-outline" size={16} color="#D97706" />
            <Text style={styles.mealLabel}>Breakfast</Text>
            <Text style={styles.mealTime}>{mealTimings.breakfastTime}</Text>
          </View>
          <View style={styles.mealDivider} />
          <View style={styles.mealItem}>
            <Ionicons name="partly-sunny-outline" size={16} color="#0D9488" />
            <Text style={styles.mealLabel}>Lunch</Text>
            <Text style={styles.mealTime}>{mealTimings.lunchTime}</Text>
          </View>
          <View style={styles.mealDivider} />
          <View style={styles.mealItem}>
            <Ionicons name="moon-outline" size={16} color="#6366F1" />
            <Text style={styles.mealLabel}>Dinner</Text>
            <Text style={styles.mealTime}>{mealTimings.dinnerTime}</Text>
          </View>
        </View>

        {/* Today's Schedule & Progress */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionHeading}>Today's Medicine Schedule</Text>
          <Text style={styles.sectionCounter}>
            {Object.values(todayDoses).filter(Boolean).length} / {allMedicines.length} Taken
          </Text>
        </View>

        {allMedicines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="medkit-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Active Medicine Reminders</Text>
            <Text style={styles.emptySub}>Scan a doctor prescription or tap '+ Add Dose' above.</Text>
          </View>
        ) : (
          allMedicines.map(med => (
            <MedicineCard 
              key={med.id}
              medicine={med}
              isTaken={!!todayDoses[med.id]}
              onToggleTaken={() => handleToggleTaken(med.id)}
            />
          ))
        )}

        {/* Doctor Checkup Follow-Up Schedule */}
        <View style={[styles.sectionRow, { marginTop: spacing.lg }]}>
          <Text style={styles.sectionHeading}>Doctor Check-ups & Appointments</Text>
          <TouchableOpacity onPress={() => setCheckupModalVisible(true)}>
            <Text style={styles.addCheckupText}>+ Add Checkup</Text>
          </TouchableOpacity>
        </View>

        {checkups.map(chk => (
          <View key={chk.id} style={styles.checkupCard}>
            <View style={styles.checkupIconBox}>
              <Ionicons name="calendar" size={24} color={colors.secondary} />
            </View>
            <View style={styles.checkupDetails}>
              <Text style={styles.checkupDoc}>{chk.doctorName}</Text>
              <Text style={styles.checkupClinic}>{chk.clinicName}</Text>
              <View style={styles.checkupDateRow}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.checkupDateTime}>{chk.date} at {chk.time || '10:00 AM'}</Text>
              </View>
              {chk.notes ? <Text style={styles.checkupNotes}>{chk.notes}</Text> : null}
            </View>
            <View style={styles.checkupSyncBadge}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
              <Text style={styles.checkupSyncText}>{chk.summaryPreparedAt ? 'Summary saved' : 'Saved'}</Text>
            </View>
            <TouchableOpacity style={styles.visitSummaryButton} onPress={() => openVisitSummary(chk)} activeOpacity={0.75}>
              <Ionicons name="document-text-outline" size={15} color={colors.primary} />
              <Text style={styles.visitSummaryButtonText}>{chk.summaryPreparedAt ? 'Update visit summary' : 'Prepare visit summary'}</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.primary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Add Custom Medicine Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Medicine Reminder</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Medicine Name & Strength</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Paracetamol 650mg, Metformin 500mg"
              placeholderTextColor={colors.textMuted}
              value={newMedName}
              onChangeText={setNewMedName}
            />

            <View style={styles.modalInputRow}>
              <View style={{ flex: 1, marginRight: spacing.xs }}>
                <Text style={styles.inputLabel}>Dosage Unit</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="1 tablet"
                  placeholderTextColor={colors.textMuted}
                  value={newMedDosage}
                  onChangeText={setNewMedDosage}
                />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.xs }}>
                <Text style={styles.inputLabel}>Duration (Days)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="5"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                  value={newMedDuration}
                  onChangeText={setNewMedDuration}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Intake Frequencies:</Text>
            <View style={styles.toggleFreqRow}>
              <TouchableOpacity 
                style={[styles.freqChip, timingMorning && styles.freqChipActive]}
                onPress={() => setTimingMorning(!timingMorning)}
              >
                <Text style={[styles.freqChipText, timingMorning && styles.freqChipTextActive]}>Morning (காலை)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.freqChip, timingNoon && styles.freqChipActive]}
                onPress={() => setTimingNoon(!timingNoon)}
              >
                <Text style={[styles.freqChipText, timingNoon && styles.freqChipTextActive]}>Noon (மதியம்)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.freqChip, timingNight && styles.freqChipActive]}
                onPress={() => setTimingNight(!timingNight)}
              >
                <Text style={[styles.freqChipText, timingNight && styles.freqChipTextActive]}>Night (இரவு)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Food Relation:</Text>
            <View style={styles.toggleFreqRow}>
              <TouchableOpacity 
                style={[styles.foodChip, newMedFoodTiming === 'before_food' && styles.foodChipActive]}
                onPress={() => setNewMedFoodTiming('before_food')}
              >
                <Text style={[styles.foodChipText, newMedFoodTiming === 'before_food' && styles.foodChipTextActive]}>Before Food</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.foodChip, newMedFoodTiming === 'after_food' && styles.foodChipActive]}
                onPress={() => setNewMedFoodTiming('after_food')}
              >
                <Text style={[styles.foodChipText, newMedFoodTiming === 'after_food' && styles.foodChipTextActive]}>After Food</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveMedBtn} onPress={handleAddCustomMedicine}>
              <Text style={styles.saveMedBtnText}>Save Medicine Reminder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Checkup Modal */}
      <Modal visible={checkupModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Doctor Checkup</Text>
              <TouchableOpacity onPress={() => setCheckupModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Doctor Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Dr. K. Rajesh, M.D."
              placeholderTextColor={colors.textMuted}
              value={docName}
              onChangeText={setDocName}
            />

            <Text style={styles.inputLabel}>Clinic or Hospital</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Apollo Speciality Clinic"
              placeholderTextColor={colors.textMuted}
              value={clinicName}
              onChangeText={setClinicName}
            />

            <Text style={styles.inputLabel}>Appointment Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="2026-11-05"
              placeholderTextColor={colors.textMuted}
              value={checkupDate}
              onChangeText={setCheckupDate}
            />

            <Text style={styles.inputLabel}>Notes / Instructions</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Bring fasting blood test report"
              placeholderTextColor={colors.textMuted}
              value={checkupNotes}
              onChangeText={setCheckupNotes}
            />

            <TouchableOpacity style={styles.saveMedBtn} onPress={handleAddDoctorCheckup}>
              <Text style={styles.saveMedBtnText}>Save Appointment Reminder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={summaryModalVisible} transparent animationType="slide" onRequestClose={() => setSummaryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.summaryModalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Doctor visit summary</Text>
                <Text style={styles.summaryModalSubtitle}>{summaryVisit?.doctorName || 'Appointment'} · {summaryVisit?.date || ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setSummaryModalVisible(false)} accessibilityLabel="Close visit summary">
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.summaryModalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.summaryNotice}>
                <Ionicons name="phone-portrait-outline" size={16} color={colors.primary} />
                <Text style={styles.summaryNoticeText}>Prepared on this device from your saved records. No new AI request is made. Review everything before sharing.</Text>
              </View>
              <Text style={styles.inputLabel}>What would you like to discuss?</Text>
              <TextInput
                style={[styles.modalInput, styles.summaryNotesInput]}
                placeholder="Symptoms, changes since the last visit, or questions for your doctor"
                placeholderTextColor={colors.textMuted}
                value={summaryDiscussion}
                onChangeText={setSummaryDiscussion}
                multiline
                textAlignVertical="top"
              />
              {summaryLoading ? (
                <View style={styles.summaryLoading}><ActivityIndicator color={colors.primary} /><Text style={styles.summaryLoadingText}>Preparing from your saved records…</Text></View>
              ) : summaryData ? (
                <View style={styles.summaryPreviewBox}>
                  <Text style={styles.summaryPreviewTitle}>Preview</Text>
                  <Text selectable style={styles.summaryPreviewText}>{makeVisitSummary(summaryData, summaryDiscussion)}</Text>
                </View>
              ) : null}
            </ScrollView>
            <View style={styles.summaryActions}>
              <TouchableOpacity style={styles.summarySaveButton} onPress={saveVisitNotes} disabled={summarySaving || summaryLoading}>
                <Ionicons name="save-outline" size={17} color={colors.primary} />
                <Text style={styles.summarySaveText}>{summarySaving ? 'Saving…' : 'Save summary'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.summaryShareButton, (!summaryData || summaryLoading) && styles.buttonDisabled]} onPress={shareVisitSummary} disabled={!summaryData || summaryLoading}>
                <Ionicons name="share-outline" size={17} color="#FFFFFF" />
                <Text style={styles.summaryShareText}>Share summary</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  calendarCard:{backgroundColor:'#EFF8FF',borderColor:'#BFDBFE',borderWidth:1,borderRadius:borderRadius.md,padding:spacing.md,marginBottom:spacing.md,flexDirection:'row',alignItems:'center',flexWrap:'wrap'},
  calendarTitle:{fontSize:15,fontWeight:'800',color:colors.primaryDark},
  calendarCaption:{fontSize:12,color:colors.textSecondary,marginTop:3,paddingRight:spacing.sm},
  calendarButton:{backgroundColor:colors.primary,borderRadius:borderRadius.sm,paddingHorizontal:12,paddingVertical:10,marginTop:spacing.xs},
  calendarButtonText:{fontSize:12,fontWeight:'700',color:colors.textWhite},
  calendarError:{fontSize:12,color:colors.danger,width:'100%',marginTop:spacing.xs},
  addMedHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md
  },
  addMedHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textWhite,
    marginLeft: 2
  },
  scanBanner: {
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  scanTextArea: {
    marginBottom: spacing.sm
  },
  scanTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textWhite
  },
  scanSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2
  },
  scanBtnRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  cameraBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs
  },
  cameraBtnText: {
    color: colors.textWhite,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6
  },
  galleryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs
  },
  galleryBtnText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6
  },
  loadingBox: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.sm
  },
  mealStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  mealItem: {
    flex: 1,
    alignItems: 'center'
  },
  mealDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border
  },
  mealLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  mealTime: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  sectionCounter: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark
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
  addCheckupText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary
  },
  checkupCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  checkupIconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  checkupDetails: {
    flex: 1
  },
  checkupDoc: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary
  },
  checkupClinic: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1
  },
  checkupDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3
  },
  checkupDateTime: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
    marginLeft: 4
  },
  checkupNotes: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2
  },
  checkupSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full
  },
  checkupSyncText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
    marginLeft: 2
  },
  visitSummaryButton: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 10, marginTop: 9, borderTopWidth: 1, borderTopColor: colors.border },
  visitSummaryButtonText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%'
  },
  summaryModalContent: { backgroundColor: colors.bgCard, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.md, height: '90%', maxHeight: '94%' },
  summaryModalSubtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 3 },
  summaryModalScroll: { flex: 1 },
  summaryNotice: { flexDirection: 'row', gap: 7, padding: spacing.sm, borderRadius: borderRadius.sm, backgroundColor: colors.bgHighlight, marginBottom: spacing.sm },
  summaryNoticeText: { flex: 1, fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  summaryNotesInput: { minHeight: 76, textAlignVertical: 'top' },
  summaryLoading: { alignItems: 'center', padding: spacing.lg, gap: 8 },
  summaryLoadingText: { fontSize: 12, color: colors.textSecondary },
  summaryPreviewBox: { backgroundColor: '#FAFCFB', borderRadius: borderRadius.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm },
  summaryPreviewTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '800', marginBottom: spacing.xs },
  summaryPreviewText: { color: colors.textSecondary, fontSize: 11, lineHeight: 17 },
  summaryActions: { flexDirection: 'row', gap: 8, paddingTop: spacing.sm, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  summarySaveButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingVertical: 12 },
  summarySaveText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  summaryShareButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 12 },
  summaryShareText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.xs
  },
  modalInput: {
    backgroundColor: colors.bgHighlight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: 13,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs
  },
  modalInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  toggleFreqRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm
  },
  freqChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgHighlight,
    alignItems: 'center',
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: colors.border
  },
  freqChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  freqChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary
  },
  freqChipTextActive: {
    color: colors.textWhite
  },
  foodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgHighlight,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.border
  },
  foodChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark
  },
  foodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  foodChipTextActive: {
    color: colors.textWhite
  },
  saveMedBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md
  },
  saveMedBtnText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '700'
  }
});
