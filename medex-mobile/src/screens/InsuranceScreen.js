/**
 * InsuranceScreen.js
 * Top-level Insurance screen with three sub-menu tabs:
 *   1. Providers            — list of providers + plans from Supabase
 *   2. Compare Plans        — side-by-side plan comparison tool
 *   3. Smart Recommendation — personalized plan suggestions (Ownself & Family)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius } from '../theme/colors';
import { Header } from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { ProvidersTab } from './insurance/ProvidersTab';
import { CompareTab }   from './insurance/CompareTab';
import { SmartRecommendationTab } from './insurance/SmartRecommendationTab';

const TABS = [
  {
    key:       'providers',
    label:     'Providers',
    icon:      'business-outline',
    iconActive:'business',
    desc:      'Browse & explore insurance providers',
  },
  {
    key:       'compare',
    label:     'Compare Plans',
    icon:      'git-compare-outline',
    iconActive:'git-compare',
    desc:      'Side-by-side plan comparison',
  },
  {
    key:       'recommend',
    label:     'Smart Recommendation',
    icon:      'sparkles-outline',
    iconActive:'sparkles',
    desc:      'Personalized plan suggestions',
  },
];

export const InsuranceScreen = () => {
  const [activeTab, setActiveTab] = useState('providers');

  const currentTab = TABS.find(t => t.key === activeTab);

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        title="Insurance"
        subtitle={currentTab?.desc}
        icon="shield-checkmark"
      />

      {/* Sub-menu tab switcher */}
      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={16}
                color={isActive ? colors.textWhite : colors.textSecondary}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {tab.key === 'recommend' && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>AI</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab content */}
      <View style={styles.content}>
        {activeTab === 'providers' ? (
          <ProvidersTab />
        ) : activeTab === 'compare' ? (
          <CompareTab />
        ) : (
          <SmartRecommendationTab />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMuted,
  },

  // Sub-menu tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: 4,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: '#1E293B',
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: colors.textWhite,
    fontWeight: '800',
  },
  newBadge: {
    backgroundColor: colors.accent || '#8B5CF6',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  newBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Screen area
  content: {
    flex: 1,
  },
});
