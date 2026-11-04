import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AuthShell } from '../../components/auth/AuthShell';
import { TextField } from '../../components/auth/TextField';
import { PasswordField } from '../../components/auth/PasswordField';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { authService } from '../../auth/authService';
import { MIN_PASSWORD_LENGTH, validateSignup } from '../../auth/validation';

/**
 * Step 1 of 2: create an account with email and password.
 * Calls onSuccess() once the account is created.
 * onSwitchToLogin() opens the login screen for existing users.
 */
export const SignupScreen = ({ onSuccess, onSwitchToLogin }) => {
  // NOTE: onSuccess receives the email so later steps can persist it.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return; // ignore repeat presses while a request is in flight

    // Validate before hitting the network
    const validation = validateSignup({ email, password });
    setErrors(validation);
    setFormError('');
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      await authService.signUp({ email, password });
      onSuccess(email.trim());
    } catch (err) {
      setFormError(err.message || 'We could not create your account. Please try again.');
      setSubmitting(false);
    }
  };

  // Typing in a field clears its error straight away
  const handleEmailChange = (value) => {
    setEmail(value);
    if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
  };
  const handlePasswordChange = (value) => {
    setPassword(value);
    if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
  };

  return (
    <AuthShell step={1} totalSteps={3}>
      <Text className="text-2xl font-extrabold text-ink md:text-3xl">Create your account</Text>
      <Text className="mb-6 mt-2 text-sm leading-5 text-subtle">
        Start tracking reports, medicines and care in one place.
      </Text>

      <View className="gap-4">
        <TextField
          label="Email address"
          placeholder="you@example.com"
          value={email}
          onChangeText={handleEmailChange}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!submitting}
        />

        <PasswordField
          label="Password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          value={password}
          onChangeText={handlePasswordChange}
          error={errors.password}
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!submitting}
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
        />
      </View>

      {/* Server-side or unexpected errors show here, above the button */}
      {formError ? (
        <Text accessibilityLiveRegion="polite" className="mt-4 text-sm text-danger">
          {formError}
        </Text>
      ) : null}

      <View className="mt-6">
        <PrimaryButton
          title="Create account"
          loadingTitle="Creating account…"
          onPress={handleSubmit}
          loading={submitting}
        />
      </View>

      {/* Footer: switch to the login screen */}
      <View className="mt-6 flex-row flex-wrap items-center justify-center gap-1">
        <Text className="text-sm text-subtle">Already have an account?</Text>
        <TouchableOpacity onPress={onSwitchToLogin} accessibilityRole="link" hitSlop={8}>
          <Text className="text-sm font-bold text-primary">Log in</Text>
        </TouchableOpacity>
      </View>
    </AuthShell>
  );
};
