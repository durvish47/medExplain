import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AuthShell } from '../../components/auth/AuthShell';
import { FormField } from '../../components/auth/FormField';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import {
  PROFILE_ROWS,
  buildProfilePayload,
  getEmptyProfileValues,
  validateProfile,
} from '../../auth/profileSchemas';

/**
 * Step 3 of 3: collects role-specific details.
 * onSubmit(payload) receives snake_case keys with numbers already converted.
 * onBack() returns to role selection.
 */
export const ProfileScreen = ({ role, onSubmit, onBack }) => {
  const isDoctor = role === 'doctor';
  const rows = PROFILE_ROWS[role];

  const [values, setValues] = useState(() => getEmptyProfileValues(role));
  const [errors, setErrors] = useState({});

  const handleChange = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
    // Clear the field's error as soon as the user edits it
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = () => {
    const validation = validateProfile(role, values);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    onSubmit(buildProfilePayload(role, values));
  };

  return (
    <AuthShell wide step={3} totalSteps={isDoctor ? 3 : 4}>
      <TouchableOpacity onPress={onBack} accessibilityRole="button" hitSlop={8} className="mb-4 self-start">
        <Text className="text-sm font-semibold text-primary">← Change role</Text>
      </TouchableOpacity>

      <Text className="text-2xl font-extrabold text-ink md:text-3xl">
        {isDoctor ? 'Your professional details' : 'Tell us about yourself'}
      </Text>
      <Text className="mb-6 mt-2 text-sm leading-5 text-subtle">
        {isDoctor
          ? 'Add your registration and practice details. All fields are required.'
          : 'Add your basic details so we can set up your health profile. All fields are required.'}
      </Text>

      {/* Fields in a row sit side by side from md up, and stack on mobile */}
      <View className="gap-5">
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-col gap-5 md:flex-row">
            {row.map(field => (
              <View key={field.key} className="flex-1">
                <FormField
                  field={field}
                  value={values[field.key]}
                  error={errors[field.key]}
                  onChange={(value) => handleChange(field.key, value)}
                />
              </View>
            ))}
          </View>
        ))}
      </View>

      <View className="mt-8">
        <PrimaryButton title={isDoctor ? "Continue to Dashboard" : "Continue"} onPress={handleSubmit} />
      </View>
    </AuthShell>
  );
};
