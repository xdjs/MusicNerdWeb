# Leaderboard eligibility

The public `/leaderboard` page and profile leaderboard read `/api/leaderboard`.
For Today, Last Week, Last Month and All Time, an account is eligible only when
`ugcCount > 0 || artistsCount > 0` for that period (issue #1247).

The query helpers discard zero-contribution rows before returning their ordered
results. The API calculates totals and slices pages from those eligible results.
This preserves existing count queries, inclusive date boundaries, scoring and
ordering. Hidden contributors still appear after visible contributors with N/A
instead of a rank; hidden accounts with no contributions are omitted too.

The UI renders the returned rows without filling vacant podium positions. An empty
result says “No contributions in this period yet. Be the first!” and has no pagination
controls. Highlighting the signed-in account does not add an ineligible row. The signed-in
summary matches by account ID and shows an unranked dash with zero period counts
when that account is absent (N/A for hidden accounts). Superseded range responses
cannot restore an earlier rank or count.

Contribution credit policy is unchanged; claimed-artist self-edits are tracked in
#1134. This read-only change needs no migration, jobs or external-service writes.
