import { useEffect, useRef } from "react";
import { useMapContext } from "@/contexts/MapContext";
import { useLandmarks } from "@/hooks/useLandmarks";
import { useMap } from "@/hooks/useMap";
import "leaflet/dist/leaflet.css";

const MapContainer = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { 
    mapCenter, 
    mapZoom, 
    mapInstance, 
    setMapInstance,
    isDarkMode,
    landmarks,
    currentLandmark,
    setCurrentLandmark,
    roads,
    isRoadsVisible,
    mapBounds,
    setMapBounds
  } = useMapContext();

  // Initialize map
  const { initializeMap, updateMap, addLandmarkMarkers, drawRoads } = useMap(mapContainerRef);

  // Setup map on initial render
  useEffect(() => {
    if (!mapContainerRef.current || mapInstance) return;
    
    const map = initializeMap(mapCenter, mapZoom, isDarkMode);
    setMapInstance(map);
    
    // Add event listener for map moveend to update bounds
    map.on('moveend', () => {
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      
      setMapBounds([
        [sw.lat, sw.lng],
        [ne.lat, ne.lng]
      ]);
    });
    
    // Initial bounds set
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    setMapBounds([
      [sw.lat, sw.lng],
      [ne.lat, ne.lng]
    ]);
    
    // Cleanup
    return () => {
      map.remove();
    };
  }, []);

  // Update map when center, zoom or theme changes
  useEffect(() => {
    if (!mapInstance) return;
    updateMap(mapInstance, mapCenter, mapZoom, isDarkMode);
  }, [mapCenter, mapZoom, isDarkMode, mapInstance]);

  // Add landmark markers when landmarks change
  useEffect(() => {
    if (!mapInstance || !landmarks) return;
    addLandmarkMarkers(mapInstance, landmarks, currentLandmark, setCurrentLandmark);
  }, [mapInstance, landmarks, currentLandmark]);

  // Draw roads when roads or visibility changes
  useEffect(() => {
    if (!mapInstance) return;
    drawRoads(mapInstance, roads, isRoadsVisible, isDarkMode);
  }, [mapInstance, roads, isRoadsVisible, isDarkMode]);

  return <div id="map" ref={mapContainerRef} className="w-full h-full z-0" />;
};

export default MapContainer;
