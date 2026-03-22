export type ValidationRule<T> = {
  field: keyof T;
  validate: (value: T[keyof T], form: T) => boolean;
  message: string;
};

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function validateForm<T extends Record<string, unknown>>(
  values: T,
  rules: ValidationRule<T>[]
): FieldErrors<T> {
  const errors: FieldErrors<T> = {};
  for (const rule of rules) {
    if (errors[rule.field]) continue; // first error wins
    if (!rule.validate(values[rule.field], values)) {
      errors[rule.field] = rule.message;
    }
  }
  return errors;
}

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.keys(errors).length > 0;
}

// Common validators
export const required = (msg = '此项必填') =>
  (value: unknown) => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return true;
    return value != null;
  };

export const positiveNumber = (msg = '请输入正数') =>
  (value: unknown) => {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return !isNaN(num) && num > 0;
  };

export const nonNegativeNumber = (msg = '不能为负数') =>
  (value: unknown) => {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return !isNaN(num) && num >= 0;
  };
