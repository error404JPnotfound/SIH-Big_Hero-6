/**
 * LanguageSwitcher.jsx
 *
 * Sets the `googtrans` cookie that Google Translate reads on every page load,
 * then reloads the page so the translation is applied.
 *
 * This is the most reliable approach — it does not depend on the widget's DOM
 * structure or internal events. Works with the free Google Website Translator
 * loaded in index.html (no API key needed).
 */
import { useState, useRef, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { cn } from '../../lib/utils'

const LANGUAGES = [
  { code: 'en', label: 'English',   native: 'English'  },
  { code: 'hi', label: 'Hindi',     native: 'हिन्दी'    },
  { code: 'gu', label: 'Gujarati',  native: 'ગુજરાતી'  },
  { code: 'mr', label: 'Marathi',   native: 'मराठी'     },
  { code: 'pa', label: 'Punjabi',   native: 'ਪੰਜਾਬੀ'   },
  { code: 'bn', label: 'Bengali',   native: 'বাংলা'     },
  { code: 'ta', label: 'Tamil',     native: 'தமிழ்'     },
  { code: 'te', label: 'Telugu',    native: 'తెలుగు'   },
  { code: 'kn', label: 'Kannada',   native: 'ಕನ್ನಡ'    },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം'   },
  { code: 'ur', label: 'Urdu',      native: 'اردو'      },
]

/**
 * Set the googtrans cookie on both the root path and the current hostname.
 * Google Translate reads this cookie on every page load to determine the
 * target language.
 */
function setGoogTransCookie(targetLang) {
  const value = `/en/${targetLang}`
  const hostname = window.location.hostname

  // Set on root path (required by Google Translate)
  document.cookie = `googtrans=${value}; path=/`

  // Also set with explicit domain so subdomain cookies are covered
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    document.cookie = `googtrans=${value}; path=/; domain=${hostname}`
    document.cookie = `googtrans=${value}; path=/; domain=.${hostname}`
  }
}

/** Read the current active language from the googtrans cookie */
function getCurrentLang() {
  try {
    const match = document.cookie.match(/googtrans=\/en\/([a-z]{2,})/)
    return match ? match[1] : 'en'
  } catch {
    return 'en'
  }
}

export default function LanguageSwitcher({ dark = false }) {
  const [open, setOpen]     = useState(false)
  const [active, setActive] = useState(getCurrentLang)
  const containerRef        = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleSelect(code) {
    setOpen(false)
    if (code === active) return   // no-op if already selected

    setActive(code)

    if (code === 'en') {
      // Clear the cookie by setting an expired/invalid value, then reload
      document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC'
      const hostname = window.location.hostname
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        document.cookie = `googtrans=; path=/; domain=${hostname}; expires=Thu, 01 Jan 1970 00:00:00 UTC`
        document.cookie = `googtrans=; path=/; domain=.${hostname}; expires=Thu, 01 Jan 1970 00:00:00 UTC`
      }
    } else {
      setGoogTransCookie(code)
    }

    // Reload so Google Translate reads the updated cookie on load
    window.location.reload()
  }

  const current = LANGUAGES.find(l => l.code === active) ?? LANGUAGES[0]

  return (
    <div ref={containerRef} className="relative notranslate" id="language-switcher" translate="no">

      {/* Toggle button */}
      <button
        id="lang-switcher-btn"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change language"
        translate="no"
        className={cn(
          'notranslate flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
          dark
            ? 'text-surface/70 hover:bg-surface/10 hover:text-surface border border-surface/20'
            : 'text-text-muted hover:bg-bg hover:text-text border border-border-subtle'
        )}
      >
        <Globe className="w-4 h-4 flex-shrink-0" />
        {/* notranslate keeps this text in its original script even after GT runs */}
        <span className="notranslate hidden sm:inline max-w-[80px] truncate" translate="no">{current.native}</span>
        <svg
          className={cn(
            'w-3 h-3 flex-shrink-0 transition-transform duration-150',
            open && 'rotate-180'
          )}
          fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          translate="no"
          className={cn(
            'notranslate absolute right-0 mt-2 w-48 rounded-xl shadow-2xl border overflow-hidden z-[9999]',
            dark
              ? 'bg-[#0B1F33] border-white/10'
              : 'bg-white border-gray-200'
          )}
        >
          <div className="py-1 max-h-72 overflow-y-auto">
            {LANGUAGES.map(lang => {
              const isActive = active === lang.code
              return (
                <button
                  key={lang.code}
                  role="option"
                  aria-selected={isActive}
                  id={`lang-option-${lang.code}`}
                  onClick={() => handleSelect(lang.code)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors duration-100',
                    isActive
                      ? dark
                        ? 'bg-brand-default/25 text-brand-default font-semibold'
                        : 'bg-brand-default/10 text-brand-default font-semibold'
                      : dark
                        ? 'text-white/70 hover:bg-white/10 hover:text-white'
                        : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <span className="font-medium">{lang.native}</span>
                  <span className={cn('text-xs', isActive ? 'text-brand-default' : 'text-gray-400')}>
                    {lang.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
