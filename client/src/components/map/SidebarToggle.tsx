import { useMapContext } from "@/contexts/MapContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const SidebarToggle = () => {
  const { isOpen, setIsOpen } = useMapContext();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      className="fixed top-1/2 right-0 transform -translate-y-1/2 z-20 map-overlay"
      style={{ display: isOpen ? "none" : "block" }}
    >
      <Button
        variant="outline"
        className="bg-white shadow-md rounded-l-lg py-6 px-2 text-neutral-600 hover:text-primary-600 transition-colors border-0"
        onClick={toggleSidebar}
      >
        <ChevronLeft />
      </Button>
    </div>
  );
};

export default SidebarToggle;
