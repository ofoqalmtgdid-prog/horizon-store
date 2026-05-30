import { useMe, getMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const TOKEN_KEY = "horizonStoreToken";

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useMe({
    query: {
      queryKey: getMeQueryKey(),
      retry: false,
      staleTime: Infinity,
    },
  });

  const setToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
  };

  const clearToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    queryClient.setQueryData(getMeQueryKey(), null);
  };

  const refreshUser = () => {
    queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
  };

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    setToken,
    clearToken,
    refreshUser,
  };
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}
