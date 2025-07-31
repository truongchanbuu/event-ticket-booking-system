import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

/**
 * Load and parse YAML notification config
 * @returns {object} Parsed config object
 */
export function loadNotificationConfig() {
  const filePath = path.resolve('config', 'notification.config.yaml');

  if (!fs.existsSync(filePath)) {
    throw new Error(`❌ Notification config file not found at: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');

  try {
    const config = yaml.parse(fileContent);
    return config;
  } catch (error) {
    throw new Error(`❌ Failed to parse YAML config: ${error.message}`);
  }
}
