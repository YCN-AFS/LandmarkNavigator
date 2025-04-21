import { 
  landmarks, 
  roads, 
  cache, 
  type Landmark, 
  type InsertLandmark, 
  type Road, 
  type InsertRoad,
  type Cache,
  type InsertCache,
  type Coordinate
} from "@shared/schema";

export interface IStorage {
  // Landmarks
  getLandmarks(): Promise<Landmark[]>;
  getLandmarksByBounds(bounds: [Coordinate, Coordinate]): Promise<Landmark[]>;
  getLandmarkById(id: number): Promise<Landmark | undefined>;
  addLandmark(landmark: InsertLandmark): Promise<Landmark>;
  
  // Roads
  getRoads(): Promise<Road[]>;
  getRoadsByArea(area: string): Promise<Road[]>;
  addRoad(road: InsertRoad): Promise<Road>;
  
  // Cache
  getCache(key: string): Promise<Cache | undefined>;
  setCache(cache: InsertCache): Promise<Cache>;
  invalidateCache(key: string): Promise<void>;
  cleanExpiredCache(): Promise<void>;
}

export class MemStorage implements IStorage {
  private landmarks: Map<number, Landmark>;
  private roads: Map<number, Road>;
  private cache: Map<string, Cache>;
  private landmarksCurrentId: number;
  private roadsCurrentId: number;
  private cacheCurrentId: number;

  constructor() {
    this.landmarks = new Map();
    this.roads = new Map();
    this.cache = new Map();
    this.landmarksCurrentId = 1;
    this.roadsCurrentId = 1;
    this.cacheCurrentId = 1;
  }

  // Landmarks
  async getLandmarks(): Promise<Landmark[]> {
    return Array.from(this.landmarks.values());
  }

  async getLandmarksByBounds(bounds: [Coordinate, Coordinate]): Promise<Landmark[]> {
    const [southWest, northEast] = bounds;
    const [swLat, swLng] = southWest;
    const [neLat, neLng] = northEast;

    return Array.from(this.landmarks.values()).filter(landmark => {
      const coords = landmark.coordinates as Coordinate;
      const [lat, lng] = coords;
      return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng;
    });
  }

  async getLandmarkById(id: number): Promise<Landmark | undefined> {
    return this.landmarks.get(id);
  }

  async addLandmark(insertLandmark: InsertLandmark): Promise<Landmark> {
    const id = this.landmarksCurrentId++;
    const landmark: Landmark = { ...insertLandmark, id };
    this.landmarks.set(id, landmark);
    return landmark;
  }

  // Roads
  async getRoads(): Promise<Road[]> {
    return Array.from(this.roads.values());
  }

  async getRoadsByArea(area: string): Promise<Road[]> {
    return Array.from(this.roads.values()).filter(road => 
      road.area.toLowerCase() === area.toLowerCase()
    );
  }

  async addRoad(insertRoad: InsertRoad): Promise<Road> {
    const id = this.roadsCurrentId++;
    const road: Road = { ...insertRoad, id };
    this.roads.set(id, road);
    return road;
  }

  // Cache
  async getCache(key: string): Promise<Cache | undefined> {
    const cacheItem = this.cache.get(key);
    
    if (!cacheItem) {
      return undefined;
    }
    
    // Check if cache is expired
    if (cacheItem.expiresAt < Math.floor(Date.now() / 1000)) {
      await this.invalidateCache(key);
      return undefined;
    }
    
    return cacheItem;
  }

  async setCache(insertCache: InsertCache): Promise<Cache> {
    const id = this.cacheCurrentId++;
    const cacheItem: Cache = { ...insertCache, id };
    this.cache.set(insertCache.key, cacheItem);
    return cacheItem;
  }

  async invalidateCache(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async cleanExpiredCache(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    for (const [key, cacheItem] of this.cache.entries()) {
      if (cacheItem.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }
}

export const storage = new MemStorage();
