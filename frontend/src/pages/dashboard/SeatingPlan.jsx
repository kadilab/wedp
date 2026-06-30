import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from 'react-query'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, TouchSensor, useSensor, useSensors, closestCenter
} from '@dnd-kit/core'
import toast from 'react-hot-toast'
import { ArrowLeftIcon, PlusIcon, TrashIcon, PencilIcon, UsersIcon, ArrowsPointingOutIcon, XMarkIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon } from '@heroicons/react/24/outline'
import { guestAPI, weddingAPI } from '../../services/api'
import { seatsUsed } from '../../utils/tables'
import { eventUsesPlusOnes } from '../../utils/eventTypes'

const guestLabel = (g) => `${g.firstName} ${g.lastName}`.trim()
const initials = (g) => `${(g.firstName?.[0] || '')}${(g.lastName?.[0] || '')}`.toUpperCase() || '?'

// Stable pastel colour per guest (by name) for the avatar.
const AVATAR_COLORS = ['bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-pink-100 text-pink-700', 'bg-teal-100 text-teal-700', 'bg-indigo-100 text-indigo-700']
const colorFor = (g) => {
  const s = guestLabel(g)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

// ---- Draggable guest (avatar + name) ----
function GuestChip({ guest, usesPlusOnes, compact }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `guest:${guest.id}`,
    data: { type: 'guest', guestId: guest.id }
  })
  const isCouple = usesPlusOnes && guest.plusOnes > 0
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      title={guestLabel(guest) + (isCouple ? ' (couple — 2 personnes)' : '')}
      className={`group cursor-grab active:cursor-grabbing select-none touch-none flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 bg-white border border-gray-200 shadow-sm hover:shadow hover:border-primary-300 transition ${isDragging ? 'opacity-30' : ''} ${compact ? '' : 'w-full'}`}
    >
      <span className={`flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold ${colorFor(guest)}`}>{initials(guest)}</span>
      <span className="text-xs font-medium text-gray-700 truncate">{guestLabel(guest)}</span>
      {isCouple && <span className="text-[10px] font-semibold text-rose-500 shrink-0">×2</span>}
    </div>
  )
}

