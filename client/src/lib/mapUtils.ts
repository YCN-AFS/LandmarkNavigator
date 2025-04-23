import L from "leaflet";
import type { Landmark, Road, Coordinate } from "@shared/schema";

// Map style URLs
export const LIGHT_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

// Map attribution (required by OpenStreetMap)
export const MAP_ATTRIBUTION = 
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Buu Long coordinates
export const BUU_LONG_COORDINATES: Coordinate = [10.9565, 106.8603];

// Initialize the map with specified center, zoom, and mode
export function initializeLeafletMap(element: HTMLElement, center: Coordinate, zoom: number, isDarkMode = false) {
  // Create map instance
  const map = L.map(element).setView(center, zoom);
  
  // Add tile layer based on mode
  const tileLayer = L.tileLayer(isDarkMode ? DARK_TILE_URL : LIGHT_TILE_URL, {
    attribution: MAP_ATTRIBUTION,
    maxZoom: 19
  });
  
  tileLayer.addTo(map);
  
  return { map, tileLayer };
}

// Layer groups for organization
export interface MapLayers {
  baseTileLayers: {
    light: L.TileLayer;
    dark: L.TileLayer;
  };
  markersLayer: L.LayerGroup;
  roadsLayer: L.LayerGroup;
}

// Create and maintain layer groups for the map
export function createMapLayers(map: L.Map): MapLayers {
  // Create tile layers
  const lightTileLayer = L.tileLayer(LIGHT_TILE_URL, {
    attribution: MAP_ATTRIBUTION,
    maxZoom: 19
  });
  
  const darkTileLayer = L.tileLayer(DARK_TILE_URL, {
    attribution: MAP_ATTRIBUTION,
    maxZoom: 19
  });
  
  // Create layer groups
  const markersLayer = L.layerGroup().addTo(map);
  const roadsLayer = L.layerGroup().addTo(map);
  
  // Add light tile layer by default
  lightTileLayer.addTo(map);
  
  return {
    baseTileLayers: {
      light: lightTileLayer,
      dark: darkTileLayer
    },
    markersLayer,
    roadsLayer
  };
}

// Update map tiles based on dark mode preference
export function updateMapMode(map: L.Map, layers: MapLayers, isDarkMode: boolean) {
  if (isDarkMode) {
    map.removeLayer(layers.baseTileLayers.light);
    layers.baseTileLayers.dark.addTo(map);
  } else {
    map.removeLayer(layers.baseTileLayers.dark);
    layers.baseTileLayers.light.addTo(map);
  }
}

// Add landmark markers to the map
export function addLandmarkMarkers(
  map: L.Map, 
  layers: MapLayers, 
  landmarks: Landmark[], 
  currentLandmark: Landmark | null,
  onMarkerClick: (landmark: Landmark) => void
) {
  // Clear existing markers
  layers.markersLayer.clearLayers();
  
  // Add new markers
  landmarks.forEach(landmark => {
    const coords = landmark.coordinates as Coordinate;
    
    // Create marker with popup
    const marker = L.marker(coords)
      .bindPopup(`<b>${landmark.title}</b><br>${landmark.extract.substring(0, 100)}...`)
      .addTo(layers.markersLayer);
    
    // Add click handler
    marker.on('click', () => {
      onMarkerClick(landmark);
    });
    
    // If this is the current selected landmark, open its popup
    if (currentLandmark && currentLandmark.id === landmark.id) {
      marker.openPopup();
    }
  });
}

