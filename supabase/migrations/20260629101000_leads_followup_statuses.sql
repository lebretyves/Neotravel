alter table leads drop constraint if exists leads_status_check;

alter table leads
  add constraint leads_status_check check (
    status in (
      'NEW',
      'INCOMPLETE',
      'QUALIFIED',
      'HIGH_VALUE',
      'HUMAN_REVIEW',
      'QUOTE_READY',
      'QUOTE_SENT',
      'FOLLOWUP_SCHEDULED',
      'FOLLOWUP_1',
      'FOLLOWUP_2',
      'WON',
      'LOST',
      'CLOSED'
    )
  );
