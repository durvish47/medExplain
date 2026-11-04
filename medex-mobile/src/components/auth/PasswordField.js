import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextField } from './TextField';

/** Password input with a show/hide toggle. Props are forwarded to TextField. */
export const PasswordField = ({ label = 'Password', ...props }) => {
  const [visible, setVisible] = useState(false);

  const toggle = (
    <TouchableOpacity
      onPress={() => setVisible(v => !v)}
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      className="ml-2 h-8 w-8 items-center justify-center"
    >
      <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#58716E" />
    </TouchableOpacity>
  );

  return (
    <TextField
      label={label}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoComplete="password"
      textContentType="password"
      rightElement={toggle}
      {...props}
    />
  );
};