// Draw roads on the map
export function drawRoads(
  map: L.Map, 
  layers: MapLayers, 
  roads: Road[], 
  isVisible: boolean,
  isDarkMode: boolean
) {
  // Clear existing roads
  layers.roadsLayer.clearLayers();
  
  if (!isVisible) return;
  
  // Define color schemes for different road types
  const roadStyles = {
    motorway: { color: isDarkMode ? '#f97316' : '#ea580c', weight: 8, dashArray: null },
    trunk: { color: isDarkMode ? '#f97316' : '#ea580c', weight: 7, dashArray: null },
    primary: { color: isDarkMode ? '#3b82f6' : '#2563eb', weight: 6, dashArray: null },
    secondary: { color: isDarkMode ? '#60a5fa' : '#3b82f6', weight: 5, dashArray: null },
    tertiary: { color: isDarkMode ? '#93c5fd' : '#60a5fa', weight: 4, dashArray: null },
    residential: { color: isDarkMode ? '#cbd5e1' : '#94a3b8', weight: 3.5, dashArray: null },
    service: { color: isDarkMode ? '#94a3b8' : '#64748b', weight: 3, dashArray: null },
    footway: { color: isDarkMode ? '#d1d5db' : '#9ca3af', weight: 2, dashArray: '5, 5' },
    path: { color: isDarkMode ? '#d1d5db' : '#9ca3af', weight: 2, dashArray: '5, 5' },
    track: { color: isDarkMode ? '#a1a1aa' : '#71717a', weight: 2, dashArray: '5, 5' },
    // Default style for other road types
    default: { color: isDarkMode ? '#60a5fa' : '#3b82f6', weight: 4, dashArray: null }
  };
  
  // Create tooltip container if it doesn't exist
  if (!document.getElementById('road-tooltip')) {
    const tooltipContainer = document.createElement('div');
    tooltipContainer.id = 'road-tooltip';
    tooltipContainer.className = 'road-tooltip hidden';
    document.body.appendChild(tooltipContainer);
    
    // Add styles for the tooltip if not already in CSS
    if (!document.getElementById('road-tooltip-style')) {
      const style = document.createElement('style');
      style.id = 'road-tooltip-style';
      style.textContent = `
        .road-tooltip {
          position: fixed;
          background-color: ${isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)'};
          color: ${isDarkMode ? '#e2e8f0' : '#0f172a'};
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          z-index: 1000;
          pointer-events: none;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          max-width: 250px;
          border: 1px solid ${isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(226, 232, 240, 0.8)'};
        }
        .road-tooltip.hidden {
          display: none;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  const tooltipElement = document.getElementById('road-tooltip');
  
  // Sort roads: main roads first (drawn underneath), minor roads last (drawn on top)
  const sortedRoads = [...roads].sort((a, b) => {
    const roadTypeOrder: {[key: string]: number} = {
      'motorway': 1,
      'trunk': 2, 
      'primary': 3,
      'secondary': 4,
      'tertiary': 5,
      'residential': 6,
      'service': 7,
      'path': 8,
      'footway': 9,
      'track': 10
    };
    
    const roadTypeA = a.roadType || 'residential';
    const roadTypeB = b.roadType || 'residential';
    
    return (roadTypeOrder[roadTypeA] || 99) - 
           (roadTypeOrder[roadTypeB] || 99);
  });
  
  // Draw each road
  sortedRoads.forEach(road => {
    const coordinates = road.coordinates as Coordinate[];
    
    // Skip roads with insufficient coordinates
    if (!coordinates || coordinates.length < 2) return;
    
    // Get style for this road type
    const roadType = road.roadType || 'default';
    const style = (roadStyles as any)[roadType] || roadStyles.default;
    
    // Create polyline for road with smooth rendering
    const polyline = L.polyline(coordinates, {
      color: style.color,
      weight: style.weight,
      opacity: 0.8,
      lineJoin: 'round', // Makes joins between segments rounded
      lineCap: 'round',  // Rounds the ends of the line
      interactive: true, // Make sure the polyline can receive mouse events
      dashArray: style.dashArray,
      smoothFactor: 1    // How much to simplify the polyline (1 = default)
    }).addTo(layers.roadsLayer);
    
    // Add road name as popup if available
    if (road.name) {
      polyline.bindPopup(road.name);
    }
    
    // Add event listeners for mouseover, mousemove and mouseout
    polyline.on('mouseover', (e: L.LeafletMouseEvent) => {
      // Change the style of the polyline
      polyline.setStyle({
        weight: style.weight + 2,
        opacity: 1
      });
      
      // Bring the polyline to front
      if (!(L.Browser.ie || L.Browser.opera || L.Browser.edge)) {
        polyline.bringToFront();
      }
      
      // Show tooltip
      if (tooltipElement) {
        tooltipElement.classList.remove('hidden');
      }
    });
    
    polyline.on('mousemove', (e: L.LeafletMouseEvent) => {
      // Get closest point on the polyline to the mouse
      const closestPoint = getClosestPoint(e.latlng, coordinates);
      
      // Get road type display name
      const roadTypeDisplay = String(roadType).charAt(0).toUpperCase() + String(roadType).slice(1);
      
      // Update tooltip content
      if (tooltipElement) {
        tooltipElement.innerHTML = `
          <div class="font-medium mb-1">${road.name || 'Unnamed Road'}</div>
          <div class="text-sm text-slate-500">${roadTypeDisplay} road</div>
          <div class="text-sm mt-1">Lat: ${closestPoint[0].toFixed(6)}</div>
          <div class="text-sm">Lng: ${closestPoint[1].toFixed(6)}</div>
          ${road.osmId ? `<div class="text-xs mt-2 text-slate-400">OSM ID: ${road.osmId}</div>` : ''}
        `;
        
        // Position tooltip near mouse
        if (e.originalEvent) {
          tooltipElement.style.left = (e.originalEvent.pageX + 15) + 'px';
          tooltipElement.style.top = (e.originalEvent.pageY - 40) + 'px';
        }
      }
    });
    
    polyline.on('mouseout', (e: L.LeafletMouseEvent) => {
      // Reset the style of the polyline
      polyline.setStyle({
        weight: style.weight,
        opacity: 0.8
      });
      
      // Hide tooltip
      if (tooltipElement) {
        tooltipElement.classList.add('hidden');
      }
    });
  });
}

// Helper function to find the closest point on a polyline to a given point
function getClosestPoint(latlng: L.LatLng, coordinates: Coordinate[]): Coordinate {
  let minDistance = Infinity;
  let closestPoint: Coordinate = coordinates[0];
  
  for (const point of coordinates) {
    const distance = latlng.distanceTo(L.latLng(point[0], point[1]));
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
    }
  }
  
  return closestPoint;
}

// Calculate distance between two coordinates in kilometers
export function calculateDistance(point1: Coordinate, point2: Coordinate): number {
  const [lat1, lon1] = point1;
  const [lat2, lon2] = point2;
  
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  
  return distance;
}

// Helper function to convert degrees to radians
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Format distance for display
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}
