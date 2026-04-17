let feedbackApi: {
  message: {
    error: (content: string) => void
    info: (content: string) => void
    success: (content: string) => void
    warning: (content: string) => void
  }
  modal: {
    confirm: (config: Record<string, unknown>) => void
  }
} | null = null

export function registerFeedbackApi(api: typeof feedbackApi) {
  feedbackApi = api
}

export const feedback = {
  success(content: string) {
    feedbackApi?.message.success(content)
  },
  error(content: string) {
    feedbackApi?.message.error(content)
  },
  warning(content: string) {
    feedbackApi?.message.warning(content)
  },
  info(content: string) {
    feedbackApi?.message.info(content)
  },
  confirm(config: Record<string, unknown>) {
    feedbackApi?.modal.confirm(config)
  }
}
