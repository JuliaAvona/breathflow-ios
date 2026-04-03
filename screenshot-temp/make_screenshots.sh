#!/bin/zsh
#
# BreathFlow — Automated App Store Screenshot Generator
#
# IMPORTANT: Metro dev server must be running (npx expo start)
#            and app must be open in simulator before running this.
#
# Usage:
#   ./screenshot-temp/make_screenshots.sh ru
#   ./screenshot-temp/make_screenshots.sh en ru
#   ./screenshot-temp/make_screenshots.sh all
#

set -e

SCRIPT_DIR="${0:A:h}"
DEVICE="EA6CC76A-E73E-4CE1-9302-FAA2539B342D"
BUNDLE_ID="com.izbrodin90.breathflow"
RAW_DIR="$SCRIPT_DIR/raw"
FRAMED_DIR="$SCRIPT_DIR/framed"
SCREEN_WAIT=4

# ── Screens ─────────────────────────────────────────────────────────
SCREENS=(
  "1|breathflow://(tabs)?category=all|0"
  "2|breathflow://technique-detail?techniqueId=fourSevenEight|0"
  "3|breathflow://session?techniqueId=box|3"
  "4|breathflow://technique-detail?techniqueId=box|0"
  "5|breathflow://(tabs)/badges|0"
)

ALL_LANGS=(en ru es de fr it ja ko pt-BR zh-Hans tr uk)

# ── Locale mapping ──────────────────────────────────────────────────
get_locale() {
  case "$1" in
    en) echo "en|US" ;; ru) echo "ru|RU" ;; es) echo "es|ES" ;;
    de) echo "de|DE" ;; fr) echo "fr|FR" ;; it) echo "it|IT" ;;
    ja) echo "ja|JP" ;; ko) echo "ko|KR" ;; pt-BR) echo "pt|BR" ;;
    zh-Hans) echo "zh-Hans|CN" ;; tr) echo "tr|TR" ;; uk) echo "uk|UA" ;;
    nl) echo "nl|NL" ;; pl) echo "pl|PL" ;; ro) echo "ro|RO" ;;
    th) echo "th|TH" ;; hi) echo "hi|IN" ;; da) echo "da|DK" ;;
    no) echo "nb|NO" ;; fi) echo "fi|FI" ;; cs) echo "cs|CZ" ;;
    hu) echo "hu|HU" ;; ar) echo "ar|SA" ;; he) echo "he|IL" ;;
    sv) echo "sv|SE" ;; sk) echo "sk|SK" ;; hr) echo "hr|HR" ;;
    sl) echo "sl|SI" ;; el) echo "el|GR" ;; vi) echo "vi|VN" ;;
    id) echo "id|ID" ;; ms) echo "ms|MY" ;; ca) echo "ca|ES" ;;
    bn) echo "bn|IN" ;; ta) echo "ta|IN" ;; te) echo "te|IN" ;; ur) echo "ur|PK" ;;
    zh-Hant) echo "zh-Hant|TW" ;; gu) echo "gu|IN" ;; kn) echo "kn|IN" ;;
    ml) echo "ml|IN" ;; mr) echo "mr|IN" ;; od) echo "or|IN" ;; pa) echo "pa|IN" ;;
    *) echo "" ;;
  esac
}

# ── Headlines (filter|keyword|title) ────────────────────────────────
get_headlines() {
  case "$1" in
    en) cat << 'EOF'
1|BREATHE|BETTER. FEEL BETTER.
2|SLEEP|IN MINUTES
3|RELAX|ANYWHERE, ANYTIME
4|FOCUS|LIKE NAVY SEALS
5|TRACK|YOUR PROGRESS
EOF
    ;; ru) cat << 'EOF'
1|ДЫШИ|ЛУЧШЕ. ЧУВСТВУЙ СЕБЯ.
2|ЗАСНИ|ЗА НЕСКОЛЬКО МИНУТ
3|ОТДОХНИ|ГДЕ УГОДНО, КОГДА УГОДНО
4|ФОКУС|КАК NAVY SEALS
5|СЛЕДИ|ЗА СВОИМ ПРОГРЕССОМ
EOF
    ;; es) cat << 'EOF'
1|RESPIRA|MEJOR. SIÉNTETE BIEN.
2|DUERME|EN POCOS MINUTOS
3|RELAJA|DONDE SEA, CUANDO SEA
4|ENFOCA|COMO LOS NAVY SEALS
5|SIGUE|TU PROGRESO
EOF
    ;; de) cat << 'EOF'
1|ATME|BESSER. FÜHL DICH GUT.
2|SCHLAF|IN WENIGEN MINUTEN
3|ENTSPA|ÜBERALL & JEDERZEIT
4|FOKUS|WIE DIE NAVY SEALS
5|VERFO|DEINEN FORTSCHRITT
EOF
    ;; fr) cat << 'EOF'
