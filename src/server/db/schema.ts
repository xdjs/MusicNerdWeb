import { pgTable, pgPolicy, bigint, text, boolean, uuid, timestamp, jsonb, numeric, index, uniqueIndex, foreignKey, integer, pgEnum, unique } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

export const platformType = pgEnum("platform_type", ['social', 'web3', 'listen'])


export const funfacts = pgTable("funfacts", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).generatedByDefaultAsIdentity({ name: "funfacts_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	loreDrop: text("lore_drop"),
	behindTheScenes: text("behind_the_scenes"),
	recentActivity: text("recent_activity"),
	surpriseMe: text("surprise_me").notNull(),
	isActive: boolean("is_active").default(false),
}, (table) => [
	pgPolicy("Enable read access for all users", { as: "permissive", for: "select", to: ["mnweb"], using: sql`true` }),
]);

export const aiprompts = pgTable("aiprompts", {
	promptId: uuid("prompt_id").defaultRandom().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }),
	promptBeforeName: text("prompt_before_name"),
	isActive: boolean("is_active").default(false).notNull(),
	promptAfterName: text("prompt_after_name"),
}, (table) => [
	pgPolicy("mnweb_delete_aiprompts", { as: "permissive", for: "delete", to: ["mnweb"], using: sql`true` }),
	pgPolicy("mnweb_insert_aiprompts", { as: "permissive", for: "insert", to: ["mnweb"] }),
	pgPolicy("mnweb_select_aiprompts", { as: "permissive", for: "select", to: ["mnweb"] }),
	pgPolicy("mnweb_update_aiprompts", { as: "permissive", for: "update", to: ["mnweb"] }),
]);

export const history = pgTable("history", {
	guildId: text("guild_id").notNull(),
	userId: text("user_id").notNull(),
	postedAt: timestamp("posted_at", { withTimezone: true, mode: 'string' }).notNull(),
	topArtist: text("top_artist"),
	topTrack: text("top_track"),
	trackId: text("track_id"),
}, (table) => [
	pgPolicy("mn_bot_history_ins", { as: "permissive", for: "insert", to: ["mn_bot"], withCheck: sql`true`  }),
	pgPolicy("mn_bot_history_sel", { as: "permissive", for: "select", to: ["mn_bot"] }),
	pgPolicy("mn_bot_history_upd", { as: "permissive", for: "update", to: ["mn_bot"] }),
]);

export const botPrompts = pgTable("bot_prompts", {
	slow: jsonb().notNull(),
	moderate: jsonb(),
	busy: jsonb(),
	prompts: text().notNull(),
	funFact: text("fun_fact"),
	shaming: jsonb(),
	trackFact: text("track_fact"),
	emoji: jsonb(),
}, (table) => [
	pgPolicy("mn_bot_bot_prompts_sel", { as: "permissive", for: "select", to: ["mn_bot"], using: sql`true` }),
]);

export const wrapGuilds = pgTable("wrap_guilds", {
	guildId: text("guild_id").notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	localTime: text("local_time"),
	posted: boolean(),
	wrapUp: jsonb("wrap_up"),
	shame: jsonb(),
	wrapTracks: jsonb("wrap_tracks"),
	wrapArtists: jsonb("wrap_artists"),
	interval: numeric(),
	channel: text(),
}, (table) => [
	pgPolicy("mn_bot_wrap_guilds_del", { as: "permissive", for: "delete", to: ["mn_bot"], using: sql`true` }),
	pgPolicy("mn_bot_wrap_guilds_ins", { as: "permissive", for: "insert", to: ["mn_bot"] }),
	pgPolicy("mn_bot_wrap_guilds_sel", { as: "permissive", for: "select", to: ["mn_bot"] }),
	pgPolicy("mn_bot_wrap_guilds_upd", { as: "permissive", for: "update", to: ["mn_bot"] }),
]);

