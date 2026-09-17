# Interview save for later (#1295)

The existing interview still uses offered rows to resume a sitting, fixed sitting/offered_at boundaries, new-material gating, source recovery and the research-in-flight guard. Save for later and invitation Not now record offered questions, never skipped answers. Returning owners get a Continue interview card; resumed interviews do not auto-open after the tour.

Draft text is private browser-local storage scoped to authenticated account, artist and question. It is not a published answer and does not sync between devices. Send retains the existing answer/refresh behavior; Skip permanently dismisses that question and clears its draft. Closing a panel also saves for later. Save errors retain the open panel and text. Completing all questions dismisses the invitation until the existing new-material rules produce another.

The /dev/interview-preview review route redirects to Pete Rango’s actual artist page with interviewPreview=1. The sample interview is inserted in the existing invitation position, above the artist hero, using the real offer/panel with a browser-backed simulation. Normal profile content is read from the configured development database. Tour/onboarding automation and the real interview invitation are suppressed only in this explicitly requested review preview. It never submits real answers, regenerates profiles or writes staging data. The review route is enabled in local development and Vercel preview deployments only; production returns 404 and ignores the query flag. No migration is needed for this browser-local draft iteration.


## September 17 — individual question deferral

Save for later now defers only the current question and advances to the next, keeping the interview open. A saved-question count appears during the round. After the last question, the dialog offers Review saved questions or Done; Done retains deferred questions and dismisses the invitation for the current page visit. The Continue interview card returns after a refresh or navigation back to the profile. Closing and Not now also dismiss for that visit. Reviewing restores each draft. An unfinished round is not marked complete or rebuilt merely because its questions were deferred. Closing the dialog still pauses all outstanding questions. Send/Skip retain their prior meanings.
