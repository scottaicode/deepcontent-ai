# Translation Guidelines for DeepContent

## Structure & Naming Conventions

### 1. Translation Key Structure
- Use dot notation for nested structures (e.g., `websiteAnalysis.title`)
- Group related translations under a common parent key
- Keep the same structure between different language files

### 2. Naming Conventions
- Use camelCase for keys
- For similar concepts across components, use consistent naming:
  - ✅ Always use `titlePlaceholder`, `urlPlaceholder` (not `placeholderUrl`)
  - ✅ Always use `analyze` (not `analyzeButton`)
  - ✅ Always use `description` (not `info` or `details`)

### 3. Avoid Duplication
- Never create duplicate translation keys
- Each translation should live in exactly one place
- Use the same component key structure across the app

## Implementation Rules

### 1. Translation Access
- Always use the `useTranslation()` hook from '@/lib/hooks/useTranslation'
- Never mix translation systems - do not use `useLanguage()` directly

### 2. Component Implementation
- Use a single consistent approach for accessing translations
- Provide meaningful defaults for all translations
- For components with many translations, create a helper function:

```typescript
// Good example from WebsiteAnalysis.tsx
const getComponentText = (key: string, defaultValue: string, replacements?: Record<string, string>) => {
  const fullKey = `websiteAnalysis.${key}`;
  if (replacements) {
    return t(fullKey, { defaultValue, ...replacements });
  } else {
    return t(fullKey, { defaultValue });
  }
};
```

### 3. Test Both Languages
- Always verify that both language versions display correctly after changes
- Check all translations in context in the application

## Adding New Translations

1. First add the key to `en.json` with appropriate English text
2. Then add the same exact key to `es.json` with Spanish translation
3. Verify both versions in the application
4. Never modify key structure without updating all locations that use that key

## Troubleshooting

If you encounter translation issues:
1. Check the locale files for duplicate keys
2. Ensure component is using the correct translation key path
3. Verify the translation hook is properly imported
4. Check for direct string literals that should be translated

Remember: The structure of `en.json` and `es.json` must be identical! 