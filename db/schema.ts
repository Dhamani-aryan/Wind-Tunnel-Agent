import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const liveQuota=sqliteTable('live_quota',{
  quotaKey:text('quota_key').primaryKey(),
  used:integer('used').notNull().default(0)
});
