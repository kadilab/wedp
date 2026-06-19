import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  PaintBrushIcon,
  PhotoIcon,
  DocumentTextIcon,
  SwatchIcon,
  ArrowsPointingOutIcon,
  EyeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  HeartIcon,
  SparklesIcon,
  CalendarDaysIcon,
  BuildingLibraryIcon,
  MusicalNoteIcon,
  MapPinIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

// Custom Church Icon
const ChurchIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 0l3 2m-3-2l-3 2m3 0v4m-6 8h12l1-6H5l1 6zm-2 0v4h16v-4M8 14v6m8-6v6m-4-10v4" />
  </svg>
)

const FONT_FAMILIES = [
  { value: 'Playfair Display', label: 'Playfair Display', type: 'serif' },
  { value: 'Great Vibes', label: 'Great Vibes', type: 'script' },
  { value: 'Cormorant Garamond', label: 'Cormorant', type: 'serif' },
  { value: 'Montserrat', label: 'Montserrat', type: 'sans' },
  { value: 'Lora', label: 'Lora', type: 'serif' },
  { value: 'Dancing Script', label: 'Dancing Script', type: 'script' },
  { value: 'Josefin Sans', label: 'Josefin Sans', type: 'sans' },
  { value: 'Crimson Text', label: 'Crimson Text', type: 'serif' }
]

const COLOR_PALETTES = [
  { name: 'Classique', primary: '#8B7355', secondary: '#D4A574', accent: '#F5E6D3', text: '#2D2D2D' },
  { name: 'Rose Doré', primary: '#B76E79', secondary: '#E8B4B8', accent: '#FDF5F3', text: '#4A4A4A' },
  { name: 'Bleu Royal', primary: '#1E3A5F', secondary: '#4A6FA5', accent: '#E8F1F8', text: '#1A1A1A' },
  { name: 'Vert Sauge', primary: '#6B7B5E', secondary: '#A4B494', accent: '#F0F4EC', text: '#2D2D2D' },
  { name: 'Lavande', primary: '#7B68A6', secondary: '#B4A7D6', accent: '#F5F3FA', text: '#3D3D3D' },
  { name: 'Terracotta', primary: '#C17767', secondary: '#E3B5A4', accent: '#FBF5F3', text: '#3A2F2C' },
  { name: 'Or & Noir', primary: '#D4AF37', secondary: '#1A1A1A', accent: '#FFFEF7', text: '#1A1A1A' },
  { name: 'Minimaliste', primary: '#333333', secondary: '#666666', accent: '#FFFFFF', text: '#1A1A1A' }
]

const LAYOUT_STYLES = [
  { id: 'classic', name: 'Classique', description: 'Centré avec bordures élégantes' },
  { id: 'modern', name: 'Moderne', description: 'Clean et minimaliste' },
  { id: 'romantic', name: 'Romantique', description: 'Avec ornements floraux' },
  { id: 'geometric', name: 'Géométrique', description: 'Lignes et formes modernes' },
  { id: 'vintage', name: 'Vintage', description: 'Style rétro élégant' },
  { id: 'tropical', name: 'Tropical', description: 'Feuillages et nature' }
]

const DECORATIONS = [
  { id: 'none', name: 'Aucune', icon: '○' },
  { id: 'floral-top', name: 'Fleurs haut', icon: '🌸' },
  { id: 'floral-frame', name: 'Cadre floral', icon: '🌺' },
  { id: 'gold-corners', name: 'Coins dorés', icon: '✦' },
  { id: 'hearts', name: 'Cœurs', icon: '💕' },
  { id: 'leaves', name: 'Feuilles', icon: '🌿' },
  { id: 'geometric', name: 'Géométrique', icon: '◇' },
  { id: 'mandala', name: 'Mandala', icon: '❋' }
]

