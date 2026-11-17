import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Skeleton } from '@/components/ui/skeleton';
import { LoginPage } from '@/pages/LoginPage';

const CalendarPage = lazy(() => import('@/pages/CalendarPage').then((module) => ({ default: module.CalendarPage })));
const CompaniesPage = lazy(() => import('@/pages/CompaniesPage').then((module) => ({ default: module.CompaniesPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="p-8"><Skeleton className="h-80 w-full" /></div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<CalendarPage />} />
                <Route path="/companies" element={<CompaniesPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
