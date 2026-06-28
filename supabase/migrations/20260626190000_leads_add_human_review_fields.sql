alter table leads
  add column if not exists assigned_to text,
  add column if not exists human_review_notes text;
