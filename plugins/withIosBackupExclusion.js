const { withAppDelegate } = require('expo/config-plugins');

const BACKUP_MARKER = 'OTWO_BACKUP_EXCLUSION';
const APP_DELEGATE_ANCHOR =
  /([ \t]*)return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/;

/**
 * Exclude the encrypted health database directory from iOS backups.
 *
 * `expo-sqlite` stores databases in `Documents/SQLite`. iCloud/iTunes backups
 * would otherwise copy the encrypted file (and its WAL/SHM sidecars) off the
 * device. The key lives in the Keychain, so the backup is not directly
 * readable, but health data should not leave the device this way at all.
 *
 * A plist key cannot express this. It must be set on the URL resource at
 * runtime, before the database is opened. The directory is created here when
 * missing so a first launch is excluded too.
 */
function addBackupExclusion(contents) {
  if (contents.includes(BACKUP_MARKER)) return contents;
  if (!APP_DELEGATE_ANCHOR.test(contents)) {
    throw new Error(
      'withIosBackupExclusion: could not find didFinishLaunchingWithOptions in AppDelegate.swift'
    );
  }

  const snippet = (indent) => `${indent}// ${BACKUP_MARKER}: keep the encrypted health database out of iCloud/iTunes backups.
${indent}if let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
${indent}  let sqliteDirectory = documents.appendingPathComponent("SQLite", isDirectory: true)
${indent}  if !FileManager.default.fileExists(atPath: sqliteDirectory.path) {
${indent}    try? FileManager.default.createDirectory(at: sqliteDirectory, withIntermediateDirectories: true)
${indent}  }
${indent}  var resourceValues = URLResourceValues()
${indent}  resourceValues.isExcludedFromBackup = true
${indent}  try? sqliteDirectory.setResourceValues(resourceValues)
${indent}}

`;

  return contents.replace(APP_DELEGATE_ANCHOR, (match, indent) =>
    `${snippet(indent)}${indent}${match.trimStart()}`
  );
}

module.exports = function withIosBackupExclusion(config) {
  return withAppDelegate(config, (configWithAppDelegate) => {
    configWithAppDelegate.modResults.contents = addBackupExclusion(
      configWithAppDelegate.modResults.contents
    );
    return configWithAppDelegate;
  });
};

module.exports.addBackupExclusion = addBackupExclusion;
