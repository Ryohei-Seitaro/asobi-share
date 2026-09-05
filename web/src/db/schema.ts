import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const visibilityEnum = pgEnum("visibility", ["public", "friends", "private"]);
export const eventCategoryEnum = pgEnum("event_category", [
  "sightseeing",
  "food",
  "transport",
  "other",
]);
export const coinTxTypeEnum = pgEnum("coin_tx_type", [
  "share_reward",
  "purchase",
  "charge",
  "payout",
]);

// Clerkのユーザーをそのまま参照する（idはClerkのuserId）
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  genre: text("genre").notNull(), // タグ表示・chipsフィルタに使う値（例: "国内旅行", "山登り"）
  daysLabel: text("days_label").notNull(), // 表示用（例: "1泊2日", "日帰り"）
  visibility: visibilityEnum("visibility").notNull().default("public"),
  priceYen: integer("price_yen").notNull().default(0), // 0 = 無料
  priceCoin: integer("price_coin"), // nullable: 円のみ対応の場合はnull
  paidFromEventOrder: integer("paid_from_event_order"), // このorderIndex以降を有料化（nullなら全編無料）
  savesCount: integer("saves_count").notNull().default(0),
  likesCount: integer("likes_count").notNull().default(0),
  trendScore: integer("trend_score").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tripDays = pgTable("trip_days", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  dayIndex: integer("day_index").notNull(), // 0-origin
  dateLabel: text("date_label").notNull(), // 表示用（例: "5/16(土)"）
  openTime: text("open_time").notNull(), // "08:30" 形式
  closeTime: text("close_time").notNull(),
});

export const tripEvents = pgTable("trip_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  dayId: uuid("day_id")
    .notNull()
    .references(() => tripDays.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(), // 有料ライン判定に使う並び順
  title: text("title").notNull(),
  place: text("place").notNull(), // Googleマップ/食べログ検索クエリにそのまま使う
  category: eventCategoryEnum("category").notNull().default("other"),
  planStart: text("plan_start").notNull(), // "10:05"
  planEnd: text("plan_end").notNull(),
  actualStart: text("actual_start"), // 未確定（帰宅前）はnull
  actualEnd: text("actual_end"),
  detail: text("detail"), // 行き方・値段・おすすめ
  caution: text("caution"), // 気をつけること（旅から帰って追記）
});

export const eventPhotos = pgTable("event_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => tripEvents.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export const tripSaves = pgTable(
  "trip_saves",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.tripId, t.userId] })]
);

export const tripLikes = pgTable(
  "trip_likes",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.tripId, t.userId] })]
);

export const coinBalances = pgTable("coin_balances", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
});

export const coinTransactions = pgTable("coin_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // 正=付与, 負=消費
  type: coinTxTypeEnum("type").notNull(),
  relatedTripId: uuid("related_trip_id").references(() => trips.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 有料旅程の購入履歴（円/コインどちらの決済か記録）
export const tripPurchases = pgTable(
  "trip_purchases",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    paidWith: text("paid_with").notNull(), // "yen" | "coin"
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.tripId, t.userId] }),
    uniqueIndex("trip_purchases_trip_user_idx").on(t.tripId, t.userId),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  trips: many(trips),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  author: one(users, { fields: [trips.authorId], references: [users.id] }),
  days: many(tripDays),
  saves: many(tripSaves),
  likes: many(tripLikes),
}));

export const tripDaysRelations = relations(tripDays, ({ one, many }) => ({
  trip: one(trips, { fields: [tripDays.tripId], references: [trips.id] }),
  events: many(tripEvents),
}));

export const tripEventsRelations = relations(tripEvents, ({ one, many }) => ({
  day: one(tripDays, { fields: [tripEvents.dayId], references: [tripDays.id] }),
  photos: many(eventPhotos),
}));

export const eventPhotosRelations = relations(eventPhotos, ({ one }) => ({
  event: one(tripEvents, {
    fields: [eventPhotos.eventId],
    references: [tripEvents.id],
  }),
}));
