import React from 'react';
import { ScrollView, Text, View } from 'react-native';

/**
 * Centered, responsive card used by every auth step.
 * - Mobile: full-width card with padding.
 * - md+ (tablet / web): constrained width, larger padding.
 * `wide` gives the onboarding step more room for side-by-side role cards.
 */
export const AuthShell = ({ children, wide = false, step, totalSteps }) => (
  <ScrollView
    className="flex-1 bg-canvas"
    contentContainerClassName="flex-grow items-center justify-center px-4 py-8 md:py-12"
    // Keeps taps on buttons working while the keyboard is open
    keyboardShouldPersistTaps="handled"
  >
    <View className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-3xl bg-surface p-6 shadow-lg md:p-10`}>
      {/* Brand mark */}
      <Text className="mb-6 text-sm font-extrabold tracking-widest text-primary">
        MEDEX <Text className="text-accent">●</Text>
      </Text>

      {/* Optional step indicator, e.g. "Step 1 of 2" as dots */}
      {step && totalSteps ? (
        <View className="mb-6 flex-row items-center gap-2" accessibilityLabel={`Step ${step} of ${totalSteps}`}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View
              key={index}
              className={`h-1.5 flex-1 rounded-full ${index < step ? 'bg-primary' : 'bg-line'}`}
            />
          ))}
        </View>
      ) : null}

      {children}
    </View>
  </ScrollView>
);