const PROGRAM_STYLES = [
  { id: 'cards', name: 'Cartes', description: 'Cartes colorées distinctes' },
  { id: 'timeline', name: 'Timeline', description: 'Ligne chronologique verticale' },
  { id: 'minimal', name: 'Minimaliste', description: 'Simple et épuré' },
  { id: 'elegant', name: 'Élégant', description: 'Avec bordures dorées' }
]

const PROGRAM_COLOR_SCHEMES = [
  { id: 'colorful', name: 'Coloré', commune: '#3B82F6', eglise: '#8B5CF6', reception: '#EC4899' },
  { id: 'monochrome', name: 'Monochrome', commune: '#6B7280', eglise: '#4B5563', reception: '#374151' },
  { id: 'warm', name: 'Chaud', commune: '#F59E0B', eglise: '#EF4444', reception: '#F97316' },
  { id: 'nature', name: 'Nature', commune: '#10B981', eglise: '#059669', reception: '#047857' },
  { id: 'pastel', name: 'Pastel', commune: '#93C5FD', eglise: '#C4B5FD', reception: '#F9A8D4' },
  { id: 'custom', name: 'Personnalisé', commune: '#3B82F6', eglise: '#8B5CF6', reception: '#EC4899' }
]

const TEMPLATE_SIZES = [
  { id: 'A7', name: 'A7', dimensions: '74 × 105 mm', description: 'Petit format, idéal pour les faire-part simples', ratio: 74/105 },
  { id: 'A6', name: 'A6', dimensions: '105 × 148 mm', description: 'Format carte postale, le plus populaire', ratio: 105/148 },
  { id: 'A5', name: 'A5', dimensions: '148 × 210 mm', description: 'Grand format, plus de contenu', ratio: 148/210 },
  { id: 'B6', name: 'B6', dimensions: '125 × 176 mm', description: 'Format intermédiaire élégant', ratio: 125/176 },
  { id: 'B5', name: 'B5', dimensions: '176 × 250 mm', description: 'Grand format premium', ratio: 176/250 },
  { id: '10x15', name: '10 × 15 cm', dimensions: '100 × 150 mm', description: 'Format photo standard', ratio: 100/150 },
  { id: '13x18', name: '13 × 18 cm', dimensions: '130 × 180 mm', description: 'Format photo large', ratio: 130/180 },
  { id: 'DL', name: 'DL', dimensions: '99 × 210 mm', description: 'Format long, style enveloppe', ratio: 99/210 },
  { id: 'square', name: 'Carré', dimensions: '148 × 148 mm', description: 'Format carré moderne', ratio: 1 },
  { id: 'custom', name: 'Personnalisé', dimensions: 'Sur mesure', description: 'Dimensions personnalisées', ratio: null }
]

