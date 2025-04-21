import { apiRequest } from "./queryClient";
import type { Landmark, Coordinate } from "@shared/schema";

// Function to fetch landmarks from the backend API based on map bounds
export async function fetchLandmarksByBounds(bounds: [Coordinate, Coordinate]) {
  if (!bounds) return [];
  
  const [southWest, northEast] = bounds;
  const [south, west] = southWest;
  const [north, east] = northEast;
  
  try {
    const response = await apiRequest(
      'GET', 
      `/api/landmarks?south=${south}&west=${west}&north=${north}&east=${east}`
    );
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching landmarks by bounds:', error);
    throw error;
  }
}

// Function to fetch a specific landmark by ID
export async function fetchLandmarkById(id: number) {
  try {
    const response = await apiRequest('GET', `/api/landmarks/${id}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching landmark by ID:', error);
    throw error;
  }
}

// Function to search for landmarks by query
export async function searchLandmarks(query: string) {
  if (!query || query.trim() === '') return [];
  
  try {
    const response = await apiRequest('GET', `/api/search?q=${encodeURIComponent(query)}`);
    return await response.json();
  } catch (error) {
    console.error('Error searching landmarks:', error);
    throw error;
  }
}

// Function to fetch Buu Long road coordinates
export async function fetchBuuLongRoads() {
  try {
    const response = await apiRequest('GET', '/api/roads/buu-long');
    return await response.json();
  } catch (error) {
    console.error('Error fetching Buu Long roads:', error);
    throw error;
  }
}
