import { useEffect } from 'react'
import { useParams, Navigate, Link, NavLink } from 'react-router-dom'
import useSiteSettingsStore from '../../../stores/siteSettingsStore'
import { getLegalDoc, LEGAL_NAV, LEGAL_SLUGS, LEGAL_UPDATED } from './legalContent'

export default function LegalPage() {
  const { slug } = useParams()
  const { siteName, contactEmail, supportPhone } = useSiteSettingsStore()

  useEffect(() => { window.scrollTo(0, 0) }, [slug])

  if (!LEGAL_SLUGS.includes(slug)) return <Navigate to="/legal/conditions" replace />

  const doc = getLegalDoc(slug, { siteName, contactEmail, supportPhone })
  if (!doc) return <Navigate to="/legal/conditions" replace />

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-4">
      {/* Fil d'ariane */}
      <nav className="mb-6 text-xs text-muted">
        <Link to="/" className="transition-colors hover:text-content">Accueil</Link>
        <span className="mx-2">/</span>
        <span className="text-content">{doc.title}</span>
      </nav>

      {/* En-tête */}
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-content sm:text-4xl">{doc.title}</h1>
        {doc.subtitle && <p className="mt-3 max-w-2xl text-muted">{doc.subtitle}</p>}
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
          Dernière mise à jour : {LEGAL_UPDATED}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Navigation latérale */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-muted">Informations légales</p>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {LEGAL_NAV.map((item) => (
              <li key={item.slug}>
                <NavLink
                  to={`/legal/${item.slug}`}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-primary-500/10 font-medium text-primary-600 dark:text-primary-400'
                        : 'text-muted hover:bg-surface-2 hover:text-content'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </aside>

        {/* Corps du document */}
        <article className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="space-y-8">
            {doc.sections.map((section, i) => (
              <section key={i}>
                <h2 className="font-serif text-lg font-bold text-content sm:text-xl">{section.h}</h2>
                {section.p?.map((para, j) => (
                  <p key={j} className="mt-3 text-sm leading-relaxed text-muted">{para}</p>
                ))}
                {section.list && (
                  <ul className="mt-3 space-y-2">
                    {section.list.map((item, j) => (
                      <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <p className="mt-10 border-t border-border pt-6 text-xs text-muted">
            Ce document est fourni à titre informatif et ne constitue pas un conseil juridique.
            Une question ? Écrivez-nous{contactEmail ? ` à ` : ''}
            {contactEmail && <a href={`mailto:${contactEmail}`} className="text-primary-600 hover:underline dark:text-primary-400">{contactEmail}</a>}.
          </p>
        </article>
      </div>
    </div>
  )
}
