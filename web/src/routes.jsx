import { createBrowserRouter, Navigate, useSearchParams } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import SalonsPage from './pages/Salons/SalonsPage.jsx'
import SalonPage from './pages/Salon/SalonPage.jsx'
import BookingPage from './pages/Booking/BookingPage.jsx'
import PanelPage from './pages/Panel/PanelPage.jsx'
import AuthPage from './pages/Auth/AuthPage.jsx'
import AccountPage from './pages/Account/AccountPage.jsx'
import RoleGuard from './components/RoleGuard.jsx'
export const router=createBrowserRouter([
 {path:'/',element:<LandingPage/>},{path:'/saloes',element:<SalonsPage/>},{path:'/salao/:salaoId',element:<SalonPage/>},
 {path:'/acesso/entrar',element:<AuthPage mode="login"/>},
 {path:'/acesso/cadastro/:role',element:<AuthPage mode="register"/>},
 {path:'/acesso/:role',element:<LegacyAccessRedirect/>},
 {path:'/agendamento/:salaoId/:servicoId',element:<RoleGuard role="cliente"><BookingPage/></RoleGuard>},
 {path:'/agendamento/:salaoId/:servicoId/especialista',element:<RoleGuard role="cliente"><BookingPage specialistFirst/></RoleGuard>},
 {path:'/painel',element:<RoleGuard role="salao"><PanelPage/></RoleGuard>},
 {path:'/painel/:salaoId',element:<RoleGuard role="salao"><PanelPage/></RoleGuard>},
 {path:'/minha-conta',element:<RoleGuard role="cliente"><AccountPage/></RoleGuard>},
 {path:'*',element:<Navigate to="/" replace/>},
])

function LegacyAccessRedirect(){
 const [query]=useSearchParams(),redirect=query.get('redirect')
 const destination=redirect?`/acesso/entrar?redirect=${encodeURIComponent(redirect)}`:'/acesso/entrar'
 return <Navigate to={destination} replace/>
}
