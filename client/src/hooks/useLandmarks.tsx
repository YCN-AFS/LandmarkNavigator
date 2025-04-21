import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useMapContext } from "@/contexts/MapContext";
import { fetchLandmarksByBounds } from "@/lib/wikiApi";
import type { Coordinate } from "@shared/schema";

export function useLandmarks(bounds: [Coordinate, Coordinate] | null) {
  const { setLandmarks } = useMapContext();

  // Query for landmarks based on map bounds
  const query = useQuery({
    queryKey: ['/api/landmarks', bounds],
    queryFn: async () => {
      if (!bounds) return [];
      return await fetchLandmarksByBounds(bounds);
    },
    enabled: !!bounds,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Update landmarks in context when data changes
  useEffect(() => {
    if (query.data) {
      setLandmarks(query.data);
    }
  }, [query.data, setLandmarks]);

  return query;
}
