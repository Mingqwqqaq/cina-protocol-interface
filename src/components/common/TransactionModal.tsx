import { CopyOutlined, LinkOutlined } from '@ant-design/icons'
import { SUPPORTED_NETWORKS, useWalletStore } from '@/stores/wallet'

export interface TransactionStep {
  label: string
  description?: string
}

export interface TransactionDetail {
  label: string
  values: string[]
  highlight?: boolean
  type?: 'debit' | 'credit'
}

interface GasInfo {
  gasLimit: string
  gasPrice: string
  estimatedFee: string
  maxFee: string
}

interface TransactionModalProps {
  visible: boolean
  title?: string
  steps: TransactionStep[]
  currentStep: number
  status: 'pending' | 'loading' | 'success' | 'error'
  transactionDetails: TransactionDetail[]
  gasInfo?: GasInfo
  transactionHash?: string
  errorMessage?: string
  showViewTransaction?: boolean
  onClose: () => void
  onRetry: () => void
}

function getStepState(index: number, currentStep: number, status: TransactionModalProps['status']) {
  if (status === 'error' && index === currentStep) {
    return 'error'
  }
  if (status === 'success' && index <= currentStep) {
    return 'done'
  }
  if (index < currentStep) {
    return 'done'
  }
  if (index === currentStep) {
    return status === 'error' ? 'error' : 'current'
  }
  return 'pending'
}

export function TransactionModal({
  currentStep,
  errorMessage,
  gasInfo,
  onClose,
  onRetry,
  showViewTransaction = true,
  status,
  steps,
  title,
  transactionDetails,
  transactionHash,
  visible
}: TransactionModalProps) {
  const chainId = useWalletStore(state => state.chainId)
  const blockExplorer = SUPPORTED_NETWORKS[chainId]?.blockExplorer
  const boundedStep = Math.min(currentStep, Math.max(steps.length - 1, 0))

  if (!visible) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] p-4"
      onClick={event => {
        if (event.target === event.currentTarget && status !== 'loading') {
          onClose()
        }
      }}
    >
      <div className="w-full max-w-2xl rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{title || 'Transaction'}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {status === 'success'
                ? 'Transaction complete.'
                : status === 'error'
                  ? 'Transaction failed.'
                  : 'Follow the steps below to complete your transaction.'}
            </p>
          </div>
          {status !== 'loading' ? (
            <button className="app-icon-button" type="button" onClick={onClose}>
              ×
            </button>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2">
            {steps.map((step, index) => {
              const state = getStepState(index, boundedStep, status)
              const isCurrent = state === 'current'
              const isDone = state === 'done'
              const isError = state === 'error'

              return (
                <div
                  key={`${step.label}-${index}`}
                  className={`rounded-2xl border px-4 py-4 ${
                    isError
                      ? 'border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.08)]'
                      : isCurrent
                        ? 'border-[var(--primary-color)] bg-[var(--bg-secondary)]'
                        : isDone
                          ? 'border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.08)]'
                          : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        isError
                          ? 'bg-[var(--error-color)] text-white'
                          : isCurrent
                            ? 'bg-[var(--primary-color)] text-white'
                            : isDone
                              ? 'bg-[var(--success-color)] text-white'
                              : 'bg-[var(--card-bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {isDone ? '✓' : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-[var(--text-primary)]">{step.label}</span>
                      {step.description ? (
                        <span className="mt-1 block text-sm text-[var(--text-secondary)]">{step.description}</span>
                      ) : null}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {transactionHash ? (
            <div className="rounded-2xl bg-[var(--bg-secondary)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                    Transaction Hash
                  </div>
                  <div className="mt-3 break-all text-sm font-medium text-[var(--text-primary)]">{transactionHash}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="app-icon-button"
                    type="button"
                    onClick={() => {
                      if (transactionHash) {
                        void navigator.clipboard.writeText(transactionHash)
                      }
                    }}
                  >
                    <CopyOutlined />
                  </button>
                  {blockExplorer ? (
                    <a
                      className="app-icon-button"
                      href={`${blockExplorer}/tx/${transactionHash}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <LinkOutlined />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[var(--bg-secondary)] p-5">
              <div className="space-y-4">
                {transactionDetails.map(detail => (
                  <div key={detail.label} className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] pb-4 last:border-b-0 last:pb-0">
                    <span className="text-sm text-[var(--text-secondary)]">{detail.label}</span>
                    <span className="text-right">
                      {detail.values.map(value => (
                        <span
                          key={value}
                          className={`block text-sm ${
                            detail.type === 'debit'
                              ? 'text-[var(--error-color)]'
                              : detail.type === 'credit'
                                ? 'text-[var(--success-color)]'
                                : 'text-[var(--text-primary)]'
                          } ${detail.highlight ? 'font-semibold' : 'font-medium'}`}
                        >
                          {value}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gasInfo ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Gas Limit', gasInfo.gasLimit],
                ['Gas Price', gasInfo.gasPrice],
                ['Estimated Fee', gasInfo.estimatedFee],
                ['Max Fee', gasInfo.maxFee]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-[var(--bg-secondary)] p-4">
                  <div className="text-sm text-[var(--text-secondary)]">{label}</div>
                  <div className="mt-2 font-semibold text-[var(--text-primary)]">{value}</div>
                </div>
              ))}
            </div>
          ) : null}

          {status === 'pending' ? (
            <div className="app-inline-note is-info">Confirm the transaction in your wallet.</div>
          ) : null}

          {status === 'loading' ? (
            <div className="app-inline-note is-info">
              {steps[boundedStep]?.description || steps[boundedStep]?.label || 'Processing transaction...'}
            </div>
          ) : null}

          {status === 'error' && errorMessage ? (
            <div className="app-inline-note is-error">{errorMessage}</div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            {status !== 'loading' ? (
              <button className="app-action-button is-subtle" type="button" onClick={onClose}>
                {status === 'success' ? 'Close' : 'Cancel'}
              </button>
            ) : null}
            {status === 'error' ? (
              <button className="app-action-button is-primary" type="button" onClick={onRetry}>
                Retry
              </button>
            ) : null}
            {status === 'success' && showViewTransaction && transactionHash && blockExplorer ? (
              <a
                className="app-action-button is-primary"
                href={`${blockExplorer}/tx/${transactionHash}`}
                rel="noreferrer"
                target="_blank"
              >
                View On Explorer
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