export const userTracks = pgTable("user_tracks", {
	guildId: text("guild_id").notNull(),
	userId: text("user_id").notNull(),
	username: text(),
	tracks: jsonb().default([]),
	topTrack: text("top_track"),
	topArtist: text("top_artist"),
	lastUpdated: timestamp("last_updated", { withTimezone: true, mode: 'string' }),
	artists: jsonb().default([]).notNull(),
}, (table) => [
	index("idx_user_tracks_guild_id").using("btree", table.guildId.asc().nullsLast().op("text_ops")),
	index("idx_user_tracks_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	pgPolicy("mn_bot_user_tracks_ins", { as: "permissive", for: "insert", to: ["mn_bot"], withCheck: sql`true`  }),
	pgPolicy("mn_bot_user_tracks_sel", { as: "permissive", for: "select", to: ["mn_bot"] }),
	pgPolicy("mn_bot_user_tracks_upd", { as: "permissive", for: "update", to: ["mn_bot"] }),
]);

export const users = pgTable("users", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	email: text(),
	username: text(),
	wallet: text(),  // Nullable for Privy users who haven't linked a wallet
	privyUserId: text("privy_user_id"),  // Privy authentication identifier
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
	legacyId: text("legacy_id"),
	isAdmin: boolean("is_admin").default(false).notNull(),
	isWhiteListed: boolean("is_white_listed").default(false).notNull(),
	isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
	isHidden: boolean("is_hidden").default(false).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	acceptedUgcCount: bigint("accepted_ugc_count", { mode: "number" }),
}, (table) => [
	unique("users_wallet_key").on(table.wallet),
	unique("users_privy_user_id_key").on(table.privyUserId),
	pgPolicy("mnweb_delete_users", { as: "permissive", for: "delete", to: ["mnweb"], using: sql`true` }),
	pgPolicy("mnweb_insert_users", { as: "permissive", for: "insert", to: ["mnweb"] }),
	pgPolicy("mnweb_select_users", { as: "permissive", for: "select", to: ["mnweb"] }),
	pgPolicy("mnweb_update_users", { as: "permissive", for: "update", to: ["mnweb"] }),
]);

export const artists = pgTable("artists", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	legacyId: text("legacy_id"),
	bandcamp: text(),
	facebook: text(),
	x: text(),
	soundcloud: text(),
	notes: text(),
	patreon: text(),
	name: text(),
	instagram: text(),
	youtube: text(),
	youtubechannel: text(),
	lcname: text(),
	soundcloudId: integer("soundcloudID"),
	spotify: text(),
	twitch: text(),
	imdb: text(),
	musicbrainz: text(),
	wikidata: text(),
	mixcloud: text(),
	facebookId: text("facebookID"),
	discogs: text(),
	tiktok: text(),
	tiktokId: text("tiktokID"),
	jaxsta: text(),
	famousbirthdays: text(),
	songexploder: text(),
	colorsxstudios: text(),
	bandsintown: text(),
	linktree: text(),
	onlyfans: text(),
	wikipedia: text(),
	audius: text(),
	zora: text(),
	catalog: text(),
	opensea: text(),
	foundation: text(),
	lastfm: text(),
	linkedin: text(),
	soundxyz: text(),
	mirror: text(),
	glassnode: text(),
	collectsNfTs: boolean("collectsNFTs"),
	spotifyusername: text(),
	bandcampfan: text(),
	tellie: text(),
	wallets: text().array(),
	ens: text(),
	lens: text(),
	addedBy: uuid("added_by"),
	cameo: text(),
	farcaster: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
	supercollector: text(),
	bio: text(),
	webmapdata: jsonb(),
	nodePfp: jsonb("node_pfp"),
}, (table) => [
	index("artists_added_by_created_at_idx").using("btree", table.addedBy.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("artists_lcname_btree_idx").using("btree", table.lcname.asc().nullsLast().op("text_ops")),
	index("artists_lcname_trgm_gin").using("gin", table.lcname.asc().nullsLast().op("gin_trgm_ops")),
	index("artists_lcname_trgm_idx").using("gist", table.lcname.asc().nullsLast().op("gist_trgm_ops")),
	index("artists_name_trgm_idx").using("gist", table.name.asc().nullsLast().op("gist_trgm_ops")),
	uniqueIndex("artists_spotify_uniq").using("btree", table.spotify.asc().nullsLast().op("text_ops")).where(sql`(spotify IS NOT NULL)`),
	index("idx_artists_added_by").using("btree", table.addedBy.asc().nullsLast().op("uuid_ops")),
	index("idx_artists_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("idx_artists_name_gin").using("gin", sql`to_tsvector('english'::regconfig, name)`),
	foreignKey({
			columns: [table.addedBy],
			foreignColumns: [users.id],
			name: "artists_added_by_fkey"
		}),
	pgPolicy("Allow webmapdata_editor to see all rows", { as: "permissive", for: "select", to: ["webmapdata_editor"], using: sql`true` }),
	pgPolicy("Allow webmapdata_editor to update webmapdata column", { as: "permissive", for: "update", to: ["webmapdata_editor"] }),
	pgPolicy("mnweb_delete_artists", { as: "permissive", for: "delete", to: ["mnweb"] }),
	pgPolicy("mnweb_insert_artists", { as: "permissive", for: "insert", to: ["mnweb"] }),
	pgPolicy("mnweb_select_artists", { as: "permissive", for: "select", to: ["mnweb"] }),
	pgPolicy("mnweb_update_artists", { as: "permissive", for: "update", to: ["mnweb"] }),
]);

export const ugcresearch = pgTable("ugcresearch", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	artistUri: text("artist_uri"),
	accepted: boolean().default(false),
	ugcUrl: text("ugc_url"),
	siteName: text("site_name"),
	siteUsername: text("site_username"),
	artistId: uuid("artist_id"),
	dateProcessed: timestamp("date_processed", { mode: 'string' }),
	name: text(),
	userId: uuid("user_id"),
}, (table) => [
	index("idx_ugcresearch_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("ugcresearch_user_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: "ugcresearch_artist_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ugcresearch_user_id_fkey"
		}),
	pgPolicy("mnweb_delete_ugcresearch", { as: "permissive", for: "delete", to: ["mnweb"], using: sql`true` }),
	pgPolicy("mnweb_insert_ugcresearch", { as: "permissive", for: "insert", to: ["mnweb"] }),
	pgPolicy("mnweb_select_ugcresearch", { as: "permissive", for: "select", to: ["mnweb"] }),
	pgPolicy("mnweb_update_ugcresearch", { as: "permissive", for: "update", to: ["mnweb"] }),
]);

