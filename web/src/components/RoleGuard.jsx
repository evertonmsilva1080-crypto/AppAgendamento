import { Navigate, useLocation, useParams } from 'react-router-dom'
import { getAuth } from '../services/auth.js'
export default function RoleGuard({role,children}){
 const session=getAuth(),location=useLocation(),params=useParams()
 if(!session)return <Navigate to={`/acesso/entrar?redirect=${encodeURIComponent(location.pathname+location.search)}`} replace/>
 if(session.usuario.role!==role)return <Navigate to="/acesso/entrar" replace/>
 if(role==='salao'&&params.salaoId&&params.salaoId!==session.salaoId)return <Navigate to={`/painel/${session.salaoId}`} replace/>
 return children
}
