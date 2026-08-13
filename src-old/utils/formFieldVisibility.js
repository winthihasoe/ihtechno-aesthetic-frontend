export function valuesMatch(actual, expected) {
  if (typeof expected === "boolean") {
    if (actual === true || actual === false) return actual === expected;
    const normalized = String(actual ?? "").toLowerCase();
    if (normalized === "true" || normalized === "yes") return expected === true;
    if (normalized === "false" || normalized === "no") return expected === false;
    return false;
  }

  if (Array.isArray(actual)) {
    return actual.map(String).includes(String(expected));
  }

  return String(actual ?? "") === String(expected ?? "");
}

export function isFieldVisible(field, formData = {}) {
  const rule = field?.visibility_rule;
  if (!rule || !rule.field) return true;

  const operator = rule.operator ?? "equals";
  const expected = rule.value;
  const actual = formData[rule.field];

  if (operator === "not_equals") {
    return !valuesMatch(actual, expected);
  }

  return valuesMatch(actual, expected);
}

export function filterVisibleFields(fields = [], formData = {}) {
  return (fields || []).filter((field) => isFieldVisible(field, formData));
}
