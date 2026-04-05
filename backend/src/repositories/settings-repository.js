const { query } = require('../db/pool');

async function getSetting(settingKey) {
  const result = await query(
    `
      SELECT setting_key, setting_value, updated_at
      FROM app_settings
      WHERE setting_key = $1
      LIMIT 1
    `,
    [settingKey]
  );

  return result.rows[0] || null;
}

async function upsertSetting(settingKey, settingValue) {
  const result = await query(
    `
      INSERT INTO app_settings (setting_key, setting_value)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (setting_key)
      DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
      RETURNING setting_key, setting_value, updated_at
    `,
    [settingKey, JSON.stringify(settingValue)]
  );

  return result.rows[0];
}

module.exports = {
  getSetting,
  upsertSetting,
};
