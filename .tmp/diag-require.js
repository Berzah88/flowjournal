const fs = require('fs');
console.log('cwd:', process.cwd());
console.log('node:', process.execPath, process.version);
console.log('env NODE_OPTIONS=', process.env.NODE_OPTIONS);
console.log('env NODE_PATH=', process.env.NODE_PATH);
console.log('PATH contains node?', !!process.env.PATH && process.env.PATH.match(/node/i));

function tryResolve(label, fn) {
  try {
    const res = fn();
    console.log(`${label}: RESOLVED ->`, res);
  } catch (e) {
    console.error(`${label}: ERROR ->`, e && e.stack ? e.stack : e);
  }
}

tryResolve('react-native', () => require.resolve('react-native/package.json'));
tryResolve('gradle-plugin', () => require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] }));
tryResolve('expo-autolinking', () => require.resolve('expo-modules-autolinking/package.json', { paths: [require.resolve('expo/package.json')] }));

// Also attempt the exact expression used in settings.gradle for clarity
try {
  const expr = require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] });
  console.log('exact-expression OK ->', expr);
} catch (e) {
  console.error('exact-expression ERROR ->', e && e.stack ? e.stack : e);
}
