/**
 * SmartRecommendationTab.js
 * Sub-menu 3: Smart Insurance Recommendation
 *
 * Provides two modes:
 *  1. For Ownself:
 *     - No input required; immediately calculates recommendations based on policyholder details.
 *  2. For Whole Family:
 *     - Collects family member profiles (DOB/age, height, weight, smoking, drinking habits)
 *     - Calculates multi-member family floater recommendations.
 *
 * Renders plans ranked from Most Favorable (#1) to Least Favorable with match %,
 * rationale, pricing, and coverage details.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { insuranceService, PROVIDER_TYPE_META } from '../../services/insuranceService';
import { Ionicons } from '@expo/vector-icons';

export const SmartRecommendationTab = () => {
  const [mode, setMode] = useState('ownself'); // 'ownself' | 'family'
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  // Family members list
  const [familyMembers, setFamilyMembers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // New member form state
  const [memberName, setMemberName] = useState('');
  const [memberRelation, setMemberRelation] = useState('Spouse');
  const [memberDob, setMemberDob] = useState('1996-05-15');
  const [memberHeight, setMemberHeight] = useState('165');
  const [memberWeight, setMemberWeight] = useState('60');
  const [memberSmoker, setMemberSmoker] = useState(false);
  const [memberDrinker, setMemberDrinker] = useState(false);

  // Expanded plan card state
  const [expandedPlanId, setExpandedPlanId] = useState(null);

  // Load user profile on mount
  useEffect(() => {
    (async () => {
      try {
        const prof = await insuranceService.getUserProfile();
        if (prof) {
          setUserProfile(prof);
        }
      } catch (err) {
        console.warn('Could not load user profile:', err);
      }
    })();
  }, []);

  // Fetch recommendations for Ownself
  const fetchOwnselfRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const results = await insuranceService.getRecommendations({
        userProfile: userProfile || undefined,
        familyProfiles: [],
      });
      setRecommendations(results || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      Alert.alert('Error', 'Unable to calculate recommendations right now.');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  // Fetch recommendations for Family
  const fetchFamilyRecommendations = useCallback(async () => {
    if (familyMembers.length === 0) {
      Alert.alert('No Family Members', 'Please add at least one family member before calculating recommendations.');
      return;
    }
    setLoading(true);
    try {
      const results = await insuranceService.getRecommendations({
        userProfile: userProfile || undefined,
        familyProfiles: familyMembers,
      });
      setRecommendations(results || []);
    } catch (err) {
      console.error('Error fetching family recommendations:', err);
      Alert.alert('Error', 'Unable to calculate recommendations right now.');
    } finally {
      setLoading(false);
    }
  }, [userProfile, familyMembers]);

  // Initial calculation when switching to ownself
  useEffect(() => {
    if (mode === 'ownself') {
      fetchOwnselfRecommendations();
    } else {
      if (familyMembers.length > 0) {
        fetchFamilyRecommendations();
      } else {
        setRecommendations([]);
      }
    }
  }, [mode, fetchOwnselfRecommendations, fetchFamilyRecommendations, familyMembers.length]);

  const handleAddMember = () => {
    if (!memberName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name or identifier for the family member.');
      return;
    }

    const newMember = {
      full_name: memberName.trim(),
      relation: memberRelation,
      date_of_birth: memberDob.trim() || '1995-01-01',
      height_cm: parseInt(memberHeight, 10) || 165,
      weight_kg: parseInt(memberWeight, 10) || 60,
      is_smoker: memberSmoker,
      is_drinker: memberDrinker,
    };

    setFamilyMembers(prev => [...prev, newMember]);
    setMemberName('');
    setMemberDob('1996-05-15');
    setMemberHeight('165');
    setMemberWeight('60');
    setMemberSmoker(false);
    setMemberDrinker(false);
    setModalVisible(false);
  };

  const handleRemoveMember = (index) => {
    setFamilyMembers(prev => prev.filter((_, i) => i !== index));
  };

  const fmtCurrency = val =>
    val !== undefined && val !== null && val !== ''
      ? `₹${Number(val).toLocaleString('en-IN')}`
      : '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Introduction Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIconBadge}>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Smart Insurance Match</Text>
            <Text style={styles.heroSubtitle}>
              Ranked automatically from most favorable to least favorable based on health risk, coverage depth, and pricing.
            </Text>
          </View>
        </View>

        {/* 2-Choice Selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'ownself' && styles.modeButtonActive]}
            onPress={() => setMode('ownself')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={mode === 'ownself' ? 'person' : 'person-outline'}
              size={18}
              color={mode === 'ownself' ? colors.textWhite : colors.textSecondary}
            />
            <Text style={[styles.modeButtonText, mode === 'ownself' && styles.modeButtonTextActive]}>
              For Ownself
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, mode === 'family' && styles.modeButtonActive]}
            onPress={() => setMode('family')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={mode === 'family' ? 'people' : 'people-outline'}
              size={18}
              color={mode === 'family' ? colors.textWhite : colors.textSecondary}
            />
            <Text style={[styles.modeButtonText, mode === 'family' && styles.modeButtonTextActive]}>
              For Whole Family
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode Specific Section */}
      {mode === 'ownself' ? (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.infoBannerText}>
            Personalized using your policyholder health profile. No extra details required.
          </Text>
        </View>
      ) : (
        <View style={styles.familySection}>
          <View style={styles.familyHeaderRow}>
            <View>
              <Text style={styles.sectionHeading}>Family Members ({familyMembers.length})</Text>
              <Text style={styles.sectionSub}>Add dependents to evaluate family floater coverage</Text>
            </View>
            <TouchableOpacity
              style={styles.addMemberBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color={colors.textWhite} />
              <Text style={styles.addMemberBtnText}>Add Member</Text>
            </TouchableOpacity>
          </View>

          {familyMembers.length === 0 ? (
            <View style={styles.emptyFamilyBox}>
              <Ionicons name="people-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyFamilyTitle}>No family members added yet</Text>
              <Text style={styles.emptyFamilySub}>
                Tap &ldquo;Add Member&rdquo; to input age, health habits, and calculate family floater recommendations.
              </Text>
            </View>
          ) : (
            <View style={styles.membersList}>
              {familyMembers.map((member, idx) => (
                <View key={idx} style={styles.memberChip}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.full_name} ({member.relation})</Text>
                    <Text style={styles.memberDetails}>
                      DOB: {member.date_of_birth} &bull; {member.height_cm}cm &bull; {member.weight_kg}kg
                      {member.is_smoker ? ' &bull; Smoker' : ''}
                      {member.is_drinker ? ' &bull; Drinker' : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(idx)}
                    style={styles.removeMemberBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.recalculateBtn}
                onPress={fetchFamilyRecommendations}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={16} color={colors.textWhite} />
                <Text style={styles.recalculateBtnText}>Re-Calculate Family Recommendations</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Recommendations List Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {loading ? 'Evaluating plans...' : `${recommendations.length} Plans Ranked (Most to Least Favorable)`}
        </Text>
      </View>

      {/* Loading state */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analyzing health factors, premiums & networks...</Text>
        </View>
      )}

      {/* Recommendations Cards */}
      {!loading && recommendations.map((plan, index) => {
        const isTop = index === 0;
        const isSecond = index === 1;
        const isExpanded = expandedPlanId === plan.plan_id;
        const meta = PROVIDER_TYPE_META[plan.provider_type] || PROVIDER_TYPE_META.private;
        const pricing = plan.pricing || {};

        return (
          <View
            key={`${plan.provider_name}-${plan.plan_id}-${index}`}
            style={[
              styles.planCard,
              isTop && styles.planCardTop,
              isSecond && styles.planCardSecond,
            ]}
          >
            {/* Rank Header */}
            <View style={styles.planCardHeader}>
              <View style={styles.rankBadgeRow}>
                <View
                  style={[
                    styles.rankBadge,
                    isTop ? styles.rankBadgeTop : styles.rankBadgeRegular,
                  ]}
                >
                  <Ionicons
                    name={isTop ? 'trophy' : 'medal-outline'}
                    size={14}
                    color={isTop ? '#B45309' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.rankBadgeText,
                      isTop && styles.rankBadgeTextTop,
                    ]}
                  >
                    {isTop ? '#1 Most Favorable' : `#${index + 1} Recommendation`}
                  </Text>
                </View>

                {/* Match percentage pill */}
                <View style={styles.matchPill}>
                  <Text style={styles.matchPillText}>{plan.matchPct}% Match</Text>
                </View>
              </View>

              {/* Plan and Provider Title */}
              <Text style={styles.cardPlanName}>{plan.plan_name}</Text>
              <Text style={styles.cardProviderName}>{plan.provider_name}</Text>

              {/* Tags */}
              <View style={styles.tagsRow}>
                <View style={[styles.badge, { backgroundColor: meta.badgeBg }]}>
                  <Text style={[styles.badgeText, { color: meta.badgeColor }]}>
                    {plan.plan_type}
                  </Text>
                </View>
                {plan.network_size_tier && (
                  <View style={styles.networkBadge}>
                    <Ionicons name="git-network-outline" size={11} color={colors.textSecondary} />
                    <Text style={styles.networkBadgeText}>{plan.network_size_tier} Network</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Pricing Summary */}
            <View style={styles.pricingRow}>
              <View style={styles.pricingBox}>
                <Text style={styles.pricingLabel}>Base Premium</Text>
                <Text style={styles.pricingValue}>
                  {pricing.base_premium_amount === 0 ? 'FREE (Govt)' : `${fmtCurrency(pricing.base_premium_amount)}/yr`}
                </Text>
              </View>
              <View style={styles.pricingBox}>
                <Text style={styles.pricingLabel}>Deductible</Text>
                <Text style={styles.pricingValue}>
                  {fmtCurrency(mode === 'family' ? pricing.family_deductible : pricing.individual_deductible)}
                </Text>
              </View>
              <View style={styles.pricingBox}>
                <Text style={styles.pricingLabel}>Max Out-of-Pocket</Text>
                <Text style={styles.pricingValue}>
                  {fmtCurrency(pricing.out_of_pocket_maximum)}
                </Text>
              </View>
            </View>

            {/* Reasons / Why Favorable */}
            {plan.reasons && plan.reasons.length > 0 && (
              <View style={styles.reasonsContainer}>
                <Text style={styles.reasonsTitle}>Why this plan matches:</Text>
                {plan.reasons.map((r, rIdx) => (
                  <View key={rIdx} style={styles.reasonRow}>
                    <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                    <Text style={styles.reasonText}>{r}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Considerations */}
            {plan.considerations && plan.considerations.length > 0 && (
              <View style={styles.considerationsContainer}>
                {plan.considerations.map((c, cIdx) => (
                  <View key={cIdx} style={styles.considerationRow}>
                    <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
                    <Text style={styles.considerationText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Expand / Collapse Button */}
            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => setExpandedPlanId(isExpanded ? null : plan.plan_id)}
              activeOpacity={0.7}
            >
              <Text style={styles.expandButtonText}>
                {isExpanded ? 'Hide Benefits & Terms' : 'View Benefits & Restrictions'}
              </Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>

            {/* Detailed Benefits and Restrictions */}
            {isExpanded && (
              <View style={styles.expandedDetails}>
                {/* Benefits */}
                <Text style={styles.detailsSectionHeading}>Included Benefits</Text>
                {(plan.benefits || []).length > 0 ? (
                  plan.benefits.map((b, bIdx) => (
                    <View key={bIdx} style={styles.benefitItem}>
                      <View style={styles.benefitBullet} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.benefitName}>{b.benefit_name}</Text>
                        <Text style={styles.benefitCoverage}>{b.coverage_details}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>Standard comprehensive hospitalization included.</Text>
                )}

                {/* Restrictions */}
                {(plan.restrictions || []).length > 0 && (
                  <>
                    <Text style={[styles.detailsSectionHeading, { marginTop: spacing.md }]}>
                      Restrictions & Eligibility
                    </Text>
                    {plan.restrictions.map((res, resIdx) => (
                      <View key={resIdx} style={styles.restrictionItem}>
                        <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.restrictionText}>
                          <Text style={{ fontWeight: '700' }}>{res.restriction_type}: </Text>
                          {res.description}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Add Family Member Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Family Member</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Priya Sharma"
                value={memberName}
                onChangeText={setMemberName}
              />

              <Text style={styles.label}>Relationship</Text>
              <View style={styles.relationRow}>
                {['Spouse', 'Child', 'Parent'].map(rel => (
                  <TouchableOpacity
                    key={rel}
                    style={[
                      styles.relationChip,
                      memberRelation === rel && styles.relationChipActive,
                    ]}
                    onPress={() => setMemberRelation(rel)}
                  >
                    <Text
                      style={[
                        styles.relationChipText,
                        memberRelation === rel && styles.relationChipTextActive,
                      ]}
                    >
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={memberDob}
                onChangeText={setMemberDob}
              />

              <View style={styles.splitRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Height (cm)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="165"
                    keyboardType="numeric"
                    value={memberHeight}
                    onChangeText={setMemberHeight}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="65"
                    keyboardType="numeric"
                    value={memberWeight}
                    onChangeText={setMemberWeight}
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Tobacco / Smoker</Text>
                  <Text style={styles.switchSub}>Uses cigarettes, beedi, or tobacco</Text>
                </View>
                <Switch
                  value={memberSmoker}
                  onValueChange={setMemberSmoker}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Alcohol Consumer</Text>
                  <Text style={styles.switchSub}>Regular alcohol consumption</Text>
                </View>
                <Switch
                  value={memberDrinker}
                  onValueChange={setMemberDrinker}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAddMember}
              >
                <Text style={styles.modalSubmitBtnText}>Add Member</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMuted,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: 40,
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  heroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  heroSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },

  // Mode Selector
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.md,
    padding: 4,
    gap: 6,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeButtonTextActive: {
    color: colors.textWhite,
    fontWeight: '700',
  },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 8,
    marginBottom: spacing.md,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.primaryDark,
    lineHeight: 16,
  },

  // Family section
  familySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  familyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  addMemberBtnText: {
    color: colors.textWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyFamilyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyFamilyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyFamilySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  membersList: {
    marginTop: spacing.sm,
    gap: 8,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  memberDetails: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  removeMemberBtn: {
    padding: 6,
  },
  recalculateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 6,
    marginTop: 4,
  },
  recalculateBtnText: {
    color: colors.textWhite,
    fontSize: 13,
    fontWeight: '700',
  },

  // Results header
  resultsHeader: {
    marginBottom: spacing.sm,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Plan Card
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCardTop: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    backgroundColor: '#FFFDF9',
  },
  planCardSecond: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  planCardHeader: {
    marginBottom: spacing.sm,
  },
  rankBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  rankBadgeTop: {
    backgroundColor: '#FEF3C7',
  },
  rankBadgeRegular: {
    backgroundColor: '#F1F5F9',
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rankBadgeTextTop: {
    color: '#B45309',
    fontWeight: '800',
  },
  matchPill: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  matchPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
  },
  cardPlanName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardProviderName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  networkBadgeText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // Pricing Row
  pricingRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: 10,
    marginVertical: spacing.sm,
    justifyContent: 'space-between',
  },
  pricingBox: {
    flex: 1,
    alignItems: 'center',
  },
  pricingLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  pricingValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  // Reasons
  reasonsContainer: {
    marginTop: 4,
    gap: 4,
  },
  reasonsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 17,
  },

  // Considerations
  considerationsContainer: {
    marginTop: 8,
    gap: 4,
  },
  considerationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  considerationText: {
    flex: 1,
    fontSize: 11,
    color: colors.warning,
    lineHeight: 15,
  },

  // Expand button
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 4,
  },
  expandButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },

  // Expanded details
  expandedDetails: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailsSectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  benefitBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  benefitName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  benefitCoverage: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  restrictionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  restrictionText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 11,
    color: colors.textMuted,
  },

  // Center / loading
  centerContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalBody: {
    padding: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  relationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  relationChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  relationChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  relationChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  relationChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  splitRow: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  switchSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    color: colors.textWhite,
    fontWeight: '700',
  },
});
