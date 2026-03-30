import { useState } from 'react'
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

  const [connectCode, setConnectCode] = useState('')
  const [showConnect, setShowConnect] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const isConnected = !!syncSettings.syncCode

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

  const statusIndicator = {
    idle: null,
    syncing: { color: '#a78bfa', text: 'Syncing…', icon: '↻' },
    success: { color: '#34d399', text: 'Synced', icon: '✓' },
    error: { color: '#f87171', text: 'Sync error', icon: '✕' },
  }[syncStatus]

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isConnected ? 'rgba(139, 92, 246, 0.3)' : 'var(--border)'}`,
      borderRadius: 16,
      padding: '24px 28px',
      marginBottom: 32,
      transition: 'border-color 250ms ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ 
          width: 36, height: 36, borderRadius: 10,
          background: isConnected ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-glass)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isConnected ? 'var(--accent)' : 'var(--text-muted)',
        }}>
          <CloudIcon size={20} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
            Cloud Sync
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {isConnected ? 'Connected — changes sync automatically' : 'Sync your data across devices'}
          </div>
        </div>
        {statusIndicator && (
          <div style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.75rem', fontWeight: 600,
            color: statusIndicator.color,
            animation: syncStatus === 'syncing' ? 'pulse 1.5s ease infinite' : 'none',
          }}>
            <span>{statusIndicator.icon}</span>
            <span>{statusIndicator.text}</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          background: 'rgba(248, 113, 113, 0.1)',
          border: '1px solid rgba(248, 113, 113, 0.3)',
          borderRadius: 8, padding: '8px 14px', marginBottom: 16,
          fontSize: '0.82rem', color: '#f87171',
        }}>
          {error}
        </div>
      )}

      {/* ── Not Connected ── */}
      {!isConnected && !showConnect && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={handleEnable}
            disabled={syncStatus === 'syncing'}
            id="enable-sync-btn"
            style={{ flex: 1, minWidth: 140 }}
          >
            ☁️ Enable Cloud Sync
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowConnect(true)}
            id="show-connect-btn"
            style={{ flex: 1, minWidth: 140 }}
          >
            🔗 Connect to Existing
          </button>
        </div>
      )}

      {/* ── Connect Form ── */}
      {!isConnected && showConnect && (
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
            Enter the sync code from your other device:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={connectCode}
              onChange={e => setConnectCode(e.target.value)}
              placeholder="Paste sync code here…"
              id="sync-code-input"
              style={{
                flex: 1,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                fontFamily: 'monospace',
                outline: 'none',
              }}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
            />
            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={!connectCode.trim() || syncStatus === 'syncing'}
              id="connect-sync-btn"
            >
              Connect
            </button>
          </div>
          <button
            className="btn-ghost"
            onClick={() => { setShowConnect(false); setError('') }}
            style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}
          >
            ← Back
          </button>
        </div>
      )}

      {/* ── Connected ── */}
      {isConnected && (
        <div>
          {/* Sync code display */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 16,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Your Sync Code
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '0.85rem',
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
              style={{ flexShrink: 0, minWidth: 70 }}
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>

          {/* Last synced */}
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Last synced: {formatTimeAgo(syncSettings.lastSyncAt)}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handlePull}
              disabled={syncStatus === 'syncing'}
              id="pull-sync-btn"
              title="Download the latest data from cloud"
            >
              ↓ Pull Latest
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handlePush}
              disabled={syncStatus === 'syncing'}
              id="push-sync-btn"
              title="Upload your current data to cloud"
            >
              ↑ Push Now
            </button>
            <button
              className="btn-ghost"
              onClick={handleDisconnect}
              id="disconnect-sync-btn"
              style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
