import type { ReactNode } from 'react'

export interface InfoCardItem {
  icon: ReactNode
  title: string
  content: string
}

interface InfoCardsProps {
  cards: InfoCardItem[]
}

export function InfoCards({ cards }: InfoCardsProps) {
  return (
    <div className="info-card-grid">
      {cards.map(card => (
        <article key={card.title} className="info-card">
          <div className="info-card-heading">
            <span className="text-2xl text-[var(--primary-color)]">{card.icon}</span>
            <h3>{card.title}</h3>
          </div>
          <div className="info-card-copy">{card.content}</div>
        </article>
      ))}
    </div>
  )
}
