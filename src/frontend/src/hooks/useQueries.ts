import { useMutation, useQuery } from "@tanstack/react-query";
import type { UserProfile } from "../backend";
import { useActor } from "./useActor";

export function useUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveUserProfile() {
  const { actor } = useActor();
  return useMutation<void, Error, UserProfile>({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
  });
}

// Stub hooks for coins - use static fallback data in App.tsx
export function useAllCoins() {
  return useQuery<never[]>({
    queryKey: ["allCoins"],
    queryFn: async () => [],
    enabled: false,
  });
}

export function useFeaturedCoins() {
  return useQuery<never[]>({
    queryKey: ["featuredCoins"],
    queryFn: async () => [],
    enabled: false,
  });
}
