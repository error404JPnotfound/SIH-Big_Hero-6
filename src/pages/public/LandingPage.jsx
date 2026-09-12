import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  HeartPulse, ArrowRight, CheckCircle2, Activity, Calendar, FileText,
  Pill, Stethoscope, ChevronRight, Shield, Globe, Wifi, Users,
  Building2, ClipboardList, AlertCircle, Star, MapPin, Clock, TrendingUp
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import LanguageSwitcher from '../../components/ui/LanguageSwitcher'

function Hero() {
  const navigate = useNavigate()
  return (
    <section className="relative overflow-hidden bg-white py-24 lg:py-32">
      {/* Decorative circles */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-default/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-brand-secondary/10 blur-3xl" />

      <div className="relative container mx-auto px-4 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-brand-default/10 text-brand-default rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <HeartPulse className="w-4 h-4" />
              Strengthening Public Healthcare
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-navy leading-tight mb-6">
              Healthcare Access,{' '}
              <span className="text-brand-default">Wherever</span>{' '}
              Care Is Needed.
            </h1>
            <p className="text-lg text-text-muted mb-8 max-w-xl mx-auto lg:mx-0">
              Connect with healthcare professionals, manage appointments, track referrals and keep your health journey connected — from local health centres to specialists.
            </p>

          </div>

          {/* Right — connected network visualization */}
          <div className="hidden lg:flex justify-center items-center">
            <div className="relative w-80 h-80">
              {/* Central node */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-brand-default flex flex-col items-center justify-center text-white shadow-xl z-10">
                <HeartPulse className="w-8 h-8" />
                <span className="text-xs font-semibold mt-0.5">Patient</span>
              </div>
              {/* Orbiting nodes */}
              {[
                { label: 'Sub-Centre', icon: Building2, deg: 270, color: 'bg-brand-secondary' },
                { label: 'Doctor', icon: Stethoscope, deg: 342, color: 'bg-status-success' },
                { label: 'Diagnostics', icon: Activity, deg: 54, color: 'bg-status-warning' },
                { label: 'Pharmacy', icon: Pill, deg: 126, color: 'bg-brand-default' },
                { label: 'Hospital', icon: Building2, deg: 198, color: 'bg-brand-secondary' },
              ].map(({ label, icon: Icon, deg, color }) => {
                const rad = (deg * Math.PI) / 180
                const r = 120
                const x = 50 + r * Math.cos(rad) * (1 / 2)
                const y = 50 + r * Math.sin(rad) * (1 / 2)
                return (
                  <div
                    key={label}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                    style={{ left: `${50 + 40 * Math.cos(rad)}%`, top: `${50 + 40 * Math.sin(rad)}%` }}
                  >
                    <div className={`w-12 h-12 rounded-full ${color}/20 border border-navy/10 flex items-center justify-center shadow-sm`}>
                      <Icon className="w-5 h-5 text-navy/70" />
                    </div>
                    <span className="text-xs text-text-muted font-medium text-center leading-tight">{label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>


      </div>
    </section>
  )
}


function HowItWorks() {
  const steps = [
    { num: '01', title: 'Register & Triage', desc: 'Register at any facility or online. Answer a guided triage questionnaire so the right care is assigned immediately.' },
    { num: '02', title: 'Book & Queue', desc: 'Book an in-person or teleconsultation appointment. See your live queue position and estimated wait time.' },
    { num: '03', title: 'Consult & Diagnose', desc: 'Meet your doctor digitally or in-person. Prescriptions, diagnostics, and notes are saved automatically.' },
    { num: '04', title: 'Track & Follow Up', desc: 'Track referrals, test results, and follow-ups from one place. High-risk patients receive automated reminders.' },
  ]
  return (
    <section id="how-it-works" className="py-20 bg-surface-elevated">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-text-primary mb-4">How CareConnect Works</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-8 relative">
          {steps.map((step, i) => (
            <div key={step.num} className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl gradient-teal flex items-center justify-center text-white text-xl font-bold mb-4 shadow-lg">
                {step.num}
              </div>
              <h3 className="font-semibold text-text-primary mb-2">{step.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Services() {
  const services = [
    { icon: Stethoscope, title: 'Assisted Teleconsultation', desc: 'Video consultations facilitated by frontline health workers for patients without devices.', color: 'teal' },
    { icon: Calendar, title: 'Appointment Management', desc: 'Book, reschedule, and track appointments with real-time availability.', color: 'blue' },
    { icon: Users, title: 'Digital Queue', desc: 'Know your exact queue position and wait time — eliminate uncertainty.', color: 'success' },
    { icon: FileText, title: 'Longitudinal Records', desc: 'Unified health records spanning your entire care journey.', color: 'warning' },
    { icon: ClipboardList, title: 'Referral Tracking', desc: 'End-to-end referral visibility from PHC to Specialist.', color: 'teal' },
    { icon: Activity, title: 'Diagnostic Coordination', desc: 'Request tests, check availability, and receive results digitally.', color: 'blue' },
    { icon: Pill, title: 'Medicine Availability', desc: 'Real-time medicine stock across all nearby facilities.', color: 'success' },
    { icon: AlertCircle, title: 'Follow-up Monitoring', desc: 'Automated follow-up for maternal, child, TB, and chronic conditions.', color: 'critical' },
  ]
  const colorMap = {
    teal: 'bg-subtle text-brand-default',
    blue: 'bg-brand-secondary-light text-brand-secondary',
    success: 'bg-status-success-bg text-status-success',
    warning: 'bg-status-warning-bg text-status-warning',
    critical: 'bg-status-critical-bg text-status-critical',
  }
  return (
    <section id="services" className="py-20 bg-canvas">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-text-primary mb-4">A Complete Healthcare Ecosystem</h2>
          <p className="text-text-muted max-w-2xl mx-auto">
            One connected platform from the local health centre to the specialist.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map(s => (
            <div key={s.title} className="bg-surface-elevated rounded-xl border border-border-subtle p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorMap[s.color]}`}>
                <s.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-text-primary mb-1.5 text-sm">{s.title}</h3>
              <p className="text-xs text-text-muted leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


function Footer() {
  return (
    <footer className="bg-white py-12 border-t border-border-subtle">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <div className="flex items-center gap-2 text-navy font-bold text-xl mb-2">
              <HeartPulse className="w-6 h-6 text-brand-default" />
              CareConnect
            </div>
            <p className="text-text-muted text-sm max-w-xs">
              Strengthening public health systems through connected technology.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm">
            {[
              {
                title: 'Platform',
                links: [
                  { label: 'Patient Portal', to: '/login?role=patient' },
                  { label: 'Doctor Portal', to: '/login?role=doctor' },
                  { label: 'Admin Portal', to: '/login?role=admin' },
                  { label: 'Teleconsultation', to: '/login?role=patient' },
                ],
              },
              {
                title: 'Services',
                links: [
                  { label: 'Appointments', to: '/login?role=patient' },
                  { label: 'Referrals', to: '/login?role=patient' },
                  { label: 'Diagnostics', to: '/login?role=patient' },
                  { label: 'Medicine Search', to: '/login?role=patient' },
                ],
              },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-navy font-semibold mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l.label}><Link to={l.to} className="text-text-muted hover:text-navy transition-colors">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border-subtle flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-text-muted/60 text-xs">&copy; {new Date().getFullYear()} CareConnect Platform. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-text-muted/60">
            <a href="#" className="hover:text-navy">Privacy</a>
            <a href="#" className="hover:text-navy">Terms</a>
            <a href="#" className="hover:text-navy">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border-subtle">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-2 text-navy font-bold text-xl">
            <HeartPulse className="w-7 h-7 text-brand-default" />
            CareConnect
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-text-muted">
            <a href="#how-it-works" className="hover:text-navy transition-colors">How it Works</a>
            <a href="#services" className="hover:text-navy transition-colors">Services</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher dark={false} />
            <Button variant="ghost" className="text-text-primary hover:bg-canvas" onClick={() => navigate('/login')}>Log In</Button>
            <Button className="bg-brand-default hover:bg-brand-hover/90 text-white" onClick={() => navigate('/register')}>Get Care</Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Hero />

        <HowItWorks />
        <Services />

      </main>

      <Footer />
    </div>
  )
}
