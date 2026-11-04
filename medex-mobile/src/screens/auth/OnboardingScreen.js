import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { AuthShell } from '../../components/auth/AuthShell';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { RoleCard } from '../../components/auth/RoleCard';
import { ROLE_OPTIONS } from '../../auth/roles';

/**
 * Step 2 of 2: the user picks Patient or Doctor.
 * The Continue button stays disabled until a role is chosen.
 * onContinue(role) receives the selected role id ('patient' | 'doctor'),
 * which leads to the role-specific profile step.
 */
export const OnboardingScreen = ({ onContinue }) => {
  const [selectedRole, setSelectedRole] = useState(null);

  return (
    <AuthShell wide step={2} totalSteps={3}>
      <Text className="text-2xl font-extrabold text-ink md:text-3xl">Welcome! Tell us who you are</Text>
      <Text className="mb-6 mt-2 text-sm leading-5 text-subtle">
        Choose the option that fits you best so we can tailor your experience.
      </Text>

      {/* Stacked on mobile, side-by-side from md up */}
      <View className="flex-col gap-4 md:flex-row">
        {ROLE_OPTIONS.map(option => (
          <RoleCard
            key={option.id}
            option={option}
            selected={selectedRole === option.id}
            onPress={() => setSelectedRole(option.id)}
          />
        ))}
      </View>

      <View className="mt-8">
        <PrimaryButton
          title="Continue"
          disabled={!selectedRole}
          onPress={() => onContinue(selectedRole)}
        />
      </View>
    </AuthShell>
  );
};
