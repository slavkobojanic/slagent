# Slagent i18n hints

Shows English values from react-i18next JSON resources as inline hints beside statically resolvable `t(...)` calls in JavaScript and TypeScript React files.

## Repository configuration

Check in the settings for your project in `.vscode/settings.json` so everyone opening the repo gets the same resource lookup:

```json
{
  "slagent.i18nHints.locale": "en",
  "slagent.i18nHints.resourcePath": "public/locales/{{lng}}/{{ns}}.json"
}
```

The checked-in workspace setting is the primary source. If it is empty, the extension inspects statically readable i18next initialization config and then tries common JSON locale layouts. An explicitly set user-level Slagent hint setting can override the repository value when necessary.

Other settings:

- `slagent.i18nHints.enabled`: enable/disable hints (default `true`)
- `slagent.i18nHints.defaultNamespace`: explicit default namespace; otherwise use the i18next config or `translation`
- `slagent.i18nHints.namespaces`: fallback namespace list if the i18next config does not declare one

The extension does not execute project config modules. It reads JSON resources only. Translation keys must be string literals or same-file `const` strings; dynamic/imported keys are skipped. Missing keys show `Missing translation`; if no resource file can be found, the hint says `Resource not found`.
