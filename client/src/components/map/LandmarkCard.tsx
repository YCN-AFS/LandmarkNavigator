import { Landmark } from "@shared/schema";
import { cn } from "@/lib/utils";

interface LandmarkCardProps {
  landmark: Landmark;
  isActive: boolean;
  onClick: () => void;
}

const LandmarkCard = ({ landmark, isActive, onClick }: LandmarkCardProps) => {
  return (
    <div
      className={cn(
        "bg-white rounded-lg p-3 mb-2 shadow-sm hover:bg-neutral-50 cursor-pointer transition-colors border",
        isActive ? "border-primary-300 bg-primary-50 hover:bg-primary-50" : "border-neutral-100"
      )}
      onClick={onClick}
    >
      <div className="flex items-start">
        <div className="w-16 h-16 bg-neutral-100 rounded-md overflow-hidden flex-shrink-0 mr-3">
          {landmark.thumbnail ? (
            <img
              src={landmark.thumbnail}
              alt={landmark.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-200 text-neutral-400">
              No image
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-neutral-800 truncate">{landmark.title}</h4>
          <p className="text-sm text-neutral-500 line-clamp-2 mt-1">
            {landmark.extract.substring(0, 100)}{landmark.extract.length > 100 ? '...' : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandmarkCard;
