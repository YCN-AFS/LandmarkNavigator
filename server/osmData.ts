import fetch from 'node-fetch';
import { Coordinate } from '@shared/schema';

// Buu Long area bounding box coordinates
const BUU_LONG_BBOX = {
  south: 10.94,
  west: 106.82,
  north: 10.98,
  east: 106.88
};

/**
 * Fetches road data from OpenStreetMap using Overpass API
 */
export async function fetchRoadDataFromOSM(): Promise<any[]> {
  // Construct Overpass API query
  const query = `
    [out:json];
    (
      way["highway"](${BUU_LONG_BBOX.south},${BUU_LONG_BBOX.west},${BUU_LONG_BBOX.north},${BUU_LONG_BBOX.east});
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    // Make request to Overpass API
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch OSM data: ${response.statusText}`);
    }

    const data = await response.json();
    return processOSMData(data);
  } catch (error) {
    console.error('Error fetching OSM data:', error);
    return [];
  }
}

/**
 * Process raw OSM data into a format suitable for our application
 */
function processOSMData(osmData: any): any[] {
  // Extract nodes from OSM data
  const nodes = new Map();
  osmData.elements.forEach((element: any) => {
    if (element.type === 'node') {
      nodes.set(element.id, [element.lat, element.lon]);
    }
  });

  // Process ways (roads)
  const roads = osmData.elements
    .filter((element: any) => element.type === 'way' && element.tags && element.tags.highway)
    .map((way: any) => {
      // Get coordinates for each node in the way
      const coordinates = way.nodes
        .map((nodeId: number) => nodes.get(nodeId))
        .filter((coord: any) => coord !== undefined);

      // Get road name or suitable fallback
      const name = way.tags.name 
        || way.tags.ref 
        || way.tags['name:vi'] 
        || `${way.tags.highway.charAt(0).toUpperCase() + way.tags.highway.slice(1)} Road`;

      // Get road type
      const roadType = way.tags.highway;

      return {
        name,
        coordinates,
        area: "buu long",
        roadType,
        tags: way.tags,
        osmId: way.id
      };
    });

  return roads;
}

/**
 * Alternative implementation using pre-processed GeoJSON from OSM
 * This can be used if the Overpass API call is too slow or rate-limited
 */
export async function fetchRoadDataFromGeoJSON(): Promise<any[]> {
  try {
    // Define area to focus on (Buu Long)
    const bbox = `${BUU_LONG_BBOX.west},${BUU_LONG_BBOX.south},${BUU_LONG_BBOX.east},${BUU_LONG_BBOX.north}`;
    
    // OSM Derived GeoJSON API
    const url = `https://osm-boundaries.com/api/v1/roads?bbox=${bbox}&format=geojson`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch GeoJSON: ${response.statusText}`);
    }
    
    const geojson = await response.json() as any;
    
    // Process GeoJSON features into our road format
    return geojson.features.map((feature: any) => {
      const name = feature.properties.name || feature.properties.highway || 'Unnamed Road';
      
      // GeoJSON coordinates are [lon, lat], but we use [lat, lon]
      const coordinates = feature.geometry.coordinates.map((coord: [number, number]) => 
        [coord[1], coord[0]] as Coordinate
      );
      
      return {
        name,
        coordinates,
        area: "buu long",
        roadType: feature.properties.highway,
        tags: feature.properties
      };
    });
  } catch (error) {
    console.error('Error fetching GeoJSON data:', error);
    return [];
  }
}

/**
 * For development/testing when API access is limited
 * Return a mix of pre-defined roads and curved roads to demonstrate curved rendering
 */
export function getTestRoadData(): any[] {
  // Main roads with more coordinates to show curves
  return [
    {
      name: "Đường Đồng Khởi",
      coordinates: [
        [10.958, 106.830],
        [10.9578, 106.835],
        [10.9575, 106.840],
        [10.9572, 106.845],
        [10.9570, 106.850],
        [10.9568, 106.855],
        [10.9565, 106.860],
        [10.9562, 106.865],
        [10.9560, 106.870]
      ],
      area: "buu long",
      roadType: "primary"
    },
    {
      name: "Đường Phạm Văn Thuận",
      coordinates: [
        [10.972, 106.858],
        [10.970, 106.8582],
        [10.968, 106.8584],
        [10.966, 106.859],
        [10.964, 106.8595],
        [10.962, 106.860],
        [10.960, 106.8605],
        [10.958, 106.861],
        [10.956, 106.8615],
        [10.954, 106.862],
        [10.952, 106.8625],
        [10.950, 106.863],
        [10.948, 106.8635]
      ],
      area: "buu long",
      roadType: "primary"
    },
    {
      name: "Đường Võ Thị Sáu",
      coordinates: [
        [10.972, 106.848],
        [10.970, 106.8485],
        [10.968, 106.849],
        [10.966, 106.8495],
        [10.964, 106.850],
        [10.962, 106.8505],
        [10.960, 106.851],
        [10.958, 106.8515],
        [10.956, 106.852],
        [10.954, 106.8525],
        [10.952, 106.853],
        [10.950, 106.8535],
        [10.948, 106.854]
      ],
      area: "buu long",
      roadType: "secondary"
    },
    // Diagonal road with curve
    {
      name: "Đường Bửu Long",
      coordinates: [
        [10.976, 106.830],
        [10.974, 106.834],
        [10.972, 106.838],
        [10.970, 106.842],
        [10.968, 106.846],
        [10.966, 106.850],
        // Add a curve here
        [10.965, 106.853],
        [10.964, 106.856],
        [10.963, 106.859],
        // Continue the diagonal
        [10.962, 106.862],
        [10.960, 106.866],
        [10.958, 106.870],
        [10.956, 106.874]
      ],
      area: "buu long",
      roadType: "secondary"
    },
    // Road with S-curve
    {
      name: "Đường Cách Mạng Tháng Tám",
      coordinates: [
        [10.946, 106.845],
        [10.947, 106.848],
        // Start of S-curve
        [10.949, 106.850],
        [10.951, 106.851],
        [10.953, 106.851],
        [10.955, 106.850],
        // Middle of S-curve
        [10.957, 106.851],
        [10.959, 106.853],
        [10.961, 106.856],
        // End of S-curve
        [10.962, 106.860],
        [10.963, 106.865],
        [10.964, 106.870]
      ],
      area: "buu long",
      roadType: "secondary"
    },
    // Campus roads with realistic layout
    {
      name: "Đường Nội Bộ ĐH Đồng Nai (Main)",
      coordinates: [
        [10.956, 106.853],
        [10.9562, 106.8532],
        [10.9565, 106.8535],
        [10.957, 106.854],
        [10.9575, 106.8545],
        [10.958, 106.855],
        [10.9585, 106.8552],
        [10.959, 106.8555],
        [10.9595, 106.8558]
      ],
      area: "buu long",
      roadType: "service"
    },
    // Roundabout or circular road
    {
      name: "Vòng Xoay Đồng Khởi",
      coordinates: [
        [10.958, 106.848],
        [10.9582, 106.8478],
        [10.9585, 106.8475],
        [10.9588, 106.8473],
        [10.959, 106.8472],
        [10.9592, 106.8473],
        [10.9595, 106.8475],
        [10.9597, 106.8478],
        [10.9598, 106.848],
        [10.9597, 106.8482],
        [10.9595, 106.8485],
        [10.9592, 106.8487],
        [10.959, 106.8488],
        [10.9588, 106.8487],
        [10.9585, 106.8485],
        [10.9582, 106.8482],
        [10.958, 106.848]
      ],
      area: "buu long",
      roadType: "tertiary"
    }
  ];
}