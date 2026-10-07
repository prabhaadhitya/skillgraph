/**
 * Validate password against SkillGraph requirements.
 * Rules: min 8 characters, at least one letter, at least one number.
 *
 * @param {string} password
 * @returns {{
 *   hasMinLength: boolean,
 *   hasLetter: boolean,
 *   hasNumber: boolean,
 *   isValid: boolean,
 *   rules: Array<{ id: string, label: string, passed: boolean }>
 * }}
 */
export function validatePassword(password = '') {
  const pwd = String(password || '');
  const hasMinLength = pwd.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const isValid = hasMinLength && hasLetter && hasNumber;

  const rules = [
    { id: 'min_length', label: 'At least 8 characters', passed: hasMinLength },
    { id: 'has_letter', label: 'At least one letter (a-z, A-Z)', passed: hasLetter },
    { id: 'has_number', label: 'At least one number (0-9)', passed: hasNumber },
  ];

  return {
    hasMinLength,
    hasLetter,
    hasNumber,
    isValid,
    rules,
  };
}

export default validatePassword;