export const featured = pgTable("featured", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	featuredArtist: uuid("featured_artist"),
	featuredCollector: uuid("featured_collector"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.featuredArtist],
			foreignColumns: [artists.id],
			name: "featured_featured_artist_fkey"
		}),
	foreignKey({
			columns: [table.featuredCollector],
			foreignColumns: [artists.id],
			name: "featured_featured_collector_fkey"
		}),
	pgPolicy("mnweb_delete_featured", { as: "permissive", for: "delete", to: ["mnweb"], using: sql`true` }),
	pgPolicy("mnweb_insert_featured", { as: "permissive", for: "insert", to: ["mnweb"] }),
	pgPolicy("mnweb_select_featured", { as: "permissive", for: "select", to: ["mnweb"] }),
	pgPolicy("mnweb_update_featured", { as: "permissive", for: "update", to: ["mnweb"] }),
]);

export const urlmap = pgTable("urlmap", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	siteUrl: text("site_url").notNull(),
	siteName: text("site_name").notNull(),
	example: text().notNull(),
	appStringFormat: text("app_string_format").notNull(),
	order: integer(),
	isIframeEnabled: boolean("is_iframe_enabled").default(false).notNull(),
	isEmbedEnabled: boolean("is_embed_enabled").default(false).notNull(),
	cardDescription: text("card_description"),
	cardPlatformName: text("card_platform_name"),
	isWeb3Site: boolean("is_web3_site").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`),
	siteImage: text("site_image"),
	regex: text().default('""').notNull(),
	regexMatcher: text("regex_matcher"),
	isMonetized: boolean("is_monetized").default(false).notNull(),
	regexOptions: text("regex_options").array(),
	colorHex: text("color_hex").default('#000000'),
	platformTypeList: platformType("platform_type_list").array().default(["social"]),
}, (table) => [
	unique("urlmap_siteurl_key").on(table.siteUrl),
	unique("urlmap_sitename_key").on(table.siteName),
	unique("urlmap_example_key").on(table.example),
	unique("urlmap_appstringformat_key").on(table.appStringFormat),
	pgPolicy("mnweb_delete_urlmap", { as: "permissive", for: "delete", to: ["mnweb"], using: sql`true` }),
	pgPolicy("mnweb_insert_urlmap", { as: "permissive", for: "insert", to: ["mnweb"] }),
	pgPolicy("mnweb_select_urlmap", { as: "permissive", for: "select", to: ["mnweb"] }),
	pgPolicy("mnweb_update_urlmap", { as: "permissive", for: "update", to: ["mnweb"] }),
]);

// Relations
export const artistsRelations = relations(artists, ({one, many}) => ({
	user: one(users, {
		fields: [artists.addedBy],
		references: [users.id]
	}),
	ugcresearches: many(ugcresearch),
	featureds_featuredArtist: many(featured, {
		relationName: "featured_featuredArtist_artists_id"
	}),
	featureds_featuredCollector: many(featured, {
		relationName: "featured_featuredCollector_artists_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	artists: many(artists),
	ugcresearches: many(ugcresearch),
}));

export const ugcresearchRelations = relations(ugcresearch, ({one}) => ({
	artist: one(artists, {
		fields: [ugcresearch.artistId],
		references: [artists.id]
	}),
	user: one(users, {
		fields: [ugcresearch.userId],
		references: [users.id]
	}),
}));

export const featuredRelations = relations(featured, ({one}) => ({
	artist_featuredArtist: one(artists, {
		fields: [featured.featuredArtist],
		references: [artists.id],
		relationName: "featured_featuredArtist_artists_id"
	}),
	artist_featuredCollector: one(artists, {
		fields: [featured.featuredCollector],
		references: [artists.id],
		relationName: "featured_featuredCollector_artists_id"
	}),
}));
