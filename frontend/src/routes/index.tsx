import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../layouts/AppShell'
import { AuthLayout } from '../layouts/AuthLayout'
import { DashboardPage } from '../pages/DashboardPage'
import { HabitDetailPage } from '../pages/HabitDetailPage'
import { HabitFormPage } from '../pages/HabitFormPage'
import { HabitsPage } from '../pages/HabitsPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RegisterPage } from '../pages/RegisterPage'
import { ProtectedRoute } from './ProtectedRoute'

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <AppShell />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: '/habits', element: <HabitsPage /> },
        { path: '/habits/new', element: <HabitFormPage /> },
        { path: '/habits/:id', element: <HabitDetailPage /> },
        { path: '/habits/:id/edit', element: <HabitFormPage /> },
      ],
    }],
  },
  { path: '*', element: <NotFoundPage /> },
])
