import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../layouts/AppShell'
import { AuthLayout } from '../layouts/AuthLayout'
import { RouteBoundary } from '../components/RouteBoundary'
import { ProtectedRoute } from './ProtectedRoute'

const DashboardPage = lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const HabitDetailPage = lazy(() => import('../pages/HabitDetailPage').then((module) => ({ default: module.HabitDetailPage })))
const HabitFormPage = lazy(() => import('../pages/HabitFormPage').then((module) => ({ default: module.HabitFormPage })))
const HabitsPage = lazy(() => import('../pages/HabitsPage').then((module) => ({ default: module.HabitsPage })))
const LoginPage = lazy(() => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
const RegisterPage = lazy(() => import('../pages/RegisterPage').then((module) => ({ default: module.RegisterPage })))
const FocusPage = lazy(() => import('../pages/FocusPage').then((module) => ({ default: module.FocusPage })))
const ProjectsPage = lazy(() => import('../pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const ProjectDetailPage = lazy(() => import('../pages/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })))

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <RouteBoundary><LoginPage /></RouteBoundary> },
      { path: '/register', element: <RouteBoundary><RegisterPage /></RouteBoundary> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <AppShell />,
      children: [
        { index: true, element: <RouteBoundary><DashboardPage /></RouteBoundary> },
        { path: '/habits', element: <RouteBoundary><HabitsPage /></RouteBoundary> },
        { path: '/habits/new', element: <RouteBoundary><HabitFormPage /></RouteBoundary> },
        { path: '/habits/:id', element: <RouteBoundary><HabitDetailPage /></RouteBoundary> },
        { path: '/habits/:id/edit', element: <RouteBoundary><HabitFormPage /></RouteBoundary> },
        { path: '/focus', element: <RouteBoundary><FocusPage /></RouteBoundary> },
        { path: '/projects', element: <RouteBoundary><ProjectsPage /></RouteBoundary> },
        { path: '/projects/:id', element: <RouteBoundary><ProjectDetailPage /></RouteBoundary> },
      ],
    }],
  },
  { path: '*', element: <RouteBoundary><NotFoundPage /></RouteBoundary> },
])
