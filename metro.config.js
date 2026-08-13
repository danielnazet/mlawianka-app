const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Workaround for Supabase 'stream' / 'ws' module error in Expo SDK 54
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
