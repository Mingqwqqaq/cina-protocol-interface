import { ref, onMounted, onUnmounted } from 'vue'

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  resistance?: number
  enabled?: boolean
  scrollContainer?: string | HTMLElement
}

export function usePullToRefresh(options: PullToRefreshOptions) {
  const {
    onRefresh,
    threshold = 80,
    resistance = 2.5,
    enabled = true,
    scrollContainer = '.ptr-template-page-content'
  } = options

  const isRefreshing = ref(false)
  const pullDistance = ref(0)
  const isPulling = ref(false)
  const canRefresh = ref(false)

  let startY = 0
  let currentY = 0
  let isScrollAtTop = false

  // 检查是否启用下拉刷新
  const isPullToRefreshEnabled = () => {
    return enabled
  }

  // 检查是否在页面顶部
  const checkScrollPosition = () => {
    if (scrollContainer) {
      let container: HTMLElement | null = null
      
      if (typeof scrollContainer === 'string') {
        container = document.querySelector(scrollContainer)
      } else {
        container = scrollContainer
      }
      
      if (container) {
        isScrollAtTop = container.scrollTop === 0
      } else {
        isScrollAtTop = window.scrollY === 0 || document.documentElement.scrollTop === 0
      }
    } else {
      isScrollAtTop = window.scrollY === 0 || document.documentElement.scrollTop === 0
    }
  }

  // 触摸开始
  const handleTouchStart = (e: TouchEvent) => {
    if (!isPullToRefreshEnabled() || isRefreshing.value) return
    
    checkScrollPosition()
    if (!isScrollAtTop) return

    startY = e.touches[0].clientY
    isPulling.value = false
    pullDistance.value = 0
    canRefresh.value = false
  }

  // 触摸移动
  const handleTouchMove = (e: TouchEvent) => {
    if (!isPullToRefreshEnabled() || isRefreshing.value || !isScrollAtTop) return

    currentY = e.touches[0].clientY
    const deltaY = currentY - startY

    if (deltaY > 0) {
      // 向下拉动
      isPulling.value = true
      pullDistance.value = Math.min(deltaY / resistance, threshold * 1.5)
      canRefresh.value = pullDistance.value >= threshold

      // 只在事件可取消且满足条件时阻止默认滚动行为
      if (deltaY > 10 && e.cancelable) {
        e.preventDefault()
      }
    }
  }

  // 触摸结束
  const handleTouchEnd = async () => {
    if (!isPullToRefreshEnabled() || isRefreshing.value) return

    if (canRefresh.value && isPulling.value) {
      isRefreshing.value = true
      pullDistance.value = threshold
      
      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        // 延迟重置状态，让用户看到刷新完成的反馈
        setTimeout(() => {
          isRefreshing.value = false
          isPulling.value = false
          pullDistance.value = 0
          canRefresh.value = false
        }, 500)
      }
    } else {
      // 重置状态
      isPulling.value = false
      pullDistance.value = 0
      canRefresh.value = false
    }
  }

  // 鼠标事件（用于桌面端测试）
  const handleMouseDown = (e: MouseEvent) => {
    if (!isPullToRefreshEnabled() || isRefreshing.value) return
    
    checkScrollPosition()
    if (!isScrollAtTop) return

    startY = e.clientY
    isPulling.value = false
    pullDistance.value = 0
    canRefresh.value = false
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isPullToRefreshEnabled() || isRefreshing.value || !isScrollAtTop) return
    if (!(e.buttons & 1)) return // 只在按下鼠标左键时处理

    currentY = e.clientY
    const deltaY = currentY - startY

    if (deltaY > 0) {
      isPulling.value = true
      pullDistance.value = Math.min(deltaY / resistance, threshold * 1.5)
      canRefresh.value = pullDistance.value >= threshold
    }
  }

  const handleMouseUp = async () => {
    if (!isPullToRefreshEnabled() || isRefreshing.value) return

    if (canRefresh.value && isPulling.value) {
      isRefreshing.value = true
      pullDistance.value = threshold
      
      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setTimeout(() => {
          isRefreshing.value = false
          isPulling.value = false
          pullDistance.value = 0
          canRefresh.value = false
        }, 500)
      }
    } else {
      isPulling.value = false
      pullDistance.value = 0
      canRefresh.value = false
    }
  }

  // 绑定事件监听器
  onMounted(() => {
    if (!isPullToRefreshEnabled()) return

    // 触摸事件
    // document.addEventListener('touchstart', handleTouchStart, { passive: false })
    // document.addEventListener('touchmove', handleTouchMove, { passive: false })
    // document.addEventListener('touchend', handleTouchEnd)

    // // 鼠标事件（用于桌面端测试）
    // document.addEventListener('mousedown', handleMouseDown)
    // document.addEventListener('mousemove', handleMouseMove)
    // document.addEventListener('mouseup', handleMouseUp)

    // 滚动事件
    window.addEventListener('scroll', checkScrollPosition)
  })

  // 清理事件监听器
  onUnmounted(() => {
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    document.removeEventListener('mousedown', handleMouseDown)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    window.removeEventListener('scroll', checkScrollPosition)
  })

  return {
    isRefreshing,
    pullDistance,
    isPulling,
    canRefresh,
    isPullToRefreshEnabled
  }
}