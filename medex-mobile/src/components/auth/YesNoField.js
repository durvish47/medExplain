import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const OPTIONS = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

/**
 * Two-segment Yes / No control. `value` is true, false, or null (unanswered).
 * Starts unanswered so the user has to make a choice rather than submitting a default.
 */
export const YesNoField = ({ label, value, onChange, error, disabled = false }) => (
  <View className="gap-1.5">
    <Text className="text-sm font-semibold text-ink">{label}</Text>

    <View className={`h-12 flex-row overflow-hidden rounded-xl border-2 bg-surface ${error ? 'border-danger' : 'border-line'}`}>
      {OPTIONS.map((option, index) => {
        const selected = value === option.value;
        return (
          <TouchableOpacity
            key={option.label}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={option.label}
            className={`flex-1 items-center justify-center ${selected ? 'bg-accent' : ''} ${index === 0 ? 'border-r-2 border-line' : ''}`}
          >
            <Text className={`text-sm font-bold ${selected ? 'text-white' : 'text-subtle'}`}>{option.label}</Text>
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
