import React, { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';

/**
 * Fades and slides its children in whenever `stepKey` changes.
 * Keeps the step-to-step motion smooth without a navigation library.
 */
export const StepTransition = ({ stepKey, children }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 300,
      // The native driver isn't available on web, so only enable it on device
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [stepKey, progress]);

  const animatedStyle = {
    opacity: progress,
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
    ],
  };

  return <Animated.View style={[{ flex: 1 }, animatedStyle]}>{children}</Animated.View>;
};
