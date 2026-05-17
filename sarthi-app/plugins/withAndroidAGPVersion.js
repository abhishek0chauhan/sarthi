const {
  withProjectBuildGradle,
  withSettingsGradle,
  withAppBuildGradle,
} = require('@expo/config-plugins');

const TARGET_AGP = '8.3.2';

// Fix 1: Old classpath format in android/build.gradle
function patchProjectBuildGradle(config) {
  return withProjectBuildGradle(config, (c) => {
    c.modResults.contents = c.modResults.contents.replace(
      /com\.android\.tools\.build:gradle:[^\s'"]+/g,
      `com.android.tools.build:gradle:${TARGET_AGP}`
    );
    return c;
  });
}

// Fix 2: New plugins DSL format in android/settings.gradle
function patchSettingsGradle(config) {
  return withSettingsGradle(config, (c) => {
    // Kotlin DSL: id("com.android.application") version "8.11.0"
    c.modResults.contents = c.modResults.contents.replace(
      /(id\(["']com\.android\.(?:application|library)["']\)\s*version\s*["'])[^"']+["']/g,
      `$1${TARGET_AGP}"`
    );
    // Groovy DSL: id 'com.android.application' version '8.11.0'
    c.modResults.contents = c.modResults.contents.replace(
      /(id\s+['"]com\.android\.(?:application|library)['"]\s+version\s+['"])[^'"]+['"]/g,
      `$1${TARGET_AGP}'`
    );
    return c;
  });
}

// Fix 3: Add matchingFallbacks to release buildType in android/app/build.gradle
// so the app can consume native modules that don't have a release variant
function patchAppBuildGradle(config) {
  return withAppBuildGradle(config, (c) => {
    if (c.modResults.contents.includes('matchingFallbacks')) return c;
    c.modResults.contents = c.modResults.contents.replace(
      /(\brelease\s*\{)/,
      "$1\n            matchingFallbacks = ['release', 'debug']"
    );
    return c;
  });
}

module.exports = function withAndroidAGPVersion(config) {
  config = patchProjectBuildGradle(config);
  config = patchSettingsGradle(config);
  config = patchAppBuildGradle(config);
  return config;
};
