import type { PropsWithChildren } from 'react'

interface PullToRefreshProps extends PropsWithChildren {
  isPulling?: boolean
  isRefreshing?: boolean
  pullDistance?: number
  canRefresh?: boolean
}

export function PullToRefresh({
  canRefresh,
  children,
  isPulling,
  isRefreshing,
  pullDistance = 0
}: PullToRefreshProps) {
  const progress = Math.min(Math.round((pullDistance / 80) * 100), 100)

  return (
    <div className="app-pull-refresh">
      {isPulling || isRefreshing ? (
        <div className="app-pull-refresh-bar" aria-hidden="true">
          <div
            className="app-pull-refresh-fill"
            style={{ width: `${isRefreshing ? 100 : canRefresh ? 100 : progress}%` }}
          />
        </div>
      ) : null}
      {children}
    </div>
  )
}
