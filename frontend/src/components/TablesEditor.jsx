import { useState } from 'react'
import { TableCellsIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import { tableName } from '../utils/tables'

// Local, controlled editor for an event's predefined tables (chips). Used in the
// create/edit forms where the value is submitted with the event (no immediate
// API call). Items may be strings (new) or objects { name, seats, x, y } (kept
// intact so the seating plan's capacity/positions aren't lost when editing).
export default function TablesEditor({ value = [], onChange }) {
  const [draft, setDraft] = useState('')
  const tables = Array.isArray(value) ? value : []

  const add = () => {
    const name = draft.trim()
    if (!name) return
    if (tables.some((t) => tableName(t) === name)) { setDraft(''); return }
    onChange([...tables, name])
    setDraft('')
  }

  const remove = (name) => onChange(tables.filter((t) => tableName(t) !== name))

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); add() }
  }

  return (
    <div className="border-t pt-6 space-y-3">
      <h3 className="font-medium text-gray-900 flex items-center">
        <TableCellsIcon className="h-5 w-5 mr-2 text-primary-500" />
        Tables de l'événement
        <span className="ml-2 text-xs font-normal text-gray-400">(facultatif)</span>
      </h3>
      <p className="text-sm text-gray-500">
        Définissez vos tables ici : elles seront proposées en liste lors de l'ajout d'invités et dans le modèle d'import.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ex : Table VIP, Table 1, Table des mariés..."
          className="input flex-1"
        />
        <button type="button" onClick={add} className="btn-secondary whitespace-nowrap flex items-center">
          <PlusIcon className="h-4 w-4 mr-1" /> Ajouter
        </button>
      </div>
      {tables.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tables.map((t) => {
            const name = tableName(t)
            return (
              <span key={name} className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-sm px-3 py-1.5 rounded-full">
                {name}
                {typeof t === 'object' && t?.seats != null && <span className="text-primary-400">({t.seats})</span>}
                <button type="button" onClick={() => remove(name)} className="text-primary-400 hover:text-primary-700" title="Retirer">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
