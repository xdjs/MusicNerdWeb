export const activityLabels: Record<string, string> = {
  latest_refresh: 'Latest update requested',
  source_added: 'Source added', source_search: 'Source research requested', profile_discovery: 'Profile discovery requested',
  social_ingest: 'Social research requested', caption_extract: 'Caption research requested',
  lore_refresh: 'Lore rebuild requested', source_submission: 'Source submitted', source_upload: 'File uploaded',
  source_approved: 'Source approved', source_rejected: 'Source rejected', link_approved: 'Link approved',
  about_generated: 'About generated', about_edited: 'About edited',
};
export const triggerLabels: Record<string, string> = {
  manual_latest_refresh: 'Update Latest',
  onboarding: 'Onboarding', editor_search: 'Search web for sources', visitor_suggestion: 'Visitor suggestion',
  editor_source: 'Add to Lore', upload: 'File upload', claim_approval: 'Claim approval',
  manual_refresh: 'Look again', source_change: 'Source change', lore_correction: 'Lore correction',
  source_review: 'Source review',
  trusted_submission: 'Auto-approved submission', source_submission: 'Lore submission', admin_bulk_review: 'Admin bulk review',
  about_editor: 'About editor', automatic_about: 'Automatic About generation', unrecorded: 'Trigger not recorded',
};
