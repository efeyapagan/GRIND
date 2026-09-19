const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// npm workspaces: @grind/shared repo kokunde tek bir yerde (hoisted) yasar -- Metro varsayilan
// olarak proje klasorunun DISINA bakmaz, bu yuzden kok dizini izlemesi ve oradan cozmesi
// gerektigi acikca soylenmeli.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
