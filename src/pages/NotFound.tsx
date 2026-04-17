import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { PageScaffold, PageSection } from '@/pages/PageScaffold'
import { resolveText } from '@/utils/i18n'

export default function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <PageScaffold title="404">
      <PageSection>
        <div className="mx-auto max-w-3xl py-8 text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">404</div>
          <h2 className="mt-4 text-4xl font-bold text-[var(--text-primary)]">Page Not Found</h2>
          <p className="mx-auto mt-4 max-w-xl text-[var(--text-secondary)]">
            {resolveText(t('error.pageNotFoundMessage'), 'error.pageNotFoundMessage', 'The page you requested does not exist or may have been moved.')}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link className="app-action-button is-primary" to="/">
              {resolveText(t('error.goHome'), 'error.goHome', 'Go Home')}
            </Link>
            <button className="app-action-button is-subtle" type="button" onClick={() => navigate(-1)}>
              {resolveText(t('error.goBack'), 'error.goBack', 'Go Back')}
            </button>
          </div>
        </div>
      </PageSection>
    </PageScaffold>
  )
}
