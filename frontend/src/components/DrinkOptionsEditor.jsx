import { useState } from 'react'
import { GiftIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'

// Local, controlled editor for an event's drink list (chips). Used in the
// create/edit forms where the value is submitted with the event (no immediate
// API call) — mirrors TablesEditor.jsx for the same predefined-list pattern.
export default function DrinkOptionsEditor({ value = [], onChange }) {
  const [draft, setDraft] = useState('')
  const drinks = Array.isArray(value) ? value : []

  const add = () => {
    const name = draft.trim()
    if (!name) return
    if (drinks.some((d) => d.toLowerCase() === name.toLowerCase())) { setDraft(''); return }
    onChange([...drinks, name])
    setDraft('')
  }

  const remove = (name) => onChange(drinks.filter((d) => d !== name))

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); add() }
  }

  return (
    <div className="border-t pt-6 space-y-3">
      <h3 className="font-medium text-gray-900 flex items-center">
        <GiftIcon className="h-5 w-5 mr-2 text-primary-500" />
        Liste de boissons
        <span className="ml-2 text-xs font-normal text-gray-400">(facultatif)</span>
      </h3>
      <p className="text-sm text-gray-500">
        Proposez ces choix aux invités lorsqu'ils confirment leur présence — utile pour prévoir les quantités avec le traiteur.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ex : Champagne, Vin rouge, Jus de fruit, Eau..."
          className="input flex-1"
        />
        <button type="button" onClick={add} className="btn-secondary whitespace-nowrap flex items-center">
          <PlusIcon className="h-4 w-4 mr-1" /> Ajouter
        </button>
      </div>
      {drinks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {drinks.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-sm px-3 py-1.5 rounded-full">
              {name}
              <button type="button" onClick={() => remove(name)} className="text-primary-400 hover:text-primary-700" title="Retirer">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
