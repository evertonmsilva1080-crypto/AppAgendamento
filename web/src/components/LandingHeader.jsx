import { Link } from 'react-router-dom'
import { Icon } from './UI.jsx'
import '../pages/LandingPage.css'

export default function LandingHeader({ authPage = false }) {
  const sectionPrefix = authPage ? '/' : ''

  return <header className="landing-header">
    <div className="landing-container landing-nav">
      <Link to="/" className="landing-brand" aria-label="Agenda Fácil, início">
        <img src="/brand/logo-agenda-facil.png" alt="Agenda Fácil" />
      </Link>
      <nav aria-label="Navegação principal" className="landing-nav-links">
        <a href={`${sectionPrefix}#como-funciona`}>Como funciona</a>
        <a href={`${sectionPrefix}#estabelecimentos`}>Estabelecimentos</a>
      </nav>
      <Link className="landing-nav-cta" to={authPage ? '/' : '/acesso/entrar'}>
        {authPage && <Icon className="landing-nav-back-icon" name="arrow" size={16}/>}
        {authPage ? 'Voltar' : 'Entrar'}
        {!authPage && <Icon name="arrow" size={16}/>}
      </Link>
    </div>
  </header>
}
