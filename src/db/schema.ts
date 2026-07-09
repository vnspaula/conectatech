import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb, numeric } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  name: text('name').notNull(),
  email: text('email').notNull(),
  avatar: text('avatar'),
  city: text('city'),
  state: text('state'),
  bio: text('bio'),
  interests: jsonb('interests').default([]), // Array of strings e.g. ["Inteligência Artificial", "Cloud"]
  role: text('role').default('attendee'), // 'attendee', 'organizer', 'admin'
  createdAt: timestamp('created_at').defaultNow(),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  banner: text('banner').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  time: text('time').notNull(), // HH:MM
  city: text('city').notNull(),
  state: text('state').notNull(),
  address: text('address').notNull(),
  modality: text('modality').notNull(), // 'Online' or 'Presencial'
  priceType: text('price_type').notNull(), // 'Gratuito' or 'Pago'
  price: text('price'), // e.g. "R$ 50,00" or null
  capacity: integer('capacity').notNull(),
  enrolledCount: integer('enrolled_count').default(0),
  organizerId: integer('organizer_id').references(() => users.id),
  organizerName: text('organizer_name').notNull(),
  speakers: jsonb('speakers').default([]), // Array of { name, role, company, avatar }
  schedule: jsonb('schedule').default([]), // Array of { time, title, description }
  category: text('category').notNull(), // 'Inteligência Artificial', 'Dados', 'Cloud', etc.
  rating: numeric('rating', { precision: 3, scale: 2 }).default('4.8'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const registrations = pgTable('registrations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  status: text('status').default('confirmed'), // 'confirmed', 'waitlist', 'cancelled'
  createdAt: timestamp('created_at').defaultNow(),
});

export const favorites = pgTable('favorites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  rating: integer('rating').notNull(), // 1 to 5
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const networking = pgTable('networking', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  targetUserId: integer('target_user_id').references(() => users.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  status: text('status').default('pending'), // 'pending', 'connected'
  message: text('message'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  eventsOrganized: many(events),
  registrations: many(registrations),
  favorites: many(favorites),
  reviews: many(reviews),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(users, {
    fields: [events.organizerId],
    references: [users.id],
  }),
  registrations: many(registrations),
  favorites: many(favorites),
  reviews: many(reviews),
}));
