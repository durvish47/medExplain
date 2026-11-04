import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

/**
 * Single-choice picker rendered as wrapping chips.
 * Chips keep every option visible, which suits short lists like gender or availability.
 */
export const SelectField = ({ label, options, value, onChange, error, disabled = false }) => (
  <View className="gap-1.5">
    <Text className="text-sm font-semibold text-ink">{label}</Text>

    <View className="flex-row flex-wrap gap-2">
      {options.map(option => {
        const selected = value === option;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onChange(option)}
            disabled={disabled}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={option}
            className={`rounded-full border-2 px-3.5 py-2 ${selected ? 'border-accent bg-accent/10' : error ? 'border-danger bg-surface' : 'border-line bg-surface'}`}
          >
            <Text className={`text-sm font-semibold ${selected ? 'text-accent' : 'text-subtle'}`}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>

    {error ? (
      <Text accessibilityLiveRegion="polite" className="text-xs text-danger">
        {error}
      </Text>
    ) : null}
  </View>
);
