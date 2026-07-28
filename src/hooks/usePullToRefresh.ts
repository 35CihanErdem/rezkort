import { useCallback, useState } from 'react';
import type { RefreshControlProps } from 'react-native';
import { colors } from '../theme';

type PullRefresh = {
  refreshing: boolean;
  refresh: () => Promise<void>;
  refreshControlProps: RefreshControlProps;
};

export function usePullToRefresh(onRefresh: () => Promise<void>): PullRefresh {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return {
    refreshing,
    refresh,
    refreshControlProps: {
      refreshing,
      onRefresh: () => {
        void refresh();
      },
      tintColor: colors.courtDeep,
      colors: [colors.courtDeep],
      progressBackgroundColor: colors.surface,
    },
  };
}
