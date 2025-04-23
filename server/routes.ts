import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import { z } from "zod";
import { insertLandmarkSchema, insertRoadSchema, type Coordinate } from "@shared/schema";

// One hour in seconds
const CACHE_DURATION = 60 * 60;

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // GET landmarks by bounds
  app.get('/api/landmarks', async (req, res) => {
    try {
      const boundsSchema = z.object({
        south: z.coerce.number(),
        west: z.coerce.number(),
        north: z.coerce.number(),
        east: z.coerce.number(),
      });
      
      const parseResult = boundsSchema.safeParse(req.query);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: 'Invalid bounds parameters', 
          errors: parseResult.error.errors 
        });
      }
      
      const { south, west, north, east } = parseResult.data;
      const bounds: [Coordinate, Coordinate] = [[south, west], [north, east]];
      
      // Create cache key based on bounds
      const cacheKey = `landmarks:${south},${west},${north},${east}`;
      
      // Check if data is in cache
      const cachedData = await storage.getCache(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData.data);
      }
      
      // Check for landmarks in storage
      let landmarks = await storage.getLandmarksByBounds(bounds);
      
      // If no landmarks in storage, fetch from Wikipedia API
      if (landmarks.length === 0) {
        landmarks = await fetchWikipediaLandmarks(bounds);
        
        // Store fetched landmarks
        for (const landmark of landmarks) {
          await storage.addLandmark({
            ...landmark,
            coordinates: landmark.coordinates as any
          });
        }
      }
      
      // Cache the results
      await storage.setCache({
        key: cacheKey,
        data: landmarks,
        expiresAt: Math.floor(Date.now() / 1000) + CACHE_DURATION
      });
      
      res.json(landmarks);
    } catch (error) {
      console.error('Error fetching landmarks:', error);
      res.status(500).json({ message: 'Failed to fetch landmarks' });
    }
  });
  
  // GET landmark by ID
  app.get('/api/landmarks/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid landmark ID' });
      }
      
      const landmark = await storage.getLandmarkById(id);
      
      if (!landmark) {
        return res.status(404).json({ message: 'Landmark not found' });
      }
      
      res.json(landmark);
    } catch (error) {
      console.error('Error fetching landmark:', error);
      res.status(500).json({ message: 'Failed to fetch landmark' });
    }
  });
  
  // GET Buu Long roads
  app.get('/api/roads/buu-long', async (req, res) => {
    try {
      const cacheKey = 'roads:buu-long';
      
      // Check if data is in cache
      const cachedData = await storage.getCache(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData.data);
      }
      
      // Get roads from storage
      let roads = await storage.getRoadsByArea('buu long');
      
      // If no roads in storage, fetch from API or use predetermined data
      if (roads.length === 0) {
        roads = await fetchBuuLongRoads();
        
        // Store fetched roads
        for (const road of roads) {
          await storage.addRoad({
            ...road,
            coordinates: road.coordinates as any,
            tags: road.tags as any
          });
        }
      }
      
      // Cache the results
      await storage.setCache({
        key: cacheKey,
        data: roads,
        expiresAt: Math.floor(Date.now() / 1000) + CACHE_DURATION
      });
      
      res.json(roads);
    } catch (error) {
      console.error('Error fetching Buu Long roads:', error);
      res.status(500).json({ message: 'Failed to fetch Buu Long roads' });
    }
  });
  
  // Search landmarks by query
  app.get('/api/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.trim() === '') {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const cacheKey = `search:${query.toLowerCase()}`;
      
      // Check if data is in cache
      const cachedData = await storage.getCache(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData.data);
      }
      
      // Search Wikipedia API
      const searchResults = await searchWikipedia(query);
      
      // Cache the results
      await storage.setCache({
        key: cacheKey,
        data: searchResults,
        expiresAt: Math.floor(Date.now() / 1000) + CACHE_DURATION
      });
      
      res.json(searchResults);
    } catch (error) {
      console.error('Error searching landmarks:', error);
      res.status(500).json({ message: 'Failed to search landmarks' });
    }
  });

  return httpServer;
}

