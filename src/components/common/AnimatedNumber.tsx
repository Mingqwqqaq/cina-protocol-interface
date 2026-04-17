import { useEffect, useMemo, useRef, useState } from 'react'
import { formatNumber } from '@/utils/format'

interface AnimatedNumberProps {
  value: string | number
  decimals?: number
  className?: string
}

export function AnimatedNumber({ className, decimals = 2, value }: AnimatedNumberProps) {
  const numericValue = useMemo(() => Number(value || 0), [value])
  const [displayValue, setDisplayValue] = useState(numericValue)
  const frameRef = useRef<number>()

  useEffect(() => {
    const startValue = displayValue
    const nextValue = Number.isFinite(numericValue) ? numericValue : 0
    const startedAt = performance.now()
    const duration = 300

    const tick = (timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / duration, 1)
      setDisplayValue(startValue + (nextValue - startValue) * progress)

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick)
      }
    }

    frameRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [displayValue, numericValue])

  return <span className={className}>{formatNumber(displayValue, decimals)}</span>
}
