import { Icon } from './UI.jsx'
import ShapeHero from './kokonutui/shape-hero.tsx'

export const salonToolShapes = [
  { id: 'scissors', content: <Icon name="scissors" size={31}/>, className: 'landing-hero-tool landing-hero-tool-purple' },
  { id: 'clipper', content: <SalonToolIcon name="clipper"/>, className: 'landing-hero-tool landing-hero-tool-orange' },
  { id: 'comb', content: <SalonToolIcon name="comb"/>, className: 'landing-hero-tool landing-hero-tool-ink' },
  { id: 'dryer', content: <SalonToolIcon name="dryer"/>, className: 'landing-hero-tool landing-hero-tool-red' },
  { id: 'card-reader', content: <SalonToolIcon name="card-reader"/>, className: 'landing-hero-tool landing-hero-tool-lilac' },
  { id: 'dot-purple', className: 'landing-hero-dot landing-hero-dot-purple' },
  { id: 'dot-orange', className: 'landing-hero-dot landing-hero-dot-orange' },
  { id: 'dot-red', className: 'landing-hero-dot landing-hero-dot-red' },
]

function SalonToolIcon({ name }) {
  const common = { width: 34, height: 34, viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'clipper') return <svg {...common}><path d="M10 11h12v15a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V11Z"/><path d="M9 11h14l-1.5-6h-11L9 11ZM12 15v8m4-8v8m4-8v8"/><path d="M13 25h6"/></svg>
  if (name === 'comb') return <svg {...common}><path d="M5 11h22v7H5z"/><path d="M8 18v8m4-8v8m4-8v8m4-8v8m4-8v8"/></svg>
  if (name === 'dryer') return <svg {...common}><path d="M5 11a2 2 0 0 1 2-2h10a7 7 0 0 1 0 14h-2l-4 5H8l2-6H7a2 2 0 0 1-2-2v-9Z"/><path d="M17 9v14m5-10 5-2m-5 8 5 2"/></svg>
  return <svg {...common}><rect x="8" y="3" width="16" height="26" rx="3"/><path d="M12 8h8m-7 5h6m-5 7h4m-4 4h4"/><circle cx="16" cy="17" r="1" fill="currentColor" stroke="none"/></svg>
}

export default function FallingSalonTools({ className = '' }) {
  return <ShapeHero className={className} as="p" title="" description={null} actions={null} shapes={salonToolShapes} fill={0.2}/>
}
