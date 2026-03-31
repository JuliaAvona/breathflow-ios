# App Store Screenshot Banner Guide

## The $70k/month Formula

Three rules that convert:
1. **Strong contrast** — bright solid background + white text
2. **Verb-first headlines** — action word is the biggest element
3. **Large, readable typography** — headline visible from thumbnail

---

## Structure (top to bottom)

```
┌─────────────────────┐
│   [badges/pills]    │  <- optional: "10 Techniques", "Free"
│                     │
│      VERB           │  <- 150-180px, 900 weight, UPPERCASE
│   second line       │  <- 80-100px, 700 weight
│                     │
│   subtitle text     │  <- 44-52px, 500 weight, 70% opacity
│                     │
│  ┌───────────────┐  │
│  │  📱 Screenshot │  │  <- phone with 3D perspective
│  │               │  │     border-radius: 56px
│  │  🧘    ✨     │  │  <- floating elements around phone
│  │       💤      │  │     different sizes, rotated
│  └───────────────┘  │
└─────────────────────┘
```

---

## Color Palettes (one per banner)

| Theme | Gradient | Use for |
|-------|----------|---------|
| Blue | `#4A90D9 → #1a3a6c` | Main/hero, focus, breathing |
| Green | `#7BC4A8 → #2d6a5a` | Calm, relax, nature |
| Purple | `#7B68AE → #3a2d6a` | Sleep, night, meditation |
| Orange | `#F5A623 → #c47a10` | Energy, motivation, streaks |
| Red | `#E85D4A → #8b2a1a` | Urgency, anxiety relief |

---

## Typography

```css
.verb {
  font-size: 180px;
  font-weight: 900;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: -4px;
  line-height: 0.9;
}
.noun {
  font-size: 100px;
  font-weight: 700;
  color: rgba(255,255,255,0.85);
  text-transform: uppercase;
}
.subtitle {
  font-size: 48px;
  font-weight: 500;
  color: rgba(255,255,255,0.7);
  line-height: 1.4;
}
```

---

## Headline Formulas

### Pattern: VERB + Benefit

| Banner | Verb | Second line | Subtitle |
|--------|------|-------------|----------|
| 1 | BREATHE | Better. Feel Better. | 10 science-backed techniques |
| 2 | RELAX | In 5 Minutes | Guided sessions with music |
| 3 | SLEEP | Like a Baby | The 4-7-8 technique |
| 4 | TRACK | Your Progress | Streaks, stats & motivation |
| 5 | FOCUS | On Demand | Box Breathing by Navy SEALs |

### More verb-first headlines:
- **REDUCE** Anxiety Fast
- **UNLOCK** Inner Calm
- **MASTER** Your Breath
- **TRANSFORM** Stress to Calm
- **DISCOVER** 10 Techniques
- **BUILD** A Daily Habit
- **CONQUER** Insomnia

---

## Phone Mockup

```css
.phone-container {
  /* Subtle 3D tilt — makes it feel premium */
  transform: perspective(1200px) rotateY(-4deg) rotateX(2deg);
}
.screenshot-frame {
  width: 860px;          /* ~67% of banner width */
  border-radius: 56px;   /* iPhone corners */
  overflow: hidden;
  box-shadow:
    0 60px 140px rgba(0,0,0,0.45),   /* deep shadow */
    0 0 0 4px rgba(255,255,255,0.1);  /* subtle border */
}
```

Alternate tilt per banner:
- Banner 1: `rotateY(-4deg)` (tilt right)
- Banner 2: `rotateY(4deg)` (tilt left)
- Banner 3: `rotateY(-3deg)` (slight tilt)

---

## Floating Elements

### Emoji approach (quick)
```css
.float-emoji {
  position: absolute;
  filter: drop-shadow(0 12px 30px rgba(0,0,0,0.4));
}
/* Vary size, position, rotation for each */
.e1 { font-size: 180px; top: -80px; left: -100px; transform: rotate(-15deg); }
.e2 { font-size: 120px; top: 60px; right: -80px; transform: rotate(12deg); }
```

