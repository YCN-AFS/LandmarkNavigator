import { useMapContext } from "@/contexts/MapContext";
import { Button } from "@/components/ui/button";
import { Info, CheckCircle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const InfoPanel = () => {
  const { isInfoVisible, infoMessage, infoType, setIsInfoVisible } = useMapContext();

  const closeInfoPanel = () => {
    setIsInfoVisible(false);
  };

  // Determine icon based on info type
  const InfoIcon = () => {
    switch (infoType) {
      case "success":
        return <CheckCircle className="text-green-500" size={18} />;
      case "error":
        return <AlertCircle className="text-red-500" size={18} />;
      default:
        return <Info className="text-primary-500" size={18} />;
    }
  };

  // Determine background color based on info type
  const getPanelClasses = () => {
    switch (infoType) {
      case "success":
        return "bg-green-50";
      case "error":
        return "bg-red-50";
      default:
        return "bg-white";
    }
  };

  // Determine text color based on info type
  const getTextClasses = () => {
    switch (infoType) {
      case "success":
        return "text-green-800";
      case "error":
        return "text-red-800";
      default:
        return "text-neutral-700";
    }
  };

  if (!isInfoVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-20 map-overlay">
      <div
        className={cn(
          "shadow-lg rounded-lg p-3 max-w-md flex items-center",
          getPanelClasses()
        )}
      >
        <div className="mr-3">
          <InfoIcon />
        </div>
        <p className={cn("text-sm", getTextClasses())}>{infoMessage}</p>
        <Button
          variant="ghost"
          size="sm"
          className="ml-3 text-neutral-400 hover:text-neutral-600 p-0 h-auto"
          onClick={closeInfoPanel}
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );
};

export default InfoPanel;
