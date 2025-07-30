import React, { useState } from 'react';
import { useSyncStatus } from '../../hooks/useOfflineQuery';
import { syncService } from '../../services/syncService';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Database,
  Sync
} from 'lucide-react';
import { toast } from 'sonner';

interface SyncStatusProps {
  compact?: boolean;
  showDetails?: boolean;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ 
  compact = false, 
  showDetails = false 
}) => {
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const syncStatus = useSyncStatus();

  const handleManualSync = async () => {
    if (!syncStatus?.isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    setIsManualSyncing(true);
    try {
      const result = await syncService.forceSync();
      if (result.success) {
        toast.success(`Sync completed! ${result.synced} items synced`);
      } else {
        toast.error(`Sync failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      toast.error('Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getStatusIcon = () => {
    if (!syncStatus) return <Clock className="h-4 w-4" />;
    
    if (syncStatus.isOnline) {
      return <Wifi className="h-4 w-4 text-green-500" />;
    } else {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    if (!syncStatus) return 'Loading...';
    
    if (syncStatus.isOnline) {
      if (syncStatus.pendingItems > 0) {
        return `Online (${syncStatus.pendingItems} pending)`;
      }
      return 'Online & Synced';
    } else {
      if (syncStatus.pendingItems > 0) {
        return `Offline (${syncStatus.pendingItems} pending)`;
      }
      return 'Offline';
    }
  };

  const getStatusColor = () => {
    if (!syncStatus) return 'secondary';
    
    if (syncStatus.isOnline) {
      return syncStatus.pendingItems > 0 ? 'warning' : 'success';
    } else {
      return syncStatus.pendingItems > 0 ? 'destructive' : 'secondary';
    }
  };

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return 'Never';
    
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <Badge variant={getStatusColor() as any}>
          {getStatusText()}
        </Badge>
        {syncStatus?.isOnline && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${isManualSyncing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  if (!showDetails) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>
            {syncStatus?.isOnline && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={isManualSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isManualSyncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
            )}
          </div>
          {syncStatus?.lastSync && (
            <p className="text-xs text-muted-foreground mt-2">
              Last sync: {formatLastSync(syncStatus.lastSync)}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5" />
          Sync Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">
              {syncStatus?.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <Badge variant={syncStatus?.isOnline ? 'success' : 'secondary'}>
            {syncStatus?.isOnline ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        {/* Pending Items */}
        {syncStatus && syncStatus.pendingItems > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm">Pending Changes</span>
            </div>
            <Badge variant="warning">
              {syncStatus.pendingItems} items
            </Badge>
          </div>
        )}

        {/* Conflicts */}
        {syncStatus && syncStatus.conflicts > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm">Conflicts</span>
            </div>
            <Badge variant="destructive">
              {syncStatus.conflicts} conflicts
            </Badge>
          </div>
        )}

        {/* Last Sync */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">Last Sync</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatLastSync(syncStatus?.lastSync)}
          </span>
        </div>

        {/* Manual Sync Button */}
        <div className="pt-2">
          <Button
            onClick={handleManualSync}
            disabled={!syncStatus?.isOnline || isManualSyncing}
            className="w-full"
            variant={syncStatus?.pendingItems ? 'default' : 'outline'}
          >
            <Sync className={`h-4 w-4 mr-2 ${isManualSyncing ? 'animate-spin' : ''}`} />
            {isManualSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>

        {/* Offline Message */}
        {!syncStatus?.isOnline && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <p>You're currently offline. Changes will be saved locally and synced when you're back online.</p>
          </div>
        )}

        {/* Pending Changes Message */}
        {syncStatus?.isOnline && syncStatus.pendingItems > 0 && (
          <div className="text-xs text-muted-foreground bg-orange-50 p-2 rounded border border-orange-200">
            <p>You have unsaved changes that will be synced automatically or you can sync manually.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Hook to show sync status in toast notifications
export const useSyncNotifications = () => {
  React.useEffect(() => {
    const handleSyncStatus = (status: any) => {
      switch (status.type) {
        case 'online':
          toast.success('Back online! Syncing data...');
          break;
        case 'offline':
          toast.info('You\'re now offline. Changes will be saved locally.');
          break;
        case 'sync_complete':
          if (status.result?.synced > 0) {
            toast.success(`Sync completed! ${status.result.synced} items synced.`);
          }
          break;
        case 'sync_error':
          toast.error(`Sync failed: ${status.error}`);
          break;
      }
    };

    syncService.addSyncListener(handleSyncStatus);

    return () => {
      syncService.removeSyncListener(handleSyncStatus);
    };
  }, []);
};