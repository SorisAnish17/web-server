export const dbCollectionNames = Object.freeze({
  online_activity: 'online_activity',
  chat_events: 'chat_events',
  chat_rooms: 'chat_rooms',
  customers: 'customers',
  support_tickets: 'support_tickets',
  schedule_unread_messages: 'schedule_unread_messages',
  merchants_staff: 'merchants_staff',
  merchants_staff_settings: 'merchants_staff_settings',
  merchants_roles_and_permissions: 'merchants_roles_and_permissions',
  _internal_admins: '_internal_admins',
  _internal_admins_roles_and_permissions:
    '_internal_admins_roles_and_permissions',
});

export type CollectionNames = keyof typeof dbCollectionNames;
