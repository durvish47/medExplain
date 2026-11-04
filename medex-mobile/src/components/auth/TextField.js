import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

/**
 * Labelled text input with an inline error message.
 * `rightElement` renders inside the field, e.g. the show/hide password toggle.
 * Remaining props (value, onChangeText, keyboardType...) go straight to TextInput.
 */
export const TextField = ({ label, error, rightElement = null, ...inputProps }) => {
  const [focused, setFocused] = useState(false);

  // Border priority: error > focused > default
  const borderClass = error ? 'border-danger' : focused ? 'border-accent' : 'border-line';

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-ink">{label}</Text>

      <View className={`h-12 flex-row items-center rounded-xl border-2 bg-surface px-4 ${borderClass}`}>
        <TextInput
          className="h-full flex-1 text-base text-ink"
          placeholderTextColor="#849994"
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...inputProps}
        />
        {rightElement}
      </View>

      {/* Announced by screen readers when it appears */}
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-xs text-danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
};
