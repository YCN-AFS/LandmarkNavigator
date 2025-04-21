import MapContainer from "@/components/map/MapContainer";
import SearchBox from "@/components/map/SearchBox";
import InfoSidebar from "@/components/map/InfoSidebar";
import SidebarToggle from "@/components/map/SidebarToggle";
import InfoPanel from "@/components/map/InfoPanel";
import MapControls from "@/components/map/MapControls";
import LoadingOverlay from "@/components/map/LoadingOverlay";
import { useEffect } from "react";
import { useMapContext } from "@/contexts/MapContext";
import { useRoads } from "@/hooks/useRoads";
import { useLandmarks } from "@/hooks/useLandmarks";

export default function MapPage() {
  const { 
    isLoading, 
    setIsLoading, 
    mapBounds,
  } = useMapContext();
  
  const { 
    data: landmarksData, 
    isLoading: isLandmarksLoading, 
    isFetching: isLandmarksFetching 
  } = useLandmarks(mapBounds);

  const { prefetchBuuLongRoads } = useRoads();

  useEffect(() => {
    // Prefetch Buu Long roads data for faster access later
    prefetchBuuLongRoads();
  }, [prefetchBuuLongRoads]);

  useEffect(() => {
    // Update loading state based on data fetching
    setIsLoading(isLandmarksLoading || isLandmarksFetching);
  }, [isLandmarksLoading, isLandmarksFetching, setIsLoading]);

  return (
    <div className="h-screen w-full relative overflow-hidden">
      {/* Map Container - fullscreen element */}
      <MapContainer />
      
      {/* UI Overlays */}
      <SearchBox />
      <InfoSidebar />
      <SidebarToggle />
      <InfoPanel />
      <MapControls />
      <LoadingOverlay />
    </div>
  );
}
