import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  TextInput
} from 'react-native';
import { colors, spacing, borderRadius } from '../theme/colors';
import { Header } from '../components/Header';
import { Badge } from '../components/Badge';
import { MetricCard } from '../components/MetricCard';
import { aiService } from '../services/aiService';
import { storageService } from '../services/storageService';
import { SAMPLE_REPORTS } from '../data/mockData';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

export const MedExplainScreen = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('both'); // 'en', 'ta', 'both'
  const [loading, setLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState(SAMPLE_REPORTS[0]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [customTextInput, setCustomTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await storageService.getSettings();
    if (s.preferredLanguage) setSelectedLanguage(s.preferredLanguage);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFiles(previous => {
          const existingUris = new Set(previous.map(file => file.uri));
          return [...previous, ...result.assets.filter(file => !existingUris.has(file.uri))];
        });
      }
    } catch (e) {
      Alert.alert('File Picker', 'Unable to pick document: ' + e.message);
    }
  };

  const handleAnalyzeFiles = async () => {
    if (!selectedFiles.length) return;
    setLoading(true);
    const completed = [];
    const failed = [];
    for (const file of selectedFiles) {
      try {
        const analysis = await aiService.explainReportFile(file, selectedLanguage);
        await storageService.saveReport(analysis);
        completed.push(analysis);
      } catch (error) {
        failed.push({ file, error: error.message });
      }
    }
    if (completed.length) setCurrentReport(completed[completed.length - 1]);
    setSelectedFiles(failed.map(item => item.file));
    setLoading(false);
    if (failed.length) {
      Alert.alert('Some reports could not be analyzed', `${completed.length} completed; ${failed.length} still selected. ${failed[0].file.name}: ${failed[0].error}`);
    } else {
      Alert.alert('Analysis complete', `Analyzed and saved ${completed.length} PDF report${completed.length === 1 ? '' : 's'}.`);
    }
  };

  const removeSelectedFile = (uri) => setSelectedFiles(files => files.filter(file => file.uri !== uri));

  const handleAnalyzeCustomText = async () => {
    if (!customTextInput.trim()) {
      Alert.alert('Empty Input', 'Please paste or type your lab test results text.');
      return;
    }
    setLoading(true);
    try {
      const analysis = await aiService.explainReport(customTextInput, selectedLanguage);
      setCurrentReport(analysis);
      await storageService.saveReport(analysis);
      setShowTextInput(false);
      setCustomTextInput('');
      Alert.alert('Success', 'AI report analysis completed.');
    } catch (e) {
      Alert.alert('Analysis Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSample = (sample) => {
    setCurrentReport(sample);
  };

  const reportTransparency = currentReport?.aiTransparency || (
    currentReport?.id?.includes('sample')
      ? { kind: 'sample', source: 'Built-in sample report', provider: 'MedEx sample library', remoteProcessing: false }
      : { kind: 'unknown', source: 'Saved before transparency details were available', provider: 'Unavailable', remoteProcessing: null }
  );
  const doctorQuestions = selectedLanguage === 'ta'
    ? (currentReport.doctor_questions_ta?.length ? currentReport.doctor_questions_ta : ['இந்த முடிவின் பொருள் என்ன, அடுத்ததாக என்ன செய்ய வேண்டும்?'])
    : (currentReport.doctor_questions_en?.length ? currentReport.doctor_questions_en : ['Which results need follow-up, and when should they be checked again?', 'Could any medicines, symptoms, or health conditions affect these results?', 'What practical steps should I take before my next visit?']);

  return (
    <View style={styles.container}>
      <Header 
        title="MedExplain" 
        subtitle="AI Medical Lab Report Explainer"
        icon="document-text"
        rightAction={
          <View style={styles.langSelector}>
            <TouchableOpacity 
              onPress={() => setSelectedLanguage('en')}
              style={[styles.langBtn, selectedLanguage === 'en' && styles.langBtnActive]}
            >
              <Text style={[styles.langText, selectedLanguage === 'en' && styles.langTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setSelectedLanguage('ta')}
              style={[styles.langBtn, selectedLanguage === 'ta' && styles.langBtnActive]}
            >
              <Text style={[styles.langText, selectedLanguage === 'ta' && styles.langTextActive]}>தமிழ்</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setSelectedLanguage('both')}
              style={[styles.langBtn, selectedLanguage === 'both' && styles.langBtnActive]}
            >
              <Text style={[styles.langText, selectedLanguage === 'both' && styles.langTextActive]}>Both</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Upload Action Hub */}
        <View style={styles.uploadCard}>
          <Text style={styles.sectionHeading}>Analyze Lab Report</Text>
          <Text style={styles.sectionSub}>Select one or more PDF reports for clear, bilingual AI explanations</Text>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.uploadBtn} onPress={handlePickDocument} activeOpacity={0.8}>
              <Ionicons name="cloud-upload" size={20} color={colors.primary} />
              <Text style={styles.uploadBtnText}>Choose PDFs</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.uploadBtn} 
              onPress={() => setShowTextInput(!showTextInput)} 
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={20} color={colors.primaryDark} />
              <Text style={[styles.uploadBtnText, { color: colors.primaryDark }]}>Paste Text</Text>
            </TouchableOpacity>
          </View>

          {selectedFiles.length > 0 && (
            <View style={styles.fileListContainer}>
              <Text style={styles.fileListLabel}>Selected reports ({selectedFiles.length})</Text>
              {selectedFiles.map(file => (
                <View key={file.uri} style={styles.fileListItem}>
                  <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                  <Text numberOfLines={1} style={styles.fileName}>{file.name || 'PDF report'}</Text>
                  <TouchableOpacity onPress={() => removeSelectedFile(file.uri)} accessibilityLabel={`Remove ${file.name || 'selected PDF'}`}>
                    <Ionicons name="close-circle-outline" size={19} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyzeFiles} disabled={loading} activeOpacity={0.8}>
                <Text style={styles.analyzeBtnText}>{loading ? 'Analyzing reports…' : `Analyze ${selectedFiles.length} PDF${selectedFiles.length === 1 ? '' : 's'}`}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Paste text modal/input */}
          {showTextInput && (
            <View style={styles.pasteBox}>
              <TextInput
                style={styles.textInputArea}
                placeholder="Paste lab report text here (e.g., Hemoglobin 10.8 g/dL, WBC 11500, Fasting Blood Sugar 145...)"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                value={customTextInput}
                onChangeText={setCustomTextInput}
              />
              <TouchableOpacity 
                style={styles.analyzeBtn}
                onPress={handleAnalyzeCustomText}
                activeOpacity={0.8}
              >
                <Text style={styles.analyzeBtnText}>Analyze with Groq AI</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Sample Selector */}
          <View style={styles.samplesArea}>
            <Text style={styles.samplesLabel}>Or try pre-loaded samples:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.samplesScroll}>
              {SAMPLE_REPORTS.map(sample => (
                <TouchableOpacity
                  key={sample.id}
                  style={[
                    styles.sampleChip,
                    currentReport?.id === sample.id && styles.sampleChipActive
                  ]}
                  onPress={() => handleSelectSample(sample)}
                >
                  <Ionicons 
                    name="flask-outline" 
                    size={14} 
                    color={currentReport?.id === sample.id ? colors.textWhite : colors.primaryDark} 
                  />
                  <Text style={[
                    styles.sampleChipText,
                    currentReport?.id === sample.id && styles.sampleChipTextActive
                  ]}>
                    {sample.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>Analyzing Medical Report with AI...</Text>
            <Text style={styles.loadingSubtitle}>Extracting lab parameters, checking abnormal ranges & translating</Text>
          </View>
        ) : currentReport ? (
          <View style={styles.reportArea}>
            {/* Header & Urgency Banner */}
            <View style={styles.reportHeaderCard}>
              <View style={styles.reportTitleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportTitle}>{currentReport.title}</Text>
                  <Text style={styles.reportDate}>Date: {currentReport.date} {currentReport.patient ? `• ${currentReport.patient}` : ''}</Text>
                </View>
                <Badge 
                  label={selectedLanguage === 'ta' ? currentReport.urgency_ta || currentReport.urgency : currentReport.urgency} 
                  type={currentReport.urgency} 
                />
              </View>

              {currentReport.urgency_reason ? (
                <View style={styles.urgencyReasonBox}>
                  <Ionicons name="information-circle" size={16} color="#B45309" />
                  <Text style={styles.urgencyReasonText}>{currentReport.urgency_reason}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.transparencyCard}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name={reportTransparency.kind === 'ai' ? 'sparkles' : 'eye-outline'} size={17} color={colors.primary} />
                <Text style={styles.cardHeading}>About this explanation</Text>
              </View>
              <Text style={styles.transparencyLine}><Text style={styles.transparencyLabel}>Type: </Text>{reportTransparency.kind === 'ai' ? 'AI-generated explanation' : reportTransparency.kind === 'sample' ? 'Demonstration sample' : 'Saved result; details unavailable'}</Text>
              <Text style={styles.transparencyLine}><Text style={styles.transparencyLabel}>Source: </Text>{reportTransparency.source}</Text>
              <Text style={styles.transparencyLine}><Text style={styles.transparencyLabel}>Service: </Text>{reportTransparency.provider}{reportTransparency.model ? ` · ${reportTransparency.model}` : ''}</Text>
              <Text style={styles.transparencyLine}><Text style={styles.transparencyLabel}>Sent for remote processing: </Text>{reportTransparency.remoteProcessing === true ? 'Yes' : reportTransparency.remoteProcessing === false ? 'No' : 'Unknown'}</Text>
              <Text style={styles.transparencyFootnote}>AI explanations can be incomplete or wrong. Use the original report and discuss the results with a qualified clinician.</Text>
            </View>

            {/* Bilingual Key Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <Text style={styles.cardHeading}>Key Summary (சுருக்கம்)</Text>
              </View>

              {(selectedLanguage === 'en' || selectedLanguage === 'both') && currentReport.summary_en ? (
                <View style={styles.summaryLangBox}>
                  <Text style={styles.summaryText}>{currentReport.summary_en}</Text>
                </View>
              ) : null}

              {(selectedLanguage === 'ta' || selectedLanguage === 'both') && currentReport.summary_ta ? (
                <View style={[styles.summaryLangBox, styles.summaryTamilBox]}>
                  <Text style={styles.tamilHeading}>தமிழ் விளக்கம்:</Text>
                  <Text style={styles.summaryTamilText}>{currentReport.summary_ta}</Text>
                </View>
              ) : null}
            </View>

            {/* Abnormal Findings Banner */}
            {currentReport.abnormal_findings && currentReport.abnormal_findings.length > 0 ? (
              <View style={styles.abnormalCard}>
                <View style={styles.abnormalTitleRow}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <Text style={styles.abnormalHeading}>Abnormal / Notable Findings</Text>
                </View>
                {currentReport.abnormal_findings.map((ab, idx) => (
                  <View key={idx} style={styles.abnormalItem}>
                    <Text style={styles.bulletDot}>•</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.abnormalEn}>{ab.finding_en}</Text>
                      {ab.finding_ta ? <Text style={styles.abnormalTa}>{ab.finding_ta}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Detailed Lab Metrics */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Lab Test Results ({currentReport.metrics?.length || 0})</Text>
              <Text style={styles.sectionSubtitle}>Tap any metric to read simplified clinical explanation</Text>
            </View>

            {currentReport.metrics?.map((metric, idx) => (
              <MetricCard 
                key={idx} 
                metric={metric} 
                preferredLanguage={selectedLanguage} 
              />
            ))}

            {/* Medical Terms Glossary */}
            {currentReport.terms && currentReport.terms.length > 0 ? (
              <View style={styles.glossaryCard}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="book-outline" size={18} color={colors.secondary} />
                  <Text style={styles.cardHeading}>Medical Terminology Explained</Text>
                </View>
                {currentReport.terms.map((t, idx) => (
                  <View key={idx} style={styles.termItem}>
                    <View style={styles.termHeader}>
                      <Text style={styles.termName}>{t.term}</Text>
                      <Text style={styles.termTamil}>
                        {t.tamil_term} {t.transliteration ? `(${t.transliteration})` : ''}
                      </Text>
                    </View>
                    <Text style={styles.termDef}>{t.definition_en}</Text>
                    {t.definition_ta ? (
                      <Text style={styles.termDefTamil}>{t.definition_ta}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {/* What this means & Recommendations */}
            <View style={styles.recommendCard}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
                <Text style={styles.cardHeading}>Lifestyle & Next Steps</Text>
              </View>

              {currentReport.significance_en ? (
                <Text style={styles.significanceText}>{currentReport.significance_en}</Text>
              ) : null}

              <Text style={styles.recomSubheading}>Actionable Guidance:</Text>
              {(selectedLanguage === 'ta' ? currentReport.recommendations_ta : currentReport.recommendations_en)?.map((rec, idx) => (
                <View key={idx} style={styles.recItem}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginTop: 2, marginRight: 6 }} />
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
            </View>

            {/* Questions to ask doctor */}
            <>
              <View style={styles.doctorQuestionsCard}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
                  <Text style={styles.cardHeading}>Questions to Ask Your Doctor</Text>
                </View>
                {doctorQuestions.map((q, idx) => (
                  <View key={idx} style={styles.questionItem}>
                    <Ionicons name="help-circle-outline" size={16} color={colors.primary} style={{ marginTop: 2, marginRight: 6 }} />
                    <Text style={styles.questionText}>{q}</Text>
                  </View>
                ))}
              </View>
            </>

            <View style={styles.finalSummaryCard}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="heart" size={18} color={colors.primary} />
                <Text style={styles.cardHeading}>Your Report Summary</Text>
              </View>
              <Text style={styles.significanceText}>{selectedLanguage==='ta' ? (currentReport.significance_ta || 'இந்த முடிவுகளை உங்கள் மருத்துவருடன் பகிருங்கள். ஒரு ஆய்வு மதிப்பை மட்டும் வைத்து முடிவு செய்யாமல், உங்கள் அறிகுறிகள் மற்றும் மருத்துவ வரலாற்றுடன் சேர்த்து மதிப்பிட வேண்டும்.') : (currentReport.significance_en || 'Review the listed results with your healthcare provider. A single lab value should be interpreted alongside your symptoms, history, and examination.')}</Text>
              <Text style={styles.recomSubheading}>{selectedLanguage==='ta'?'நலவாழ்வு பரிந்துரைகள்':'Wellbeing suggestions'}</Text>
              {(selectedLanguage==='ta' ? (currentReport.recommendations_ta?.length ? currentReport.recommendations_ta.slice(0,3) : ['இந்த அறிக்கையை அடுத்த மருத்துவ சந்திப்பிற்கு எடுத்துச் செல்லுங்கள்.','மருந்துகளில் மாற்றம் செய்வதற்கு முன் மருத்துவரை அணுகுங்கள்.','புதிய அல்லது மோசமடையும் அறிகுறிகளுக்கு மருத்துவ ஆலோசனை பெறுங்கள்.']) : (currentReport.recommendations_en?.length ? currentReport.recommendations_en.slice(0, 3) : ['Keep a copy of this report and bring it to your next appointment.', 'Continue prescribed care and discuss any changes with your clinician.', 'Seek timely medical advice if you develop new or worsening symptoms.'])).map((item, idx) => (
                <View key={idx} style={styles.recItem}><Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginTop: 2, marginRight: 6 }} /><Text style={styles.recText}>{item}</Text></View>
              ))}
            </View>

            {/* Safety Disclaimer */}
            <View style={styles.disclaimerBox}>
              <Ionicons name="alert" size={16} color={colors.textMuted} />
              <Text style={styles.disclaimerText}>
                MedExplain is an AI educational guide and is not a medical diagnosis or clinical prescription. Please discuss these test results directly with a qualified doctor.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: borderRadius.sm,
    padding: 2
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm
  },
  langBtnActive: {
    backgroundColor: colors.primary
  },
  langText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted
  },
  langTextActive: {
    color: colors.textWhite
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: 40
  },
  uploadCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  sectionSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  fileListContainer: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  fileListLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: spacing.xs },
  fileListItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  fileName: { color: colors.textPrimary, fontSize: 12, flex: 1 },
  uploadBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgHighlight,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.border
  },
  uploadBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4
  },
  pasteBox: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  textInputArea: {
    backgroundColor: colors.bgHighlight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: 13,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  analyzeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm
  },
  analyzeBtnText: {
    color: colors.textWhite,
    fontSize: 13,
    fontWeight: '700'
  },
  samplesArea: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  samplesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6
  },
  samplesScroll: {
    flexDirection: 'row'
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: '#99F6E4'
  },
  sampleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  sampleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    marginLeft: 4
  },
  sampleChipTextActive: {
    color: colors.textWhite
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md
  },
  loadingSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: spacing.md
  },
  reportArea: {
    marginTop: 4
  },
  transparencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  transparencyLine: { fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  transparencyLabel: { fontWeight: '700', color: colors.textPrimary },
  transparencyFootnote: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  reportHeaderCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  reportTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary
  },
  reportDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2
  },
  urgencyReasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm
  },
  urgencyReasonText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    marginLeft: 6,
    flex: 1
  },
  summaryCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 6
  },
  summaryLangBox: {
    marginBottom: spacing.xs
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary
  },
  summaryTamilBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  tamilHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.tamilAccent,
    marginBottom: 4
  },
  summaryTamilText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#78350F'
  },
  abnormalCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  abnormalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs
  },
  abnormalHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
    marginLeft: 6
  },
  abnormalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 3
  },
  bulletDot: {
    fontSize: 14,
    color: colors.danger,
    marginRight: 6
  },
  abnormalEn: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B'
  },
  abnormalTa: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 1
  },
  sectionHeaderRow: {
    marginVertical: spacing.sm
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted
  },
  glossaryCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  termItem: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  termHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  termName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary
  },
  termTamil: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.tamilAccent
  },
  termDef: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17
  },
  termDefTamil: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2
  },
  recommendCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  significanceText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  recomSubheading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 3
  },
  recText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18
  },
  doctorQuestionsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  finalSummaryCard: {
    backgroundColor: '#ECFDF5', borderRadius: borderRadius.md, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: '#A7F3D0'
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4
  },
  questionText: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bgHighlight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    marginLeft: 6
  }
});
