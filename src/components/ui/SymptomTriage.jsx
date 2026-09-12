import { useState } from 'react'
import { Stethoscope, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from './Button'

export default function SymptomTriage() {
  const [symptoms, setSymptoms] = useState('')
  const [severity, setSeverity] = useState(5)
  const [duration, setDuration] = useState(1)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleTriage = async (e) => {
    e.preventDefault()
    if (!symptoms.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const symptomList = symptoms.split(',').map(s => s.trim()).filter(Boolean)
      const response = await fetch('http://localhost:8000/api/v1/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: symptomList,
          severity: Number(severity),
          duration_days: Number(duration)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to connect to the Triage API. Ensure it is running on port 8000.')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface-elevated rounded-3xl p-6 md:p-8 border border-border-subtle shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-brand-default/10 flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-6 h-6 text-brand-default" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Symptom Checker</h2>
          <p className="text-xs text-text-muted mt-0.5">Deterministic Rule-Based Triage (No AI)</p>
        </div>
      </div>

      <form onSubmit={handleTriage} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1.5">Symptoms or Disease</label>
          <input 
            type="text" 
            list={symptoms.length > 0 ? "symptom-suggestions" : undefined}
            placeholder="e.g. chest pain, fever, continuous cough" 
            className="w-full bg-canvas border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-default focus:ring-1 focus:ring-brand-default transition-all"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            required
            autoComplete="off"
          />
          <datalist id="symptom-suggestions">
            {/* English */}
            <option value="chest pain" />
            <option value="severe shortness of breath" />
            <option value="difficulty breathing" />
            <option value="loss of consciousness" />
            <option value="severe bleeding" />
            <option value="fever" />
            <option value="mild headache" />
            <option value="body pain" />
            <option value="sore throat" />
            {/* Hindi */}
            <option value="सीने में दर्द" />
            <option value="सांस लेने में कठिनाई" />
            <option value="बेहोश हो जाना" />
            <option value="बुखार" />
            <option value="सिरदर्द" />
            {/* Gujarati */}
            <option value="છાતીમાં દુખાવો" />
            <option value="શ્વાસ લેવામાં તકલીફ" />
            <option value="બેભાન" />
            <option value="તાવ" />
            <option value="માથાનો દુખાવો" />
          </datalist>
          <div className="mt-2 text-[11px] text-text-muted bg-canvas p-3 rounded-lg border border-border-subtle">
            <span className="font-semibold block mb-2 text-text-primary">Supported Multilingual Keywords (Exact match required):</span>
            
            <div className="space-y-3">
              <div>
                <span className="text-status-critical font-medium block mb-0.5">🚨 Emergency (Red Flags):</span>
                <ul className="space-y-1 pl-1">
                  <li><span className="font-medium text-text-primary">English:</span> chest pain, severe shortness of breath, loss of consciousness</li>
                  <li><span className="font-medium text-text-primary">Hindi (हिंदी):</span> सीने में दर्द, सांस लेने में कठिनाई, बेहोश हो जाना</li>
                  <li><span className="font-medium text-text-primary">Gujarati (ગુજરાતી):</span> છાતીમાં દુખાવો, શ્વાસ લેવામાં તકલીફ, બેભાન</li>
                </ul>
              </div>
              
              <div className="pt-2 border-t border-border-subtle">
                <span className="text-status-success font-medium block mb-0.5">🟢 Non-Urgent:</span>
                <ul className="space-y-1 pl-1">
                  <li><span className="font-medium text-text-primary">English:</span> fever, mild headache, body pain</li>
                  <li><span className="font-medium text-text-primary">Hindi (हिंदी):</span> बुखार, सिरदर्द</li>
                  <li><span className="font-medium text-text-primary">Gujarati (ગુજરાતી):</span> તાવ, માથાનો દુખાવો</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-1.5">Severity (1-10)</label>
            <input 
              type="number" 
              min="1" max="10" 
              className="w-full bg-canvas border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-default transition-all"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-1.5">Duration (Days)</label>
            <input 
              type="number" 
              min="1" 
              className="w-full bg-canvas border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-default transition-all"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
        </div>
        <Button type="submit" className="w-full py-3" disabled={loading || !symptoms.trim()}>
          {loading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> 
              <span>Analyzing...</span>
            </span>
          ) : (
            <span>Evaluate Triage Level</span>
          )}
        </Button>
      </form>

      {error && (
        <div className="mt-5 p-4 rounded-xl bg-status-critical-bg border border-status-critical/20 text-status-critical text-sm font-medium">
          {error}
        </div>
      )}

      {result && (
        <div className={`mt-6 p-6 rounded-2xl border transition-all animate-in fade-in slide-in-from-bottom-2 ${result.emergency ? 'bg-status-critical-bg border-status-critical shadow-lg ring-4 ring-status-critical/20' : 'bg-status-success-bg border-status-success/30'}`}>
          {result.emergency && (
            <div className="flex items-center gap-2 mb-4 bg-status-critical text-white px-4 py-2 rounded-lg animate-pulse w-fit">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold tracking-widest uppercase">Emergency Signal Active</span>
            </div>
          )}
          <div className="flex items-start gap-4">
            {!result.emergency && <CheckCircle className="w-6 h-6 text-status-success flex-shrink-0 mt-0.5" />}
            <div>
              <h3 className={`font-bold text-2xl mb-2 uppercase tracking-wide ${result.emergency ? 'text-status-critical' : 'text-status-success'}`}>
                {result.triage_level}
              </h3>
              <p className="text-base font-bold text-text-primary mb-3">{result.recommended_action}</p>
              
              {result.reasons?.length > 0 && (
                <div className="mb-3">
                  <span className="text-sm font-semibold text-text-muted mb-2 block">Rule Engine Findings:</span>
                  <ul className="text-sm text-text-primary space-y-1.5 list-disc pl-5 marker:text-border-subtle">
                    {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              
              <p className="text-[11px] text-text-muted opacity-80 italic mt-5 pt-3 border-t border-black/5">
                {result.disclaimer}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
