import { relations } from "drizzle-orm/relations";
import { users, artists, ugcresearch, featured } from "./schema";

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