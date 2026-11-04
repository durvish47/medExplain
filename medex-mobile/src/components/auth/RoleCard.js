import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Selectable role card. When selected it gets the accent border and a check badge.
 * Rendered as a radio so screen readers announce it as a choice in a group.
 */
export const RoleCard = ({ option, selected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
    accessibilityLabel={option.title}
    className={`flex-1 rounded-2xl border-2 bg-surface p-5 ${selected ? 'border-accent' : 'border-line'}`}
  >
    {/* Check badge, only shown when selected */}
    {selected ? (
      <View className="absolute right-3 top-3 h-7 w-7 items-center justify-center rounded-full bg-accent">
        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
      </View>
    ) : null}

    <View className={`mb-4 h-14 w-14 items-center justify-center rounded-2xl ${option.tint}`}>
      <Ionicons name={option.icon} size={28} color={option.iconColor} />
    </View>

    <Text className="text-lg font-bold text-ink">{option.title}</Text>
    <Text className="mt-1 text-sm leading-5 text-subtle">{option.description}</Text>
  </TouchableOpacity>
);
