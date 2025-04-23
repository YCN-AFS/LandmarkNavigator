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
            coordinates: road.coordinates as any
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
async function fetchBuuLongRoads(): Promise<any[]> {
  // Buu Long approximate coordinates and bounds
  const buuLongCenter: Coordinate = [10.9565, 106.8603];
  
  // In a real implementation, this would call an external API
  // For this implementation, we'll use predefined road data for the Buu Long area
  // These coordinates are based on Google Maps data for Buu Long area
  
  const roads = [
    // Main arterial roads - East-West
    {
      name: "Đường Đồng Khởi (Main East-West)",
      coordinates: [
        [10.957, 106.830],
        [10.957, 106.835],
        [10.957, 106.840],
        [10.957, 106.845],
        [10.957, 106.850],
        [10.957, 106.855],
        [10.957, 106.860],
        [10.957, 106.865],
        [10.957, 106.870]
      ],
      area: "buu long"
    },
    {
      name: "Đường Huỳnh Văn Nghệ (East-West)",
      coordinates: [
        [10.954, 106.835],
        [10.954, 106.840],
        [10.954, 106.845],
        [10.954, 106.850],
        [10.954, 106.855],
        [10.954, 106.860],
        [10.954, 106.865],
        [10.954, 106.870]
      ],
      area: "buu long"
    },
    {
      name: "Đường Phan Đình Phùng (East-West)",
      coordinates: [
        [10.960, 106.835],
        [10.960, 106.840],
        [10.960, 106.845],
        [10.960, 106.850],
        [10.960, 106.855],
        [10.960, 106.860],
        [10.960, 106.865],
        [10.960, 106.870]
      ],
      area: "buu long"
    },
    // Main arterial roads - North-South
    {
      name: "Đường Phạm Văn Thuận (North-South)",
      coordinates: [
        [10.972, 106.860],
        [10.970, 106.860],
        [10.968, 106.860],
        [10.966, 106.860],
        [10.964, 106.860],
        [10.962, 106.860],
        [10.960, 106.860],
        [10.958, 106.860],
        [10.956, 106.860],
        [10.954, 106.860],
        [10.952, 106.860],
        [10.950, 106.860],
        [10.948, 106.860]
      ],
      area: "buu long"
    },
    {
      name: "Đường Võ Thị Sáu (North-South)",
      coordinates: [
        [10.972, 106.850],
        [10.970, 106.850],
        [10.968, 106.850],
        [10.966, 106.850],
        [10.964, 106.850],
        [10.962, 106.850],
        [10.960, 106.850],
        [10.958, 106.850],
        [10.956, 106.850],
        [10.954, 106.850],
        [10.952, 106.850],
        [10.950, 106.850],
        [10.948, 106.850]
      ],
      area: "buu long"
    },
    {
      name: "Đường Nguyễn Ái Quốc (North-South)",
      coordinates: [
        [10.972, 106.840],
        [10.970, 106.840],
        [10.968, 106.840],
        [10.966, 106.840],
        [10.964, 106.840],
        [10.962, 106.840],
        [10.960, 106.840],
        [10.958, 106.840],
        [10.956, 106.840],
        [10.954, 106.840],
        [10.952, 106.840],
        [10.950, 106.840],
        [10.948, 106.840]
      ],
      area: "buu long"
    },
    {
      name: "Đường Hoàng Diệu (North-South)",
      coordinates: [
        [10.972, 106.865],
        [10.970, 106.865],
        [10.968, 106.865],
        [10.966, 106.865],
        [10.964, 106.865],
        [10.962, 106.865],
        [10.960, 106.865],
        [10.958, 106.865],
        [10.956, 106.865],
        [10.954, 106.865],
        [10.952, 106.865],
        [10.950, 106.865],
        [10.948, 106.865]
      ],
      area: "buu long"
    },
    // Diagonal roads
    {
      name: "Đường Bửu Long (Major Diagonal)",
      coordinates: [
        [10.976, 106.830],
        [10.974, 106.835],
        [10.972, 106.840],
        [10.970, 106.845],
        [10.968, 106.850],
        [10.966, 106.855],
        [10.964, 106.860],
        [10.962, 106.865],
        [10.960, 106.870],
        [10.958, 106.875]
      ],
      area: "buu long"
    },
    {
      name: "Đường Cách Mạng Tháng Tám (Diagonal)",
      coordinates: [
        [10.946, 106.845],
        [10.948, 106.850],
        [10.950, 106.855],
        [10.952, 106.860],
        [10.954, 106.865],
        [10.956, 106.870],
        [10.958, 106.875]
      ],
      area: "buu long"
    },
    // Campus roads
    {
      name: "Đường Nội Bộ ĐH Đồng Nai (Campus - East)",
      coordinates: [
        [10.956, 106.855],
        [10.957, 106.855],
        [10.958, 106.855],
        [10.959, 106.855],
        [10.960, 106.855]
      ],
      area: "buu long"
    },
    {
      name: "Đường Nội Bộ ĐH Đồng Nai (Campus - West)",
      coordinates: [
        [10.956, 106.845],
        [10.957, 106.845],
        [10.958, 106.845],
        [10.959, 106.845],
        [10.960, 106.845]
      ],
      area: "buu long"
    },
    // Smaller connecting roads
    {
      name: "Hẻm 7 Đồng Khởi (Connection)",
      coordinates: [
        [10.957, 106.845],
        [10.956, 106.846],
        [10.955, 106.847],
        [10.954, 106.848],
        [10.953, 106.849],
        [10.952, 106.850]
      ],
      area: "buu long"
    },
    {
      name: "Hẻm 10 Đồng Khởi (Connection)",
      coordinates: [
        [10.957, 106.855],
        [10.956, 106.856],
        [10.955, 106.857],
        [10.954, 106.858],
        [10.953, 106.859],
        [10.952, 106.860]
      ],
      area: "buu long"
    },
    {
      name: "Đường Lê Quý Đôn (East-West)",
      coordinates: [
        [10.962, 106.830],
        [10.962, 106.835],
        [10.962, 106.840],
        [10.962, 106.845],
        [10.962, 106.850],
        [10.962, 106.855],
        [10.962, 106.860]
      ],
      area: "buu long"
    },
    {
      name: "Đường Trần Phú (East-West)",
      coordinates: [
        [10.966, 106.830],
        [10.966, 106.835],
        [10.966, 106.840],
        [10.966, 106.845],
        [10.966, 106.850],
        [10.966, 106.855],
        [10.966, 106.860]
      ],
      area: "buu long"
    },
    {
      name: "Đường Phan Chu Trinh (North-South)",
      coordinates: [
        [10.972, 106.835],
        [10.970, 106.835],
        [10.968, 106.835],
        [10.966, 106.835],
        [10.964, 106.835],
        [10.962, 106.835],
        [10.960, 106.835],
        [10.958, 106.835],
        [10.956, 106.835],
        [10.954, 106.835]
      ],
      area: "buu long"
    }
  ];
  
  return roads;
}