// Helper function to fetch landmarks from Wikipedia
async function fetchWikipediaLandmarks(bounds: [Coordinate, Coordinate]): Promise<any[]> {
  const [southWest, northEast] = bounds;
  const [swLat, swLng] = southWest;
  const [neLat, neLng] = northEast;
  
  // Wikipedia GeoSearch API URL
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=10000&gscoord=${(swLat + neLat)/2}|${(swLng + neLng)/2}&gslimit=10&format=json&origin=*`;
  
  try {
    const response = await fetch(url);
    const data = await response.json() as any;
    
    if (!data.query || !data.query.geosearch) {
      return [];
    }
    
    // Get detailed information for each found landmark
    const landmarks = await Promise.all(
      data.query.geosearch.map(async (item: any) => {
        const details = await fetchWikipediaDetails(item.pageid);
        return {
          title: item.title,
          pageId: item.pageid,
          extract: details.extract || 'No description available',
          thumbnail: details.thumbnail || '',
          coordinates: [item.lat, item.lon] as Coordinate,
          distance: `${(item.dist / 1000).toFixed(1)} km away`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`
        };
      })
    );
    
    return landmarks;
  } catch (error) {
    console.error('Error fetching Wikipedia landmarks:', error);
    return [];
  }
}

// Helper function to fetch details for a Wikipedia page
async function fetchWikipediaDetails(pageId: number): Promise<any> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro=true&explaintext=true&pageids=${pageId}&pithumbsize=300&format=json&origin=*`;
  
  try {
    const response = await fetch(url);
    const data = await response.json() as any;
    
    if (!data.query || !data.query.pages || !data.query.pages[pageId]) {
      return { extract: '', thumbnail: '' };
    }
    
    const page = data.query.pages[pageId];
    const extract = page.extract || '';
    const thumbnail = page.thumbnail ? page.thumbnail.source : '';
    
    return { extract, thumbnail };
  } catch (error) {
    console.error('Error fetching Wikipedia details:', error);
    return { extract: '', thumbnail: '' };
  }
}

// Helper function to search Wikipedia
async function searchWikipedia(query: string): Promise<any[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
  
  try {
    const response = await fetch(url);
    const data = await response.json() as any;
    
    if (!data.query || !data.query.search) {
      return [];
    }
    
    // Get detailed information for each found result
    const results = await Promise.all(
      data.query.search.slice(0, 5).map(async (item: any) => {
        const details = await fetchWikipediaDetails(item.pageid);
        return {
          title: item.title,
          pageId: item.pageid,
          extract: details.extract || 'No description available',
          snippet: item.snippet.replace(/<\/?span[^>]*>/g, ''),
          thumbnail: details.thumbnail || '',
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`
        };
      })
    );
    
    return results;
  } catch (error) {
    console.error('Error searching Wikipedia:', error);
    return [];
  }
}

// Helper function to fetch Buu Long roads
import { fetchRoadDataFromOSM, fetchRoadDataFromGeoJSON, getTestRoadData } from './osmData';

async function fetchBuuLongRoads(): Promise<any[]> {
  // First try to get real OSM data
  try {
    // Try getting data from OpenStreetMap
    const osmRoads = await fetchRoadDataFromOSM();
    
    if (osmRoads && osmRoads.length > 0) {
      console.log(`Successfully fetched ${osmRoads.length} roads from OpenStreetMap`);
      return osmRoads;
    }
    
    // If OSM API fails, try the GeoJSON API
    const geoJsonRoads = await fetchRoadDataFromGeoJSON();
    
    if (geoJsonRoads && geoJsonRoads.length > 0) {
      console.log(`Successfully fetched ${geoJsonRoads.length} roads from GeoJSON API`);
      return geoJsonRoads;
    }
    
    // If both APIs fail, use the test data with curves
    console.log('Using test road data with realistic curves');
    return getTestRoadData();
  } catch (error) {
    console.error('Error fetching road data from external sources:', error);
    console.log('Falling back to test data with realistic curves');
    // Fallback to test data if all else fails
    return getTestRoadData();
  }
}
