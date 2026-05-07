import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const verificationLevelEnum = pgEnum('verification_level', [
  'level_1', // 手機門號
  'level_2', // 裝置綁定
  'level_3', // 支付驗證
  'level_4', // 政府 ID
])

export const postStatusEnum = pgEnum('post_status', ['active', 'deleted', 'hidden'])

export const murmurStatusEnum = pgEnum('murmur_status', ['active', 'deleted', 'hidden'])

// ─── Identity Layer (knows real phone numbers) ────────────────────────────────

// 真實身份，只有驗證服務看得到
export const verifiedIdentities = pgTable('verified_identities', {
  id: text('id').primaryKey(), // UUID v7
  phoneHash: text('phone_hash').notNull(),   // SHA-256(phone+salt)，不存明文
  verificationLevel: verificationLevelEnum('verification_level').notNull().default('level_1'),
  deviceFingerprint: text('device_fingerprint'), // level_2
  paymentMethodHash: text('payment_method_hash'), // level_3
  govIdHash: text('gov_id_hash'),              // level_4
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('verified_identities_phone_hash_idx').on(t.phoneHash),
])

// Token 橋接層：過期後連平台自己都無法回溯到真人
export const userTokens = pgTable('user_tokens', {
  id: text('id').primaryKey(),          // UUID v7，這個就是論壇服務認識的「用戶 ID」
  identityId: text('identity_id').notNull().references(() => verifiedIdentities.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('user_tokens_identity_id_idx').on(t.identityId),
])

// ─── Forum Layer (only knows tokens) ─────────────────────────────────────────

// 匿名用戶資料（token 過期後變成孤兒資料）
export const users = pgTable('users', {
  id: text('id').primaryKey(),          // = userTokens.id
  nickname: text('nickname').notNull(),
  nicknameChangedAt: timestamp('nickname_changed_at', { withTimezone: true }),
  verificationLevel: verificationLevelEnum('verification_level').notNull().default('level_1'),
  dailyPostCount: integer('daily_post_count').notNull().default(0),
  dailyPostResetAt: timestamp('daily_post_reset_at', { withTimezone: true }).notNull().defaultNow(),
  isBanned: boolean('is_banned').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// 板塊
export const boards = pgTable('boards', {
  id: text('id').primaryKey(),          // UUID v7
  slug: text('slug').notNull(),         // 用於 URL，如 taiwan-politics
  name: text('name').notNull(),
  description: text('description'),
  createdBy: text('created_by').references(() => users.id),
  moderatorId: text('moderator_id').references(() => users.id),
  requiredLevel: verificationLevelEnum('required_level').notNull().default('level_1'),
  postCount: integer('post_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('boards_slug_idx').on(t.slug),
])

// 用戶收藏的板塊
export const userFavoriteBoards = pgTable('user_favorite_boards', {
  userId: text('user_id').notNull().references(() => users.id),
  boardId: text('board_id').notNull().references(() => boards.id),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('user_favorite_boards_pk').on(t.userId, t.boardId),
  index('user_favorite_boards_user_idx').on(t.userId),
])

// 帖子
export const posts = pgTable('posts', {
  id: text('id').primaryKey(),          // UUID v7（天然時序）
  boardId: text('board_id').notNull().references(() => boards.id),
  authorId: text('author_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  contentEditedAt: timestamp('content_edited_at', { withTimezone: true }),
  status: postStatusEnum('status').notNull().default('active'),
  replyCount: integer('reply_count').notNull().default(0),
  upvoteCount: integer('upvote_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('posts_board_id_idx').on(t.boardId, t.id),  // 板塊內用 cursor 翻頁
  index('posts_author_id_idx').on(t.authorId),
])

// 留言
export const replies = pgTable('replies', {
  id: text('id').primaryKey(),          // UUID v7
  postId: text('post_id').notNull().references(() => posts.id),
  authorId: text('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  contentEditedAt: timestamp('content_edited_at', { withTimezone: true }),
  status: postStatusEnum('status').notNull().default('active'),
  upvoteCount: integer('upvote_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('replies_post_id_idx').on(t.postId, t.id),
])

// 個人 murmur（發到個人空間）
export const murmurs = pgTable('murmurs', {
  id: text('id').primaryKey(),          // UUID v7
  authorId: text('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  contentEditedAt: timestamp('content_edited_at', { withTimezone: true }),
  status: murmurStatusEnum('status').notNull().default('active'),
  isPrivate: boolean('is_private').notNull().default(false),
  replyCount: integer('reply_count').notNull().default(0),
  upvoteCount: integer('upvote_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('murmurs_author_id_idx').on(t.authorId, t.id),
  index('murmurs_created_at_idx').on(t.id),  // 全站時序翻頁
])

// Murmur 留言
export const murmurReplies = pgTable('murmur_replies', {
  id: text('id').primaryKey(),
  murmurId: text('murmur_id').notNull().references(() => murmurs.id),
  authorId: text('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  contentEditedAt: timestamp('content_edited_at', { withTimezone: true }),
  status: murmurStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('murmur_replies_murmur_id_idx').on(t.murmurId, t.id),
])

// 文章按讚（每人只能讚一次）
export const postUpvotes = pgTable('post_upvotes', {
  postId: text('post_id').notNull().references(() => posts.id),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.postId, t.userId] }),
])

// Murmur 按讚（每人只能讚一次）
export const murmurUpvotes = pgTable('murmur_upvotes', {
  murmurId: text('murmur_id').notNull().references(() => murmurs.id),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.murmurId, t.userId] }),
])

// ─── OTP ─────────────────────────────────────────────────────────────────────

export const otpCodes = pgTable('otp_codes', {
  id: text('id').primaryKey(),
  phoneHash: text('phone_hash').notNull(),
  code: text('code').notNull(),         // bcrypt hash
  attempts: integer('attempts').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('otp_codes_phone_hash_idx').on(t.phoneHash),
])

// ─── User Feedback ────────────────────────────────────────────────────────────

export const feedback = pgTable('feedback', {
  id: text('id').primaryKey(),           // UUID v7
  userId: text('user_id').references(() => users.id), // nullable，允許未登入回饋
  content: text('content').notNull(),
  category: text('category').notNull().default('general'), // bug | feature | other | general
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('feedback_created_at_idx').on(t.createdAt),
])

// ─── Translation Cache ────────────────────────────────────────────────────────

export const translationCache = pgTable('translation_cache', {
  id: text('id').primaryKey(),          // SHA-256(sourceText+targetLang)
  sourceText: text('source_text').notNull(),
  targetLang: text('target_lang').notNull(),
  translatedText: text('translated_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
