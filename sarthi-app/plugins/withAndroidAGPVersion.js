const { withProjectBuildGradle } = require('@expo/config-plugins');

// Pins AGP to 8.3.2 — EAS build workers use AGP 8.11.x which breaks native modules
// that don't yet have variant configurations for that version.
module.exports = function withAndroidAGPVersion(config) {
  return withProjectBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /com\.android\.tools\.build:gradle:[^\s'"]+/g,
      'com.android.tools.build:gradle:8.3.2'
    );
    return config;
  });
};
