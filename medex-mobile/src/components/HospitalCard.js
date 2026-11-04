import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { colors, spacing, borderRadius } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from './Badge';

export const HospitalCard = ({ hospital }) => {
  const handleCall = () => {
    if (!hospital.contact) {
      Alert.alert('No contact', 'No phone number available for this hospital.');
      return;
    }
    const cleanNumber = hospital.contact.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate call on this device.');
    });
  };

  const handleDirections = () => {
    const lat = hospital.location?.latitude;
    const lng = hospital.location?.longitude;
    const query = encodeURIComponent(hospital.name + ' ' + hospital.address);
    const url = lat && lng 
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open Google Maps.');
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleArea}>
          <Text style={styles.hospitalName}>{hospital.name}</Text>
          <View style={styles.ratingRow}>
            {hospital.rating != null ? <><Ionicons name="star" size={14} color="#F59E0B" /><Text style={styles.ratingText}>{Number(hospital.rating).toFixed(1)}</Text><Text style={styles.reviewText}>({hospital.totalReviews || 0} reviews)</Text></> : <Text style={styles.reviewText}>Rating unavailable</Text>}
          </View>
        </View>

        <View style={styles.distanceBadge}>
          <Ionicons name="navigate-outline" size={12} color={colors.primary} />
          <Text style={styles.distanceText}>{hospital.distanceKm != null ? `${Number(hospital.distanceKm).toFixed(1)} km` : 'Directory'}</Text>
        </View>
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={14} color={colors.textMuted} style={styles.locIcon} />
        <Text style={styles.addressText} numberOfLines={2}>{hospital.address}</Text>
      </View>

      {hospital.emergencyAvailable ? (
        <View style={styles.emergencyRow}>
          <Badge label="24/7 Emergency Available" type="danger" size="sm" />
        </View>
      ) : null}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.callButton} onPress={handleCall} activeOpacity={0.8}>
          <Ionicons name="call" size={15} color={colors.textWhite} />
          <Text style={styles.callButtonText}>Call Hospital</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dirButton} onPress={handleDirections} activeOpacity={0.8}>
          <Ionicons name="map-outline" size={15} color={colors.primaryDark} />
          <Text style={styles.dirButtonText}>Directions</Text>
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
    borderColor: colors.border
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  titleArea: {
    flex: 1,
    paddingRight: spacing.sm
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 3
  },
  reviewText: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 4
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    marginLeft: 3
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm
  },
  locIcon: {
    marginTop: 2,
    marginRight: 4
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16
  },
  emergencyRow: {
    marginTop: spacing.xs
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    marginRight: spacing.xs
  },
  callButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textWhite,
    marginLeft: 6
  },
  dirButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginLeft: spacing.xs
  },
  dirButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    marginLeft: 6
  }
});
