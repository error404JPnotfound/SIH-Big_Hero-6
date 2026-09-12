import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import {
  HeartPulse, LayoutDashboard, Calendar, ClipboardList, Users, Activity,
  FileText, Pill, Stethoscope, Bell, Settings, LogOut, Menu, X, ChevronDown,
  AlertCircle, ShieldCheck, TrendingUp, Building2, Search, MapPin
} from 'lucide-react'

const NAV_PATIENT = [
  { href: '/patient',              icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/patient/facilities',   icon: MapPin,          label: 'Find Healthcare' },
  { href: '/patient/appointments', icon: Calendar,        label: 'Appointments' },
  { href: '/patient/records',      icon: FileText,        label: 'My Records' },
  { href: '/patient/referrals',    icon: ClipboardList,   label: 'Referrals' },
  { href: '/patient/diagnostics',  icon: Activity,        label: 'Diagnostics' },
  { href: '/patient/medicines',    icon: Pill,            label: 'Medicines' },
  { href: '/patient/queue',        icon: Users,           label: 'My Queue' },
]

const NAV_DOCTOR = [
  { href: '/doctor', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/doctor/queue', icon: Users, label: "Today's Queue" },
  { href: '/doctor/patients', icon: ClipboardList, label: 'Patients' },
  { href: '/doctor/referrals', icon: Stethoscope, label: 'Referrals' },
  { href: '/doctor/diagnostics', icon: Activity, label: 'Diagnostics' },
  { href: '/doctor/prescriptions', icon: Pill, label: 'Prescriptions' },
  { href: '/doctor/follow-ups', icon: AlertCircle, label: 'Follow-ups' },
]

const NAV_ADMIN = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/facilities', icon: Building2, label: 'Facilities' },
  { href: '/admin/doctors', icon: Stethoscope, label: 'Doctors' },
  { href: '/admin/patients', icon: Users, label: 'Patients' },
  { href: '/admin/referrals', icon: ClipboardList, label: 'Referrals' },
  { href: '/admin/high-risk', icon: AlertCircle, label: 'High Risk' },
  { href: '/admin/medicines', icon: Pill, label: 'Medicine Stock' },
  { href: '/admin/quality', icon: TrendingUp, label: 'Quality Monitor' },
]

function NavItem({ href, icon: Icon, label, collapsed }) {
  const { pathname } = useLocation()
  const active = pathname === href || (href !== '/patient' && href !== '/doctor' && href !== '/admin' && pathname.startsWith(href))
  return (
    <Link
      to={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
        active
          ? 'bg-brand-default text-white shadow-sm'
          : 'text-text-muted hover:bg-bg hover:text-navy'
      )}
    >
      <Icon className="w-4.5 h-4.5 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}

export default function AppLayout({ children, role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()

  const navItems = role === 'patient' ? NAV_PATIENT : role === 'doctor' ? NAV_DOCTOR : NAV_ADMIN

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const Sidebar = () => (
    <aside className={cn(
      'flex flex-col h-full bg-surface-elevated border-r border-border-subtle transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-4 py-5 border-b border-border-subtle', collapsed && 'justify-center px-2')}>
        <HeartPulse className="w-7 h-7 text-brand-default flex-shrink-0" />
        {!collapsed && <span translate="no" className="notranslate font-bold text-lg text-text-primary">CareConnect</span>}
      </div>

      {/* Role label */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-2">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">
            {role === 'patient' ? 'Patient Portal' : role === 'doctor' ? 'Clinical Portal' : 'Admin Portal'}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-1">
        {navItems.map(item => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom controls */}
      <div className={cn('px-2 py-3 border-t border-border-subtle space-y-1')}>
        {/* Desktop Collapse */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:bg-canvas hover:text-text-primary transition-colors"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 -rotate-90" />}
          {!collapsed && <span>Collapse</span>}
        </button>
        {/* Mobile Close */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:bg-canvas hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
          <span>Close Menu</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:bg-critical-bg hover:text-critical transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-navy/70" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 flex-shrink-0">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-surface-elevated border-b border-border-subtle flex items-center gap-3 px-4 flex-shrink-0 z-10">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-bg text-text-muted"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="hidden sm:flex items-center gap-2 bg-canvas rounded-lg px-3 py-1.5 flex-1 max-w-xs border border-border-subtle">
            <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-muted focus:outline-none min-w-0"
              placeholder="Search..."
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Demo mode badge */}
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-status-warning-bg text-status-warning border border-status-warning/30">
              Demo Mode
            </span>

            {/* Language Switcher */}
            <LanguageSwitcher dark={false} />

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-bg text-text-muted hover:text-text">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-critical rounded-full" />
            </button>

            {/* Avatar */}
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-bg cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-brand-default flex items-center justify-center text-white text-xs font-bold">
                {(user?.name || 'U').charAt(0)}
              </div>
              <span className="hidden md:block text-sm font-medium text-text-primary truncate max-w-32">
                {user?.name || 'User'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  )
}
