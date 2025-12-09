import { useData } from '../contexts/DataContext';
import Card from './primitives/Card.jsx';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useCallback } from 'react';
import { COLLECTIONS } from '../constants';

export default function ConnectionStatus() {
  const { isConnected, loading, forceRefresh, data } = useData();
  const isRefreshing = loading.all || Object.values(loading).some(v => v === true);

  // Check if API is configured
  const hasApiKey = import.meta.env.VITE_GOOGLE_API_KEY && import.meta.env.VITE_GOOGLE_API_KEY !== 'your_api_key_here';
  const hasSheetId = import.meta.env.VITE_GOOGLE_SHEET_ID && import.meta.env.VITE_GOOGLE_SHEET_ID !== 'your_sheet_id_here';
  const isConfigured = hasApiKey && hasSheetId;

  // Consider connected if configured and we have data structure (even if empty)
  const actuallyConnected = isConfigured && (isConnected || (data && Object.keys(data).length > 0));

  const handleRefresh = useCallback(async () => {
    // Force refresh all common sheets
    await forceRefresh([
      COLLECTIONS.USERS,
      COLLECTIONS.CLIENTS,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.ASSETS,
      COLLECTIONS.ATTENDANCE,
      COLLECTIONS.PHOTOGRAPHER_ATTENDANCE,
      COLLECTIONS.EDITOR_TIME_LOGS
    ]);
  }, [forceRefresh]);

  // Don't show connection status if API is not configured (to avoid confusion)
  if (!isConfigured) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Card glass className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl backdrop-blur-md transition-colors duration-300 ${actuallyConnected
          ? 'bg-green-500/10 border-green-500/20 text-green-700'
          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700'
        }`}>
        {actuallyConnected ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Wifi className="w-5 h-5 text-green-600" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </div>
            <span className="text-sm font-bold">Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-bold">Syncing...</span>
          </div>
        )}

        <div className="h-4 w-px bg-current opacity-20 mx-1"></div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 active:scale-95"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </Card>
    </div>
  );
}
