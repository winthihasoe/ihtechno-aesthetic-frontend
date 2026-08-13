import { filterVisibleFields } from "./formFieldVisibility";

function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) {
    return value.filter((item) => !isEmptyValue(item)).length === 0;
  }
  return false;
}

function validateFieldRules(field, value) {
  const rules = field?.validation_rules;
  if (!rules || typeof rules !== "object") return null;
  if (isEmptyValue(value)) return null;

  const message = rules.message || `Invalid value for ${field.label || field.name}.`;

  if (field.type === "number") {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return message;
    if (rules.min !== undefined && numeric < Number(rules.min)) return message;
    if (rules.max !== undefined && numeric > Number(rules.max)) return message;
    return null;
  }

  const stringValue = Array.isArray(value) ? value.join(",") : String(value);
  if (rules.min_length !== undefined && stringValue.length < Number(rules.min_length)) {
    return message;
  }
  if (rules.max_length !== undefined && stringValue.length > Number(rules.max_length)) {
    return message;
  }
  if (rules.pattern) {
    try {
      const regex = new RegExp(rules.pattern, "u");
      if (!regex.test(stringValue)) return message;
    } catch {
      return message;
    }
  }

  return null;
}

/**
 * @param {Array} fields
 * @param {Object} formData
 * @param {{ skipFieldNames?: string[] }} options
 * @returns {Record<string, string>}
 */
export function validateFormFields(fields = [], formData = {}, options = {}) {
  const skip = new Set(options.skipFieldNames || []);
  const errors = {};
  const visibleFields = filterVisibleFields(fields, formData);

  for (const field of visibleFields) {
    if (skip.has(field.name)) continue;

    if (field.required && isEmptyValue(formData[field.name])) {
      errors[field.name] = "This field is required.";
      continue;
    }

    const ruleError = validateFieldRules(field, formData[field.name]);
    if (ruleError) errors[field.name] = ruleError;
  }

  return errors;
}

export { isEmptyValue };
