import { pgTable, text, serial, integer, boolean, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Landmark model
export const landmarks = pgTable("landmarks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  pageId: integer("page_id").notNull(),
  extract: text("extract").notNull(),
  thumbnail: text("thumbnail"),
  coordinates: jsonb("coordinates").notNull(), // [lat, lng]
  distance: text("distance"),
  url: text("url").notNull(),
});

export const insertLandmarkSchema = createInsertSchema(landmarks).omit({
  id: true,
});

// Roads model
export const roads = pgTable("roads", {
  id: serial("id").primaryKey(),
  name: text("name"),
  coordinates: jsonb("coordinates").notNull(), // Array of [lat, lng] coordinates
  area: text("area").notNull(), 
});

export const insertRoadSchema = createInsertSchema(roads).omit({
  id: true,
});

// Cache model to store previously fetched data
export const cache = pgTable("cache", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  data: jsonb("data").notNull(),
  expiresAt: integer("expires_at").notNull(), // Unix timestamp
});

export const insertCacheSchema = createInsertSchema(cache).omit({
  id: true,
});

// Types
export type Landmark = typeof landmarks.$inferSelect;
export type InsertLandmark = z.infer<typeof insertLandmarkSchema>;

export type Road = typeof roads.$inferSelect;
export type InsertRoad = z.infer<typeof insertRoadSchema>;

export type Cache = typeof cache.$inferSelect;
export type InsertCache = z.infer<typeof insertCacheSchema>;

// Coordinate type for consistency
export type Coordinate = [number, number]; // [latitude, longitude]
