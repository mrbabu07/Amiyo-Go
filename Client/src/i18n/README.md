# Multi-Language System (i18n)

This application supports multiple languages using react-i18next.

## Supported Languages

- **English (en)** - Default language
- **বাংলা (bn)** - Bengali/Bangla
- **हिन्दी (hi)** - Hindi

## Features

- **Automatic Language Detection**: Detects browser language on first visit
- **Persistent Language Selection**: Saves user's language preference in localStorage
- **Dynamic Language Switching**: Switch languages without page reload
- **Professional UI**: Modern language switcher with flags and smooth animations

## Usage

### In Components

```jsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("navbar.home")}</h1>
      <p>{t("common.loading")}</p>
    </div>
  );
}
```

### Language Switcher

The `LanguageSwitcher` component is already integrated into the navbar and provides:

- Flag icons for each language
- Current language indicator
- Dropdown menu with smooth animations
- Mobile-responsive design

## Adding New Translations

1. Add new keys to all language files in `src/i18n/locales/`
2. Use the translation keys in your components with `t('key.path')`

## File Structure

```
src/i18n/
├── i18n.js              # i18n configuration
├── locales/
│   ├── en.json          # English translations
│   ├── bn.json          # Bengali translations
│   └── hi.json          # Hindi translations
└── README.md            # This file
```

## Language Codes

- `en` - English
- `bn` - Bengali/Bangla
- `hi` - Hindi

The language preference is automatically saved and restored on subsequent visits.
