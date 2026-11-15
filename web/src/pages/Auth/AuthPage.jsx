import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Brand, Icon } from '../../components/UI.jsx'
import FallingSalonTools from '../../components/FallingSalonTools.jsx'
import { authApi, messageFromError } from '../../services/api.js'
import { getAuth, saveAuth } from '../../services/auth.js'
import './auth.css'

const defaultPath = (role, salonId) => role === 'salao' ? `/painel/${salonId || ''}` : '/minha-conta'
const isRedirectForRole = (path, role) => role === 'salao'
  ? path?.startsWith('/painel')
  : path === '/minha-conta' || path?.startsWith('/agendamento/')

export default function AuthPage({ mode }) {
  const { role } = useParams()
  const navigate = useNavigate()
  const [query] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ nome: '', email: '', senha: '', telefone: '', dataNascimento: '', sexo: '', documentoTipo: 'individual', documentoNumero: '', foto: '', cidade: '', uf: '', longitude: '', latitude: '' })

  const isLogin = mode === 'login'
  const isSalon = !isLogin && role === 'salao'
  const isValidRegistration = isLogin || ['cliente', 'salao'].includes(role)
  const existing = getAuth()
  const requestedPath = query.get('redirect')
  const safeRequestedPath = requestedPath?.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : null

  if (!isValidRegistration) return <Navigate to="/acesso/entrar" replace/>
  if (existing && (isLogin || existing.usuario.role === role)) {
    const destination = isRedirectForRole(safeRequestedPath, existing.usuario.role)
      ? safeRequestedPath
      : defaultPath(existing.usuario.role, existing.salaoId || existing.usuario.id)
    return <Navigate to={destination} replace/>
  }

  function update(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  function locate() {
    if (!navigator.geolocation) {
      setError('Seu navegador não oferece geolocalização.')
      return
    }
    navigator.geolocation.getCurrentPosition(({ coords }) => setForm(current => ({ ...current, latitude: String(coords.latitude), longitude: String(coords.longitude) })), () => setError('Não foi possível obter a localização. Preencha latitude e longitude manualmente.'), { enableHighAccuracy: true, timeout: 10000 })
  }

  async function loginAutomatically() {
    const results = await Promise.allSettled(['cliente', 'salao'].map(accountRole => authApi.login({ email: form.email, senha: form.senha, role: accountRole })))
    const matches = results.filter(result => result.status === 'fulfilled')
    if (matches.length > 1) throw new Error('Este e-mail e senha correspondem a mais de uma conta. Fale com o suporte para resolver o cadastro duplicado.')
    if (matches.length === 1) return matches[0].value

    const serviceFailure = results.find(result => result.status === 'rejected' && result.reason?.response?.status !== 401)
    if (serviceFailure) throw serviceFailure.reason
    throw new Error('E-mail ou senha incorretos.')
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = isLogin
        ? await loginAutomatically()
        : isSalon
          ? await authApi.registerSalon({ nome: form.nome, email: form.email, senha: form.senha, telefone: form.telefone, foto: form.foto, cidade: form.cidade, uf: form.uf, longitude: form.longitude, latitude: form.latitude })
          : await authApi.registerClient({ nome: form.nome, email: form.email, senha: form.senha, telefone: form.telefone, dataNascimento: form.dataNascimento, sexo: form.sexo, documento: { tipo: form.documentoTipo, numero: form.documentoNumero } })

      saveAuth(result)
      const accountRole = result.usuario.role
      const destination = isRedirectForRole(safeRequestedPath, accountRole)
        ? safeRequestedPath
        : defaultPath(accountRole, result.salaoId || result.usuario.id)
      navigate(destination, { replace: true })
    } catch (cause) {
      setError(messageFromError(cause))
    } finally {
      setBusy(false)
    }
  }

  const loginHref = safeRequestedPath ? `/acesso/entrar?redirect=${encodeURIComponent(safeRequestedPath)}` : '/acesso/entrar'
  const clientSignupHref = safeRequestedPath ? `/acesso/cadastro/cliente?redirect=${encodeURIComponent(safeRequestedPath)}` : '/acesso/cadastro/cliente'

  return <main className="auth-page">
    <div className="auth-falling-layer" aria-hidden="true"><FallingSalonTools className="auth-falling-tools"/></div>
    <header className="auth-header"><Link to="/"><Brand/></Link><Link className="auth-back-link" to="/">Voltar ao início</Link></header>
    <section className="auth-card">
      <div className="auth-intro">
        <span className="eyebrow">{isLogin ? 'ACESSO À PLATAFORMA' : isSalon ? 'ESPAÇO DO NEGÓCIO' : 'SUA CONTA'}</span>
        <h1>{isLogin ? 'Entre na sua conta.' : isSalon ? 'Cadastre seu salão.' : 'Crie sua conta.'}</h1>
        <p>{isLogin ? 'Informe seu e-mail e senha. Vamos identificar seu perfil automaticamente.' : isSalon ? 'Configure o acesso do seu negócio.' : 'Cadastre-se para reservar e acompanhar seus horários.'}</p>
      </div>

      <form className="auth-form" onSubmit={submit}>
        {!isLogin && <label className="service-field">{isSalon ? 'Nome do salão' : 'Nome completo'}<input autoComplete="name" value={form.nome} onChange={event => update('nome', event.target.value)} required/></label>}
        <label className="service-field">E-mail<input type="email" autoComplete="email" value={form.email} onChange={event => update('email', event.target.value)} required/></label>
        <label className="service-field">Senha<input type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} minLength="8" maxLength="128" value={form.senha} onChange={event => update('senha', event.target.value)} required/>{!isLogin && <small>Use pelo menos 8 caracteres.</small>}</label>

        {!isLogin && !isSalon && <>
          <label className="service-field">Telefone<input type="tel" autoComplete="tel" value={form.telefone} onChange={event => update('telefone', event.target.value)} required/></label>
          <div className="auth-fields-two">
            <label className="service-field">Nascimento<input type="date" value={form.dataNascimento} onChange={event => update('dataNascimento', event.target.value)} required/></label>
            <label className="service-field">Sexo<select value={form.sexo} onChange={event => update('sexo', event.target.value)} required><option value="">Selecione</option><option value="F">Feminino</option><option value="M">Masculino</option></select></label>
          </div>
          <div className="auth-fields-two">
            <label className="service-field">Documento<select value={form.documentoTipo} onChange={event => update('documentoTipo', event.target.value)}><option value="individual">CPF</option><option value="corporation">CNPJ</option></select></label>
            <label className="service-field">Número<input inputMode="numeric" value={form.documentoNumero} onChange={event => update('documentoNumero', event.target.value)} required/></label>
          </div>
        </>}

        {!isLogin && isSalon && <>
          <label className="service-field">Telefone<input type="tel" autoComplete="tel" value={form.telefone} onChange={event => update('telefone', event.target.value)}/></label>
          <label className="service-field">URL da logo<input type="url" value={form.foto} onChange={event => update('foto', event.target.value)} placeholder="https://…"/></label>
          <div className="auth-fields-two">
            <label className="service-field">Cidade<input value={form.cidade} onChange={event => update('cidade', event.target.value)}/></label>
            <label className="service-field">UF<input maxLength="2" value={form.uf} onChange={event => update('uf', event.target.value.toUpperCase())}/></label>
          </div>
          <div className="auth-fields-two">
            <label className="service-field">Longitude<input type="number" step="any" min="-180" max="180" value={form.longitude} onChange={event => update('longitude', event.target.value)} required/></label>
            <label className="service-field">Latitude<input type="number" step="any" min="-90" max="90" value={form.latitude} onChange={event => update('latitude', event.target.value)} required/></label>
          </div>
          <button type="button" className="button button-ghost auth-locate" onClick={locate}><Icon name="pin" size={16}/> Usar minha localização</button>
        </>}

        {error && <div className="error-banner" role="alert">{error}</div>}
        <button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Aguarde…' : isLogin ? 'Entrar' : 'Criar conta'}</button>
      </form>

      <p className="auth-privacy">{isLogin ? 'Um único acesso para clientes e negócios.' : isSalon ? 'Seu cadastro libera o painel de gestão do salão.' : 'Sua conta dá acesso às suas reservas e agendamentos.'}</p>
      <div className="auth-path-links">
        {isLogin ? <>
          <span>É cliente e ainda não tem conta? <Link to={clientSignupHref}>Cadastre-se</Link></span>
          <span>Tem um negócio? <Link to="/acesso/cadastro/salao">Cadastre seu espaço</Link></span>
        </> : <>
          <span>Já tem uma conta? <Link to={loginHref}>Entrar</Link></span>
          {!isSalon && <span>É um negócio? <Link to="/acesso/cadastro/salao">Cadastre seu espaço</Link></span>}
        </>}
      </div>
    </section>
  </main>
}
