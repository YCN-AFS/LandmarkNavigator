import { useRef, useCallback } from "react";
import L from "leaflet";
import { useMapContext } from "@/contexts/MapContext";
import type { Landmark, Road, Coordinate } from "@shared/schema";
import { 
  LIGHT_TILE_URL, 
  DARK_TILE_URL, 
  MAP_ATTRIBUTION,
  createMapLayers,
  updateMapMode,
  addLandmarkMarkers as addMarkers,
  drawRoads as drawRoadLines
} from "@/lib/mapUtils";

export function useMap(mapContainerRef: React.RefObject<HTMLDivElement>) {
  const layersRef = useRef<any>(null);

  // Initialize map
  const initializeMap = useCallback((center: Coordinate, zoom: number, isDarkMode: boolean) => {
    if (!mapContainerRef.current) return null;
    
    // Create map
    const map = L.map(mapContainerRef.current).setView(center, zoom);
    
    // Initialize layers
    layersRef.current = createMapLayers(map);
    
    // Set the appropriate tile layer based on dark mode
    updateMapMode(map, layersRef.current, isDarkMode);
    
    return map;
  }, [mapContainerRef]);

  // Update map center, zoom, and dark mode
  const updateMap = useCallback((map: L.Map, center: Coordinate, zoom: number, isDarkMode: boolean) => {
    // Update center and zoom if different from current
    if (map.getCenter().lat !== center[0] || map.getCenter().lng !== center[1]) {
      map.setView(center, zoom);
    } else if (map.getZoom() !== zoom) {
      map.setZoom(zoom);
    }
    
    // Update tile layer based on dark mode
    if (layersRef.current) {
      updateMapMode(map, layersRef.current, isDarkMode);
    }
  }, []);

  // Add landmark markers to the map
  const addLandmarkMarkers = useCallback((
    map: L.Map, 
    landmarks: Landmark[], 
    currentLandmark: Landmark | null,
    setCurrentLandmark: (landmark: Landmark | null) => void
  ) => {
    if (!layersRef.current) return;
    
    addMarkers(map, layersRef.current, landmarks, currentLandmark, setCurrentLandmark);
  }, []);

  // Draw roads on the map 
  const drawRoads = useCallback((
    map: L.Map, 
    roads: Road[], 
    isVisible: boolean,
    isDarkMode: boolean
  ) => {
    if (!layersRef.current) return;
    
    drawRoadLines(map, layersRef.current, roads, isVisible, isDarkMode);
  }, []);

  return {
    initializeMap,
    updateMap,
    addLandmarkMarkers,
    drawRoads
  };
}
