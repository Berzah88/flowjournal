module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-worklets/plugin', // en son sırada olmalı (worklets önce gelmeli)
      'react-native-reanimated/plugin', // reanimated plugin en son olmalı
    ],
  };
};