### Rules for floating elements:
- **6-8 elements** per banner
- **3 size tiers**: large (150-190px), medium (100-130px), small (80-100px)
- **Partially off-screen** — elements should bleed off edges
- **Different rotation** per element (-25deg to +30deg)
- **Drop shadow** on all elements
- **Theme-relevant** emojis only

### Emoji sets by theme:

| Theme | Emojis |
|-------|--------|
| Breathe/Calm | 🧘 ✨ 🌿 💫 🍃 💤 🌟 🫧 |
| Relax/Music | 🎵 🌊 🎶 🌸 💫 ⏱️ 🫧 |
| Sleep/Night | 🌙 💤 ⭐ ✨ 🌟 ☁️ 🫧 💫 |
| Focus/Energy | ⚡ 🎯 🧠 💪 🔥 ✨ 💫 |
| Progress | 🔥 📈 🏆 ⭐ 💪 ✨ 🎯 |

### PNG sticker approach (premium)
Download from pngegg.com / cleanpng.com:
```css
.sticker {
  position: absolute;
  filter: drop-shadow(0 16px 40px rgba(0,0,0,0.35));
}
.sticker img {
  width: 100%; height: 100%; object-fit: contain;
}
```

---

## Background Decorations

Subtle transparent circles add depth:

```css
.deco1 {
  position: absolute;
  top: -100px; right: -100px;
  width: 500px; height: 500px;
  border-radius: 250px;
  background: rgba(255,255,255,0.06);
}
.deco2 {
  position: absolute;
  bottom: 200px; left: -150px;
  width: 400px; height: 400px;
  border-radius: 200px;
  background: rgba(255,255,255,0.04);
}
```

---

## Optional Elements

### Badge pills (top)
```html
<div class="badge-row">
  <div class="badge">🧘 10 Techniques</div>
  <div class="badge">🎵 Calm Music</div>
</div>
```
```css
.badge {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 40px;
  padding: 16px 36px;
  font-size: 36px; font-weight: 600; color: #fff;
}
```

### Star rating + review
```html
<div class="stars">⭐⭐⭐⭐⭐</div>
<div class="review">
  <div class="review-text">"Quote from user..."</div>
  <div class="review-author">— Name</div>
</div>
```

### Stats grid
```html
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value green">10</div>
    <div class="stat-label">Techniques</div>
  </div>
  ...
</div>
```

---

## Sizes

| Device | Size (px) | Required |
|--------|-----------|----------|
| iPhone 15 Pro Max | 1290 x 2796 | Yes |
| iPhone 8 Plus | 1242 x 2208 | Yes |
| iPad Pro 12.9" | 2048 x 2732 | If iPad app |

---

## Export to PNG

Open HTML in Chrome, then:
1. DevTools (F12) → Device toolbar → set to 1290x2796
2. Cmd+Shift+P → "Capture full size screenshot"

Or use CLI:
```bash
# Using Playwright
npx playwright screenshot banner1.html banner1.png --viewport-size=1290,2796

# Using Chrome headless
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --screenshot=banner1.png \
  --window-size=1290,2796 \
  --force-device-scale-factor=1 \
  banner1.html
```

---

## Prompt for AI Generation

```
Create an App Store screenshot banner (1290x2796px) as HTML/CSS.

App: [APP NAME] — [one-line description]
Theme color: [hex gradient]
Headline: [VERB] + [second line]
Subtitle: [description]
Screenshot: [what screen to show]
Floating elements: [emoji list]

Style: strong contrast, verb-first headline (180px uppercase),
phone mockup with 3D perspective tilt, floating emoji elements
around phone (6-8, varied sizes 90-190px, rotated, with drop shadows),
gradient background with subtle decorative circles.
```
