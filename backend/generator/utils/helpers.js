const emailSet = new Set();

/**
 * Generates a unique email from first name and last name.
 * e.g., rahul.sharma@talentintelligence.ai
 */
function generateUniqueEmail(firstName, lastName) {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
  let baseEmail = `${cleanFirst}.${cleanLast}@talentintelligence.ai`;
  
  if (!emailSet.has(baseEmail)) {
    emailSet.add(baseEmail);
    return baseEmail;
  }
  
  let counter = 1;
  let uniqueEmail = `${cleanFirst}.${cleanLast}${counter}@talentintelligence.ai`;
  while (emailSet.has(uniqueEmail)) {
    counter++;
    uniqueEmail = `${cleanFirst}.${cleanLast}${counter}@talentintelligence.ai`;
  }
  
  emailSet.add(uniqueEmail);
  return uniqueEmail;
}

/**
 * Resets the email set (useful for test runs or multi-runs).
 */
function resetEmails() {
  emailSet.clear();
}

/**
 * Interpolates template strings with context variables.
 * e.g., "Hello {name}" -> "Hello Rahul"
 */
function interpolate(template, context) {
  return template.replace(/\{(\w+)\}/g, (placeholder, key) => {
    return context[key] !== undefined ? context[key] : placeholder;
  });
}

/**
 * Formats a SQL-safe string by escaping single quotes.
 */
function escapeSqlString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/'/g, "''");
}

module.exports = {
  generateUniqueEmail,
  resetEmails,
  interpolate,
  escapeSqlString
};
