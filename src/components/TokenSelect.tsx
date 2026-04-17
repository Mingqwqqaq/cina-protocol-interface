import { DownOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { TokenIcon } from '@/components/common/TokenIcon'

export interface SelectableToken {
  symbol: string
  name: string
  address: string
  decimals: number
  balance?: number | string
}

interface TokenSelectProps {
  value?: SelectableToken
  tokens: SelectableToken[]
  placeholder?: string
  disabled?: boolean
  onChange: (token: SelectableToken) => void
  onTokenChange?: (token: SelectableToken, previousToken?: SelectableToken) => void
}

export function TokenSelect({
  disabled,
  onChange,
  onTokenChange,
  placeholder,
  tokens,
  value
}: TokenSelectProps) {
  const [open, setOpen] = useState(false)
  const label = useMemo(() => placeholder || 'Select token', [placeholder])

  return (
    <>
      <button
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary-color)] hover:text-[var(--primary-color)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        type="button"
        onClick={() => setOpen(true)}
      >
        {value ? <TokenIcon size="medium" symbol={value.symbol} /> : null}
        <span>{value?.symbol || label}</span>
        <DownOutlined />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{label}</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Choose the asset to continue.</p>
              </div>
              <button className="app-icon-button" type="button" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            {!tokens.length ? (
              <div className="app-inline-note">No available tokens</div>
            ) : (
              <div className="space-y-3">
                {tokens.map(token => (
                  <button
                    key={token.address}
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4 text-left transition hover:border-[var(--primary-color)]"
                    type="button"
                    onClick={() => {
                      onChange(token)
                      onTokenChange?.(token, value)
                      setOpen(false)
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <TokenIcon size="large" symbol={token.symbol} />
                      <span className="flex flex-col">
                        <span className="font-semibold text-[var(--text-primary)]">{token.symbol}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{token.name}</span>
                      </span>
                    </span>
                    {token.balance !== undefined ? (
                      <span className="text-xs font-medium text-[var(--text-secondary)]">Balance: {token.balance}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
