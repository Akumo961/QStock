/**
 * Validators
 * Input validation functions with error messages
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Email Validation
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  if (email.length > 255) {
    return { valid: false, error: 'Email must be less than 255 characters' };
  }

  return { valid: true };
};

/**
 * Password Validation
 */
export const validatePassword = (password: string, minLength: number = 8): ValidationResult => {
  if (!password || password.trim() === '') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < minLength) {
    return { valid: false, error: `Password must be at least ${minLength} characters` };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }

  return { valid: true };
};

/**
 * Strong Password Validation
 */
export const validateStrongPassword = (password: string): ValidationResult => {
  const basicValidation = validatePassword(password);
  if (!basicValidation.valid) {
    return basicValidation;
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!hasLowerCase) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (!hasNumber) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  if (!hasSpecialChar) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }

  return { valid: true };
};

/**
 * Password Match Validation
 */
export const validatePasswordMatch = (password: string, confirmPassword: string): ValidationResult => {
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' };
  }
  return { valid: true };
};

/**
 * Name Validation
 */
export const validateName = (name: string, fieldName: string = 'Name'): ValidationResult => {
  if (!name || name.trim() === '') {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (name.trim().length < 2) {
    return { valid: false, error: `${fieldName} must be at least 2 characters` };
  }

  if (name.length > 100) {
    return { valid: false, error: `${fieldName} must be less than 100 characters` };
  }

  return { valid: true };
};

/**
 * Phone Number Validation
 */
export const validatePhone = (phone: string): ValidationResult => {
  if (!phone || phone.trim() === '') {
    return { valid: false, error: 'Phone number is required' };
  }

  // Remove spaces, dashes, and parentheses for validation
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  if (!/^\+?\d{10,15}$/.test(cleanPhone)) {
    return { valid: false, error: 'Please enter a valid phone number' };
  }

  return { valid: true };
};

/**
 * Required Field Validation
 */
export const validateRequired = (value: any, fieldName: string = 'This field'): ValidationResult => {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (typeof value === 'string' && value.trim() === '') {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (Array.isArray(value) && value.length === 0) {
    return { valid: false, error: `${fieldName} is required` };
  }

  return { valid: true };
};

/**
 * Number Validation
 */
export const validateNumber = (
  value: string | number,
  fieldName: string = 'Value',
  options?: { min?: number; max?: number; integer?: boolean }
): ValidationResult => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }

  if (options?.integer && !Number.isInteger(num)) {
    return { valid: false, error: `${fieldName} must be a whole number` };
  }

  if (options?.min !== undefined && num < options.min) {
    return { valid: false, error: `${fieldName} must be at least ${options.min}` };
  }

  if (options?.max !== undefined && num > options.max) {
    return { valid: false, error: `${fieldName} must be at most ${options.max}` };
  }

  return { valid: true };
};

/**
 * Positive Number Validation
 */
export const validatePositiveNumber = (value: string | number, fieldName: string = 'Value'): ValidationResult => {
  return validateNumber(value, fieldName, { min: 0 });
};

/**
 * Integer Validation
 */
export const validateInteger = (value: string | number, fieldName: string = 'Value'): ValidationResult => {
  return validateNumber(value, fieldName, { integer: true });
};

/**
 * Length Validation
 */
export const validateLength = (
  value: string,
  fieldName: string = 'Field',
  options: { min?: number; max?: number }
): ValidationResult => {
  const length = value.length;

  if (options.min !== undefined && length < options.min) {
    return { valid: false, error: `${fieldName} must be at least ${options.min} characters` };
  }

  if (options.max !== undefined && length > options.max) {
    return { valid: false, error: `${fieldName} must be at most ${options.max} characters` };
  }

  return { valid: true };
};

/**
 * URL Validation
 */
export const validateUrl = (url: string): ValidationResult => {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'URL is required' };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Please enter a valid URL' };
  }
};

/**
 * Date Validation
 */
export const validateDate = (date: string, fieldName: string = 'Date'): ValidationResult => {
  if (!date || date.trim() === '') {
    return { valid: false, error: `${fieldName} is required` };
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
  }

  return { valid: true };
};

/**
 * Future Date Validation
 */
export const validateFutureDate = (date: string, fieldName: string = 'Date'): ValidationResult => {
  const basicValidation = validateDate(date, fieldName);
  if (!basicValidation.valid) {
    return basicValidation;
  }

  const dateObj = new Date(date);
  const now = new Date();

  if (dateObj <= now) {
    return { valid: false, error: `${fieldName} must be in the future` };
  }

  return { valid: true };
};

/**
 * Past Date Validation
 */
export const validatePastDate = (date: string, fieldName: string = 'Date'): ValidationResult => {
  const basicValidation = validateDate(date, fieldName);
  if (!basicValidation.valid) {
    return basicValidation;
  }

  const dateObj = new Date(date);
  const now = new Date();

  if (dateObj >= now) {
    return { valid: false, error: `${fieldName} must be in the past` };
  }

  return { valid: true };
};

