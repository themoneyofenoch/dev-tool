# App Icon Templates

Drop any of these SVGs into `publisher.html` → ICONS tab to generate all sizes.

---

## GeezEasy — Adey Abeba Flower

**File:** `geezeasy-adey-abeba.svg`

Ethiopian Meskel daisy (Adey Abeba) with 🇪🇹🇪🇷 flag colors. ግዕዝ in white bold at center, GeezEasy in gradient below.

**Colors:** Green (#078930), Yellow (#FFDE00), Red (#DA121A), Blue (#005BBB)

**To customize:**
- Change petal colors → edit `<linearGradient>` blocks (green, yellow, red, blue)
- Change center text → edit `<text>` with `ግዕዝ`
- Change bottom text → edit `<text>` with `GeezEasy`
- Adjust petal size → modify `d` attribute in `<path id="petal">`
- More/less petals → add/remove `<use href="#petal" transform="rotate(X)">` lines (increment by 360÷N)

---

## Kalkidan — Heart Logo

**File:** `kalkidan-heart.svg`
**File:** `kalkidan-seal.svg`

Habesha dating app icon. White heart on pink→orange gradient with Vogue-style "KALKIDAN" text and heart tittle above the "I".

**Colors:** Pink→Orange gradient (#FF416C → #FF6B4A → #FF9A3C), White (#ffffff)

---

## Pixwee — Photo App Icon

**File:** `pixwee-icon.svg`

---

## How to Add New Templates

1. Create a new `.svg` file in this folder
2. Add an entry to `TEMPLATES` in `publisher.html`:

```javascript
'AppName': `<svg>...</svg>`
```

3. The template auto-loads when the app is selected from the dropdown