// ---- A table on the canvas ----
function TableCard({ table, guests, usesPlusOnes, zoom, onEdit, onDelete }) {
  const drop = useDroppable({ id: `table:${table.name}`, data: { type: 'table', name: table.name } })
  const move = useDraggable({ id: `move:${table.name}`, data: { type: 'table-move', name: table.name } })

  const used = seatsUsed(guests, usesPlusOnes)
  const cap = table.seats
  const full = cap != null && used >= cap
  const over = cap != null && used > cap
  const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0

  // The canvas is CSS-scaled by `zoom`; divide the drag transform so the table
  // tracks the cursor 1:1 on screen.
  const transform = move.transform ? `translate3d(${move.transform.x / zoom}px, ${move.transform.y / zoom}px, 0)` : undefined

  return (
    <div
      ref={drop.setNodeRef}
      style={{ left: table.x, top: table.y, width: 232, transform, zIndex: move.transform ? 50 : 1 }}
      className={`absolute rounded-2xl bg-white shadow-md transition-shadow ${drop.isOver ? 'ring-2 ring-primary-400 shadow-xl' : 'ring-1 ring-gray-200'}`}
    >
      {/* Header (drag handle) */}
      <div
        ref={move.setNodeRef}
        {...move.listeners}
        {...move.attributes}
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-t-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white cursor-move touch-none"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ArrowsPointingOutIcon className="h-3.5 w-3.5 opacity-70 shrink-0" />
          <span className="font-semibold text-sm truncate" title={table.name}>{table.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(table)} className="p-1 rounded hover:bg-white/20" title="Renommer / capacité"><PencilIcon className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDelete(table.name)} className="p-1 rounded hover:bg-white/20" title="Supprimer"><TrashIcon className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* Capacity */}
      <div className="px-3 pt-2">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className={over ? 'text-red-600 font-semibold' : full ? 'text-amber-600 font-medium' : 'text-gray-500'}>
            <UsersIcon className="h-3 w-3 inline -mt-0.5 mr-0.5" />
            {used}{cap != null ? `/${cap}` : ''} {full && !over ? '• complète' : over ? '• dépassée' : 'pers.'}
          </span>
        </div>
        {cap != null && (
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${over ? 'bg-red-500' : full ? 'bg-amber-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {/* Guests */}
      <div className="p-2.5 flex flex-col gap-1.5 min-h-[60px]">
        {guests.length === 0
          ? <div className="text-[11px] text-gray-300 italic text-center py-3 border border-dashed border-gray-200 rounded-lg">Glissez des invités ici</div>
          : guests.map((g) => <GuestChip key={g.id} guest={g} usesPlusOnes={usesPlusOnes} />)}
      </div>
    </div>
  )
}

// ---- Unassigned panel (droppable) ----
function UnassignedZone({ guests, usesPlusOnes, search, setSearch }) {
  const drop = useDroppable({ id: 'unassigned', data: { type: 'unassigned' } })
  return (
    <div className="w-full lg:w-64 lg:shrink-0 bg-white rounded-2xl shadow-lg flex flex-col max-h-[40vh] lg:max-h-[75vh] ring-1 ring-gray-200">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-primary-500" />
          Non assignés <span className="text-gray-400 font-normal">({guests.length})</span>
        </h3>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un invité..."
          className="input mt-2 text-sm"
        />
      </div>
      <div ref={drop.setNodeRef} className={`p-2 flex flex-wrap lg:flex-col gap-1.5 overflow-auto flex-1 rounded-b-2xl ${drop.isOver ? 'bg-primary-50' : ''}`}>
        {guests.length === 0
          ? <p className="text-xs text-gray-400 p-3 text-center w-full">Tous les invités sont placés 🎉</p>
          : guests.map((g) => <GuestChip key={g.id} guest={g} usesPlusOnes={usesPlusOnes} compact />)}
      </div>
    </div>
  )
}

// ---- Add / edit table modal ----
function TableModal({ initial, existingNames, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [seats, setSeats] = useState(initial?.seats ?? '')
  const isEdit = !!initial

  const submit = (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return toast.error('Le nom de la table est requis')
    if (existingNames.includes(n) && n !== initial?.name) return toast.error('Une table porte déjà ce nom')
    onSave({ name: n, seats: seats === '' ? null : Math.max(0, parseInt(seats) || 0) })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Modifier la table' : 'Nouvelle table'}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-5 w-5" /></button>
        </div>
        <div>
          <label className="label">Nom de la table *</label>
          <input autoFocus type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Table VIP, Famille mariée..." />
        </div>
        <div>
          <label className="label">Nombre de places <span className="text-gray-400 font-normal">— vide = illimité</span></label>
          <input type="number" min="0" className="input" value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="Ex : 8" />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">Annuler</button>
          <button type="submit" className="btn-primary btn-sm">{isEdit ? 'Enregistrer' : 'Ajouter'}</button>
        </div>
      </form>
    </div>
  )
}

export default function SeatingPlan() {
  const { id: weddingId } = useParams()
  const queryClient = useQueryClient()
  const [tables, setTables] = useState([])
  const [guests, setGuests] = useState([])
  const [usesPlusOnes, setUsesPlusOnes] = useState(false)
  const [search, setSearch] = useState('')
  const [activeGuest, setActiveGuest] = useState(null)
  const [modal, setModal] = useState(null) // null | { table } (table=null → add)
  const [zoom, setZoom] = useState(1)
  const initialized = useRef(false)
  const saveTimer = useRef(null)

  // Keep the other views (guest list, dashboard, tables) in sync so the user
  // doesn't have to refresh after assigning guests / editing tables here.
  const syncOtherViews = () => {
    queryClient.invalidateQueries(['guests', weddingId])
    queryClient.invalidateQueries(['wedding', weddingId])
    queryClient.invalidateQueries(['weddingTables', weddingId])
    queryClient.invalidateQueries('weddings')
  }

  const { data, isLoading } = useQuery(
    ['seating', weddingId],
    () => guestAPI.getSeating(weddingId),
    { refetchOnWindowFocus: false }
  )

  useEffect(() => {
    if (data && !initialized.current) {
      setTables(data.data.tables || [])
      setGuests(data.data.guests || [])
      setUsesPlusOnes(eventUsesPlusOnes(data.data.eventType))
      initialized.current = true
    }
  }, [data])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const tableNames = useMemo(() => new Set(tables.map((t) => t.name)), [tables])
  const { map: guestsByTable, unassigned } = useMemo(() => {
    const map = {}
    tables.forEach((t) => { map[t.name] = [] })
    const un = []
    for (const g of guests) {
      if (g.tableNumber && map[g.tableNumber]) map[g.tableNumber].push(g)
      else un.push(g)
    }
    return { map, unassigned: un }
  }, [guests, tables])

  const filteredUnassigned = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? unassigned.filter((g) => guestLabel(g).toLowerCase().includes(q)) : unassigned
  }, [unassigned, search])

  const people = (list) => seatsUsed(list, usesPlusOnes)
  const totalPeople = people(guests)
  const placedPeople = totalPeople - people(unassigned)

  const scheduleSave = (next) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      weddingAPI.saveTables(weddingId, next)
        .then(syncOtherViews)
        .catch(() => toast.error('Échec de la sauvegarde des tables'))
    }, 600)
  }

  const assignGuest = (guestId, newTable) => {
    const prev = guests
    setGuests((gs) => gs.map((g) => (g.id === guestId ? { ...g, tableNumber: newTable } : g)))
    guestAPI.update(weddingId, guestId, { tableNumber: newTable })
      .then(syncOtherViews)
      .catch(() => {
        setGuests(prev)
        toast.error("Échec de l'assignation")
      })
  }

  const handleDragStart = (e) => {
    if (e.active.data.current?.type === 'guest') {
      setActiveGuest(guests.find((g) => g.id === e.active.data.current.guestId) || null)
    }
  }

  const handleDragEnd = (e) => {
    setActiveGuest(null)
    const { active, over, delta } = e
    const type = active.data.current?.type
    if (type === 'table-move') {
      const name = active.data.current.name
      const next = tables.map((t) => (t.name === name
        ? { ...t, x: Math.max(0, Math.round((t.x || 0) + delta.x / zoom)), y: Math.max(0, Math.round((t.y || 0) + delta.y / zoom)) }
        : t))
      setTables(next)
      scheduleSave(next)
      return
    }
    if (type === 'guest' && over) {
      const guestId = active.data.current.guestId
      const dest = over.data.current
      if (dest?.type === 'table') {
        const t = tables.find((x) => x.name === dest.name)
        if (t?.seats != null && people(guestsByTable[dest.name] || []) >= t.seats) {
          toast(`« ${dest.name} » est déjà complète`, { icon: '⚠️' })
        }
        assignGuest(guestId, dest.name)
      } else if (dest?.type === 'unassigned') {
        assignGuest(guestId, '')
      }
    }
  }

  const saveTable = ({ name, seats }) => {
    if (modal?.table) {
      // Edit (possibly rename) → reassign guests if the name changed.
      const old = modal.table.name
      const next = tables.map((t) => (t.name === old ? { ...t, name, seats } : t))
      setTables(next)
      scheduleSave(next)
      if (name !== old) {
        guests.filter((g) => g.tableNumber === old).forEach((g) => assignGuest(g.id, name))
      }
    } else {
      const i = tables.length
      const next = [...tables, { name, seats, x: 30 + (i % 3) * 252, y: 30 + Math.floor(i / 3) * 250 }]
      setTables(next)
      scheduleSave(next)
    }
    setModal(null)
  }

  const deleteTable = (name) => {
    guests.filter((g) => g.tableNumber === name).forEach((g) => assignGuest(g.id, ''))
    const next = tables.filter((t) => t.name !== name)
    setTables(next)
    scheduleSave(next)
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/weddings/${weddingId}`} className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-bold text-gray-900">Plan de table</h1>
            <p className="text-gray-500 text-sm">
              {placedPeople}/{totalPeople} personnes placées • {tables.length} table{tables.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-1 py-0.5">
            <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} className="p-1.5 text-gray-500 hover:text-primary-600 disabled:opacity-40" disabled={zoom <= 0.5} title="Dézoomer">
              <MagnifyingGlassMinusIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setZoom(1)} className="text-xs font-medium text-gray-600 w-10 text-center hover:text-primary-600" title="Réinitialiser le zoom">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))} className="p-1.5 text-gray-500 hover:text-primary-600 disabled:opacity-40" disabled={zoom >= 1.5} title="Zoomer">
              <MagnifyingGlassPlusIcon className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => setModal({ table: null })} className="btn-primary btn-sm">
            <PlusIcon className="h-4 w-4 mr-1" /> Ajouter une table
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-start">
          <UnassignedZone guests={filteredUnassigned} usesPlusOnes={usesPlusOnes} search={search} setSearch={setSearch} />

          {/* Canvas */}
          <div className="flex-1 w-full overflow-auto rounded-2xl border border-dashed border-gray-300 bg-gray-50 h-[60vh] lg:h-[75vh]">
            {/* Sizer matches the scaled content so scrollbars stay correct */}
            <div style={{ width: 820 * zoom, height: 780 * zoom }}>
              <div
                className="relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]"
                style={{ width: 820, height: 780, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
              >
                {tables.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-400">
                    <UsersIcon className="h-12 w-12 mb-2 text-gray-300" />
                    <p>Aucune table. Cliquez sur « Ajouter une table ».</p>
                  </div>
                ) : tables.map((t) => (
                  <TableCard
                    key={t.name}
                    table={t}
                    guests={guestsByTable[t.name] || []}
                    usesPlusOnes={usesPlusOnes}
                    zoom={zoom}
                    onEdit={(table) => setModal({ table })}
                    onDelete={deleteTable}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeGuest ? (
            <div className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 bg-white shadow-lg ring-1 ring-primary-300">
              <span className={`flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold ${colorFor(activeGuest)}`}>{initials(activeGuest)}</span>
              <span className="text-xs font-medium text-gray-800">{guestLabel(activeGuest)}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modal && (
        <TableModal
          initial={modal.table}
          existingNames={[...tableNames]}
          onSave={saveTable}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
