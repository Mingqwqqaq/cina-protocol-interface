import type { PropsWithChildren, ReactNode } from 'react'

interface PageScaffoldProps extends PropsWithChildren {
  title: string
  subtitle?: string
  extra?: ReactNode
}

export function PageScaffold({ children, extra, subtitle, title }: PageScaffoldProps) {
  return (
    <div className="app-page-inner">
      <div className="page-heading">
        <div className="page-heading-copy">
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
        {extra ? <div>{extra}</div> : null}
      </div>
      {children}
    </div>
  )
}

export function PageSection({ children }: PropsWithChildren) {
  return <div className="page-surface">{children}</div>
}

export function PageStack({ children }: PropsWithChildren) {
  return <div className="app-page-inner">{children}</div>
}
