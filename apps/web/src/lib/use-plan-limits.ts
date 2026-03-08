'use client';

import { useState, useCallback } from 'react';

interface PlanLimitError {
  error: 'PLAN_LIMIT_REACHED' | 'FEATURE_NOT_AVAILABLE';
  message: string;
  metric?: string;
  feature?: string;
  current?: number;
  limit?: number;
  upgrade: boolean;
}

/**
 * Hook to handle plan limit errors from API responses.
 * Automatically detects 403 responses with plan limit payloads
 * and triggers the upgrade overlay.
 */
export function usePlanLimits() {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [upgradeFeature, setUpgradeFeature] = useState('');

  /**
   * Check a fetch response for plan limit errors.
   * Returns true if a plan limit was detected.
   */
  const checkResponse = useCallback(async (res: Response): Promise<boolean> => {
    if (res.status === 403) {
      try {
        const data: PlanLimitError = await res.clone().json();
        if (data.upgrade) {
          setUpgradeMessage(data.message);
          setUpgradeFeature(data.feature || data.metric || '');
          setShowUpgrade(true);
          return true;
        }
      } catch {
        // Not a JSON response
      }
    }
    return false;
  }, []);

  const closeUpgrade = useCallback(() => {
    setShowUpgrade(false);
    setUpgradeMessage('');
    setUpgradeFeature('');
  }, []);

  return {
    showUpgrade,
    upgradeMessage,
    upgradeFeature,
    checkResponse,
    closeUpgrade,
  };
}
