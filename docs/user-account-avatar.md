# User account avatar

Issue #1309: the signed-in account menu uses the saved user photo, never the claimed artist's photo. It shares the account-scoped `profile-photo` query with profile editing, so successful uploads update both views immediately. Missing photos, request failures and broken images use the existing default avatar. Changing accounts selects a different cache key; sign-out unmounts the avatar. The menu keeps its accessible label and open state, including the profile page's close icon.

The photo fills the circular menu button edge to edge inside its thin border; it is not inset in a second, smaller circle.
