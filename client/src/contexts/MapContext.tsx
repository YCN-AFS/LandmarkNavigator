import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Landmark, Road, Coordinate } from "@shared/schema";

type MapContextType = {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentLandmark: Landmark | null;
  setCurrentLandmark: (landmark: Landmark | null) => void;
  landmarks: Landmark[];
  setLandmarks: (landmarks: Landmark[]) => void;
  isInfoVisible: boolean;
  setIsInfoVisible: (isVisible: boolean) => void;
  infoMessage: string;
  setInfoMessage: (message: string) => void;
  infoType: 'info' | 'success' | 'error';
  setInfoType: (type: 'info' | 'success' | 'error') => void;
  isDarkMode: boolean;
  setIsDarkMode: (isDarkMode: boolean) => void;
  mapCenter: Coordinate;
  setMapCenter: (center: Coordinate) => void;
  mapZoom: number;
  setMapZoom: (zoom: number) => void;
  mapInstance: any;
  setMapInstance: (map: any) => void;
  roads: Road[];
  setRoads: (roads: Road[]) => void;
  isRoadsVisible: boolean;
  setIsRoadsVisible: (isVisible: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  mapBounds: [Coordinate, Coordinate] | null;
  setMapBounds: (bounds: [Coordinate, Coordinate] | null) => void;
  showInfoMessage: (message: string, type: 'info' | 'success' | 'error', duration?: number) => void;
};

const MapContext = createContext<MapContextType | undefined>(undefined);

export function MapProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [currentLandmark, setCurrentLandmark] = useState<Landmark | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [infoType, setInfoType] = useState<'info' | 'success' | 'error'>('info');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mapCenter, setMapCenter] = useState<Coordinate>([10.9565, 106.8603]); // Buu Long coordinates
  const [mapZoom, setMapZoom] = useState(14);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [roads, setRoads] = useState<Road[]>([]);
  const [isRoadsVisible, setIsRoadsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapBounds, setMapBounds] = useState<[Coordinate, Coordinate] | null>(null);

  const showInfoMessage = (
    message: string, 
    type: 'info' | 'success' | 'error' = 'info', 
    duration: number = 5000
  ) => {
    setInfoMessage(message);
    setInfoType(type);
    setIsInfoVisible(true);
    
    // Auto-hide after duration
    setTimeout(() => {
      setIsInfoVisible(false);
    }, duration);
  };

  const value = {
    isLoading,
    setIsLoading,
    isOpen,
    setIsOpen,
    currentLandmark,
    setCurrentLandmark,
    landmarks,
    setLandmarks,
    isInfoVisible,
    setIsInfoVisible,
    infoMessage,
    setInfoMessage,
    infoType,
    setInfoType,
    isDarkMode,
    setIsDarkMode,
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    mapInstance,
    setMapInstance,
    roads,
    setRoads,
    isRoadsVisible,
    setIsRoadsVisible,
    searchQuery,
    setSearchQuery,
    mapBounds,
    setMapBounds,
    showInfoMessage
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error("useMapContext must be used within a MapProvider");
  }
  return context;
}
