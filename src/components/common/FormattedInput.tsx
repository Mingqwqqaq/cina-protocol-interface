import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import BigNumber from 'bignumber.js'
import { formatLargeNumber, formatNumber } from '@/utils/format'

interface FormattedInputProps {
  modelValue: string | number
  placeholder?: string
  size?: 'large' | 'middle' | 'small'
  className?: string
  decimals?: number
  useAbbreviation?: boolean
  abbreviationThreshold?: number
  maxDecimals?: number
  inputSuffix?: string
  disabled?: boolean
  readOnly?: boolean
  children?: ReactNode
  onInputChange?: (value: string) => void
  onChange: (value: string) => void
}

function parseAbbreviatedValue(value: string) {
  const cleanValue = value.trim().toLowerCase()
  const numericMatch = cleanValue.match(/^([0-9]*\.?[0-9]+)/)
  if (!numericMatch) {
    return '0'
  }

  const numericPart = new BigNumber(numericMatch[1])

  if (cleanValue.includes('t')) {
    return numericPart.multipliedBy('1e12').toString()
  }

  if (cleanValue.includes('b')) {
    return numericPart.multipliedBy('1e9').toString()
  }

  if (cleanValue.includes('m')) {
    return numericPart.multipliedBy('1e6').toString()
  }

  if (cleanValue.includes('k')) {
    return numericPart.multipliedBy('1e3').toString()
  }

  return value
}

function formatDisplayValue(
  value: string,
  decimals: number,
  useAbbreviation: boolean,
  abbreviationThreshold: number
) {
  if (!value || value === '0') {
    return ''
  }

  const numericValue = new BigNumber(value)
  if (numericValue.isNaN() || numericValue.isZero()) {
    return ''
  }

  if (useAbbreviation && numericValue.isGreaterThanOrEqualTo(abbreviationThreshold)) {
    return formatLargeNumber(numericValue.toNumber(), 2)
  }

  return formatNumber(numericValue.toNumber(), decimals)
}

export function FormattedInput({
  abbreviationThreshold = 1_000_000,
  children,
  className,
  decimals = 6,
  disabled,
  inputSuffix = '',
  maxDecimals = 6,
  modelValue,
  onChange,
  onInputChange,
  placeholder,
  readOnly,
  size = 'middle',
  useAbbreviation = true
}: FormattedInputProps) {
  const [displayValue, setDisplayValue] = useState('')
  const [focused, setFocused] = useState(false)
  const normalizedValue = typeof modelValue === 'number' ? modelValue.toString() : modelValue
  const inputValue = focused
    ? displayValue
    : formatDisplayValue(normalizedValue, decimals, useAbbreviation, abbreviationThreshold)

  const suffix = useMemo(() => {
    if (!inputSuffix && !children) {
      return null
    }

    return (
      <span className="formatted-input-suffix">
        {inputSuffix ? <span className="text-[var(--text-secondary)]">{inputSuffix}</span> : null}
        {children}
      </span>
    )
  }, [children, inputSuffix])

  return (
    <label
      className={`formatted-input ${disabled ? 'is-disabled' : ''} ${className ?? ''}`.trim()}
      data-size={size}
    >
      <input
        disabled={disabled}
        placeholder={placeholder}
        readOnly={readOnly}
        value={inputValue}
        onBlur={() => {
          setFocused(false)
          setDisplayValue('')
        }}
        onChange={event => {
          const cleanValue = event.target.value.replace(/[^0-9.kmbtKMBT]/g, '')
          const parts = cleanValue.split('.')
          let processedValue = parts[0]
          if (parts.length > 1) {
            processedValue += `.${parts.slice(1).join('')}`
          }

          const decimalIndex = processedValue.indexOf('.')
          if (decimalIndex !== -1 && processedValue.length - decimalIndex - 1 > maxDecimals) {
            processedValue = processedValue.slice(0, decimalIndex + maxDecimals + 1)
          }

          const parsedValue = parseAbbreviatedValue(processedValue)
          setDisplayValue(processedValue)
          onChange(parsedValue)
          onInputChange?.(parsedValue)
        }}
        onFocus={() => {
          setFocused(true)
          if (normalizedValue) {
            const numericValue = new BigNumber(normalizedValue)
            setDisplayValue(numericValue.isNaN() || numericValue.isZero() ? '' : numericValue.toFixed())
          } else {
            setDisplayValue('')
          }
        }}
      />
      {suffix}
    </label>
  )
}
