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
  
  // Determine road color based on mode
  const roadColor = isDarkMode ? '#60a5fa' : '#3b82f6';
  
  // Create tooltip container if it doesn't exist
  if (!document.getElementById('road-tooltip')) {
    const tooltipContainer = document.createElement('div');
    tooltipContainer.id = 'road-tooltip';
    tooltipContainer.className = 'road-tooltip hidden';
    document.body.appendChild(tooltipContainer);
  }
  
  const tooltipElement = document.getElementById('road-tooltip');
  
  // Draw each road
  roads.forEach(road => {
    const coordinates = road.coordinates as Coordinate[];
    
    // Create polyline for road
    const polyline = L.polyline(coordinates, {
      color: roadColor,
      weight: 5,
      opacity: 0.7,
      interactive: true // Make sure the polyline can receive mouse events
    }).addTo(layers.roadsLayer);
    
    // Add event listeners for mouseover, mousemove and mouseout
    polyline.on('mouseover', (e: L.LeafletMouseEvent) => {
      // Change the style of the polyline
      polyline.setStyle({
        weight: 7,
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
      
      // Update tooltip content
      if (tooltipElement) {
        tooltipElement.innerHTML = `
          <div class="font-medium mb-1">${road.name || 'Road Segment'}</div>
          <div class="text-sm">Lat: ${closestPoint[0].toFixed(6)}</div>
          <div class="text-sm">Lng: ${closestPoint[1].toFixed(6)}</div>
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
        weight: 5,
        opacity: 0.7
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