/**
 * Date Range Validation
 */
export const validateDateRange = (startDate: string, endDate: string): ValidationResult => {
  const startValidation = validateDate(startDate, 'Start date');
  if (!startValidation.valid) {
    return startValidation;
  }

  const endValidation = validateDate(endDate, 'End date');
  if (!endValidation.valid) {
    return endValidation;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    return { valid: false, error: 'End date must be after start date' };
  }

  return { valid: true };
};

/**
 * Item Code Validation
 */
export const validateItemCode = (code: string): ValidationResult => {
  if (!code || code.trim() === '') {
    return { valid: false, error: 'Item code is required' };
  }

  if (!/^[A-Z0-9\-]+$/.test(code)) {
    return { valid: false, error: 'Item code must contain only uppercase letters, numbers, and hyphens' };
  }

  if (code.length > 50) {
    return { valid: false, error: 'Item code must be less than 50 characters' };
  }

  return { valid: true };
};

/**
 * Employee ID Validation
 */
export const validateEmployeeId = (id: string): ValidationResult => {
  if (!id || id.trim() === '') {
    return { valid: false, error: 'Employee ID is required' };
  }

  if (!/^[A-Z0-9\-]+$/.test(id)) {
    return { valid: false, error: 'Employee ID must contain only uppercase letters, numbers, and hyphens' };
  }

  if (id.length > 20) {
    return { valid: false, error: 'Employee ID must be less than 20 characters' };
  }

  return { valid: true };
};

/**
 * Alphanumeric Validation
 */
export const validateAlphanumeric = (value: string, fieldName: string = 'Field'): ValidationResult => {
  if (!value || value.trim() === '') {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (!/^[a-zA-Z0-9]+$/.test(value)) {
    return { valid: false, error: `${fieldName} must contain only letters and numbers` };
  }

  return { valid: true };
};

/**
 * File Validation
 */
export const validateFile = (
  file: File,
  options?: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  }
): ValidationResult => {
  if (!file) {
    return { valid: false, error: 'File is required' };
  }

  if (options?.maxSize && file.size > options.maxSize) {
    const maxSizeMB = options.maxSize / (1024 * 1024);
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }

  if (options?.allowedTypes && !options.allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  if (options?.allowedExtensions) {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!options.allowedExtensions.includes(extension)) {
      return { valid: false, error: `Allowed extensions: ${options.allowedExtensions.join(', ')}` };
    }
  }

  return { valid: true };
};

/**
 * Image File Validation
 */
export const validateImageFile = (file: File): ValidationResult => {
  return validateFile(file, {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  });
};

/**
 * QR Code Data Validation
 */
export const validateQRCode = (qrData: string): ValidationResult => {
  if (!qrData || qrData.trim() === '') {
    return { valid: false, error: 'QR code data is required' };
  }

  const parts = qrData.split(':');
  if (parts.length < 2) {
    return { valid: false, error: 'Invalid QR code format' };
  }

  const type = parts[0].toUpperCase();
  if (type !== 'USER' && type !== 'ITEM') {
    return { valid: false, error: 'Invalid QR code type' };
  }

  return { valid: true };
};

/**
 * Rating Validation
 */
export const validateRating = (rating: number): ValidationResult => {
  return validateNumber(rating, 'Rating', { min: 1, max: 5, integer: true });
};

/**
 * Comment Validation
 */
export const validateComment = (comment: string, maxLength: number = 1000): ValidationResult => {
  if (!comment || comment.trim() === '') {
    return { valid: true }; // Comments are usually optional
  }

  return validateLength(comment, 'Comment', { max: maxLength });
};

/**
 * Description Validation
 */
export const validateDescription = (description: string, maxLength: number = 2000): ValidationResult => {
  if (!description || description.trim() === '') {
    return { valid: true }; // Descriptions are usually optional
  }

  return validateLength(description, 'Description', { max: maxLength });
};

/**
 * Quantity Validation
 */
export const validateQuantity = (quantity: number, available: number): ValidationResult => {
  const numberValidation = validateNumber(quantity, 'Quantity', { min: 1, integer: true });
  if (!numberValidation.valid) {
    return numberValidation;
  }

  if (quantity > available) {
    return { valid: false, error: `Only ${available} available` };
  }

  return { valid: true };
};

/**
 * Form Validation Helper
 */
export const validateForm = (validations: Record<string, ValidationResult>): {
  valid: boolean;
  errors: Record<string, string>;
} => {
  const errors: Record<string, string> = {};
  let valid = true;

  Object.entries(validations).forEach(([field, result]) => {
    if (!result.valid && result.error) {
      errors[field] = result.error;
      valid = false;
    }
  });

  return { valid, errors };
};

/**
 * Custom Validator Function Type
 */
export type CustomValidator = (value: any) => ValidationResult;

/**
 * Combine Multiple Validators
 */
export const combineValidators = (
  value: any,
  validators: CustomValidator[]
): ValidationResult => {
  for (const validator of validators) {
    const result = validator(value);
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
};