#!/bin/bash
#
# Automated App Store screenshot generator
# Takes 5 screenshots per language, switching simulator locale between runs.
#
# Usage:
#   ./screenshot_locales.sh                  # All languages
#   ./screenshot_locales.sh en es fr         # Specific languages only
#
# Prerequisites:
#   - Simulator with the app installed
#   - App built and running on simulator
#

set -e

# ── Config ──────────────────────────────────────────────────────────
DEVICE="EA6CC76A-E73E-4CE1-9302-FAA2539B342D"  # iPhone 17
BUNDLE_ID="com.izbrodin90.breathflow"
SCHEME="breathflow"
OUT_DIR="screenshots/locales-screens"

# Screens to capture: (filename  deep_link  wait_seconds)
SCREENS=(
  "1:breathflow://(tabs):3"
  "2:breathflow://technique-detail?id=relaxing_478:3"
  "3:breathflow://session?id=box_breathing:5"
  "4:breathflow://technique-detail?id=box_breathing:3"
  "5:breathflow://(tabs)/badges:3"
)

# Languages: (code  locale  region)
# Add/remove as needed — must match iOS locale identifiers
declare -A LANGUAGES
LANGUAGES=(
  [en]="en US"
  [es]="es ES"
  [ar]="ar SA"
  [de]="de DE"
  [fr]="fr FR"
  [it]="it IT"
  [pt-BR]="pt BR"
  [pt-PT]="pt PT"
  [ja]="ja JP"
  [ko]="ko KR"
  [zh-Hans]="zh-Hans CN"
  [zh-Hant]="zh-Hant TW"
  [ru]="ru RU"
  [uk]="uk UA"
  [tr]="tr TR"
  [pl]="pl PL"
  [nl]="nl NL"
  [sv]="sv SE"
  [da]="da DK"
  [no]="nb NO"
  [fi]="fi FI"
  [cs]="cs CZ"
  [sk]="sk SK"
  [hu]="hu HU"
  [ro]="ro RO"
  [hr]="hr HR"
  [sl]="sl SI"
  [el]="el GR"
  [he]="he IL"
  [th]="th TH"
  [vi]="vi VN"
  [id]="id ID"
  [ms]="ms MY"
  [hi]="hi IN"
  [ca]="ca ES"
)

# ── Functions ───────────────────────────────────────────────────────

set_language() {
  local lang="$1"
  local region="$2"
  echo "  Setting language: $lang, region: $region"
  xcrun simctl spawn "$DEVICE" defaults write NSGlobalDomain AppleLanguages -array "$lang"
  xcrun simctl spawn "$DEVICE" defaults write NSGlobalDomain AppleLocale -string "${lang}_${region}"
}

restart_app() {
  echo "  Restarting app..."
  xcrun simctl terminate "$DEVICE" "$BUNDLE_ID" 2>/dev/null || true
  sleep 1
  xcrun simctl launch "$DEVICE" "$BUNDLE_ID"
  sleep 3  # wait for app to fully load
}

take_screenshot() {
  local output_path="$1"
  xcrun simctl io "$DEVICE" screenshot "$output_path" 2>/dev/null
  echo "  ✓ $(basename "$output_path")"
}

navigate_and_capture() {
  local filename="$1"
  local deeplink="$2"
  local wait="$3"
  local output="$4"

  # Navigate via deep link
  xcrun simctl openurl "$DEVICE" "$deeplink"
  sleep "$wait"
  take_screenshot "$output"
}

# ── Main ────────────────────────────────────────────────────────────

# Filter languages if args provided
if [ $# -gt 0 ]; then
  SELECTED=("$@")
else
  SELECTED=("${!LANGUAGES[@]}")
fi

# Ensure simulator is booted
STATE=$(xcrun simctl list devices | grep "$DEVICE" | grep -o "(Booted)\|(Shutdown)")
if [ "$STATE" = "(Shutdown)" ]; then
  echo "Booting simulator..."
  xcrun simctl boot "$DEVICE"
  open -a Simulator
  sleep 5
fi

echo "Starting screenshot capture for ${#SELECTED[@]} languages..."
echo ""

for LANG_CODE in "${SELECTED[@]}"; do
  if [ -z "${LANGUAGES[$LANG_CODE]}" ]; then
    echo "⚠ Unknown language: $LANG_CODE, skipping"
    continue
  fi

  read -r LANG REGION <<< "${LANGUAGES[$LANG_CODE]}"
  LANG_DIR="$OUT_DIR/$LANG_CODE"
  mkdir -p "$LANG_DIR"

  echo "[$LANG_CODE] ($LANG-$REGION)"

  # Set language and restart
  set_language "$LANG" "$REGION"
  restart_app

  # Capture each screen
  for SCREEN in "${SCREENS[@]}"; do
    IFS=':' read -r FNAME DEEPLINK WAIT <<< "$SCREEN"
    navigate_and_capture "$FNAME" "$DEEPLINK" "$WAIT" "$LANG_DIR/$FNAME.png"
  done

  echo ""
done

# Restore English
echo "Restoring English..."
set_language "en" "US"
restart_app

echo ""
echo "Done! Screenshots saved to $OUT_DIR/"
echo "Folders: $(ls "$OUT_DIR" | tr '\n' ' ')"
