# Shared artist search controls

Tracks #1284. The homepage and non-home navigation use the same search/add CSS module styles and light/dark tokens. Desktop uses the pink outlined field and transparent blue outlined add button; narrow screens use the existing joined homepage control. Navigation constrains the pair to available width between the logo and account button.

Search requests, result rendering, login prompts and add dialogs retain their existing implementation. No database, authentication or user-profile redesign changes. Homepage layout and background remain scoped to `.home`; sharing tokens with `.searchRow` does not apply the homepage background to other routes.

Verify homepage, artist and user profile routes at 832px and 390px in both themes; search results, keyboard focus, guest login entry and authenticated add dialog (without submission).
