/** Plain-English names for audit-log actions, shared by the dashboard and the upload-to-outputs page. */
export const ACTION_LABEL: Record<string, string> = {
  ai_ingest_completed: 'AI catalogued',
  asset_publish: 'Published',
  asset_published: 'Published',
  campaign_generated: 'Social drafts generated',
  lesson_generated: 'Lesson drafted',
  lesson_publish: 'Lesson published',
  post_corrected: 'Post corrected',
  asset_verify: 'Checked against source',
  asset_unpublish: 'Taken off the site',
  asset_reject: 'Sent back',
  post_publish: 'Post published',
  post_approve: 'Post approved',
  post_reject: 'Post rejected',
  post_submit: 'Post sent for review',
  post_sent_telegram: 'Sent to Telegram',
  post_telegram_failed: 'Telegram delivery failed',
};
