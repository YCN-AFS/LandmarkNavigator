import { useMapContext } from "@/contexts/MapContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Locate, TrafficCone } from "lucide-react";
import { useRoads } from "@/hooks/useRoads";
import { cn } from "@/lib/utils";

const MapControls = () => {
  const {
    isDarkMode,
    setIsDarkMode,
    setMapCenter,
    isRoadsVisible,
    setIsRoadsVisible,
    showInfoMessage
  } = useMapContext();

  const { getBuuLongRoads } = useRoads();

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      showInfoMessage("Getting your current location...", "info");
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          showInfoMessage("Map centered on your current location", "success");
        },
        (error) => {
          showInfoMessage(`Unable to get location: ${error.message}`, "error");
        }
      );
    } else {
      showInfoMessage("Geolocation is not supported by this browser", "error");
    }
  };

  const showBuuLongRoads = async () => {
    try {
      if (isRoadsVisible) {
        setIsRoadsVisible(false);
        showInfoMessage("Buu Long roads hidden", "info");
      } else {
        showInfoMessage("Loading Buu Long road coordinates...", "info");
        await getBuuLongRoads();
        setIsRoadsVisible(true);
        showInfoMessage("TrafficCone coordinates for Bửu Long area have been loaded successfully", "success");
      }
    } catch (error) {
      showInfoMessage("Failed to load Buu Long road coordinates", "error");
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-10 flex flex-col space-y-2 map-overlay">
      <Button
        variant="outline"
        size="icon"
        className="bg-white shadow-md rounded-full w-10 h-10 flex items-center justify-center text-neutral-600 hover:text-primary-600 transition-colors"
        onClick={toggleDarkMode}
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="bg-white shadow-md rounded-full w-10 h-10 flex items-center justify-center text-neutral-600 hover:text-primary-600 transition-colors"
        onClick={getCurrentLocation}
      >
        <Locate size={18} />
      </Button>
      <Button
        variant={isRoadsVisible ? "default" : "outline"}
        size="icon"
        className={cn(
          "shadow-md rounded-full w-10 h-10 flex items-center justify-center transition-colors",
          isRoadsVisible 
            ? "bg-primary-500 text-white hover:bg-primary-600" 
            : "bg-white text-neutral-600 hover:text-primary-600",
          isRoadsVisible ? "" : "pulse-animation"
        )}
        onClick={showBuuLongRoads}
        title="Show Bửu Long Roads"
      >
        <TrafficCone size={18} />
      </Button>
    </div>
  );
};

export default MapControls;
