import { App } from 'antd'
import { useEffect } from 'react'
import { registerFeedbackApi } from '@/lib/feedback'

export function FeedbackBridge() {
  const api = App.useApp()

  useEffect(() => {
    registerFeedbackApi({
      message: api.message,
      modal: api.modal
    })
  }, [api])

  return null
}
