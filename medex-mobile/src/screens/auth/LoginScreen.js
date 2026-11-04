import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AuthShell } from '../../components/auth/AuthShell';
import { TextField } from '../../components/auth/TextField';
import { PasswordField } from '../../components/auth/PasswordField';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { authService } from '../../auth/authService';
import { validateLogin } from '../../auth/validation';

/**
 * Login for existing users. Successful login skips onboarding and goes
 * straight to the dashboard via onSuccess().
 */
export const LoginScreen = ({ onSuccess, onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;

    const validation = validateLogin({ email, password });
    setErrors(validation);
    setFormError('');
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      const result = await authService.signIn({ email, password });
      onSuccess(result?.user);
    } catch (err) {
      setFormError(err.message || 'Incorrect email or password.');
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <Text className="text-2xl font-extrabold text-ink md:text-3xl">Welcome back</Text>
      <Text className="mb-6 mt-2 text-sm leading-5 text-subtle">Log in to continue to your dashboard.</Text>

      <View className="gap-4">
        <TextField
          label="Email address"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!submitting}
        />

        <PasswordField
          label="Password"
          placeholder="Your password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          autoComplete="current-password"
          textContentType="password"
          editable={!submitting}
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
        />
      </View>

      {formError ? (
        <Text accessibilityLiveRegion="polite" className="mt-4 text-sm text-danger">
          {formError}
        </Text>
      ) : null}

      <View className="mt-6">
        <PrimaryButton title="Log in" loadingTitle="Logging in…" onPress={handleSubmit} loading={submitting} />
      </View>

      <View className="mt-6 flex-row flex-wrap items-center justify-center gap-1">
        <Text className="text-sm text-subtle">New here?</Text>
        <TouchableOpacity onPress={onSwitchToSignup} accessibilityRole="link" hitSlop={8}>
          <Text className="text-sm font-bold text-primary">Create an account</Text>
        </TouchableOpacity>
      </View>
    </AuthShell>
  );
};
