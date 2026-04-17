import { useMemo, useState } from 'react'
import cinaIcon from '@/assets/cina.png'
import usdcIcon from '@/assets/usdc.png'
import usdtIcon from '@/assets/usdt.png'
import wrmbIcon from '@/assets/wrmb.png'

type TokenIconSize = 'small' | 'medium' | 'large'

interface TokenIconProps {
  symbol: string
  size?: TokenIconSize
  customIconUrl?: string
}

const SIZE_MAP: Record<TokenIconSize, number> = {
  small: 16,
  medium: 20,
  large: 32
}

const ICON_MAP: Record<string, string> = {
  WRMB: wrmbIcon,
  sWRMB: wrmbIcon,
  USDC: usdcIcon,
  USDT: usdtIcon,
  CINA: cinaIcon
}

function getFallbackStyles(symbol: string) {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FECA57',
    '#FF9FF3',
    '#54A0FF',
    '#5F27CD',
    '#00D2D3',
    '#FF9F43',
    '#10AC84',
    '#EE5A24',
    '#009432',
    '#0652DD',
    '#9980FA'
  ]

  let hash = 0
  for (let index = 0; index < symbol.length; index += 1) {
    hash = symbol.charCodeAt(index) + ((hash << 5) - hash)
  }

  const backgroundColor = colors[Math.abs(hash) % colors.length]
  const hex = backgroundColor.replace('#', '')
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000

  return {
    backgroundColor,
    color: brightness > 128 ? '#000000' : '#FFFFFF'
  }
}

export function TokenIcon({ customIconUrl, size = 'medium', symbol }: TokenIconProps) {
  const [hasError, setHasError] = useState(false)
  const dimension = SIZE_MAP[size]
  const iconUrl = !hasError ? customIconUrl || ICON_MAP[symbol] : null
  const fallbackStyles = useMemo(() => getFallbackStyles(symbol), [symbol])

  if (iconUrl) {
    return (
      <img
        alt={symbol}
        className="shrink-0 rounded-full object-cover"
        height={dimension}
        src={iconUrl}
        width={dimension}
        onError={() => setHasError(true)}
      />
    )
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        ...fallbackStyles,
        fontSize: size === 'large' ? 14 : size === 'medium' ? 10 : 8,
        height: dimension,
        width: dimension
      }}
    >
      {symbol.slice(0, 2).toUpperCase()}
    </span>
  )
}
