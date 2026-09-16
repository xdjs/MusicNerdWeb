import { rememberLoginTrigger } from "@/lib/analytics/rememberLoginTrigger";
import type { LoginTrigger } from "@/lib/analytics/events";

/**
 * Opens the Privy login from anywhere on the page by clicking the nav button, and
 * remembers which surface asked. Returns false when the nav button is not rendered.
 */
export function requestLogin(trigger: LoginTrigger): boolean {
    const button = document.getElementById("login-btn");
    if (!(button instanceof HTMLElement)) return false;
    rememberLoginTrigger(trigger);
    button.click();
    return true;
}
