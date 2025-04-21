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
    // Main arterial roads
    {
      name: "Đường Đồng Khởi (Main East-West Road)",
      coordinates: [
        [10.9573, 106.8530],
        [10.9571, 106.8550],
        [10.9569, 106.8570],
        [10.9567, 106.8590],
        [10.9565, 106.8610],
        [10.9563, 106.8630],
        [10.9561, 106.8650],
        [10.9559, 106.8670]
      ],
      area: "buu long"
    },
    {
      name: "Đường Phạm Văn Thuận (Main North-South)",
      coordinates: [
        [10.9650, 106.8595],
        [10.9630, 106.8605],
        [10.9610, 106.8615],
        [10.9590, 106.8625],
        [10.9570, 106.8635],
        [10.9550, 106.8645],
        [10.9530, 106.8655],
        [10.9510, 106.8665]
      ],
      area: "buu long"
    },
    {
      name: "Đường Võ Thị Sáu (North-South)",
      coordinates: [
        [10.9645, 106.8570],
        [10.9625, 106.8580],
        [10.9605, 106.8590],
        [10.9585, 106.8600],
        [10.9565, 106.8610],
        [10.9545, 106.8620],
        [10.9525, 106.8630],
        [10.9505, 106.8640]
      ],
      area: "buu long"
    },
    // Diagonal roads
    {
      name: "Đường Bửu Long (Major Diagonal)",
      coordinates: [
        [10.9630, 106.8520],
        [10.9615, 106.8535],
        [10.9600, 106.8550],
        [10.9585, 106.8565],
        [10.9570, 106.8580],
        [10.9555, 106.8595],
        [10.9540, 106.8610],
        [10.9525, 106.8625],
        [10.9510, 106.8640],
        [10.9495, 106.8655]
      ],
      area: "buu long"
    },
    {
      name: "Đường Cách Mạng Tháng Tám (Diagonal)",
      coordinates: [
        [10.9515, 106.8550],
        [10.9530, 106.8565],
        [10.9545, 106.8580],
        [10.9560, 106.8595],
        [10.9575, 106.8610],
        [10.9590, 106.8625],
        [10.9605, 106.8640],
        [10.9620, 106.8655]
      ],
      area: "buu long"
    },
    {
      name: "Đường Nguyễn Ái Quốc (North-South)",
      coordinates: [
        [10.9640, 106.8540],
        [10.9625, 106.8555],
        [10.9610, 106.8570],
        [10.9595, 106.8585],
        [10.9580, 106.8600],
        [10.9565, 106.8615],
        [10.9550, 106.8630],
        [10.9535, 106.8645],
        [10.9520, 106.8660]
      ],
      area: "buu long"
    },
    // Secondary East-West roads
    {
      name: "Đường Phan Đình Phùng (East-West)",
      coordinates: [
        [10.9600, 106.8535],
        [10.9598, 106.8555],
        [10.9596, 106.8575],
        [10.9594, 106.8595],
        [10.9592, 106.8615],
        [10.9590, 106.8635],
        [10.9588, 106.8655]
      ],
      area: "buu long"
    },
    {
      name: "Đường Huỳnh Văn Nghệ (East-West)",
      coordinates: [
        [10.9545, 106.8535],
        [10.9545, 106.8555],
        [10.9545, 106.8575],
        [10.9545, 106.8595],
        [10.9545, 106.8615],
        [10.9545, 106.8635],
        [10.9545, 106.8655]
      ],
      area: "buu long"
    },
    // Secondary North-South roads
    {
      name: "Đường Trương Định (North-South)",
      coordinates: [
        [10.9635, 106.8550],
        [10.9615, 106.8555],
        [10.9595, 106.8560],
        [10.9575, 106.8565],
        [10.9555, 106.8570],
        [10.9535, 106.8575],
        [10.9515, 106.8580]
      ],
      area: "buu long"
    },
    {
      name: "Đường Hoàng Diệu (North-South)",
      coordinates: [
        [10.9640, 106.8615],
        [10.9620, 106.8620],
        [10.9600, 106.8625],
        [10.9580, 106.8630],
        [10.9560, 106.8635],
        [10.9540, 106.8640],
        [10.9520, 106.8645]
      ],
      area: "buu long"
    },
    // Connecting roads
    {
      name: "Hẻm 7 Đồng Khởi (Connection)",
      coordinates: [
        [10.9565, 106.8580],
        [10.9570, 106.8585],
        [10.9575, 106.8590],
        [10.9580, 106.8595],
        [10.9585, 106.8600]
      ],
      area: "buu long"
    },
    {
      name: "Hẻm 10 Đồng Khởi (Connection)",
      coordinates: [
        [10.9560, 106.8600],
        [10.9565, 106.8605],
        [10.9570, 106.8610],
        [10.9575, 106.8615],
        [10.9580, 106.8620]
      ],
      area: "buu long"
    },
    {
      name: "Đường Lê Quý Đôn (Connection)",
      coordinates: [
        [10.9590, 106.8575],
        [10.9580, 106.8580],
        [10.9570, 106.8585],
        [10.9560, 106.8590],
        [10.9550, 106.8595]
      ],
      area: "buu long"
    },
    // University campus roads
    {
      name: "Đường Nội Bộ Đại Học (Campus Road)",
      coordinates: [
        [10.9580, 106.8590],
        [10.9585, 106.8595],
        [10.9590, 106.8600],
        [10.9585, 106.8605],
        [10.9580, 106.8610],
        [10.9575, 106.8605],
        [10.9570, 106.8600],
        [10.9575, 106.8595],
        [10.9580, 106.8590]
      ],
      area: "buu long"
    },
    {
      name: "Hẻm 468 Đồng Khởi (Access Road)",
      coordinates: [
        [10.9565, 106.8550],
        [10.9560, 106.8555],
        [10.9555, 106.8560],
        [10.9550, 106.8565],
        [10.9545, 106.8570]
      ],
      area: "buu long"
    },
    {
      name: "Hẻm 512 Đồng Khởi (Access Road)",
      coordinates: [
        [10.9572, 106.8540],
        [10.9567, 106.8545],
        [10.9562, 106.8550],
        [10.9557, 106.8555],
        [10.9552, 106.8560]
      ],
      area: "buu long"
    }
  ];
  
  return roads;
}
