import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import LandingHeader from '../../components/LandingHeader.jsx'
import FallingSalonTools from '../../components/FallingSalonTools.jsx'
import { authApi, messageFromError } from '../../services/api.js'
import { getAuth, saveAuth } from '../../services/auth.js'
import './auth.css'

const defaultPath = (role, salonId) => role === 'salao' ? `/painel/${salonId || ''}` : '/minha-conta'
const isRedirectForRole = (path, role) => role === 'salao'
  ? path?.startsWith('/painel')
  : path === '/minha-conta' || path?.startsWith('/agendamento/')

function getPasswordChecks(password = '') {
  return [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
}

const isStrongPassword = password => getPasswordChecks(password).every(Boolean)

export default function AuthPage({ mode }) {
  const { role } = useParams()
  const navigate = useNavigate()
  const [query] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [salonStep, setSalonStep] = useState(1)
  const [validationAttempted, setValidationAttempted] = useState(false)
  const formElement = useRef(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmarSenha: '', telefone: '', dataNascimento: '', sexo: '', foto: '', rua: '', cidade: '', uf: '' })

  useEffect(() => {
    if (!form.foto) {
      setLogoPreview('')
      return
    }
    const previewUrl = URL.createObjectURL(form.foto)
    setLogoPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [form.foto])

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

  function continueSalonSignup() {
    setValidationAttempted(true)
    if (!formElement.current?.checkValidity()) {
      formElement.current?.reportValidity()
      return
    }
    if (!isStrongPassword(form.senha)) {
      setError('A senha precisa cumprir todos os requisitos indicados.')
      return
    }
    if (form.senha !== form.confirmarSenha) {
      setError('As senhas não coincidem.')
      return
    }
    setError('')
    setSalonStep(2)
    window.setTimeout(() => document.querySelector('.auth-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
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
    setValidationAttempted(true)
    if (isSalon && salonStep === 1) {
      continueSalonSignup()
      return
    }
    if (!formElement.current?.checkValidity()) {
      formElement.current?.reportValidity()
      return
    }
    setBusy(true)
    setError('')
    try {
      if (!isLogin && !isStrongPassword(form.senha)) {
        throw new Error('A senha precisa ter 8 caracteres, letra maiúscula, letra minúscula, número e caractere especial.')
      }
      if (!isLogin && form.senha !== form.confirmarSenha) {
        throw new Error('As senhas não coincidem.')
      }
      if (isSalon && form.foto && (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(form.foto.type) || form.foto.size > 4 * 1024 * 1024)) {
        throw new Error('Escolha JPG, PNG, WEBP ou GIF de até 4 MB para a logo.')
      }
      const salonForm = new FormData()
      Object.entries({ nome: form.nome, email: form.email, senha: form.senha, telefone: form.telefone, rua: form.rua, cidade: form.cidade, uf: form.uf }).forEach(([key, value]) => salonForm.append(key, value))
      if (form.foto) salonForm.append('foto', form.foto)

      const result = isLogin
        ? await loginAutomatically()
        : isSalon
          ? await authApi.registerSalon(salonForm)
          : await authApi.registerClient({ nome: form.nome, email: form.email, senha: form.senha, telefone: form.telefone, dataNascimento: form.dataNascimento, sexo: form.sexo })

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
    <LandingHeader authPage />
    <section className="auth-card">
      <div className="auth-intro">
        <span className="eyebrow">{isLogin ? 'ACESSO À PLATAFORMA' : isSalon ? 'ESPAÇO DO NEGÓCIO' : 'SUA CONTA'}</span>
        <h1>{isLogin ? 'Entre na sua conta.' : isSalon ? 'Cadastre seu salão.' : 'Crie sua conta.'}</h1>
        <p>{isLogin ? 'Informe seu e-mail e senha. Vamos identificar seu perfil automaticamente.' : isSalon ? 'Configure o acesso do seu negócio.' : 'Cadastre-se para reservar e acompanhar seus horários.'}</p>
      </div>

      <form ref={formElement} noValidate className={`auth-form${validationAttempted ? ' was-validated' : ''}`} onSubmit={submit}>
        {isSalon ? <>
          <div className="auth-step-heading"><span>ETAPA {salonStep} DE 2</span><strong>{salonStep === 1 ? 'Acesso do negócio' : 'Dados do espaço'}</strong><div className="auth-step-progress"><i className={salonStep === 1 ? 'active' : 'complete'}/><i className={salonStep === 2 ? 'active' : ''}/></div></div>
          {salonStep === 1 ? <>
            <label className="service-field"><span className="auth-label-text">Nome do salão <span className="auth-required" aria-hidden="true">*</span></span><input autoComplete="organization" value={form.nome} onChange={event => update('nome', event.target.value)} required/></label>
            <label className="service-field"><span className="auth-label-text">E-mail <span className="auth-required" aria-hidden="true">*</span></span><input type="email" autoComplete="email" value={form.email} onChange={event => update('email', event.target.value)} required/></label>
            <label className="service-field"><span className="auth-label-text">Senha <span className="auth-required" aria-hidden="true">*</span></span><div className="auth-password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength="8" maxLength="128" value={form.senha} onChange={event => update('senha', event.target.value)} required/><button type="button" className="auth-password-toggle" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}><PasswordVisibilityIcon visible={showPassword}/></button></div>{form.senha && <PasswordStrength password={form.senha}/>}</label>
            <label className="service-field"><span className="auth-label-text">Confirmar senha <span className="auth-required" aria-hidden="true">*</span></span><div className="auth-password-wrap"><input type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" minLength="8" maxLength="128" value={form.confirmarSenha} onChange={event => update('confirmarSenha', event.target.value)} required/><button type="button" className="auth-password-toggle" onClick={() => setShowConfirmPassword(value => !value)} aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'} title={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}><PasswordVisibilityIcon visible={showConfirmPassword}/></button></div></label>
            <button type="button" className="button button-primary auth-submit" onClick={continueSalonSignup}>Próximo <span aria-hidden="true">→</span></button>
          </> : <>
            <label className="service-field">Telefone<input type="tel" autoComplete="tel" value={form.telefone} onChange={event => update('telefone', event.target.value)}/></label>
            <label className="service-field">Endereço<input autoComplete="address-line1" value={form.rua} onChange={event => update('rua', event.target.value)}/></label>
            <div className="auth-fields-two">
              <label className="service-field">Cidade<input autoComplete="address-level2" value={form.cidade} onChange={event => update('cidade', event.target.value)}/></label>
              <label className="service-field">UF<input autoComplete="address-level1" maxLength="2" value={form.uf} onChange={event => update('uf', event.target.value.toUpperCase())}/></label>
            </div>
            <label className="service-field">Logo do salão <span className="auth-optional">Opcional</span><input key={form.foto ? `${form.foto.name}-${form.foto.lastModified}` : 'empty'} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={event => update('foto', event.target.files?.[0] || '')}/><small>JPG, PNG, WEBP ou GIF · até 4 MB.</small></label>
            {logoPreview && <div className="auth-logo-preview"><img src={logoPreview} alt="Prévia da logo do salão"/><button type="button" onClick={() => update('foto', '')}>Remover imagem</button></div>}
            <div className="auth-step-actions"><button type="button" className="auth-step-back" onClick={() => { setSalonStep(1); document.querySelector('.auth-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>Voltar</button><button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Aguarde…' : 'Criar conta'}</button></div>
          </>}
        </> : <>
          {!isLogin && <label className="service-field"><span className="auth-label-text">Nome completo <span className="auth-required" aria-hidden="true">*</span></span><input autoComplete="name" value={form.nome} onChange={event => update('nome', event.target.value)} required/></label>}
          <label className="service-field"><span className="auth-label-text">E-mail <span className="auth-required" aria-hidden="true">*</span></span><input type="email" autoComplete="email" value={form.email} onChange={event => update('email', event.target.value)} required/></label>
          <label className="service-field"><span className="auth-label-text">Senha <span className="auth-required" aria-hidden="true">*</span></span><div className="auth-password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'} minLength="8" maxLength="128" value={form.senha} onChange={event => update('senha', event.target.value)} required/><button type="button" className="auth-password-toggle" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}><PasswordVisibilityIcon visible={showPassword}/></button></div>{!isLogin && form.senha && <PasswordStrength password={form.senha}/>}</label>
          {!isLogin && <label className="service-field"><span className="auth-label-text">Confirmar senha <span className="auth-required" aria-hidden="true">*</span></span><div className="auth-password-wrap"><input type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" minLength="8" maxLength="128" value={form.confirmarSenha} onChange={event => update('confirmarSenha', event.target.value)} required/><button type="button" className="auth-password-toggle" onClick={() => setShowConfirmPassword(value => !value)} aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'} title={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}><PasswordVisibilityIcon visible={showConfirmPassword}/></button></div></label>}
          {!isLogin && <>
            <label className="service-field"><span className="auth-label-text">Telefone <span className="auth-required" aria-hidden="true">*</span></span><input type="tel" autoComplete="tel" value={form.telefone} onChange={event => update('telefone', event.target.value)} required/></label>
            <div className="auth-fields-two">
              <label className="service-field"><span className="auth-label-text">Nascimento <span className="auth-required" aria-hidden="true">*</span></span><input type="date" value={form.dataNascimento} onChange={event => update('dataNascimento', event.target.value)} required/></label>
              <label className="service-field"><span className="auth-label-text">Sexo <span className="auth-required" aria-hidden="true">*</span></span><select value={form.sexo} onChange={event => update('sexo', event.target.value)} required><option value="">Selecione</option><option value="F">Feminino</option><option value="M">Masculino</option></select></label>
            </div>
          </>}
        </>}

        {error && <div className="error-banner" role="alert">{error}</div>}
        {!isSalon && <button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Aguarde…' : isLogin ? 'Entrar' : 'Criar conta'}</button>}
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

function PasswordStrength({ password }) {
  const labels = ['8 caracteres', 'letra maiúscula', 'letra minúscula', 'número', 'caractere especial']
  const checks = getPasswordChecks(password)
  const score = checks.filter(Boolean).length
  const level = password.length === 0 ? 'empty' : score === 5 ? 'strong' : score >= 3 ? 'medium' : 'weak'
  const title = level === 'strong' ? 'Forte' : level === 'medium' ? 'Média' : level === 'weak' ? 'Fraca' : 'Força da senha'
  const missing = labels.filter((_, index) => !checks[index])

  return <div className={`auth-password-strength ${level}`}>
    <div className="auth-password-meter" role="progressbar" aria-label="Força da senha" aria-valuemin="0" aria-valuemax="5" aria-valuenow={score}><span style={{ width: `${score * 20}%` }}/></div>
    <div className="auth-password-strength-copy"><strong>{title}</strong><small>{password ? missing.length ? `Falta: ${missing.join(', ')}.` : 'Todos os requisitos atendidos.' : 'Use 8 caracteres, maiúscula, minúscula, número e caractere especial.'}</small></div>
  </div>
}

function PasswordVisibilityIcon({ visible }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/>
    <circle cx="12" cy="12" r="2.7"/>
    {!visible && <path d="m4 4 16 16"/>}
  </svg>
}