1|RESPIRE|MIEUX. SENTEZ-VOUS BIEN.
2|DORMEZ|EN QUELQUES MINUTES
3|RELAXE|N'IMPORTE OÙ, QUAND
4|FOCALI|COMME LES NAVY SEALS
5|SUIVEZ|VOS PROGRÈS
EOF
    ;; it) cat << 'EOF'
1|RESPIRA|MEGLIO. STAI MEGLIO.
2|DORMI|IN POCHI MINUTI
3|RILASSA|OVUNQUE, SEMPRE
4|FOCALIZ|COME I NAVY SEALS
5|SEGUI|I TUOI PROGRESSI
EOF
    ;; ja) cat << 'EOF'
1|呼吸する|もっと良く。気分も良く。
2|眠る|数分で
3|リラックス|いつでもどこでも
4|集中する|NAVY SEALSのように
5|記録する|あなたの進捗
EOF
    ;; ko) cat << 'EOF'
1|호흡하세요|더 나은 기분을 느끼세요
2|잠드세요|몇 분 만에
3|쉬세요|언제 어디서나
4|집중하세요|NAVY SEALS처럼
5|기록하세요|당신의 진행 상황
EOF
    ;; pt-BR) cat << 'EOF'
1|RESPIRE|MELHOR. SINTA-SE BEM.
2|DURMA|EM POUCOS MINUTOS
3|RELAXE|EM QUALQUER LUGAR
4|FOQUE|COMO OS NAVY SEALS
5|ACOMPA|SEU PROGRESSO
EOF
    ;; zh-Hans) cat << 'EOF'
1|呼吸|更好地感受自己
2|入睡|几分钟内
3|放松|随时随地
4|专注|像海豹突击队一样
5|追踪|你的进步
EOF
    ;; tr) cat << 'EOF'
1|NEFES|DAHA İYİ HİSSET.
2|UYU|BİRKAÇ DAKİKADA
3|RAHATL|HER YERDE, HER ZAMAN
4|ODAKLA|NAVY SEALS GİBİ
5|TAKİP|İLERLEMENİZİ
EOF
    ;; uk) cat << 'EOF'
1|ДИХАЙ|КРАЩЕ. ВІДЧУЙ СЕБЕ.
2|ЗАСНИ|ЗА КІЛЬКА ХВИЛИН
3|ВІДПОЧ|БУДЬ-ДЕ, БУДЬ-КОЛИ
4|ФОКУС|ЯК NAVY SEALS
5|СТЕЖ|ЗА СВОЇМ ПРОГРЕСОМ
EOF
    ;; *) echo "" ;;
  esac
}

# ── Functions ───────────────────────────────────────────────────────

set_language() {
  xcrun simctl spawn "$DEVICE" defaults write NSGlobalDomain AppleLanguages -array "$1"
  xcrun simctl spawn "$DEVICE" defaults write NSGlobalDomain AppleLocale -string "${1}_${2}"
}

capture_screen() {
  local deeplink="$1" output="$2" extra_wait="$3"
  xcrun simctl openurl "$DEVICE" "$deeplink"
  sleep "$SCREEN_WAIT"
  [[ "$extra_wait" -gt 0 ]] && sleep "$extra_wait"
  xcrun simctl io "$DEVICE" screenshot "$output" 2>/dev/null
}

generate_framefile() {
  local lang="$1" dir="$2"
  local headlines=$(get_headlines "$lang")
  [[ -z "$headlines" ]] && return 1

  [[ ! -f "$dir/font.otf" ]] && cp "/Library/Fonts/SF-Pro-Display-Black.otf" "$dir/font.otf"
  [[ ! -f "$dir/background.png" ]] && python3 -c "from PIL import Image; Image.new('RGB', (3000,6000), (29,58,94)).save('$dir/background.png')"

  # Use Python to generate Framefile with smart font sizing
  python3 << PYEOF
from PIL import ImageFont
import json

FONT_PATH = "$dir/font.otf"
CANVAS_W = 1290
PADDING = 30
MAX_TEXT_W = CANVAS_W - PADDING * 2  # available width for text

headlines_raw = """$headlines"""

# Spacer to force keyword onto its own line
SPACER = "                                                            "

data = []
for line in headlines_raw.strip().split("\n"):
    parts = line.split("|")
    if len(parts) < 3:
        continue
    filt, keyword, title = parts[0], parts[1], parts[2]

    # Measure keyword width to pick font size
    # Short keywords (<=5 chars) get bigger font, long ones get smaller
    char_count = len(keyword)
    if char_count <= 3:
        kw_size = 100
    elif char_count <= 5:
        kw_size = 90
    elif char_count <= 7:
        kw_size = 80
    else:
        kw_size = 68

    # Verify it fits
    try:
        font = ImageFont.truetype(FONT_PATH, kw_size)
        bbox = font.getbbox(keyword)
        w = bbox[2] - bbox[0]
        while w > MAX_TEXT_W and kw_size > 40:
            kw_size -= 4
            font = ImageFont.truetype(FONT_PATH, kw_size)
            bbox = font.getbbox(keyword)
            w = bbox[2] - bbox[0]
    except:
        pass

    # Title size proportional
    title_size = max(int(kw_size * 0.5), 32)

    data.append({
        "filter": filt,
        "keyword": {"text": keyword + SPACER},
        "title": {"text": title},
        "keyword_font_size": kw_size,
        "title_font_size": title_size
    })

# All screenshots use same font sizes (use the smallest needed to be consistent)
min_kw = min(d["keyword_font_size"] for d in data)
min_title = min(d["title_font_size"] for d in data)

framefile = {
    "device_frame_version": "latest",
    "default": {
        "keyword": {"font": "./font.otf", "color": "#FFFFFF", "font_size": min_kw},
        "title": {"font": "./font.otf", "color": "#FFFFFF", "font_size": min_title},
        "background": "./background.png",
        "padding": PADDING,
        "show_complete_frame": False,
        "title_below_image": False
    },
    "data": [
        {"filter": d["filter"], "keyword": {"text": d["keyword"]["text"]}, "title": {"text": d["title"]["text"]}}
        for d in data
    ]
}

with open("$dir/Framefile.json", "w") as f:
    json.dump(framefile, f, indent=2, ensure_ascii=False)

print(f"  Framefile: keyword={min_kw}pt, title={min_title}pt")
PYEOF
}

