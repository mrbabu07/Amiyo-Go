# Dual-Language Workflow

The client supports two marketplace languages:

- English (`en`)
- Bangla (`bn`)

## How Selection Works

1. Guests use the language saved in `localStorage` under `amiyo_go_language`.
2. Logged-in users load `account.appPreferences.language` from the backend.
3. When a logged-in user changes language, the choice is saved back to account preferences.
4. `document.documentElement.lang` and `data-language` are updated on every language change.

## Files

```text
src/i18n/i18n.js              # i18next setup
src/i18n/languages.js         # supported language config
src/i18n/locales/en.json      # English copy
src/i18n/locales/bn.json      # Bangla copy
src/components/LanguagePreferenceSync.jsx
```

## Component Usage

```jsx
import { useTranslation } from "react-i18next";

function Example() {
  const { t } = useTranslation();
  return <h1>{t("navbar.home")}</h1>;
}
```

When adding UI text, add the same key to both locale files. Use the second argument to `t()` only as a temporary fallback while wiring a new screen.
