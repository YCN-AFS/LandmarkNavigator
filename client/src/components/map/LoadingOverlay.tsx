import { useMapContext } from "@/contexts/MapContext";

const LoadingOverlay = () => {
  const { isLoading } = useMapContext();

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-neutral-900 bg-opacity-30 flex items-center justify-center z-30 map-overlay">
      <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full mx-4">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
        <p className="text-center text-neutral-700 font-medium">Loading map data...</p>
        <p className="text-center text-neutral-500 text-sm mt-1">
          Retrieving landmarks and geographic information
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
