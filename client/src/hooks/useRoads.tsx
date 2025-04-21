import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { useMapContext } from "@/contexts/MapContext";
import { fetchBuuLongRoads } from "@/lib/wikiApi";

export function useRoads() {
  const { setRoads } = useMapContext();
  const queryClient = useQueryClient();

  // Query for Buu Long roads
  const query = useQuery({
    queryKey: ['/api/roads/buu-long'],
    queryFn: fetchBuuLongRoads,
    enabled: false, // Don't fetch automatically
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Update roads in context when data changes
  useEffect(() => {
    if (query.data) {
      setRoads(query.data);
    }
  }, [query.data, setRoads]);

  // Prefetch Buu Long roads for faster access later
  const prefetchBuuLongRoads = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['/api/roads/buu-long'],
      queryFn: fetchBuuLongRoads,
    });
  }, [queryClient]);

  // Get Buu Long roads on demand
  const getBuuLongRoads = useCallback(async () => {
    const data = await query.refetch();
    return data.data;
  }, [query]);

  return {
    ...query,
    prefetchBuuLongRoads,
    getBuuLongRoads,
  };
}
