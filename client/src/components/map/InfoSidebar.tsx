import { useMapContext } from "@/contexts/MapContext";
import { Button } from "@/components/ui/button";
import { X, MapPin, Crosshair, RefreshCw } from "lucide-react";
import { FaWikipediaW } from "react-icons/fa";
import LandmarkCard from "./LandmarkCard";
import { Separator } from "@/components/ui/separator";
import { useLandmarks } from "@/hooks/useLandmarks";

const InfoSidebar = () => {
  const {
    isOpen,
    setIsOpen,
    currentLandmark,
    setCurrentLandmark,
    landmarks,
    mapInstance,
    mapBounds,
    setMapCenter
  } = useMapContext();

  const { refetch: refetchLandmarks } = useLandmarks(mapBounds);

  const closeLandmarkDetails = () => {
    setCurrentLandmark(null);
  };

  const openWikipedia = (url: string) => {
    window.open(url, '_blank');
  };

  const centerOnLandmark = () => {
    if (!currentLandmark || !mapInstance) return;
    
    const coordinates = currentLandmark.coordinates as [number, number];
    setMapCenter(coordinates);
  };

  const refreshLandmarks = () => {
    refetchLandmarks();
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      id="sidebar"
      className={`fixed top-0 right-0 h-full bg-white shadow-lg w-80 max-w-xs z-20 transition-transform duration-300 ease-in-out transform ${
        isOpen ? "translate-x-0" : "translate-x-full"
      } flex flex-col map-overlay mobile-sidebar`}
    >
      {/* Sidebar Header */}
      <div className="flex justify-between items-center p-4 border-b border-neutral-200">
        <h2 className="text-lg font-semibold text-neutral-800">Landmarks</h2>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-neutral-500 hover:text-neutral-700">
          <X size={18} />
        </Button>
      </div>

      {/* Current Landmark Details */}
      {currentLandmark && (
        <div className="p-4 border-b border-neutral-200">
          <div className="mb-2 flex justify-between items-start">
            <h3 className="text-lg font-medium text-neutral-800">{currentLandmark.title}</h3>
            <Button variant="ghost" size="icon" onClick={closeLandmarkDetails} className="text-neutral-400 hover:text-neutral-600 h-8 w-8">
              <X size={16} />
            </Button>
          </div>
          
          <div className="mb-3 text-sm text-neutral-500 flex items-center">
            <MapPin size={14} className="mr-1" />
            <span>{currentLandmark.distance}</span>
          </div>
          
          {currentLandmark.thumbnail && (
            <div className="rounded-lg overflow-hidden mb-3 h-40 bg-neutral-100">
              <img
                src={currentLandmark.thumbnail}
                alt={currentLandmark.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <p className="text-sm text-neutral-700 mb-4 line-clamp-4">
            {currentLandmark.extract}
          </p>
          
          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center p-0 h-auto"
              onClick={() => openWikipedia(currentLandmark.url)}
            >
              <FaWikipediaW className="mr-1" /> Read on Wikipedia
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center p-0 h-auto"
              onClick={centerOnLandmark}
            >
              <Crosshair size={14} className="mr-1" /> Center on map
            </Button>
          </div>
        </div>
      )}

      {/* Landmark List */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Empty state */}
        {landmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 text-neutral-500">
            <MapPin size={40} className="mb-3 text-neutral-300" />
            <p className="mb-2">No landmarks in this area</p>
            <p className="text-sm">Try zooming out or moving the map to discover more locations</p>
          </div>
        ) : (
          /* Landmarks list */
          <div>
            {landmarks.map((landmark) => (
              <LandmarkCard
                key={landmark.id}
                landmark={landmark}
                isActive={currentLandmark?.id === landmark.id}
                onClick={() => setCurrentLandmark(landmark)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-neutral-200">
        <div className="text-xs text-neutral-500 flex justify-between items-center">
          <span>
            Landmarks found: <span className="font-medium">{landmarks.length}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-600 text-xs hover:text-primary-700 p-0 h-auto"
            onClick={refreshLandmarks}
          >
            <RefreshCw size={12} className="mr-1" /> Refresh
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InfoSidebar;
