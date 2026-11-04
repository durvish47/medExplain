import React from 'react';
import { SelectField } from './SelectField';
import { YesNoField } from './YesNoField';
import { TextField } from './TextField';
import { DatePickerField } from '../DatePickerField';

/**
 * Renders one profile field from its schema definition (see src/auth/profileSchemas.js).
 * Picks the right control for field.type and wires it to value / onChange.
 */
export const FormField = ({ field, value, error, onChange, disabled = false }) => {
  switch (field.type) {
    case 'date':
      return (
        <DatePickerField
          label={field.label}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          placeholder={field.inputProps?.placeholder || 'YYYY-MM-DD'}
          variant="auth"
        />
      );
    case 'select':
      return (
        <SelectField
          label={field.label}
          options={field.options}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
    case 'choice':
      return (
        <YesNoField
          label={field.label}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
    case 'text':
    default:
      return (
        <TextField
          label={field.label}
          value={value}
          onChangeText={onChange}
          error={error}
          editable={!disabled}
          {...field.inputProps}
        />
      );
  }
};
