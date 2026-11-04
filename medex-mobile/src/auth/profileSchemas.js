// Field definitions for the post-onboarding profile form, per role.
//
// Each field:
//   key          payload key sent on submit (snake_case)
//   label        visible label
//   type         'text' (TextField) | 'select' (chip picker) | 'choice' (Yes / No)
//   required     must be filled in
//   options      choices for 'select'
//   numeric      converted to a Number in the payload
//   inputProps   extra props passed to TextField (keyboardType, placeholder...)
//   validate     optional (trimmedValue) => error message or ''
//
// `rows` groups fields that sit side by side on md+ screens; each row stacks on mobile.

export const GENDER_OPTIONS = ['Female', 'Male', 'Other', 'Prefer not to say'];
export const QUALIFICATION_OPTIONS = ['MBBS', 'MD', 'MS', 'DM / MCh', 'DNB', 'PhD', 'Other'];
export const AVAILABILITY_OPTIONS = ['Full-time', 'Part-time', 'On-call', 'Weekends only'];
export const SPECIALITY_OPTIONS = [
  'General Medicine', 'Cardiology', 'Dermatology', 'Endocrinology', 'ENT',
  'Gastroenterology', 'Gynaecology', 'Neurology', 'Oncology', 'Orthopaedics',
  'Paediatrics', 'Psychiatry', 'Pulmonology', 'Radiology', 'Surgery', 'Other',
];

// ---- Reusable validators -------------------------------------------------

// 4–20 letters, digits or hyphens (covers most ID and registration formats)
const ID_PATTERN = /^[A-Za-z0-9-]{4,20}$/;
const idRule = (label) => (value) =>
  ID_PATTERN.test(value) ? '' : `${label} should be 4–20 letters or numbers.`;

// Accepts YYYY-MM-DD, rejects impossible dates and future dates
const dobRule = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return 'Use the format YYYY-MM-DD.';
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  // Date silently rolls over invalid days (e.g. Feb 31), so check the parts match
  const isRealDate = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!isRealDate) return 'Enter a real date.';
  if (date > new Date()) return 'Date of birth cannot be in the future.';
  return '';
};

// Numeric range check; `integer` rejects decimals
const rangeRule = (label, min, max, { integer = false } = {}) => (value) => {
  if (!/^\d+(\.\d+)?$/.test(value)) return `${label} must be a number.`;
  if (integer && value.includes('.')) return `${label} must be a whole number.`;
  const n = Number(value);
  if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
  return '';
};

// ---- Shared fields -------------------------------------------------------

const fullName = {
  key: 'full_name', label: 'Full name', type: 'text', required: true,
  inputProps: { placeholder: 'As it appears on your ID', autoComplete: 'name', textContentType: 'name' },
};

const gender = { key: 'gender', label: 'Gender', type: 'select', required: true, options: GENDER_OPTIONS };

const govtId = {
  key: 'govt_id', label: 'Government ID number', type: 'text', required: true,
  inputProps: { placeholder: 'ID number', autoCapitalize: 'characters' },
  validate: idRule('Government ID'),
};

// ---- Patient fields ------------------------------------------------------

const patientFields = {
  dob: {
    key: 'dob', label: 'Date of birth', type: 'date', required: true,
    inputProps: { placeholder: 'YYYY-MM-DD' },
    validate: dobRule,
  },
  occupation: {
    key: 'occupation', label: 'Occupation', type: 'text', required: true,
    inputProps: { placeholder: 'e.g. Teacher' },
  },
  height: {
    key: 'height', label: 'Height (cm)', type: 'text', required: true, numeric: true,
    inputProps: { placeholder: 'e.g. 170', keyboardType: 'number-pad' },
    validate: rangeRule('Height', 50, 250, { integer: true }),
  },
  weight: {
    key: 'weight', label: 'Weight (kg)', type: 'text', required: true, numeric: true,
    inputProps: { placeholder: 'e.g. 65.5', keyboardType: 'decimal-pad' },
    validate: rangeRule('Weight', 2, 400),
  },
  is_smoker: { key: 'is_smoker', label: 'Do you smoke?', type: 'choice', required: true },
  is_drinker: { key: 'is_drinker', label: 'Do you drink alcohol?', type: 'choice', required: true },
};

// ---- Doctor fields -------------------------------------------------------

const doctorFields = {
  reg_number: {
    key: 'reg_number', label: 'Registration number', type: 'text', required: true,
    inputProps: { placeholder: 'Medical council registration no.', autoCapitalize: 'characters' },
    validate: idRule('Registration number'),
  },
  state_medical_council: {
    key: 'state_medical_council', label: 'State medical council', type: 'text', required: true,
    inputProps: { placeholder: 'e.g. Tamil Nadu Medical Council' },
  },
  speciality: { key: 'speciality', label: 'Speciality', type: 'select', required: true, options: SPECIALITY_OPTIONS },
  yoe: {
    key: 'yoe', label: 'Years of experience', type: 'text', required: true, numeric: true,
    inputProps: { placeholder: 'e.g. 8', keyboardType: 'number-pad' },
    validate: rangeRule('Years of experience', 0, 70, { integer: true }),
  },
  highest_qualification: {
    key: 'highest_qualification', label: 'Highest qualification', type: 'select', required: true,
    options: QUALIFICATION_OPTIONS,
  },
  hospital: {
    key: 'hospital', label: 'Hospital / clinic', type: 'text', required: true,
    inputProps: { placeholder: 'Where you practise' },
  },
  availability: { key: 'availability', label: 'Availability', type: 'select', required: true, options: AVAILABILITY_OPTIONS },
};

// ---- Form layout per role ------------------------------------------------

export const PROFILE_ROWS = {
  patient: [
    [fullName],
    [gender, patientFields.dob],
    [govtId, patientFields.occupation],
    [patientFields.height, patientFields.weight],
    [patientFields.is_smoker, patientFields.is_drinker],
  ],
  doctor: [
    [fullName],
    [gender, govtId],
    [doctorFields.reg_number, doctorFields.state_medical_council],
    [doctorFields.speciality, doctorFields.yoe],
    [doctorFields.highest_qualification, doctorFields.hospital],
    [doctorFields.availability],
  ],
};

const flatFields = (role) => PROFILE_ROWS[role].flat();

/** Empty form state: '' for text/select, null for Yes/No so "unanswered" is distinguishable. */
export const getEmptyProfileValues = (role) =>
  Object.fromEntries(flatFields(role).map(field => [field.key, field.type === 'choice' ? null : '']));

/** Returns a map of key -> message. Empty object means the profile is valid. */
export const validateProfile = (role, values) => {
  const errors = {};
  for (const field of flatFields(role)) {
    const value = values[field.key];

    if (field.type === 'choice') {
      if (value === null) errors[field.key] = `Please answer: ${field.label}`;
      continue;
    }

    const trimmed = String(value).trim();
    if (field.required && !trimmed) {
      errors[field.key] = `${field.label} is required.`;
      continue;
    }
    if (field.validate && trimmed) {
      const message = field.validate(trimmed);
      if (message) errors[field.key] = message;
    }
  }
  return errors;
};

/** Converts form state into the payload: trims text, numbers become Numbers. */
export const buildProfilePayload = (role, values) =>
  Object.fromEntries(
    flatFields(role).map(field => {
      const raw = values[field.key];
      if (field.type === 'choice') return [field.key, raw];
      const trimmed = String(raw).trim();
      return [field.key, field.numeric ? Number(trimmed) : trimmed];
    }),
  );
