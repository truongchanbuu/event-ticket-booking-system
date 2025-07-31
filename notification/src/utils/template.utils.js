import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

export function loadEmailTemplate(fileName) {
  const templatePath = path.resolve('src/templates', fileName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${fileName}`);
  }
  return fs.readFileSync(templatePath, 'utf8');
}

export function processTemplate(template, variables) {
  const compiled = Handlebars.compile(template, { noEscape: true });
  return compiled(variables);
}

export function validateVariables(templateConfig, variables) {
  const required = templateConfig?.variables || [];
  const missing = required.filter((key) => !(key in variables));
  return missing;
}

// HELPERS
import Handlebars from 'handlebars';

/**
 * Register common Handlebars helpers
 */
export function registerHelpers() {
  // Capitalize first letter
  Handlebars.registerHelper('capitalize', (str) => {
    if (typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Uppercase
  Handlebars.registerHelper('uppercase', (str) => {
    return (str || '').toString().toUpperCase();
  });

  // Lowercase
  Handlebars.registerHelper('lowercase', (str) => {
    return (str || '').toString().toLowerCase();
  });

  // Date formatting (yyyy-mm-dd)
  Handlebars.registerHelper('formatDate', (dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toISOString().split('T')[0];
  });

  // Time formatting (HH:MM)
  Handlebars.registerHelper('formatTime', (dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  });

  // If equals
  Handlebars.registerHelper('if_eq', function (a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
  });

  // Fallback (e.g. {{fallback username "Guest"}})
  Handlebars.registerHelper('fallback', (value, fallback) => {
    return value || fallback;
  });

  // URL encode (for safe links)
  Handlebars.registerHelper('urlEncode', (str) => {
    return encodeURIComponent(str || '');
  });

  // Truncate text (e.g. preview in-app msg)
  Handlebars.registerHelper('truncate', (str, length) => {
    str = str || '';
    return str.length > length ? str.slice(0, length) + '...' : str;
  });

  // JSON stringify
  Handlebars.registerHelper('json', (context) => {
    return JSON.stringify(context, null, 2);
  });
}
