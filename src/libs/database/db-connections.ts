export const dbCollectionNames = Object.freeze({
  online_activity: 'online_activity',
  chat_events: 'chat_events',
  chat_rooms: 'chat_rooms',
  support_tickets: 'support_tickets',
  schedule_unread_messages: 'schedule_unread_messages',
});

export type CollectionNames = keyof typeof dbCollectionNames;
