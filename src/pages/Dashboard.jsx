import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserData } from '../context/UserDataContext'
import { getEventById } from '../api/ticketmaster'
import RAImport from '../components/RAImport'
import AddCustomEvent from '../components/AddCustomFestival'


const HAS_KEY = import.meta.env.VITE_TICKETMASTER_KEY &&
  import.meta.env.VITE_TICKETMASTER_KEY !== 'your_ticketmaster_api_key_here'

function formatDate(dateStr) {
  if (!dateStr) return 'Date TBA'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/* ── Inline Edit Modal ──────────────────────────────────────────────── */
function EditFestivalModal({ eventId, onClose }) {
  const { getFestivalMeta, updateFestivalMeta } = useUserData()
  const meta = getFestivalMeta(eventId)

  const [name, setName] = useState(meta?.name ?? '')
  const [date, setDate] = useState(meta?.date ?? '')
  const [venue, setVenue] = useState(meta?.venue?.name ?? '')
  const [city, setCity] = useState(meta?.venue?.city ?? '')
  const [image, setImage] = useState(meta?.image ?? '')
  const [lineup, setLineup] = useState((meta?.lineup ?? []).join(', '))
  const [saved, setSaved] = useState(false)

  if (!meta) return null

  const handleSave = () => {
    const updatedMeta = {
      ...meta,
      name: name.trim() || meta.name,
      date: date.trim() || meta.date,
      venue: { ...(meta.venue ?? {}), name: venue.trim() || null, city: city.trim() || null },
      image: image.trim() || null,
      lineup: lineup.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
    }
    updateFestivalMeta(eventId, updatedMeta)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 12px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 5, display: 'block', fontWeight: 600 }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 0 env(safe-area-inset-bottom, 0)',
      }}
    >
      <div
        className="fade-in"
        style={{
          background: 'var(--bg-card)',
          width: '100%', maxWidth: 480,
          borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>✏️ Edit Festival</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
        </div>

        {/* Form — scrollable */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Event Name</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-grid">
            <div>
              <label style={labelStyle}>Venue</label>
              <input style={inputStyle} value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Gashouder" />
            </div>
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Amsterdam" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Image URL</label>
            <input style={inputStyle} value={image} onChange={e => setImage(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label style={labelStyle}>Lineup (comma-separated)</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
              value={lineup}
              onChange={e => setLineup(e.target.value)}
              placeholder="Artist 1, Artist 2, …"
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleSave} className="btn btn-primary" style={{ flex: 2 }}>
            {saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Festival Row ───────────────────────────────────────────────────── */
const FestivalRow = React.memo(({ eventId, onRemove, isUpcomingTab, onEdit }) => {
  const navigate = useNavigate()
  const { getSeenCount, seenArtists, getFestivalMeta } = useUserData()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  const isLocal = eventId.startsWith('ra-') || eventId.startsWith('custom-')

  useEffect(() => {
    if (isLocal) { setLoading(false); return }
    if (!HAS_KEY) { setLoading(false); return }
    getEventById(eventId)
      .then(setEvent)
      .catch(() => setEvent(null))
      .finally(() => setLoading(false))
  }, [eventId, isLocal])

  const localMeta = isLocal ? getFestivalMeta(eventId) : null
  const displayEvent = localMeta || event
  const seenCount = getSeenCount(eventId)

  const handleRemove = useCallback((e) => {
    e.stopPropagation()
    onRemove(eventId)
  }, [eventId, onRemove])

  const handleEdit = useCallback((e) => {
    e.stopPropagation()
    onEdit(eventId)
  }, [eventId, onEdit])

  if (loading) {
    return <div className="skeleton" style={{ height: 76, borderRadius: 12 }} />
  }

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        transition: 'border-color 250ms ease',
        overflow: 'hidden',
      }}
      onClick={() => navigate(`/festival/${eventId}`)}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Thumbnail */}
      {displayEvent?.image ? (
        <img src={displayEvent.image} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--gradient-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
          {eventId.startsWith('ra-') ? '🎧' : eventId.startsWith('custom-') ? '🎪' : '🎵'}
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.93rem', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
          {displayEvent?.name ?? eventId}
        </div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', gap: 8, flexWrap: 'wrap', lineHeight: 1.4 }}>
          {displayEvent?.date && <span style={{ whiteSpace: 'nowrap' }}>📅 {formatDate(displayEvent.date)}</span>}
          {displayEvent?.venue?.city && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>📍 {displayEvent.venue.city}</span>}
        </div>
      </div>

      {/* Seen badge */}
      {!isUpcomingTab && seenCount > 0 && (
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{seenCount}</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Seen</div>
        </div>
      )}

      {/* Edit button — only for editable local events */}
      {isLocal && (
        <button
          className="btn-ghost"
          onClick={handleEdit}
          title="Edit festival details"
          style={{ fontSize: '0.9rem', color: 'var(--text-muted)', flexShrink: 0, padding: '4px 7px' }}
        >
          ✏️
        </button>
      )}

      {/* Remove button */}
      <button
        className="btn-ghost"
        style={{ fontSize: '0.85rem', color: 'var(--text-muted)', flexShrink: 0, padding: '4px 7px' }}
        onClick={handleRemove}
        id={`remove-${eventId}`}
        title="Remove from list"
      >
        ✕
      </button>
    </div>
  )
})

/* ── Dashboard page ─────────────────────────────────────────────────── */
export default function Dashboard() {
  const {
    attendedFestivals,
    upcomingFestivals,
    seenArtists,
    festivalRatings,
    artistNotes,
    toggleAttended,
    toggleUpcoming,
    importData,
    clearFestivals,
    getFestivalMeta,
  } = useUserData()
  const navigate = useNavigate()
  const [showImport, setShowImport] = useState(false)
  const [activeTab, setActiveTab] = useState('attended')
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const fileInputRef = useRef(null)

  const handleImportFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        if (data && typeof data === 'object') {
          importData(data)
          alert('Profile successfully restored!')
        }
      } catch (err) {
        alert('Invalid backup file.')
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  const totalSeen = Object.values(seenArtists).reduce((sum, arr) => sum + arr.length, 0)
  const festivalRatingValues = attendedFestivals
    .map(id => festivalRatings?.[id])
    .filter(r => r && r > 0)
  const avgRatingAll = festivalRatingValues.length > 0
    ? (festivalRatingValues.reduce((a, b) => a + b, 0) / festivalRatingValues.length).toFixed(1)
    : null
  const totalNotes = Object.values(artistNotes).filter(n => n.trim()).length

  // Sort festivals by date — attending: newest first; upcoming: soonest first
  const sortedAttended = useMemo(() => {
    return [...attendedFestivals].sort((a, b) => {
      const da = getFestivalMeta(a)?.date ?? ''
      const db = getFestivalMeta(b)?.date ?? ''
      return da.localeCompare(db) // oldest first
    })
  }, [attendedFestivals, getFestivalMeta])

  const sortedUpcoming = useMemo(() => {
    return [...upcomingFestivals].sort((a, b) => {
      const da = getFestivalMeta(a)?.date ?? ''
      const db = getFestivalMeta(b)?.date ?? ''
      return da.localeCompare(db) // soonest first
    })
  }, [upcomingFestivals, getFestivalMeta])

  const displayList = activeTab === 'attended' ? sortedAttended : sortedUpcoming
  const removeHandler = activeTab === 'attended' ? toggleAttended : toggleUpcoming

  return (
    <div className="page">
      <div className="container">
        <div style={{ paddingTop: 8, marginBottom: 32 }}>
          <h1 className="section-title" style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 6 }}>
            My Festivals
          </h1>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Your personal festival history & schedule</p>
            </div>
          </div>
        </div>

        {showImport && (
          <div style={{ marginBottom: 40 }}>
            <RAImport />
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Festivals Attended</div>
            <div className="stat-value">{attendedFestivals.length}</div>
            <div className="stat-sub">festivals on record</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Artists Seen</div>
            <div className="stat-value">{totalSeen}</div>
            <div className="stat-sub">live performances tracked</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg. Vibe</div>
            <div className="stat-value">{avgRatingAll ?? '—'}</div>
            <div className="stat-sub">{festivalRatingValues.length} festivals rated</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Upcoming</div>
            <div className="stat-value">{upcomingFestivals.length}</div>
            <div className="stat-sub">future festivals planned</div>
          </div>
        </div>

        <div className="divider" />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className={`btn ${activeTab === 'attended' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('attended')}
            style={activeTab === 'attended' ? {} : { border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            Past ({attendedFestivals.length})
          </button>
          <button
            className={`btn ${activeTab === 'upcoming' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('upcoming')}
            style={activeTab === 'upcoming' ? { background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' } : { border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            Upcoming ({upcomingFestivals.length})
          </button>
          <div style={{ marginLeft: 'auto' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAddCustom(!showAddCustom)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {showAddCustom ? '✕ Close' : '＋ Add Event'}
            </button>
          </div>
        </div>

        {/* Add custom festival form */}
        {showAddCustom && (
          <div style={{ marginBottom: 24 }}>
            <AddCustomEvent onClose={() => setShowAddCustom(false)} />
          </div>
        )}

        {displayList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎟️</div>
            <h3>No {activeTab} festivals yet</h3>
            <p>Head to the Discover page to find festivals and mark them to your schedule.</p>
            <button className="btn btn-primary" onClick={() => navigate('/')} id="go-discover-btn">
              Discover Festivals
            </button>
          </div>
        ) : (
          <>
            <div className="section-header">
              <h2 className="section-title">{activeTab === 'attended' ? 'Attended Festivals' : 'Upcoming Festivals'}</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (confirm(`Are you sure you want to clear your ${activeTab} list? This will also remove any artist ratings associated with these festivals.`)) {
                    clearFestivals(activeTab)
                  }
                }}
                style={{ color: '#ff4444' }}
              >
                🗑️ Clear List
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayList.map(id => (
                <FestivalRow
                  key={id}
                  eventId={id}
                  onRemove={removeHandler}
                  isUpcomingTab={activeTab === 'upcoming'}
                  onEdit={setEditingId}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit modal */}
      {editingId && (
        <EditFestivalModal eventId={editingId} onClose={() => setEditingId(null)} />
      )}
    </div>
  )
}
