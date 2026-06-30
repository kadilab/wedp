import { create } from 'zustand'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'

// Promise-based confirmation modal — a styled replacement for window.confirm().
// Usage:
//   import { confirmDialog } from '../../components/common/confirm'
//   const ok = await confirmDialog({ title, message, confirmText, danger: true })
//   if (!ok) return
// Mount <ConfirmRoot /> once at the app root.
const useConfirmStore = create((set, get) => ({
  open: false,
  opts: {},
  resolver: null,
  show: (opts) =>
    new Promise((resolve) => {
      // Resolve any previously-open dialog as cancelled before opening a new one.
      get().resolver?.(false)
      set({ open: true, opts: opts || {}, resolver: resolve })
    }),
  close: (value) => {
    get().resolver?.(value)
    set({ open: false, resolver: null })
  }
}))

export function confirmDialog(opts) {
  return useConfirmStore.getState().show(opts)
}

export function ConfirmRoot() {
  const { open, opts, close } = useConfirmStore()
  if (!open) return null

  const {
    title = 'Confirmer l’action',
    message = 'Êtes-vous sûr ?',
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    danger = true
  } = opts

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => close(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`shrink-0 h-11 w-11 rounded-full flex items-center justify-center ${danger ? 'bg-red-100' : 'bg-primary-100'}`}>
              <ExclamationTriangleIcon className={`h-6 w-6 ${danger ? 'text-red-600' : 'text-primary-600'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="mt-1 text-sm text-gray-600 break-words">{message}</p>
            </div>
            <button onClick={() => close(false)} className="shrink-0 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={() => close(false)}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            onClick={() => close(true)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-white font-medium ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
