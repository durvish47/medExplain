import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { colors, spacing, borderRadius } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export const InsuranceCard = ({ plan }) => {
  const [expanded, setExpanded] = useState(false);

  const handleCall = () => {
    if (!plan.contact) return;
    Linking.openURL(`tel:${plan.contact.replace(/[^0-9+]/g, '')}`).catch(() =>
      Alert.alert('Error', 'Unable to initiate call.')
    );
  };

  const handleWebsite = () => {
    if (!plan.website) return;
    Linking.openURL(plan.website).catch(() =>
      Alert.alert('Error', 'Unable to open link.')
    );
  };

  const typeLabel = { government: 'Gov.', private: 'Private', psu: 'PSU' };
  const typeBg = { government: '#DCFCE7', private: '#EDE9FE', psu: '#FEF3C7' };
  const typeColor = { government: '#15803D', private: '#6D28D9', psu: '#B45309' };

  return (
    <View style={[styles.card, { borderLeftColor: plan.color, borderLeftWidth: 4 }]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: plan.colorLight }]}>
          <Ionicons name={plan.icon} size={22} color={plan.color} />
        </View>

        <View style={styles.titleArea}>
          <Text style={styles.planName} numberOfLines={2}>{plan.name}</Text>
          <Text style={styles.providerText}>{plan.provider}</Text>
        </View>

        <View style={[styles.typeBadge, { backgroundColor: typeBg[plan.type] }]}>
          <Text style={[styles.typeText, { color: typeColor[plan.type] }]}>
            {typeLabel[plan.type]}
          </Text>
        </View>
      </View>

      {/* Key Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="shield-half-outline" size={13} color={colors.textMuted} />
          <Text style={styles.statLabel}>Coverage</Text>
          <Text style={styles.statValue}>₹{plan.coverageAmount}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Ionicons name="cash-outline" size={13} color={colors.textMuted} />
          <Text style={styles.statLabel}>Premium</Text>
          <Text style={styles.statValue} numberOfLines={1}>{plan.premium}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Ionicons name="business-outline" size={13} color={colors.textMuted} />
          <Text style={styles.statLabel}>Hospitals</Text>
          <Text style={styles.statValue}>{plan.hospitalsCovered.toLocaleString()}+</Text>
        </View>
      </View>

      {/* Eligibility */}
      <View style={styles.eligibilityRow}>
        <Ionicons name="person-outline" size={13} color={colors.textMuted} />
        <Text style={styles.eligibilityText}>{plan.eligibility}</Text>
      </View>

      {/* Expandable Features */}
      <TouchableOpacity
        style={styles.expandBtn}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.expandBtnText}>
          {expanded ? 'Hide Details' : 'View Features'}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={plan.color}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.featuresList}>
          {plan.features.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={15} color={plan.color} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}

          <View style={styles.stateRow}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={styles.stateText}>Available in: {plan.state}</Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.callBtn, { backgroundColor: plan.color }]}
          onPress={handleCall}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={14} color={colors.textWhite} />
          <Text style={styles.callBtnText}>Helpline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.webBtn, { borderColor: plan.color }]}
          onPress={handleWebsite}
          activeOpacity={0.8}
        >
          <Ionicons name="globe-outline" size={14} color={plan.color} />
          <Text style={[styles.webBtnText, { color: plan.color }]}>Website</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  titleArea: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  planName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  providerText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgHighlight,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 1,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  eligibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  eligibilityText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 5,
    flex: 1,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 2,
  },
  expandBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 4,
  },
  featuresList: {
    backgroundColor: colors.bgMuted,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
    lineHeight: 17,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stateText: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 5,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    marginRight: spacing.xs,
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textWhite,
    marginLeft: 5,
  },
  webBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    marginLeft: spacing.xs,
  },
  webBtnText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 5,
  },
});

