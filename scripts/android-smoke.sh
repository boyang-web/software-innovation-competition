#!/usr/bin/env bash
set -euo pipefail
adb logcat -c
if gradle -p android connectedDebugAndroidTest --no-daemon; then
  echo 'Installed WebView test passed'
else
  adb logcat -d > test-results/android-logcat.txt || true
  adb shell dumpsys activity lastanr > test-results/android-last-anr.txt || true
  tail -n 160 test-results/android-logcat.txt || true
  cat test-results/android-last-anr.txt || true
  exit 1
fi
