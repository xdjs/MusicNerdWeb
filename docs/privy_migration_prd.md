# PRD: Migration to Privy Authentication (Revised)
**Product:** Music Nerd  
**Document Type:** High-Level PRD

---

## 1. Overview
Music Nerd will replace its wallet-first authentication model (RainbowKit + SIWE) with **Privy’s email/passkey identity system**, shifting all users—including legacy wallet users—to an email-first login experience. Wallets become optional, post-login linkable credentials rather than authentication methods.

---

## 2. Goals
1. Remove all SIWE, RainbowKit, Wagmi, and wallet-based login flows.  
2. Adopt Privy’s email/passkey authentication as the single login method.  
3. Provide a migration path for legacy wallet-only users via an explicit post-login wallet-linking step.  
4. Preserve all Music Nerd permission roles and authorization flags.  
5. Continue using NextAuth as the session boundary with a custom Privy provider.

---

## 3. Non-Goals
- No redefinition of Music Nerd’s role/permissions model.  
- No auto-detecting wallets or performing wallet-based login.  
- No new login methods beyond email/passkey.  
- No surfacing the embedded Privy wallet during onboarding.

---

## 4. High-Level Experience

### 4.1 New Users
New users sign in with email/passkey via Privy.  
After successful login:
- A new Music Nerd account is created.
- The `privy_user_id` is stored.
- A CTA appears offering wallet connection, but new users may safely ignore it.
- User proceeds normally.

---

### 4.2 Returning Email-Based Users
Users with an existing `privy_user_id` in the Music Nerd database:
- Log in with email (Privy)
- NextAuth creates a session using the Privy identity
- The user enters the application normally

No wallet actions required.

---

### 4.3 Legacy Wallet-Only Users
Legacy users cannot be detected at login since wallet-based authentication is removed.  
Every returning user—including legacy wallet-only users—will go through the **same initial Privy email/login flow**.

Immediately after successful Privy login, the system must operate under a single assumption:

> **If a Privy user does not yet map to a Music Nerd account, they *might* be either a new user or a legacy user. We must support both.**

#### 4.3.1 Universal Post-Login CTA
If the logged-in Privy identity does **not** have a corresponding Music Nerd record, show the CTA:

> **“Have an existing Music Nerd wallet-based account?  
> Connect your wallet to link your old account.”**

This CTA appears for:
- New users (can safely ignore)
- Legacy users (must use this to upgrade)

Two user actions are possible:

---

#### A) User Connects Their Wallet (Legacy Recovery Path)
1. Privy opens the wallet-linking flow  
2. User links their external wallet  
3. Music Nerd checks for a legacy record with that wallet address  

**If match found:**
- Legacy Music Nerd record is updated with the `privy_user_id`  
- Any temporary “new” record created for this login is ignored or merged  
- User proceeds with their restored account

**If no match:**
- Treat as a new user attaching a wallet  
- Proceed with the newly created record

---

#### B) User Dismisses the CTA
User proceeds without linking a wallet.

System action:
- A new Music Nerd user record is created with the `privy_user_id`
- User enters the application normally

This may produce the common edge case:
- Legacy user accidentally skips linking → creates a second account

This must be recoverable.

---

### 4.3.2 Account Recovery for Legacy Users Who Skip the CTA
To avoid stranding legacy accounts, the profile page must provide a wallet-linking affordance:

> **“Have an older Music Nerd wallet-based account?  
> Connect your wallet to merge accounts and restore your history.”**

When selected:
1. Privy’s wallet-linking modal opens  
2. User connects their wallet  
3. Music Nerd locates the legacy wallet-based record  
4. System performs an account merge:
   - Legacy record becomes the surviving account  
   - `privy_user_id` is copied to legacy record  
   - The placeholder new record is archived or deleted  
5. User seamlessly transitions into the restored account

This ensures full legacy recovery without requiring detection.

---

## 5. System Architecture
- Privy handles identity and credential linking  
- NextAuth consumes Privy identity tokens  
- Music Nerd database stores canonical user ID and `privy_user_id`  
- Wallets become optional linked credentials, not authenticators  
- All roles and permissions remain Music Nerd–managed

---

## 6. Data Model Updates
- Add `privy_user_id TEXT UNIQUE`  
- Retain `wallet` column for legacy matching and merges  
- Keep role flags: `isAdmin`, `isWhiteListed`, `isHidden`, etc.

---

## 7. Migration Strategy

### Phase 1 – Deploy Privy + Session Integration
- NextAuth updated to validate Privy sessions  
- SIWE endpoints removed

### Phase 2 – CTA-Based Soft Migration
- All new Privy logins with no Music Nerd record see the wallet-link CTA

### Phase 3 – Legacy Linking + Record Merge Workflow
- Users linking wallets post-login map to legacy records  
- Skipped-CTA users can merge accounts later via profile page

### Phase 4 – Fully Sunset Wallet Auth
- All wallet-based login infrastructure removed  
- RainbowKit, Wagmi, SIWE packages eliminated

---

## 8. UX Requirements
- Universal CTA after Privy login if no Music Nerd record exists  
- CTA is dismissible  
- Profile page must include “merge legacy account” affordance  
- Copy should be soft, explanatory, and non-technical  
- Wallet linking is always optional for new users and required for legacy users

---

## 9. Acceptance Criteria
1. All users authenticate via Privy email/passkey  
2. Wallet-based login is fully removed  
3. Legacy users can recover their accounts through CTA or profile-based merge  
4. New users are not blocked or burdened by legacy flows  
5. Wallet linking never functions as a login mechanism  
6. Merging restores full access to legacy data and roles without conflicts

---

## 10. Risks
- Legacy users may skip CTA → mitigated with profile-based merge  
- Incorrect merges → resolved with deterministic merge logic  
- Confusion about having “two accounts” → mitigated by clear messaging  
- No wallet auto-detection → solved by explicit linking interfaces

---
