
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './components/auth/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster as SonnerToaster } from 'sonner';
import { Toaster } from '@/components/ui/toaster';
import AppRoutes from './components/layout/AppRoutes';
import AnalyticsDebugger from './components/analytics/AnalyticsDebugger';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <AuthProvider>
          <TooltipProvider>
            <BrowserRouter>
              <div className="flex min-h-screen flex-col">
                <header className="border-b flex items-center px-4 h-14">
                  <div className="flex items-center">
                    <span className="text-lg font-semibold ml-2">nexus</span>
                  </div>
                  <div className="ml-auto flex items-center space-x-4">
                    <button className="text-sm font-medium">user models</button>
                  </div>
                </header>
                <main className="flex-1">
                  <AppRoutes />
                </main>
              </div>
              <Toaster />
              <SonnerToaster 
                position="top-center" 
                closeButton 
                richColors 
                toastOptions={{
                  duration: 5000,
                  className: "z-[100]"
                }}
              />
              <AnalyticsDebugger />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
