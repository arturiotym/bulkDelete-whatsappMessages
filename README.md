# WhatsApp Date Range Selector

Select messages in the currently open WhatsApp Web conversation using an inclusive date range. Selection only: no messages are deleted or sent. No dependencies or external requests from the browser script.

Independent project; not affiliated with or endorsed by WhatsApp or Meta.

Paste all of whatsapp-select-date-range.js into the WhatsApp Web console with the intended conversation open. Installing it does not change the conversation. Run:

```javascript
await waSelectRange({
  start: '14/09/2026',
  end: '22/09/2026',
  progressEvery: 1000
});
```

Both endpoint dates are inclusive. Your input always uses DD/MM/YYYY or YYYY-MM-DD, regardless of the UI language. The script only selects messages; you perform all subsequent actions yourself.

## Language and date formats

Controls use inspected icon identifiers (ic-more-vert, ic-check-box, ic-close), not translated menu/button names. The selection count is read from the scoped selection toolbar, with localized digits and grouping separators supported. The script detects the UI language from the HTML lang attribute. Browser Intl supplies localized weekdays, today/yesterday labels, and Gregorian month names.

Visible unambiguous timestamps establish day/month order. A regional locale provides a fallback. If the page reports only a language such as en and all dates are ambiguous, the script stops instead of guessing. Specify the actual UI locale and, if needed, its numeric date order:

```javascript
await waSelectRange({
  start: '2026-09-14',
  end: '2026-09-22',
  locale: 'en-GB',
  dateOrder: 'DMY'
});
```

Use en-US / MDY for month-first UI dates; YMD is also accepted. These options describe WhatsApp's displayed dates, not the input start/end format. Conflicting visible dates cause a stop. Two-digit UI years are interpreted as 2000–2099 and must fall between 2009 and next year. Only Gregorian UI calendars are supported.

If WhatsApp uses a day label differing from your browser's Intl translation, supply an exact override:

```javascript
await waSelectRange({
  start: '2026-09-14', end: '2026-09-22',
  dayLabels: { 'Custom displayed day label': '2026-09-21' }
});
```

## Operation

The script clears an existing selection, enters selection mode, starts at the latest message, scrolls backward and selects matching messages. Voice messages and media inherit dates from day separators. Unrecognized dates/separators cause a stop rather than guessing. Progress prints after every 1,000 selected messages and at completion; internal date/checkbox checks continue as messages load.

Keep the conversation open and avoid interacting with the page during selection. To stop, run waSelectRange.stop(). Inspect waSelectRange.last for the result. Stopping leaves the current partial selection in place. It never clicks Delete or changes media-deletion settings.

Close any open dialogs yourself before running. The script must reach an earlier dated message to establish the start boundary. If older history cannot load, or the requested start predates the entire available conversation, it stops with an incomplete-range error. Automatic scrolling works in any language; the optional explicit loadOlderSelector can target an already-identified history-loading control. No translated loading-banner text is guessed.

If an older version is already installed, reload the page before installing this file. Reloading clears any current selection.

## Validation and limits

202 parser/count assertions passed across pt-BR, en-US, en-GB, es-ES, fr-FR, de-DE, it-IT, ru-RU, uk-UA, tr-TR, ar-EG, hi-IN, ja-JP, zh-CN and ko-KR. Coverage includes numeric/named-month dates, weekdays, relative days, localized digits/counts, ambiguous dates, date-order overrides and calendar rejection.

Simulated controls passed inclusive-endpoint, same-day, voice-date inheritance, existing-selection reset and no-match tests, with zero delete clicks. Control lookup was tested with untranslated placeholder labels. The icon identifiers were inspected on the live Portuguese page. The complete updated script has not been exercised end-to-end on live WhatsApp in these other languages; WhatsApp markup and date translations may differ from Intl. Unsupported formats stop with an error and may require an override or update.

## Development

Node.js 20 or newer is sufficient for the dependency-free tests. Run `npm test` (no installation step required).

## License and commercial use

This project is source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE). The license permits noncommercial purposes and expressly permits certain organizational uses; see the full license for the scope of those permissions.

Commercial use outside those permissions requires a separately agreed paid commercial license before use. Contact **[YOUR_CONTACT_EMAIL]** to discuss terms. No commercial license is granted merely by sending an inquiry or downloading this repository. See [COMMERCIAL.md](COMMERCIAL.md).