# ── Checks ──────────────────────────────────────────────────────────
if ! lsof -i :8081 > /dev/null 2>&1; then
  echo "❌ Metro not running! Start: npx expo start"
  exit 1
fi
if ! xcrun simctl list devices | grep "$DEVICE" | grep -q "Booted"; then
  echo "❌ Simulator not booted!"
  exit 1
fi
echo "✅ Metro running, simulator booted"

# ── Main ────────────────────────────────────────────────────────────
if [[ "$1" == "all" ]]; then
  LANGS=("${ALL_LANGS[@]}")
else
  LANGS=("${@:-en}")
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  BreathFlow Screenshot Generator         ║"
echo "║  Languages: ${LANGS[*]}"
echo "╚══════════════════════════════════════════╝"
echo ""

for LANG in "${LANGS[@]}"; do
  echo "━━━ $LANG ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  LOCALE_INFO=$(get_locale "$LANG")
  [[ -z "$LOCALE_INFO" ]] && { echo "  ⚠ Unknown: $LANG"; continue; }

  IFS='|' read -r LANG_CODE REGION <<< "$LOCALE_INFO"
  LANG_RAW="$RAW_DIR/$LANG"
  LANG_FRAMED="$FRAMED_DIR/$LANG"
  mkdir -p "$LANG_RAW" "$LANG_FRAMED"

  echo "  [1/3] Language → $LANG_CODE-$REGION"
  set_language "$LANG_CODE" "$REGION"
  xcrun simctl terminate "$DEVICE" "$BUNDLE_ID" 2>/dev/null || true
  sleep 2
  xcrun simctl launch "$DEVICE" "$BUNDLE_ID"
  sleep 6
  echo "    App restarted"

  echo "  [2/3] Capturing..."
  for SCREEN in "${SCREENS[@]}"; do
    IFS='|' read -r FNAME DEEPLINK EXTRA_WAIT <<< "$SCREEN"
    capture_screen "$DEEPLINK" "$LANG_RAW/$FNAME.png" "$EXTRA_WAIT"
    echo "    ✓ $FNAME.png"
  done

  echo "  [3/3] Framing..."
  for f in "$LANG_RAW"/*.png; do
    [[ "$(basename $f)" == "background.png" || "$(basename $f)" == *_framed* ]] && continue
    sips -z 2796 1290 "$f" > /dev/null 2>&1
  done

  # Use pre-generated Framefile.json (don't overwrite)
  if [[ ! -f "$LANG_RAW/Framefile.json" ]]; then
    echo "  ⚠ No Framefile.json for $LANG, skipping framing"
    continue
  fi
  (cd "$LANG_RAW" && LC_ALL=en_US.UTF-8 fastlane frameit silver 2>&1 | grep -E "Added frame|error|Error" || true)

  for f in "$LANG_RAW"/*_framed.png; do
    [[ -f "$f" ]] && mv "$f" "$LANG_FRAMED/$(basename "${f/_framed/}")"
  done

  echo "  ✓ $LANG → $LANG_FRAMED/"
  echo ""
done

echo "Restoring English..."
set_language "en" "US"
xcrun simctl terminate "$DEVICE" "$BUNDLE_ID" 2>/dev/null || true
sleep 1
xcrun simctl launch "$DEVICE" "$BUNDLE_ID"

echo ""
echo "✅ Done! Screenshots in: $FRAMED_DIR/"
ls -d "$FRAMED_DIR"/*/
