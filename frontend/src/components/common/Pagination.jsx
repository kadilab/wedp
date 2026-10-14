import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

// Page numbers with ellipses: 1 … 4 5 [6] 7 8 … 20. Always shows the first and
// last page plus `siblings` pages around the current one.
function pageItems(page, totalPages, siblings = 1) {
  const pages = new Set([1, totalPages])
  for (let p = page - siblings; p <= page + siblings; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p)
  }
  const sorted = [...pages].sort((a, b) => a - b)
  const items = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push(`gap-${p}`)
    items.push(p)
  })
  return items
}

export default function Pagination({ page, totalPages, total, pageSize, onChange, label = 'éléments' }) {
  if (!totalPages || totalPages <= 1) {
    return total > 0 ? (
      <p className="text-center text-sm text-gray-400">{total} {label}</p>
    ) : null
  }

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const btn = 'h-9 min-w-[2.25rem] px-2 rounded-lg text-sm font-medium transition-colors'

  return (
    <nav className="flex flex-col sm:flex-row items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-sm text-gray-500">
        <span className="font-medium text-gray-700">{from}–{to}</span> sur {total} {label}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className={`${btn} flex items-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent`}
          aria-label="Page précédente"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {pageItems(page, totalPages).map((item) =>
          typeof item === 'string' ? (
            <span key={item} className="px-1 text-gray-400 select-none">…</span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={`${btn} ${item === page ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className={`${btn} flex items-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent`}
          aria-label="Page suivante"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </nav>
  )
}
