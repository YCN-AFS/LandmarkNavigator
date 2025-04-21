import { useRef, useCallback } from "react";
import L from "leaflet";
import { useMapContext } from "@/contexts/MapContext";
import type { Landmark, Road, Coordinate } from "@shared/schema";

export function useMap(mapContainerRef: React.RefObject<HTMLDivElement>) {
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const roadsLayerRef = useRef<L.LayerGroup | null>(null);
  const lightTileLayerRef = useRef<L.TileLayer | null>(null);
  const darkTileLayerRef = useRef<L.TileLayer | null>(null);

  // Light and dark tile layer URLs
  const LIGHT_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  
  // Map attribution
  const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // Initialize map
  const initializeMap = useCallback((center: Coordinate, zoom: number, isDarkMode: boolean) => {
    if (!mapContainerRef.current) return null;
    
    // Create map
    const map = L.map(mapContainerRef.current).setView(center, zoom);
    
    // Create tile layers
    lightTileLayerRef.current = L.tileLayer(LIGHT_TILE_URL, {
      attribution: MAP_ATTRIBUTION,
      maxZoom: 19
    });
    
    darkTileLayerRef.current = L.tileLayer(DARK_TILE_URL, {
      attribution: MAP_ATTRIBUTION,
      maxZoom: 19
    });
    
    // Create layers for markers and roads
    markersLayerRef.current = L.layerGroup().addTo(map);
    roadsLayerRef.current = L.layerGroup().addTo(map);
    
    // Add appropriate tile layer based on dark mode
    if (isDarkMode) {
      darkTileLayerRef.current.addTo(map);
    } else {
      lightTileLayerRef.current.addTo(map);
    }
    
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
    if (isDarkMode && lightTileLayerRef.current && map.hasLayer(lightTileLayerRef.current)) {
      map.removeLayer(lightTileLayerRef.current);
      if (darkTileLayerRef.current) darkTileLayerRef.current.addTo(map);
    } else if (!isDarkMode && darkTileLayerRef.current && map.hasLayer(darkTileLayerRef.current)) {
      map.removeLayer(darkTileLayerRef.current);
      if (lightTileLayerRef.current) lightTileLayerRef.current.addTo(map);
    }
  }, []);

  // Add landmark markers to the map
  const addLandmarkMarkers = useCallback((
    map: L.Map, 
    landmarks: Landmark[], 
    currentLandmark: Landmark | null,
    setCurrentLandmark: (landmark: Landmark | null) => void
  ) => {
    if (!markersLayerRef.current) return;
    
    // Clear existing markers
    markersLayerRef.current.clearLayers();
    
    // Add markers for each landmark
    landmarks.forEach(landmark => {
      const coords = landmark.coordinates as Coordinate;
      
      // Create marker with popup
      const marker = L.marker(coords)
        .bindPopup(`<b>${landmark.title}</b><br>${landmark.extract.substring(0, 100)}...`)
        .addTo(markersLayerRef.current!);
      
      // Add click handler
      marker.on('click', () => {
        setCurrentLandmark(landmark);
      });
      
      // If this is the current selected landmark, open its popup
      if (currentLandmark && currentLandmark.id === landmark.id) {
        marker.openPopup();
      }
    });
  }, []);

  // Draw roads on the map
  const drawRoads = useCallback((
    map: L.Map, 
    roads: Road[], 
    isVisible: boolean,
    isDarkMode: boolean
  ) => {
    if (!roadsLayerRef.current) return;
    
    // Clear existing roads
    roadsLayerRef.current.clearLayers();
    
    if (!isVisible) return;
    
    // Determine road color based on mode
    const roadColor = isDarkMode ? '#60a5fa' : '#3b82f6';
    
    // Draw each road
    roads.forEach(road => {
      const coordinates = road.coordinates as Coordinate[];
      
      // Create polyline for road
      L.polyline(coordinates, {
        color: roadColor,
        weight: 5,
        opacity: 0.7
      }).addTo(roadsLayerRef.current!);
    });
  }, []);

  return {
    initializeMap,
    updateMap,
    addLandmarkMarkers,
    drawRoads
  };
}
