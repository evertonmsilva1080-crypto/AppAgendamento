import { createBrowserRouter, Navigate } from 'react-router-dom'
import SalonPage from './pages/Salon/SalonPage.jsx'
import BookingPage from './pages/Booking/BookingPage.jsx'
import PanelPage from './pages/Panel/PanelPage.jsx'

export const router = createBrowserRouter([
  { path: '/', element: <SalonPage /> },
  { path: '/salao/:salaoId', element: <SalonPage /> },
  { path: '/agendamento/:salaoId/:servicoId', element: <BookingPage /> },
  { path: '/agendamento/:salaoId/:servicoId/especialista', element: <BookingPage specialistFirst /> },
  { path: '/painel', element: <PanelPage /> },
  { path: '/painel/:salaoId', element: <PanelPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
])
