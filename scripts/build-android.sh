#!/usr/bin/env bash
# Build the Android preview APK and attach it to a GitHub Release.
# Requires: npx eas-cli login (run once) and an Expo account.
set -euo pipefail

VERSION="${1:-1.0.0}"
APK_NAME="otwo-${VERSION}.apk"

echo "==> Building Android preview APK (version $VERSION)"
npx eas-cli build -p android --profile preview --non-interactive

echo "==> Download the latest build artifact from EAS dashboard or via:"
echo "    npx eas-cli build:list --platform android --limit 1"
echo "    (download the APK to ./$APK_NAME)"
echo
echo "==> Creating GitHub Release v$VERSION"
gh release create "v$VERSION" "./$APK_NAME" \
  --title "OTwo $VERSION" \
  --notes "Android preview APK (sideload). Enable 'install unknown apps' to install.

Live web app: https://samdanisayam.github.io/OTwo/
Source: https://github.com/SamdaniSayam/OTwo"

echo "Done. Release: https://github.com/SamdaniSayam/OTwo/releases/tag/v$VERSION"
