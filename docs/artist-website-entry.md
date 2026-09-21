# Artist website entry

Issue #1306: user-entered public domains may omit the scheme. Wizard profile/Lore entry and the profile source editor add `https://` before validation, fetching and persistence, and display the normalized URL. Explicit HTTP(S), path, query and fragment are preserved. Invalid syntax and unsupported schemes remain invalid; normalization never grants ownership or bypasses server unsafe-address checks. Existing fetch and source-review behavior remains in place.
