import { useState } from 'react'
import { TableCellsIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'

// Local, controlled editor for an event's predefined table names (chips).
// Used in the create/edit forms where the value is submitted with the event
// (no immediate API call). value = string[]; onChange(nextArray).
export default function TablesEditor({ value = [], onChange }) {
  const [draft, setDraft] = useState('')
  const tables = Array.isArray(value) ? value : []

  const add = () => {
    const name = draft.trim()
    if (!name) return
    if (tables.includes(name)) { setDraft(''); return }
    onChange([...tables, name])
    setDraft('')
  }

  const remove = (name) => onChange(tables.filter((t) => t !== name))

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
          {tables.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-sm px-3 py-1.5 rounded-full">
              {t}
              <button type="button" onClick={() => remove(t)} className="text-primary-400 hover:text-primary-700" title="Retirer">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
