@AGENTS.md

# Language

Write all code identifiers in English, never Swedish. This includes function names, variable names, type names, component names, file names, and folder names.

User-facing copy, voice prompts, and spoken keyword lists may stay in Swedish, because workshop staff use the app in Swedish.

# Environment

Snapbike is under development and runs against the BikeOffice **staging** environment: Supabase project `cykelnatur-staging` and the backend at https://staging.api.bikeoffice.se (repo `../bikeoffice-sf-be`). It shares login and accounts with BikeOffice. Larger migrations and backend changes are fine here; there is no production data to protect.

# Reuse components

Reuse existing components as far as possible instead of building one-off variants. When the same UI or behaviour is needed in more than one place, make it a shared component and use it everywhere.

Floating dropdowns are one example: every floating dropdown in the app uses `components/OptionDropdown.tsx` (`OptionDropdown` for pick lists, `SuggestInput` for free text with suggestions). Their standard behaviour: arrow up/down moves through the list, Enter picks, Escape closes, arrow left/right still move the caret in the search/filter field, and the browser's own autocomplete is turned off so it never covers the list.
