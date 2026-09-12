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
    <section className="relative overflow-hidden bg-navy py-24 lg:py-32">
      {/* Decorative circles */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-default/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-brand-secondary/10 blur-3xl" />

      <div className="relative container mx-auto px-4 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-brand-default/20 text-brand-default rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <HeartPulse className="w-4 h-4" />
              Strengthening Public Healthcare
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-surface leading-tight mb-6">
              Healthcare Access,{' '}
              <span className="text-brand-default">Wherever</span>{' '}
              Care Is Needed.
            </h1>
            <p className="text-lg text-surface/70 mb-8 max-w-xl mx-auto lg:mx-0">
              Connect with healthcare professionals, manage appointments, track referrals and keep your health journey connected — from local health centres to specialists.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button size="xl" className="bg-brand-default hover:bg-brand-hover/90 text-white" onClick={() => navigate('/register')}>
                Get Care Now <ArrowRight className="w-5 h-5" />
              </Button>
              <Button size="xl" variant="outline" className="border-surface/20 text-surface hover:bg-surface/10 hover:text-surface" onClick={() => document.getElementById('services').scrollIntoView({ behavior: 'smooth' })}>
                Explore Services
              </Button>
            </div>
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
                    <div className={`w-12 h-12 rounded-full ${color}/20 border border-surface/10 flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-surface/80" />
                    </div>
                    <span className="text-xs text-surface/60 font-medium text-center leading-tight">{label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-surface/10 pt-10">
          {[
            { value: '12,847+', label: 'Patients Served' },
            { value: '47', label: 'Active Doctors' },
            { value: '12', label: 'Facilities' },
            { value: '95%', label: 'Referral Rate' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-brand-default">{stat.value}</div>
              <div className="text-sm text-surface/50 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Problem() {
  return (
    <section id="problem" className="py-20 bg-canvas">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-text-primary mb-4">Bridging the Rural Healthcare Gap</h2>
          <p className="text-text-muted max-w-2xl mx-auto">
            Rural and underserved communities face unique barriers to quality healthcare. CareConnect systematically addresses each one.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: MapPin, title: 'Distance & Travel', desc: 'Patients travel hours for basic consultations. CareConnect brings the doctor to the patient through assisted teleconsultation.', color: 'text-status-critical' },
            { icon: FileText, title: 'Fragmented Records', desc: 'Medical history scattered across paper registers. Our longitudinal digital records follow you from Sub-Centre to Specialist.', color: 'text-status-warning' },
            { icon: Clock, title: 'Long Waiting Times', desc: 'Digital queue management reduces uncertainty and helps patients plan their day rather than waiting blindly.', color: 'text-brand-secondary' },
            { icon: ClipboardList, title: 'Lost Referrals', desc: 'Referral slips get lost or delayed. Every referral is tracked in real-time from creation to specialist appointment.', color: 'text-status-critical' },
            { icon: Pill, title: 'Medicine Uncertainty', desc: 'Patients travel only to find medicine unavailable. Real-time medicine availability across facilities saves unnecessary trips.', color: 'text-status-warning' },
            { icon: AlertCircle, title: 'Poor Follow-up', desc: 'High-risk patients — maternal, diabetic, TB — often miss follow-ups. Automated alerts ensure no one falls through the cracks.', color: 'text-status-success' },
          ].map(item => (
            <div key={item.title} className="bg-surface-elevated rounded-xl border border-border-subtle p-6 hover:shadow-md transition-shadow">
              <item.icon className={`w-10 h-10 ${item.color} mb-4`} />
              <h3 className="text-base font-bold text-text-primary mb-2">{item.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
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
          <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-px bg-border" />
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

function Trust() {
  return (
    <section className="py-20 bg-surface-elevated">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-text-primary mb-4">Built on Trust & Security</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: 'RBAC & Encryption', desc: 'Row-level security ensures patients see only their own records. All data encrypted in transit and at rest.', color: 'text-brand-default' },
            { icon: Globe, title: 'Multilingual', desc: 'Full support for English, Hindi, and Gujarati so no patient is left behind due to language barriers.', color: 'text-brand-secondary' },
            { icon: Wifi, title: 'Low Connectivity Mode', desc: 'Offline-first PWA: enter data, queue appointments, and save notes without internet. Sync when connected.', color: 'text-status-success' },
          ].map(item => (
            <div key={item.title} className="flex gap-4 p-6 bg-canvas rounded-xl border border-border-subtle">
              <item.icon className={`w-8 h-8 flex-shrink-0 mt-1 ${item.color}`} />
              <div>
                <h3 className="font-semibold text-text-primary mb-1">{item.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  const navigate = useNavigate()
  return (
    <section className="py-24 bg-subtle border-y border-border-subtle">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">Ready to Connect to Better Care?</h2>
        <p className="text-text-muted mb-8 text-lg">
          Join thousands of patients and healthcare workers using CareConnect to strengthen community health.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button size="xl" className="w-full sm:w-auto bg-brand-default hover:bg-brand-hover text-white shadow-sm" onClick={() => navigate('/login')}>
            Get Started — It's Free
          </Button>
          <Button size="xl" variant="outline" className="w-full sm:w-auto border-border-subtle text-text-primary hover:bg-canvas bg-surface-elevated shadow-sm" onClick={() => navigate('/login?tab=doctor')}>
            I'm a Healthcare Provider
          </Button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-navy py-12 border-t border-surface/10">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <div className="flex items-center gap-2 text-surface font-bold text-xl mb-2">
              <HeartPulse className="w-6 h-6 text-brand-default" />
              CareConnect
            </div>
            <p className="text-surface/50 text-sm max-w-xs">
              Strengthening public health systems through connected technology.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
            {[
              { title: 'Platform', links: ['Patient Portal', 'Doctor Portal', 'Admin Portal', 'Teleconsultation'] },
              { title: 'Services', links: ['Appointments', 'Referrals', 'Diagnostics', 'Medicine Search'] },
              { title: 'Trust', links: ['Privacy Policy', 'Security', 'Accessibility', 'Contact'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-surface/80 font-semibold mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-surface/40 hover:text-surface/70 transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-surface/10 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-surface/30 text-xs">&copy; {new Date().getFullYear()} CareConnect Platform. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-surface/30">
            <a href="#" className="hover:text-surface/60">Privacy</a>
            <a href="#" className="hover:text-surface/60">Terms</a>
            <a href="#" className="hover:text-surface/60">Accessibility</a>
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
      <header className="sticky top-0 z-50 bg-navy/95 backdrop-blur-sm border-b border-surface/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-2 text-surface font-bold text-xl">
            <HeartPulse className="w-7 h-7 text-brand-default" />
            CareConnect
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-surface/60">
            <a href="#problem" className="hover:text-surface transition-colors">Problem</a>
            <a href="#how-it-works" className="hover:text-surface transition-colors">How it Works</a>
            <a href="#services" className="hover:text-surface transition-colors">Services</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher dark={true} />
            <Button variant="ghost" className="text-surface/60 hover:text-surface hover:bg-surface/10" onClick={() => navigate('/login')}>Log In</Button>
            <Button className="bg-brand-default hover:bg-brand-hover/90 text-white" onClick={() => navigate('/register')}>Get Care</Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <Services />
        <Trust />
        <CTA />
      </main>

      <Footer />
    </div>
  )
}
