// Pragmatic email check: something@something.tld with no whitespace.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MIN_PASSWORD_LENGTH = 8;

export const isValidEmail = (email) => EMAIL_PATTERN.test(email.trim());

/** Returns an error message, or '' when the password meets the minimum length. */
export const getPasswordError = (password) =>
  password.length >= MIN_PASSWORD_LENGTH
    ? ''
    : `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

/** Validates the signup form. Returns a map of field -> message; empty object means valid. */
export const validateSignup = ({ email, password }) => {
  const errors = {};
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  const passwordError = getPasswordError(password);
  if (passwordError) errors.password = passwordError;
  return errors;
};

/** Login only checks presence; the server decides whether credentials are correct. */
export const validateLogin = ({ email, password }) => {
  const errors = {};
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
};
