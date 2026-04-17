import { createHashRouter } from 'react-router-dom'
import { appRoutes } from '@/router/routes'

export const router = createHashRouter(appRoutes)
