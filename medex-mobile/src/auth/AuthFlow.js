import React, { useState } from 'react';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { ProfileScreen } from '../screens/auth/ProfileScreen';
import { EmergencyContactScreen } from '../screens/auth/EmergencyContactScreen';
import { StepTransition } from '../components/auth/StepTransition';

// Step keys. Each maps to a route the flow is designed around.
export const AUTH_STEPS = {
  SIGNUP: 'signup', // /signup
  LOGIN: 'login', // /login
  ONBOARDING: 'onboarding', // /onboarding
  PROFILE: 'profile', // /onboarding/profile
  EMERGENCY: 'emergency', // /onboarding/emergency (patient only, optional)
};

/**
 * Owns the auth flow's step state. React Native has no URL bar, so the
 * route paths above are represented as step keys in a single state machine.
 *
 *   signup ──► onboarding (role) ──► profile (role-specific details) ──► dashboard
 *   login  ─────────────────────────────────────────────────────────► dashboard
 *
 * `onComplete({ role, profile })` is called once the user is ready for the main app.
 * Login completes with `profile: null` because existing users skip onboarding.
 */
export const AuthFlow = ({ onComplete }) => {
  const [step, setStep] = useState(AUTH_STEPS.SIGNUP);
  const [role, setRole] = useState(null);
  const [signupEmail, setSignupEmail] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [emergencyContact, setEmergencyContact] = useState({ name: '', phone: '' });

  let content;
  switch (step) {
    case AUTH_STEPS.LOGIN:
      content = (
        <LoginScreen
          onSuccess={(loggedInUser) => {
            onComplete({
              role: loggedInUser?.role || 'patient',
              profile: null,
              email: loggedInUser?.email || '',
            });
          }}
          onSwitchToSignup={() => setStep(AUTH_STEPS.SIGNUP)}
        />
      );
      break;
    case AUTH_STEPS.ONBOARDING:
      content = (
        <OnboardingScreen
          onContinue={async (selectedRole) => {
            setRole(selectedRole);
            if (signupEmail) {
              await authService.updateUserRole({ email: signupEmail, role: selectedRole }).catch(() => {});
            }
            setStep(AUTH_STEPS.PROFILE);
          }}
        />
      );
      break;
    case AUTH_STEPS.PROFILE:
      content = (
        <ProfileScreen
          role={role}
          onBack={() => setStep(AUTH_STEPS.ONBOARDING)}
          onSubmit={(profile) => {
            if (role === 'doctor') {
              onComplete({ role, profile, email: signupEmail });
            } else {
              setPatientProfile(profile);
              setStep(AUTH_STEPS.EMERGENCY);
            }
          }}
        />
      );
      break;
    case AUTH_STEPS.EMERGENCY:
      content = (
        <EmergencyContactScreen
          initialName={emergencyContact.name}
          initialPhone={emergencyContact.phone}
          onBack={() => setStep(AUTH_STEPS.PROFILE)}
          onSkip={() => {
            onComplete({
              role,
              profile: patientProfile,
              email: signupEmail,
            });
          }}
          onSubmit={({ name, phone }) => {
            setEmergencyContact({ name, phone });
            onComplete({
              role,
              profile: {
                ...patientProfile,
                emergencyContactName: name,
                emergencyContactPhone: phone,
              },
              email: signupEmail,
            });
          }}
        />
      );
      break;
    case AUTH_STEPS.SIGNUP:
    default:
      content = (
        <SignupScreen
          onSuccess={(email) => {
            setSignupEmail(email);
            setStep(AUTH_STEPS.ONBOARDING);
          }}
          onSwitchToLogin={() => setStep(AUTH_STEPS.LOGIN)}
        />
      );
  }

  // The stepKey re-runs the entrance animation on every step change
  return <StepTransition stepKey={step}>{content}</StepTransition>;
};
