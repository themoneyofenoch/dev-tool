# Adding a New App to the Publisher

Open `publisher copy.html` and edit 3 places + create 1 file.

---

## 1. Dropdown (line ~127)

Find `<select id="appSelect">` and add:

```html
<option value="appname">AppName</option>
```

## 2. Package IDs (line ~360)

Find `const appPackages={...}` and add:

```js
'appname':{ios:'com.appname.app',android:'com.appname.app'},
```

## 3. SVG Template (line ~778)

Find `const TEMPLATES={...}` and add:

```js
'AppName':`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">...</svg>`,
```

SVG must be: 1024×1024, rounded background (`rx="224"`), no external fonts.

## 4. Store JSON

Create `{appname}-store.json` in the project root:

```json
{
  "app": "appname",
  "title": "AppName — Tagline",
  "bundleId": "com.appname.app",
  "packageName": "com.appname.app",
  "projectFolder": "appname",
  "privacyUrl": "https://appname.app/privacy",
  "supportUrl": "https://appname.app/support",
  "liveMetadata": {
    "description": "...",
    "keywords": "word1,word2,...",
    "promotionalText": "One punchy sentence."
  }
}
```

---

## Quick checklist

- [ ] Dropdown option added
- [ ] Package IDs added  
- [ ] SVG template added
- [ ] `{app}-store.json` created

That's it. Open publisher → select app → Load Template (auto) → Load from Project → push.
