import { useState, useRef, useEffect } from 'react'
import { useUserData } from '../context/UserDataContext'

function CloudIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  )
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'never'
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function SyncSettings() {
  const {
    syncSettings,
    syncStatus,
    enableSync,
    connectSync,
    pullSync,
    pushSync,
    disconnectSync,
  } = useUserData()

  const [open, setOpen] = useState(false)
  const [connectCode, setConnectCode] = useState('')
  const [showConnect, setShowConnect] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const panelRef = useRef(null)

  const isConnected = !!syncSettings.syncCode

  // Close panel on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleEnable = async () => {
    setError('')
    try {
      await enableSync()
    } catch (err) {
      setError('Failed to enable sync. Please try again.')
    }
  }

  const handleConnect = async () => {
    const code = connectCode.trim()
    if (!code) return
    setError('')
    try {
      await connectSync(code)
      setShowConnect(false)
      setConnectCode('')
    } catch (err) {
      if (err.message === 'SYNC_NOT_FOUND') {
        setError('Sync code not found. Please check and try again.')
      } else {
        setError('Failed to connect. Please try again.')
      }
    }
  }

  const handlePull = async () => {
    setError('')
    try {
      await pullSync()
    } catch {
      setError('Failed to pull latest data.')
    }
  }

  const handlePush = async () => {
    setError('')
    try {
      await pushSync()
    } catch {
      setError('Failed to push data to cloud.')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(syncSettings.syncCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDisconnect = () => {
    if (confirm('Disconnect cloud sync? Your local data will be kept.')) {
      disconnectSync()
    }
  }

  const statusColor = {
    idle: isConnected ? '#34d399' : 'var(--text-muted)',
    syncing: '#a78bfa',
    success: '#34d399',
    error: '#f87171',
  }[syncStatus]

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        id="sync-toggle-btn"
        onClick={() => setOpen(!open)}
        title={isConnected ? `Cloud Sync — Last: ${formatTimeAgo(syncSettings.lastSyncAt)}` : 'Cloud Sync'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          background: open ? 'var(--bg-glass-hover)' : 'transparent',
          border: '1px solid',
          borderColor: open ? 'var(--border-hover)' : 'transparent',
          borderRadius: 'var(--radius-md)',
          padding: '7px 10px',
          color: statusColor,
          cursor: 'pointer',
          transition: 'all 250ms ease',
          position: 'relative',
        }}
      >
        <CloudIcon size={18} />
        {syncStatus === 'syncing' && (
          <span style={{
            fontSize: '0.7rem',
            animation: 'pulse 1.5s ease infinite',
          }}>↻</span>
        )}
        {/* Connected dot indicator */}
        {isConnected && syncStatus === 'idle' && (
          <span style={{
            position: 'absolute',
            top: 5,
            right: 5,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#34d399',
          }} />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 320,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
          padding: 16,
          zIndex: 200,
          animation: 'fadeIn 150ms ease',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: isConnected ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-glass)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isConnected ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '0.85rem',
            }}>
              <CloudIcon size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem' }}>
                Cloud Sync
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {isConnected ? `Synced ${formatTimeAgo(syncSettings.lastSyncAt)}` : 'Sync across devices'}
              </div>
            </div>
            {syncStatus !== 'idle' && (
              <div style={{
                fontSize: '0.7rem', fontWeight: 600,
                color: statusColor,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {syncStatus === 'syncing' && <>↻ Syncing…</>}
                {syncStatus === 'success' && <>✓ Synced</>}
                {syncStatus === 'error' && <>✕ Error</>}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(248, 113, 113, 0.1)',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              borderRadius: 8, padding: '6px 10px', marginBottom: 10,
              fontSize: '0.78rem', color: '#f87171',
            }}>
              {error}
            </div>
          )}

          {/* ── Not Connected ── */}
          {!isConnected && !showConnect && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleEnable}
                disabled={syncStatus === 'syncing'}
                id="enable-sync-btn"
                style={{ width: '100%' }}
              >
                ☁️ Enable Cloud Sync
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowConnect(true)}
                id="show-connect-btn"
                style={{ width: '100%' }}
              >
                🔗 Connect to Existing
              </button>
            </div>
          )}

          {/* ── Connect Form ── */}
          {!isConnected && showConnect && (
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                Enter sync code from your other device:
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={connectCode}
                  onChange={e => setConnectCode(e.target.value)}
                  placeholder="Paste sync code…"
                  id="sync-code-input"
                  style={{
                    flex: 1,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleConnect}
                  disabled={!connectCode.trim() || syncStatus === 'syncing'}
                  id="connect-sync-btn"
                >
                  Go
                </button>
              </div>
              <button
                className="btn-ghost"
                onClick={() => { setShowConnect(false); setError('') }}
                style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}
              >
                ← Back
              </button>
            </div>
          )}

          {/* ── Connected ── */}
          {isConnected && (
            <div>
              {/* Sync code */}
              <div style={{
                background: 'var(--bg-surface, var(--bg-secondary))',
                border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 10px',
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                    Sync Code
                  </div>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '0.78rem',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    userSelect: 'all',
                  }}>
                    {syncSettings.syncCode}
                  </div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopy}
                  id="copy-sync-code-btn"
                  style={{ flexShrink: 0, padding: '5px 10px', fontSize: '0.75rem' }}
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handlePull}
                  disabled={syncStatus === 'syncing'}
                  id="pull-sync-btn"
                  title="Download the latest data from cloud"
                  style={{ flex: 1, fontSize: '0.78rem' }}
                >
                  ↓ Pull
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handlePush}
                  disabled={syncStatus === 'syncing'}
                  id="push-sync-btn"
                  title="Upload your current data to cloud"
                  style={{ flex: 1, fontSize: '0.78rem' }}
                >
                  ↑ Push
                </button>
              </div>

              <button
                className="btn-ghost"
                onClick={handleDisconnect}
                id="disconnect-sync-btn"
                style={{ width: '100%', marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
