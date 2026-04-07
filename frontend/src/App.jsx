import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function formatValue(value, unit = '') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }
  return `${Number(value).toFixed(2)}${unit}`
}

function App() {
  const [meterData, setMeterData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isToggling, setIsToggling] = useState(false)

  const relayStatus = meterData?.relayStatus === '1' ? '1' : '0'
  const relayOn = relayStatus === '1'

  const lastUpdatedText = useMemo(() => {
    if (!meterData?.timestamp) return 'Waiting for meter data...'
    return `Last update: ${new Date(meterData.timestamp).toLocaleString()}`
  }, [meterData?.timestamp])

  async function fetchLatestData() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/meter/latest`)
      if (!response.ok) throw new Error('Unable to load latest readings')
      const data = await response.json()
      setMeterData(data)
      setError('')
    } catch (fetchError) {
      setError(fetchError.message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleRelay() {
    const nextCommand = relayOn ? '0' : '1'
    try {
      setIsToggling(true)
      const response = await fetch(`${API_BASE_URL}/api/meter/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: nextCommand }),
      })
      if (!response.ok) throw new Error('Failed to switch relay')
      const result = await response.json()
      setMeterData((prev) => ({
        ...(prev || {}),
        relayStatus: result.currentStatus?.toString() || nextCommand,
      }))
      setError('')
    } catch (toggleError) {
      setError(toggleError.message)
    } finally {
      setIsToggling(false)
    }
  }

  useEffect(() => {
    fetchLatestData()
    const intervalId = setInterval(fetchLatestData, 2000)
    return () => clearInterval(intervalId)
  }, [])

  const cards = [
    { label: 'Voltage', value: formatValue(meterData?.voltage, ' V') },
    { label: 'Current', value: formatValue(meterData?.current, ' A') },
    { label: 'Power', value: formatValue(meterData?.power, ' W') },
    { label: 'Units', value: formatValue(meterData?.units, ' kWh') },
    { label: 'Bill', value: formatValue(meterData?.bill, ' INR') },
  ]

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-green-200 bg-white p-5 shadow-lg sm:p-8">
        <p className="mb-3 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 sm:text-sm">
          Smart Energy Meter
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
          Live Meter Dashboard
        </h1>

        <p className="mt-3 text-sm text-slate-600 sm:text-base">{lastUpdatedText}</p>
        {error && (
          <p className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.label}
              className="rounded-xl border border-green-200 bg-green-50 p-4"
            >
              <p className="text-sm text-slate-600">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-green-700">
                {loading ? '...' : card.value}
              </p>
            </article>
          ))}
        </div>

        <section className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-slate-600">Light relay status</p>
          <p className={`mt-1 text-lg font-semibold ${relayOn ? 'text-green-700' : 'text-amber-600'}`}>
            {relayOn ? 'ON' : 'OFF'}
        </p>
          <button
            type="button"
            onClick={toggleRelay}
            disabled={isToggling}
            className="mt-3 w-full rounded-lg bg-green-500 px-4 py-3 text-base font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isToggling ? 'Switching...' : relayOn ? 'Turn Light OFF' : 'Turn Light ON'}
          </button>
        </section>
      </div>
    </main>
  )
}

export default App
