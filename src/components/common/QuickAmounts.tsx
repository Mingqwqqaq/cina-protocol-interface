interface QuickAmountsProps {
  percentages?: number[]
  showMax?: boolean
  maxLabel?: string
  disabled?: boolean
  onSelectPercentage: (percentage: number) => void
  onSelectMax: () => void
}

export function QuickAmounts({
  disabled,
  maxLabel = 'MAX',
  onSelectMax,
  onSelectPercentage,
  percentages = [25, 50, 75],
  showMax = true
}: QuickAmountsProps) {
  return (
    <div className="quick-amounts">
      {percentages.map(percentage => (
        <button
          key={percentage}
          className="quick-amount-button"
          disabled={disabled}
          type="button"
          onClick={() => onSelectPercentage(percentage)}
        >
          {percentage}%
        </button>
      ))}
      {showMax ? (
        <button className="quick-amount-button" disabled={disabled} type="button" onClick={onSelectMax}>
          {maxLabel}
        </button>
      ) : null}
    </div>
  )
}
