import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AuthShell } from '../../components/auth/AuthShell';
import { TextField } from '../../components/auth/TextField';
import { PrimaryButton } from '../../components/auth/PrimaryButton';

/**
 * Optional step (patient only): collects an emergency contact for SOS situations.
 * Users can fill it in or tap "Skip for now".
 */
export const EmergencyContactScreen = ({
  initialName = '',
  initialPhone = '',
  onSubmit,
  onSkip,
  onBack,
}) => {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);

  const handleSubmit = () => {
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
    });
  };

  return (
    <AuthShell wide step={4} totalSteps={4}>
      <TouchableOpacity
        onPress={onBack}
        accessibilityRole="button"
        hitSlop={8}
        className="mb-4 self-start"
      >
        <Text className="text-sm font-semibold text-primary">← Back to profile</Text>
      </TouchableOpacity>

      <Text className="text-2xl font-extrabold text-ink md:text-3xl">
        Emergency Contact
      </Text>
      <Text className="mb-6 mt-2 text-sm leading-5 text-subtle">
        This contact will be shown during emergency SOS situations. You can also add or update this later in Settings.
      </Text>

      <View className="gap-4">
        <TextField
          label="Contact Name (optional)"
          placeholder="Enter contact name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
        />

        <TextField
          label="Contact Phone (optional)"
          placeholder="Enter contact phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
      </View>

      <View className="mt-8 gap-3">
        <PrimaryButton
          title={name.trim() || phone.trim() ? "Save & Continue" : "Continue to Dashboard"}
          onPress={handleSubmit}
        />

        <TouchableOpacity
          onPress={onSkip}
          accessibilityRole="button"
          className="h-12 items-center justify-center rounded-xl border border-line bg-transparent active:bg-muted/10"
          activeOpacity={0.7}
        >
          <Text className="text-sm font-bold text-subtle">Skip for now</Text>
        </TouchableOpacity>
      </View>
    </AuthShell>
  );
};