export default function TemplateEditor({ template, onChange, onSave }) {
  const [activeTab, setActiveTab] = useState('colors')
  const [previewMode, setPreviewMode] = useState('desktop')
  const [showPreview, setShowPreview] = useState(false)
  const previewRef = useRef(null)

  const [config, setConfig] = useState({
    name: template?.name || '',
    category: template?.category || 'MODERN',
    colors: template?.config?.colors || COLOR_PALETTES[0],
    fonts: template?.config?.fonts || {
      heading: 'Playfair Display',
      body: 'Montserrat',
      script: 'Great Vibes'
    },
    layout: template?.config?.layout || 'classic',
    decoration: template?.config?.decoration || 'floral-top',
    spacing: template?.config?.spacing || 'normal',
    borderStyle: template?.config?.borderStyle || 'double',
    backgroundImage: template?.config?.backgroundImage || '',
    opacity: template?.config?.opacity || 100,
    isPremium: template?.isPremium || false,
    // Template size
    size: template?.config?.size || 'A6',
    customWidth: template?.config?.customWidth || 148,
    customHeight: template?.config?.customHeight || 210,
    // Programme configuration
    program: template?.config?.program || {
      enabled: true,
      style: 'cards',
      colorScheme: 'colorful',
      communeColor: '#3B82F6',
      egliseColor: '#8B5CF6',
      receptionColor: '#EC4899',
      showIcons: true,
      showDates: true,
      showAddresses: true
    }
  })

  useEffect(() => {
    if (onChange) {
      onChange(config)
    }
  }, [config])

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const tabs = [
    { id: 'colors', label: 'Couleurs', icon: SwatchIcon },
    { id: 'fonts', label: 'Polices', icon: DocumentTextIcon },
    { id: 'size', label: 'Taille', icon: ArrowsPointingOutIcon },
    { id: 'layout', label: 'Mise en page', icon: PaintBrushIcon },
    { id: 'decorations', label: 'Décorations', icon: SparklesIcon },
    { id: 'program', label: 'Programme', icon: CalendarDaysIcon },
    { id: 'background', label: 'Arrière-plan', icon: PhotoIcon }
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Editor Panel */}
      <div className="lg:w-1/2 bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[500px] overflow-y-auto">
          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Palettes prédéfinies</h3>
                <div className="grid grid-cols-2 gap-3">
                  {COLOR_PALETTES.map((palette, idx) => (
                    <button
                      key={idx}
                      onClick={() => updateConfig('colors', palette)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        config.colors.name === palette.name
                          ? 'border-primary-500 ring-2 ring-primary-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex -space-x-1">
                          <div className="w-5 h-5 rounded-full border-2 border-white" style={{ backgroundColor: palette.primary }} />
                          <div className="w-5 h-5 rounded-full border-2 border-white" style={{ backgroundColor: palette.secondary }} />
                          <div className="w-5 h-5 rounded-full border-2 border-white" style={{ backgroundColor: palette.accent }} />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-700">{palette.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Personnaliser les couleurs</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Principale</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.colors.primary}
                        onChange={(e) => updateConfig('colors', { ...config.colors, primary: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.colors.primary}
                        onChange={(e) => updateConfig('colors', { ...config.colors, primary: e.target.value })}
                        className="input text-xs flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Secondaire</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.colors.secondary}
                        onChange={(e) => updateConfig('colors', { ...config.colors, secondary: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.colors.secondary}
                        onChange={(e) => updateConfig('colors', { ...config.colors, secondary: e.target.value })}
                        className="input text-xs flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Accent</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.colors.accent}
                        onChange={(e) => updateConfig('colors', { ...config.colors, accent: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.colors.accent}
                        onChange={(e) => updateConfig('colors', { ...config.colors, accent: e.target.value })}
                        className="input text-xs flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Texte</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.colors.text}
                        onChange={(e) => updateConfig('colors', { ...config.colors, text: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.colors.text}
                        onChange={(e) => updateConfig('colors', { ...config.colors, text: e.target.value })}
                        className="input text-xs flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fonts Tab */}
          {activeTab === 'fonts' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Police des titres
                </label>
                <select
                  value={config.fonts.heading}
                  onChange={(e) => updateConfig('fonts', { ...config.fonts, heading: e.target.value })}
                  className="input"
                  style={{ fontFamily: config.fonts.heading }}
                >
                  {FONT_FAMILIES.filter(f => f.type === 'serif' || f.type === 'sans').map(font => (
                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Police du texte
                </label>
                <select
                  value={config.fonts.body}
                  onChange={(e) => updateConfig('fonts', { ...config.fonts, body: e.target.value })}
                  className="input"
                  style={{ fontFamily: config.fonts.body }}
                >
                  {FONT_FAMILIES.filter(f => f.type === 'sans' || f.type === 'serif').map(font => (
                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Police script (noms)
                </label>
                <select
                  value={config.fonts.script}
                  onChange={(e) => updateConfig('fonts', { ...config.fonts, script: e.target.value })}
                  className="input"
                  style={{ fontFamily: config.fonts.script }}
                >
                  {FONT_FAMILIES.filter(f => f.type === 'script').map(font => (
                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Aperçu des polices</p>
                <p style={{ fontFamily: config.fonts.heading }} className="text-2xl mb-1">Titre élégant</p>
                <p style={{ fontFamily: config.fonts.script }} className="text-3xl text-primary-600 mb-1">Marie & Jean</p>
                <p style={{ fontFamily: config.fonts.body }} className="text-sm text-gray-600">Vous êtes cordialement invités à célébrer notre union.</p>
              </div>
            </div>
          )}

          {/* Size Tab */}
          {activeTab === 'size' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Format d'impression</h3>
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATE_SIZES.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => updateConfig('size', size.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        config.size === size.id
                          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-900">{size.name}</p>
                        {size.ratio && (
                          <div
                            className="border-2 rounded-sm"
                            style={{
                              width: `${Math.round(size.ratio * 28)}px`,
                              height: '28px',
                              borderColor: config.size === size.id ? '#7c3aed' : '#d1d5db'
                            }}
                          />
                        )}
                      </div>
                      <p className="text-xs font-mono text-gray-500">{size.dimensions}</p>
                      <p className="text-xs text-gray-400 mt-1">{size.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {config.size === 'custom' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Dimensions personnalisées (mm)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Largeur</label>
                      <input
                        type="number"
                        min="50"
                        max="300"
                        value={config.customWidth}
                        onChange={(e) => updateConfig('customWidth', parseInt(e.target.value))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Hauteur</label>
                      <input
                        type="number"
                        min="50"
                        max="420"
                        value={config.customHeight}
                        onChange={(e) => updateConfig('customHeight', parseInt(e.target.value))}
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 font-medium mb-1">💡 Conseil</p>
                <p className="text-xs text-blue-600">
                  Le format A6 (105 × 148 mm) est le plus populaire pour les faire-part.
                  Le format A5 offre plus d'espace pour les programmes détaillés.
                  Choisissez un format carré pour un style moderne et original.
                </p>
              </div>
            </div>
          )}

          {/* Layout Tab */}
          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Style de mise en page</h3>
                <div className="grid grid-cols-2 gap-3">
                  {LAYOUT_STYLES.map(layout => (
                    <button
                      key={layout.id}
                      onClick={() => updateConfig('layout', layout.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        config.layout === layout.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{layout.name}</p>
                      <p className="text-xs text-gray-500">{layout.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Style de bordure
                </label>
                <select
                  value={config.borderStyle}
                  onChange={(e) => updateConfig('borderStyle', e.target.value)}
                  className="input"
                >
                  <option value="none">Aucune</option>
                  <option value="simple">Simple</option>
                  <option value="double">Double</option>
                  <option value="ornate">Ornementée</option>
                  <option value="gold">Dorée</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Espacement
                </label>
                <select
                  value={config.spacing}
                  onChange={(e) => updateConfig('spacing', e.target.value)}
                  className="input"
                >
                  <option value="compact">Compact</option>
                  <option value="normal">Normal</option>
                  <option value="relaxed">Aéré</option>
                </select>
              </div>
            </div>
          )}

          {/* Decorations Tab */}
          {activeTab === 'decorations' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Éléments décoratifs</h3>
                <div className="grid grid-cols-4 gap-3">
                  {DECORATIONS.map(deco => (
                    <button
                      key={deco.id}
                      onClick={() => updateConfig('decoration', deco.id)}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        config.decoration === deco.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{deco.icon}</span>
                      <p className="text-xs text-gray-600">{deco.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Program Tab */}
          {activeTab === 'program' && (
            <div className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Afficher le programme</h3>
                  <p className="text-xs text-gray-500">Mairie, Église, Réception</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.program.enabled}
                    onChange={(e) => updateConfig('program', { ...config.program, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {config.program.enabled && (
                <>
                  {/* Style de programme */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Style d'affichage</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {PROGRAM_STYLES.map(style => (
                        <button
                          key={style.id}
                          onClick={() => updateConfig('program', { ...config.program, style: style.id })}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            config.program.style === style.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className="font-medium text-gray-900">{style.name}</p>
                          <p className="text-xs text-gray-500">{style.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Schéma de couleurs */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Schéma de couleurs</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {PROGRAM_COLOR_SCHEMES.map(scheme => (
                        <button
                          key={scheme.id}
                          onClick={() => updateConfig('program', { 
                            ...config.program, 
                            colorScheme: scheme.id,
                            communeColor: scheme.commune,
                            egliseColor: scheme.eglise,
                            receptionColor: scheme.reception
                          })}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            config.program.colorScheme === scheme.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-center gap-1 mb-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: scheme.commune }} />
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: scheme.eglise }} />
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: scheme.reception }} />
                          </div>
                          <p className="text-xs font-medium text-gray-700">{scheme.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Couleurs personnalisées */}
                  {config.program.colorScheme === 'custom' && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Couleurs personnalisées</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                            <BuildingLibraryIcon className="h-3 w-3" /> Mairie
                          </label>
                          <input
                            type="color"
                            value={config.program.communeColor}
                            onChange={(e) => updateConfig('program', { ...config.program, communeColor: e.target.value })}
                            className="w-full h-10 rounded cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                            <ChurchIcon className="h-3 w-3" /> Église
                          </label>
                          <input
                            type="color"
                            value={config.program.egliseColor}
                            onChange={(e) => updateConfig('program', { ...config.program, egliseColor: e.target.value })}
                            className="w-full h-10 rounded cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                            <MusicalNoteIcon className="h-3 w-3" /> Réception
                          </label>
                          <input
                            type="color"
                            value={config.program.receptionColor}
                            onChange={(e) => updateConfig('program', { ...config.program, receptionColor: e.target.value })}
                            className="w-full h-10 rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Options d'affichage */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Options d'affichage</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.program.showIcons}
                          onChange={(e) => updateConfig('program', { ...config.program, showIcons: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">Afficher les icônes</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.program.showDates}
                          onChange={(e) => updateConfig('program', { ...config.program, showDates: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">Afficher les dates et heures</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.program.showAddresses}
                          onChange={(e) => updateConfig('program', { ...config.program, showAddresses: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">Afficher les adresses</span>
                      </label>
                    </div>
                  </div>

                  {/* Aperçu du programme */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-3">Aperçu du programme</p>
                    <div className="flex gap-2">
                      <div 
                        className="flex-1 p-2 rounded-lg text-center text-white text-xs"
                        style={{ backgroundColor: config.program.communeColor }}
                      >
                        {config.program.showIcons && <BuildingLibraryIcon className="h-4 w-4 mx-auto mb-1" />}
                        Mairie
                      </div>
                      <div 
                        className="flex-1 p-2 rounded-lg text-center text-white text-xs"
                        style={{ backgroundColor: config.program.egliseColor }}
                      >
                        {config.program.showIcons && <ChurchIcon className="h-4 w-4 mx-auto mb-1" />}
                        Église
                      </div>
                      <div 
                        className="flex-1 p-2 rounded-lg text-center text-white text-xs"
                        style={{ backgroundColor: config.program.receptionColor }}
                      >
                        {config.program.showIcons && <MusicalNoteIcon className="h-4 w-4 mx-auto mb-1" />}
                        Réception
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Background Tab */}
          {activeTab === 'background' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de l'image de fond
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={config.backgroundImage}
                  onChange={(e) => updateConfig('backgroundImage', e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opacité du fond ({config.opacity}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.opacity}
                  onChange={(e) => updateConfig('opacity', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
                  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400',
                  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400'
                ].map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => updateConfig('backgroundImage', url)}
                    className="aspect-video rounded-lg overflow-hidden border-2 border-gray-200 hover:border-primary-500 transition-colors"
                  >
                    <img src={url} alt={`Background ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      <div className="lg:w-1/2 space-y-4">
        {/* Preview Controls */}
        <div className="flex items-center justify-between bg-white rounded-lg p-3 shadow">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`p-2 rounded-lg ${previewMode === 'desktop' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
            >
              <ComputerDesktopIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`p-2 rounded-lg ${previewMode === 'mobile' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
            >
              <DevicePhoneMobileIcon className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center text-sm text-primary-600 hover:text-primary-700"
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            Plein écran
          </button>
        </div>

        {/* Preview */}
        <div 
          ref={previewRef}
          className={`bg-gray-100 rounded-xl overflow-hidden shadow-lg transition-all ${
            previewMode === 'mobile' ? 'max-w-[375px] mx-auto' : ''
          }`}
          style={{ minHeight: '500px' }}
        >
          <TemplatePreview config={config} />
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setShowPreview(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            ✕
          </button>
          <div className="max-w-2xl w-full max-h-[90vh] overflow-auto">
            <TemplatePreview config={config} fullscreen />
          </div>
        </div>
      )}
    </div>
  )
}

// Template Preview Component
function TemplatePreview({ config, fullscreen = false }) {
  const { colors, fonts, layout, decoration, borderStyle, backgroundImage, opacity, spacing, program } = config

  const spacingClass = {
    compact: 'py-6 px-4',
    normal: 'py-10 px-8',
    relaxed: 'py-16 px-12'
  }[spacing] || 'py-10 px-8'

  const borderStyles = {
    none: '',
    simple: 'border-2',
    double: 'border-4 border-double',
    ornate: 'border-4 border-double shadow-lg',
    gold: 'border-4 border-double shadow-xl'
  }

  const getDecorationElement = () => {
    switch (decoration) {
      case 'floral-top':
        return (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl">
            🌸
          </div>
        )
      case 'floral-frame':
        return (
          <>
            <div className="absolute top-2 left-2 text-2xl">🌺</div>
            <div className="absolute top-2 right-2 text-2xl transform -scale-x-100">🌺</div>
            <div className="absolute bottom-2 left-2 text-2xl transform -scale-y-100">🌺</div>
            <div className="absolute bottom-2 right-2 text-2xl transform scale-x-[-1] scale-y-[-1]">🌺</div>
          </>
        )
      case 'gold-corners':
        return (
          <>
            <div className="absolute top-2 left-2 text-xl" style={{ color: colors.secondary }}>✦</div>
            <div className="absolute top-2 right-2 text-xl" style={{ color: colors.secondary }}>✦</div>
            <div className="absolute bottom-2 left-2 text-xl" style={{ color: colors.secondary }}>✦</div>
            <div className="absolute bottom-2 right-2 text-xl" style={{ color: colors.secondary }}>✦</div>
          </>
        )
      case 'hearts':
        return (
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <HeartIcon className="h-8 w-8" style={{ color: colors.primary }} />
          </div>
        )
      case 'leaves':
        return (
          <>
            <div className="absolute top-4 left-4 text-2xl opacity-60">🌿</div>
            <div className="absolute top-4 right-4 text-2xl opacity-60 transform -scale-x-100">🌿</div>
          </>
        )
      default:
        return null
    }
  }

  return (
    <div 
      className="relative"
      style={{ 
        backgroundColor: colors.accent,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {backgroundImage && (
        <div 
          className="absolute inset-0" 
          style={{ backgroundColor: colors.accent, opacity: (100 - opacity) / 100 }}
        />
      )}
      
      <div 
        className={`relative ${spacingClass} ${borderStyles[borderStyle]} m-4 rounded-lg`}
        style={{ 
          borderColor: colors.primary,
          backgroundColor: `${colors.accent}ee`
        }}
      >
        {getDecorationElement()}

        <div className="text-center space-y-6">
          {/* Header */}
          <p 
            className="text-sm uppercase tracking-widest"
            style={{ color: colors.primary, fontFamily: fonts.body }}
          >
            Invitation au mariage
          </p>

          {/* Names */}
          <div className="space-y-2">
            <h1 
              className="text-4xl"
              style={{ fontFamily: fonts.script, color: colors.text }}
            >
              Marie
            </h1>
            <p style={{ color: colors.secondary }} className="text-2xl">&</p>
            <h1 
              className="text-4xl"
              style={{ fontFamily: fonts.script, color: colors.text }}
            >
              Jean
            </h1>
          </div>

          {/* Divider */}
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-px" style={{ backgroundColor: colors.secondary }} />
            <HeartIcon className="h-4 w-4" style={{ color: colors.primary }} />
            <div className="w-12 h-px" style={{ backgroundColor: colors.secondary }} />
          </div>

          {/* Date & Venue */}
          <div className="space-y-3">
            <p 
              className="text-lg"
              style={{ fontFamily: fonts.heading, color: colors.text }}
            >
              Samedi 15 Juin 2026
            </p>
            <p 
              className="text-sm"
              style={{ fontFamily: fonts.body, color: colors.text, opacity: 0.8 }}
            >
              à 15h00
            </p>
            <p 
              className="text-base"
              style={{ fontFamily: fonts.body, color: colors.primary }}
            >
              Château des Roses, Dakar
            </p>
          </div>

          {/* Message */}
          <p 
            className="text-sm italic max-w-xs mx-auto"
            style={{ fontFamily: fonts.body, color: colors.text, opacity: 0.7 }}
          >
            "Nous serions honorés de votre présence pour célébrer notre amour"
          </p>

          {/* RSVP */}
          <div 
            className="inline-block px-6 py-2 rounded-full"
            style={{ backgroundColor: colors.primary }}
          >
            <p className="text-white text-sm" style={{ fontFamily: fonts.body }}>
              RSVP avant le 1er Mai
            </p>
          </div>

          {/* Programme */}
          {program?.enabled && (
            <div className="mt-8 pt-6 border-t" style={{ borderColor: `${colors.secondary}40` }}>
              <p 
                className="text-sm uppercase tracking-widest mb-4"
                style={{ color: colors.primary, fontFamily: fonts.body }}
              >
                Programme
              </p>
              
              {program.style === 'cards' && (
                <div className="grid grid-cols-3 gap-2">
                  {/* Mairie */}
                  <div 
                    className="p-3 rounded-lg text-white text-center"
                    style={{ backgroundColor: program.communeColor }}
                  >
                    {program.showIcons && (
                      <BuildingLibraryIcon className="h-5 w-5 mx-auto mb-1" />
                    )}
                    <p className="text-xs font-medium">Mairie</p>
                    {program.showDates && (
                      <p className="text-[10px] opacity-80 mt-1">10h00</p>
                    )}
                  </div>
                  {/* Église */}
                  <div 
                    className="p-3 rounded-lg text-white text-center"
                    style={{ backgroundColor: program.egliseColor }}
                  >
                    {program.showIcons && (
                      <ChurchIcon className="h-5 w-5 mx-auto mb-1" />
                    )}
                    <p className="text-xs font-medium">Église</p>
                    {program.showDates && (
                      <p className="text-[10px] opacity-80 mt-1">14h00</p>
                    )}
                  </div>
                  {/* Réception */}
                  <div 
                    className="p-3 rounded-lg text-white text-center"
                    style={{ backgroundColor: program.receptionColor }}
                  >
                    {program.showIcons && (
                      <MusicalNoteIcon className="h-5 w-5 mx-auto mb-1" />
                    )}
                    <p className="text-xs font-medium">Réception</p>
                    {program.showDates && (
                      <p className="text-[10px] opacity-80 mt-1">18h00</p>
                    )}
                  </div>
                </div>
              )}

              {program.style === 'timeline' && (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-0 bottom-0 w-0.5" style={{ backgroundColor: colors.secondary }} />
                  {/* Mairie */}
                  <div className="relative mb-4">
                    <div 
                      className="absolute left-[-18px] w-4 h-4 rounded-full border-2 border-white"
                      style={{ backgroundColor: program.communeColor }}
                    />
                    <div className="text-left">
                      <p className="text-xs font-medium" style={{ color: program.communeColor }}>Mairie</p>
                      {program.showDates && <p className="text-[10px]" style={{ color: colors.text, opacity: 0.7 }}>10h00</p>}
                    </div>
                  </div>
                  {/* Église */}
                  <div className="relative mb-4">
                    <div 
                      className="absolute left-[-18px] w-4 h-4 rounded-full border-2 border-white"
                      style={{ backgroundColor: program.egliseColor }}
                    />
                    <div className="text-left">
                      <p className="text-xs font-medium" style={{ color: program.egliseColor }}>Église</p>
                      {program.showDates && <p className="text-[10px]" style={{ color: colors.text, opacity: 0.7 }}>14h00</p>}
                    </div>
                  </div>
                  {/* Réception */}
                  <div className="relative">
                    <div 
                      className="absolute left-[-18px] w-4 h-4 rounded-full border-2 border-white"
                      style={{ backgroundColor: program.receptionColor }}
                    />
                    <div className="text-left">
                      <p className="text-xs font-medium" style={{ color: program.receptionColor }}>Réception</p>
                      {program.showDates && <p className="text-[10px]" style={{ color: colors.text, opacity: 0.7 }}>18h00</p>}
                    </div>
                  </div>
                </div>
              )}

              {program.style === 'minimal' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-3 text-xs" style={{ color: colors.text }}>
                    <span style={{ color: program.communeColor }}>Mairie 10h00</span>
                    <span className="opacity-30">•</span>
                    <span style={{ color: program.egliseColor }}>Église 14h00</span>
                    <span className="opacity-30">•</span>
                    <span style={{ color: program.receptionColor }}>Réception 18h00</span>
                  </div>
                </div>
              )}

              {program.style === 'elegant' && (
                <div className="grid grid-cols-3 gap-2">
                  {/* Mairie */}
                  <div 
                    className="p-3 rounded-lg border-2 text-center"
                    style={{ borderColor: program.communeColor, backgroundColor: `${program.communeColor}10` }}
                  >
                    {program.showIcons && (
                      <BuildingLibraryIcon className="h-5 w-5 mx-auto mb-1" style={{ color: program.communeColor }} />
                    )}
                    <p className="text-xs font-medium" style={{ color: program.communeColor }}>Mairie</p>
                    {program.showDates && (
                      <p className="text-[10px] mt-1" style={{ color: colors.text, opacity: 0.7 }}>10h00</p>
                    )}
                  </div>
                  {/* Église */}
                  <div 
                    className="p-3 rounded-lg border-2 text-center"
                    style={{ borderColor: program.egliseColor, backgroundColor: `${program.egliseColor}10` }}
                  >
                    {program.showIcons && (
                      <ChurchIcon className="h-5 w-5 mx-auto mb-1" style={{ color: program.egliseColor }} />
                    )}
                    <p className="text-xs font-medium" style={{ color: program.egliseColor }}>Église</p>
                    {program.showDates && (
                      <p className="text-[10px] mt-1" style={{ color: colors.text, opacity: 0.7 }}>14h00</p>
                    )}
                  </div>
                  {/* Réception */}
                  <div 
                    className="p-3 rounded-lg border-2 text-center"
                    style={{ borderColor: program.receptionColor, backgroundColor: `${program.receptionColor}10` }}
                  >
                    {program.showIcons && (
                      <MusicalNoteIcon className="h-5 w-5 mx-auto mb-1" style={{ color: program.receptionColor }} />
                    )}
                    <p className="text-xs font-medium" style={{ color: program.receptionColor }}>Réception</p>
                    {program.showDates && (
                      <p className="text-[10px] mt-1" style={{ color: colors.text, opacity: 0.7 }}>18h00</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
