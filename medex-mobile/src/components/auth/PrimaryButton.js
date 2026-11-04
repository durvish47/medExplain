import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';

/**
 * Full-width primary action button.
 * - `loading` shows a spinner and blocks repeat presses.
 * - `disabled` greys it out until the form is ready.
 */
export const PrimaryButton = ({ title, loadingTitle = 'Please wait…', onPress, loading = false, disabled = false }) => {
  const isInactive = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isInactive}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-xl ${isInactive ? 'bg-primary/40' : 'bg-primary'}`}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : null}
      <Text className="text-base font-bold text-white">{loading ? loadingTitle : title}</Text>
    </TouchableOpacity>
  );
};
