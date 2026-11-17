import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export function ProtectedRoute() {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const result = await api<{ username: string }>('/api/auth/me');
        setAuthenticated(result.username);
        return result;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setAnonymous();
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  if (me.isPending) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (me.isError) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <p className="text-sm text-red-300">
          {me.error instanceof ApiError ? me.error.message : 'Could not check the current session.'}
        </p>
        <Button className="mt-4" variant="outline" onClick={() => me.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!me.data?.username) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
