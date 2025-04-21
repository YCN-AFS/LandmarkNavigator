import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useMapContext } from "@/contexts/MapContext";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { debounce } from "@/lib/utils";

const DEBOUNCE_DELAY = 500; // ms

const SearchBox = () => {
  const { 
    setMapCenter, 
    setMapZoom, 
    searchQuery, 
    setSearchQuery,
    showInfoMessage
  } = useMapContext();

  // Local state for input value
  const [inputValue, setInputValue] = useState(searchQuery);

  // Buu Long coordinates
  const BUU_LONG_COORDINATES: [number, number] = [10.9565, 106.8603];

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['/api/search', searchQuery],
    enabled: searchQuery.length > 2,
  });

  // Handle input change with debounce
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchQuery(value);
    }, DEBOUNCE_DELAY),
    [setSearchQuery]
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSearch(value);
  };

  // Center map on Buu Long
  const handleCenterOnBuuLong = () => {
    setMapCenter(BUU_LONG_COORDINATES);
    setMapZoom(14);
    showInfoMessage("Map centered on Bửu Long area", "info");
  };

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-xl px-4 sm:px-0 map-overlay">
      <div className="relative w-full">
        <Input
          type="text"
          placeholder="Search for locations or landmarks..."
          className="w-full h-12 pl-12 pr-[100px] rounded-lg shadow-md bg-white border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={inputValue}
          onChange={handleInputChange}
        />
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-500">
          <Search size={18} />
        </div>
        <Button
          className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-primary-500 text-white px-3 py-1 rounded-md text-sm hover:bg-primary-600 transition-colors"
          onClick={handleCenterOnBuuLong}
        >
          Bửu Long
        </Button>
      </div>
    </div>
  );
};

export default SearchBox;
