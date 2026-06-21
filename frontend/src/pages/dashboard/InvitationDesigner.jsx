import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from 'react-query'
import { templateAPI, weddingAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { processImage } from '../../utils/imageProcessor'
import {
  ArrowLeftIcon,
  EyeIcon,
  ArrowsPointingOutIcon,
  TrashIcon,
  PlusIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeSlashIcon,
  DocumentArrowDownIcon,
  Squares2X2Icon,
  CursorArrowRaysIcon,
  ArrowPathIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

// ===================== CONSTANTS =====================

const FONT_FAMILIES = [
  'Playfair Display', 'Great Vibes', 'Cormorant Garamond', 'Montserrat',
  'Lora', 'Dancing Script', 'Josefin Sans', 'Crimson Text',
  'Poppins', 'Raleway', 'Roboto', 'Open Sans', 'Merriweather',
  'Satisfy', 'Pacifico', 'Alex Brush', 'Sacramento', 'Tangerine'
]

const DEFAULT_CANVAS_WIDTH = 800
const DEFAULT_CANVAS_HEIGHT = 1120
const MAX_CANVAS_DIMENSION = 4000
const MIN_CANVAS_DIMENSION = 300

// Format presets (dimensions in px, roughly 150 DPI for print)
const FORMAT_PRESETS = [
  { id: 'a5-portrait', label: 'A5 Portrait', w: 874, h: 1240, desc: '148×210 mm' },
  { id: 'a5-landscape', label: 'A5 Paysage', w: 1240, h: 874, desc: '210×148 mm' },
  { id: 'a6-portrait', label: 'A6 Portrait', w: 620, h: 874, desc: '105×148 mm' },
  { id: 'a6-landscape', label: 'A6 Paysage', w: 874, h: 620, desc: '148×105 mm' },
  { id: 'dl', label: 'DL (Long)', w: 585, h: 1240, desc: '99×210 mm' },
  { id: 'square', label: 'Carré', w: 900, h: 900, desc: '150×150 mm' },
  { id: 'instagram-post', label: 'Post Instagram', w: 1080, h: 1080, desc: '1080×1080 px' },
  { id: 'instagram-story', label: 'Story', w: 1080, h: 1920, desc: '1080×1920 px' },
  { id: 'custom', label: 'Personnalisé', w: null, h: null, desc: 'Dimensions libres' }
]

const DEFAULT_MARGINS = { top: 0, right: 0, bottom: 0, left: 0 }

const DEFAULT_ELEMENTS = [
  // NOTE: x/y positions use percentages of default canvas (800×1120),
  // they will be recalculated when a format preset is applied.
  {
    id: 'title',
    type: 'text',
    label: 'Titre',
    content: 'Invitation au Mariage',
    x: 100, y: 40, width: 600, height: 40,
    fontSize: 14, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#8B7355', textAlign: 'center', visible: true,
    letterSpacing: 4, textTransform: 'uppercase', locked: false
  },
  {
    id: 'brideGroomNames',
    type: 'names',
    label: 'Noms des mariés',
    content: '{{bride_name}} & {{groom_name}}',
    x: 50, y: 100, width: 700, height: 80,
    fontSize: 48, fontFamily: 'Great Vibes', fontWeight: 'normal', fontStyle: 'normal',
    color: '#2D2D2D', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'guestName',
    type: 'guest',
    label: "Nom de l'invité",
    content: 'Cher(e) {{guest_name}}',
    x: 150, y: 200, width: 500, height: 40,
    fontSize: 20, fontFamily: 'Cormorant Garamond', fontWeight: 'normal', fontStyle: 'italic',
    color: '#4A4A4A', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'invitationType',
    type: 'invitationType',
    label: "Type d'invitation",
    content: '{{invitation_type}}',
    x: 250, y: 250, width: 300, height: 30,
    fontSize: 14, fontFamily: 'Montserrat', fontWeight: 'bold', fontStyle: 'normal',
    color: '#8B7355', textAlign: 'center', visible: true,
    letterSpacing: 1, textTransform: 'uppercase', locked: false
  },
  {
    id: 'message',
    type: 'message',
    label: 'Message personnalisé',
    content: '{{custom_message}}',
    x: 100, y: 290, width: 600, height: 50,
    fontSize: 14, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'italic',
    color: '#666666', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'date',
    type: 'date',
    label: 'Date du mariage',
    content: '{{wedding_date}}',
    x: 200, y: 360, width: 400, height: 40,
    fontSize: 24, fontFamily: 'Playfair Display', fontWeight: 'bold', fontStyle: 'normal',
    color: '#2D2D2D', textAlign: 'center', visible: true,
    letterSpacing: 1, textTransform: 'none', locked: false
  },
  {
    id: 'time',
    type: 'time',
    label: 'Heure de cérémonie',
    content: 'à {{ceremony_time}}',
    x: 280, y: 410, width: 240, height: 30,
    fontSize: 16, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#666666', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  // ======== Programme: Commune ========
  {
    id: 'communeLabel',
    type: 'communeLabel',
    label: 'Commune — Titre',
    content: '🏛️ Commune',
    iconUrl: '',
    x: 50, y: 460, width: 220, height: 30,
    fontSize: 14, fontFamily: 'Montserrat', fontWeight: 'bold', fontStyle: 'normal',
    color: '#2D2D2D', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'communeDate',
    type: 'communeDate',
    label: 'Commune — Date/Heure',
    content: '{{commune_date}} à {{commune_time}}',
    x: 50, y: 492, width: 220, height: 24,
    fontSize: 11, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#666666', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'communeVenue',
    type: 'communeVenue',
    label: 'Commune — Lieu',
    content: '{{commune_venue}}',
    x: 50, y: 518, width: 220, height: 24,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'italic',
    color: '#8B7355', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'communeAddress',
    type: 'communeAddress',
    label: 'Commune — Adresse',
    content: '{{commune_address}}',
    x: 50, y: 544, width: 220, height: 22,
    fontSize: 10, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#999999', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  // ======== Programme: Église ========
  {
    id: 'egliseLabel',
    type: 'egliseLabel',
    label: 'Église — Titre',
    content: '⛪ Église',
    iconUrl: '',
    x: 290, y: 460, width: 220, height: 30,
    fontSize: 14, fontFamily: 'Montserrat', fontWeight: 'bold', fontStyle: 'normal',
    color: '#2D2D2D', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'egliseDate',
    type: 'egliseDate',
    label: 'Église — Date/Heure',
    content: '{{eglise_date}} à {{eglise_time}}',
    x: 290, y: 492, width: 220, height: 24,
    fontSize: 11, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#666666', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'egliseVenue',
    type: 'egliseVenue',
    label: 'Église — Lieu',
    content: '{{eglise_venue}}',
    x: 290, y: 518, width: 220, height: 24,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'italic',
    color: '#8B7355', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'egliseAddress',
    type: 'egliseAddress',
    label: 'Église — Adresse',
    content: '{{eglise_address}}',
    x: 290, y: 544, width: 220, height: 22,
    fontSize: 10, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#999999', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  // ======== Programme: Réception ========
  {
    id: 'receptionLabel',
    type: 'receptionLabel',
    label: 'Réception — Titre',
    content: '🎉 Réception',
    iconUrl: '',
    x: 530, y: 460, width: 220, height: 30,
    fontSize: 14, fontFamily: 'Montserrat', fontWeight: 'bold', fontStyle: 'normal',
    color: '#2D2D2D', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'receptionDate',
    type: 'receptionDate',
    label: 'Réception — Date/Heure',
    content: '{{reception_date}} à {{reception_time}}',
    x: 530, y: 492, width: 220, height: 24,
    fontSize: 11, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#666666', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'receptionVenue',
    type: 'receptionVenue',
    label: 'Réception — Lieu',
    content: '{{reception_venue}}',
    x: 530, y: 518, width: 220, height: 24,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'italic',
    color: '#8B7355', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'receptionAddress',
    type: 'receptionAddress',
    label: 'Réception — Adresse',
    content: '{{reception_address}}',
    x: 530, y: 544, width: 220, height: 22,
    fontSize: 10, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#999999', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'qrCode',
    type: 'qrcode',
    label: 'QR Code',
    content: '{{qr_code}}',
    x: 300, y: 610, width: 200, height: 200,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#333333', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'tableNumber',
    type: 'table',
    label: 'Numéro de table',
    content: 'Table {{table_number}}',
    x: 300, y: 830, width: 200, height: 35,
    fontSize: 16, fontFamily: 'Montserrat', fontWeight: 'bold', fontStyle: 'normal',
    color: '#8B7355', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'rsvpDate',
    type: 'rsvp',
    label: 'Date RSVP',
    content: 'RSVP avant le {{rsvp_date}}',
    x: 200, y: 880, width: 400, height: 30,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#999999', textAlign: 'center', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  }
]

// Sample data for preview
const SAMPLE_DATA = {
  bride_name: 'Marie',
  groom_name: 'Jean',
  guest_name: 'Sophie Dupont',
  custom_message: 'Nous serions honorés de votre présence pour célébrer notre union',
  wedding_date: 'Samedi 20 Juin 2026',
  ceremony_time: '15h00',
  table_number: 'VIP',
  rsvp_date: '1er Mai 2026',
  invitation_type: 'Couple',
  qr_code: 'QR',
  // Programme — Commune
  commune_date: '20 Juin 2026',
  commune_time: '10h00',
  commune_venue: 'Mairie de Dakar',
  commune_address: 'Place de l\'Indépendance',
  // Programme — Église
  eglise_date: '20 Juin 2026',
  eglise_time: '14h00',
  eglise_venue: 'Cathédrale de Dakar',
  eglise_address: 'Blvd de la République',
  // Programme — Réception
  reception_date: '20 Juin 2026',
  reception_time: '18h00',
  reception_venue: 'Château des Roses',
  reception_address: '12 Rue des Fleurs, Dakar'
}

// Helper: scale default elements to fit any canvas dimensions
const scaleElementsToCanvas = (els, targetW, targetH, refW = DEFAULT_CANVAS_WIDTH, refH = DEFAULT_CANVAS_HEIGHT) => {
  const scaleX = targetW / refW
  const scaleY = targetH / refH
  return els.map(el => ({
    ...el,
    x: Math.round(el.x * scaleX),
    y: Math.round(el.y * scaleY),
    width: Math.round(el.width * scaleX),
    height: Math.round(el.height * scaleY)
  }))
}

// ===================== COMPONENT =====================

export default function InvitationDesigner() {
  const { templateId } = useParams()
  const [searchParams] = useSearchParams()
  const weddingId = searchParams.get('wedding')
  const navigate = useNavigate()

  // State
  const [elements, setElements] = useState(DEFAULT_ELEMENTS)
  const [selectedId, setSelectedId] = useState(null)
  const [backgroundImage, setBackgroundImage] = useState('')
  const [backgroundOpacity, setBackgroundOpacity] = useState(100)
  const [invitationType, setInvitationType] = useState('couple') // couple or singleton
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDir, setResizeDir] = useState(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [elementStart, setElementStart] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [showGrid, setShowGrid] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_CANVAS_WIDTH)
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_CANVAS_HEIGHT)
  const [selectedFormat, setSelectedFormat] = useState('a5-portrait')
  const [margins, setMargins] = useState(DEFAULT_MARGINS)
  const [saving, setSaving] = useState(false)
  const [activePanel, setActivePanel] = useState('elements') // elements, background, format, settings
  const [templateName, setTemplateName] = useState('')

  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const previewInputRef = useRef(null)
  const iconInputRef = useRef(null)

  // Load template data
  const { data: templateData, isLoading: loadingTemplate } = useQuery(
    ['template', templateId],
    () => templateAPI.getOne(templateId),
    { enabled: !!templateId }
  )

  // Load wedding data if editing for a specific wedding
  const { data: weddingData } = useQuery(
    ['wedding', weddingId],
    () => weddingAPI.getOne(weddingId),
    { enabled: !!weddingId }
  )

  const template = templateData?.data?.template
  const wedding = weddingData?.data?.wedding

  // Initialize from template
  useEffect(() => {
    if (template) {
      setTemplateName(template.name || '')
      const cfg = template.config || {}

      if (cfg.designElements && Array.isArray(cfg.designElements)) {
        setElements(cfg.designElements)
      }
      if (cfg.backgroundOpacity !== undefined) {
        setBackgroundOpacity(cfg.backgroundOpacity)
      }
      if (cfg.invitationType) {
        setInvitationType(cfg.invitationType)
      }
      if (cfg.margins) {
        setMargins(cfg.margins)
      }
      if (cfg.selectedFormat) {
        setSelectedFormat(cfg.selectedFormat)
      }

      // Load saved canvas dimensions (user-defined format takes priority)
      if (cfg.canvasWidth) setCanvasWidth(cfg.canvasWidth)
      if (cfg.canvasHeight) setCanvasHeight(cfg.canvasHeight)

      // Load background image without changing canvas dimensions
      const bgSrc = cfg.backgroundImage || template.previewImage || template.backgroundUrl || ''
      if (bgSrc) {
        setBackgroundImage(bgSrc)
      }
    }
  }, [template])

  // Selected element
  const selectedElement = elements.find(el => el.id === selectedId)

  // ===================== CANVAS MOUSE HANDLERS =====================

  const getCanvasCoords = useCallback((e) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasWidth / rect.width
    const scaleY = canvasHeight / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }, [canvasWidth, canvasHeight])

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target === canvasRef.current || e.target.dataset.canvas) {
      setSelectedId(null)
    }
  }, [])

  const handleElementMouseDown = useCallback((e, elementId) => {
    e.stopPropagation()
    const el = elements.find(item => item.id === elementId)
    if (!el || el.locked) return

    setSelectedId(elementId)
    const coords = getCanvasCoords(e)
    setDragStart(coords)
    setElementStart({ x: el.x, y: el.y, w: el.width, h: el.height })
    setIsDragging(true)
  }, [elements, getCanvasCoords])

  const handleResizeMouseDown = useCallback((e, direction) => {
    e.stopPropagation()
    if (!selectedElement || selectedElement.locked) return

    const coords = getCanvasCoords(e)
    setDragStart(coords)
    setElementStart({
      x: selectedElement.x,
      y: selectedElement.y,
      w: selectedElement.width,
      h: selectedElement.height
    })
    setResizeDir(direction)
    setIsResizing(true)
  }, [selectedElement, getCanvasCoords])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging && !isResizing) return

    const coords = getCanvasCoords(e)
    const dx = coords.x - dragStart.x
    const dy = coords.y - dragStart.y

    setElements(prev => prev.map(el => {
      if (el.id !== selectedId) return el

      if (isDragging) {
        let newX = Math.round(elementStart.x + dx)
        let newY = Math.round(elementStart.y + dy)
        // Snap to grid
        if (showGrid) {
          newX = Math.round(newX / 10) * 10
          newY = Math.round(newY / 10) * 10
        }
        // Clamp
        newX = Math.max(0, Math.min(canvasWidth - el.width, newX))
        newY = Math.max(0, Math.min(canvasHeight - el.height, newY))
        return { ...el, x: newX, y: newY }
      }

      if (isResizing) {
        let newW = elementStart.w
        let newH = elementStart.h
        let newX = elementStart.x
        let newY = elementStart.y

        if (resizeDir.includes('e')) newW = Math.max(40, elementStart.w + dx)
        if (resizeDir.includes('w')) {
          newW = Math.max(40, elementStart.w - dx)
          newX = elementStart.x + dx
        }
        if (resizeDir.includes('s')) newH = Math.max(20, elementStart.h + dy)
        if (resizeDir.includes('n')) {
          newH = Math.max(20, elementStart.h - dy)
          newY = elementStart.y + dy
        }

        if (showGrid) {
          newW = Math.round(newW / 10) * 10
          newH = Math.round(newH / 10) * 10
          newX = Math.round(newX / 10) * 10
          newY = Math.round(newY / 10) * 10
        }

        return { ...el, x: newX, y: newY, width: newW, height: newH }
      }
      return el
    }))
  }, [isDragging, isResizing, dragStart, elementStart, selectedId, showGrid, resizeDir, getCanvasCoords])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeDir(null)
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // ===================== ELEMENT OPERATIONS =====================

  const updateElement = (id, updates) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el))
  }

  const toggleVisibility = (id) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, visible: !el.visible } : el))
  }

  const toggleLock = (id) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, locked: !el.locked } : el))
  }

  const addCustomText = () => {
    const id = `custom_${Date.now()}`
    const w = Math.min(400, Math.round(canvasWidth * 0.5))
    const h = 40
    setElements(prev => [...prev, {
      id,
      type: 'custom',
      label: 'Texte personnalisé',
      content: 'Nouveau texte',
      x: Math.round((canvasWidth - w) / 2), y: Math.round(canvasHeight * 0.4), width: w, height: h,
      fontSize: 16, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
      color: '#333333', textAlign: 'center', visible: true,
      letterSpacing: 0, textTransform: 'none', locked: false
    }])
    setSelectedId(id)
  }

  const deleteElement = (id) => {
    const el = elements.find(e => e.id === id)
    if (el?.type === 'custom') {
      setElements(prev => prev.filter(e => e.id !== id))
      if (selectedId === id) setSelectedId(null)
    }
  }

  const resetLayout = () => {
    // Reset elements scaled to the current canvas size
    setElements(scaleElementsToCanvas(DEFAULT_ELEMENTS, canvasWidth, canvasHeight))
    setSelectedId(null)
  }

  // ===================== BACKGROUND =====================

  const [backgroundUploading, setBackgroundUploading] = useState(false)

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    setBackgroundUploading(true)
    try {
      // Compress + re-encode (WebP when supported) in the browser before
      // sending anything — keeps the payload small and the editor snappy,
      // and avoids ever stuffing a multi-MB base64 string into app state.
      const result = await processImage(file, 'background', { maxSizeMB: 10 })

      const formData = new FormData()
      formData.append('background', result.upload, result.filename)
      const res = await templateAPI.uploadBackgroundForTemplate(templateId, formData)
      setBackgroundImage(res.data.backgroundImage)
      toast.success("Image de fond chargée — elle s'adapte au format défini")
    } catch (err) {
      toast.error(err.message || err.response?.data?.error || "Erreur lors de l'upload de l'image de fond")
    } finally {
      setBackgroundUploading(false)
    }
  }

  // ===================== PREVIEW UPLOAD =====================

  const [uploadingPreview, setUploadingPreview] = useState(false)

  const handlePreviewUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      return toast.error('Seules les images sont acceptées')
    }
    if (file.size > 10 * 1024 * 1024) {
      return toast.error('Image trop volumineuse (max 10 Mo)')
    }

    setUploadingPreview(true)
    try {
      const formData = new FormData()
      formData.append('preview', file)
      const res = await templateAPI.uploadPreview(templateId, formData)
      toast.success('Image de prévisualisation mise à jour !')
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors de l'upload de la prévisualisation")
    } finally {
      setUploadingPreview(false)
      if (previewInputRef.current) previewInputRef.current.value = ''
    }
  }

  // ===================== ICON UPLOAD =====================

  const handleIconUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const validTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp']
    if (!validTypes.includes(file.type)) return toast.error('Seuls les fichiers PNG, SVG, JPEG ou WEBP sont acceptés')
    if (file.size > 5 * 1024 * 1024) return toast.error('Image trop volumineuse (max 5 Mo)')

    try {
      const formData = new FormData()
      formData.append('icon', file)
      const res = await templateAPI.uploadIcon(formData)
      const iconPath = res.data.iconUrl
      updateElement(selectedId, { iconUrl: iconPath })
      toast.success('Icône chargée !')
    } catch (err) {
      // Fallback: local preview via data URL
      const reader = new FileReader()
      reader.onload = (ev) => {
        updateElement(selectedId, { iconUrl: ev.target.result })
      }
      reader.readAsDataURL(file)
      toast.success('Icône chargée (aperçu local)')
    }
    // Reset input
    if (iconInputRef.current) iconInputRef.current.value = ''
  }

  // ===================== SAVE =====================

  const saveMutation = useMutation(
    (designData) => templateAPI.saveDesign(templateId, designData),
    {
      onSuccess: () => {
        toast.success('Template sauvegardé avec succès !')
        setSaving(false)
      },
      onError: (err) => {
        toast.error(err.response?.data?.error || 'Erreur lors de la sauvegarde')
        setSaving(false)
      }
    }
  )

  const handleSave = () => {
    setSaving(true)
    const designData = {
      designElements: elements,
      backgroundImage,
      backgroundOpacity,
      invitationType,
      canvasWidth,
      canvasHeight,
      margins,
      selectedFormat
    }
    saveMutation.mutate(designData)
  }

  // ===================== RENDER ELEMENT CONTENT =====================

  const renderElementContent = (el) => {
    let text = el.content || ''

    // Replace sample data for preview (invitation_type driven by invitationType state)
    const previewData = {
      ...SAMPLE_DATA,
      invitation_type: invitationType === 'couple' ? 'Couple' : 'Singleton'
    }
    Object.entries(previewData).forEach(([key, val]) => {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val)
    })

    // Handle invitation type element (also ensures correct value if content differs)
    if (el.type === 'invitationType') {
      text = invitationType === 'couple' ? 'Couple' : 'Singleton'
    }

    // QR code placeholder
    if (el.type === 'qrcode') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-white/80 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <div className="w-3/4 h-3/4 mx-auto mb-1 bg-gray-200 rounded flex items-center justify-center">
              <svg className="w-1/2 h-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 14.625v2.25m0 3v.75m3-3h.75m-6 0h.75m3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-3.75 3.75a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <span className="text-xs text-gray-500">QR Code</span>
          </div>
        </div>
      )
    }

    // Programme label with custom icon
    const isLabelElement = ['communeLabel', 'egliseLabel', 'receptionLabel'].includes(el.type)
    if (isLabelElement && el.iconUrl) {
      const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
      const iconSrc = el.iconUrl.startsWith('data:') || el.iconUrl.startsWith('http') ? el.iconUrl : `${apiBase}${el.iconUrl}`
      return (
        <span
          className="w-full h-full overflow-hidden whitespace-pre-wrap break-words leading-tight"
          style={{
            fontFamily: el.fontFamily,
            fontSize: `${el.fontSize}px`,
            fontWeight: el.fontWeight,
            fontStyle: el.fontStyle,
            color: el.color,
            textAlign: el.textAlign,
            letterSpacing: `${el.letterSpacing || 0}px`,
            textTransform: el.textTransform || 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start'
          }}
        >
          <img src={iconSrc} alt="" className="inline-block flex-shrink-0" style={{ height: `${el.fontSize + 4}px`, width: `${el.fontSize + 4}px`, objectFit: 'contain' }} />
          {text}
        </span>
      )
    }

    return (
      <span
        className="block w-full h-full overflow-hidden whitespace-pre-wrap break-words leading-tight"
        style={{
          fontFamily: el.fontFamily,
          fontSize: `${el.fontSize}px`,
          fontWeight: el.fontWeight,
          fontStyle: el.fontStyle,
          color: el.color,
          textAlign: el.textAlign,
          letterSpacing: `${el.letterSpacing || 0}px`,
          textTransform: el.textTransform || 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start'
        }}
      >
        {text}
      </span>
    )
  }

  // ===================== LOADING STATE =====================

  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // ===================== RENDER =====================

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100">
      {/* Top Bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Éditeur d'invitation
            </h1>
            <p className="text-xs text-gray-500">
              {templateName || 'Template'}
              {wedding && ` — ${wedding.brideName} & ${wedding.groomName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="text-sm font-bold px-1">−</button>
            <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="text-sm font-bold px-1">+</button>
          </div>

          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg ${showGrid ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="Grille d'alignement"
          >
            <Squares2X2Icon className="h-5 w-5" />
          </button>

          {/* Reset */}
          <button onClick={resetLayout} className="p-2 text-gray-400 hover:text-orange-500 rounded-lg" title="Réinitialiser">
            <ArrowPathIcon className="h-5 w-5" />
          </button>

          {/* Upload Preview */}
          <button
            onClick={() => previewInputRef.current?.click()}
            disabled={uploadingPreview}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
            title="Uploader une image de prévisualisation du template"
          >
            {uploadingPreview ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowUpTrayIcon className="h-4 w-4" />
            )}
            Preview
          </button>
          <input
            ref={previewInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePreviewUpload}
          />

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium text-sm"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckIcon className="h-4 w-4" />
            )}
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Elements & Settings */}
        <div className="w-72 bg-white border-r flex flex-col shrink-0 overflow-hidden">
          {/* Panel Tabs */}
          <div className="flex border-b">
            {[
              { id: 'elements', label: 'Éléments', icon: CursorArrowRaysIcon },
              { id: 'format', label: 'Format', icon: ArrowsPointingOutIcon },
              { id: 'background', label: 'Fond', icon: PhotoIcon },
              { id: 'settings', label: 'Options', icon: Squares2X2Icon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
                  activePanel === tab.id ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4 mb-1" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Elements Panel */}
          {activePanel === 'elements' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Éléments</h3>
                <button onClick={addCustomText} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
                  <PlusIcon className="h-3.5 w-3.5" />
                  Texte
                </button>
              </div>

              {elements.map((el) => (
                <div
                  key={el.id}
                  onClick={() => setSelectedId(el.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm ${
                    selectedId === el.id
                      ? 'bg-primary-50 border border-primary-200 text-primary-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="flex-1 truncate text-xs">{el.label}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id) }}
                      className={`p-1 rounded ${el.visible ? 'text-gray-400 hover:text-gray-600' : 'text-red-400'}`}
                      title={el.visible ? 'Masquer' : 'Afficher'}
                    >
                      {el.visible ? <EyeIcon className="h-3.5 w-3.5" /> : <EyeSlashIcon className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleLock(el.id) }}
                      className={`p-1 rounded ${el.locked ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'}`}
                      title={el.locked ? 'Déverrouiller' : 'Verrouiller'}
                    >
                      {el.locked ? <LockClosedIcon className="h-3.5 w-3.5" /> : <LockOpenIcon className="h-3.5 w-3.5" />}
                    </button>
                    {el.type === 'custom' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteElement(el.id) }}
                        className="p-1 rounded text-gray-400 hover:text-red-500"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Format Panel */}
          {activePanel === 'format' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Format de l'invitation</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Choisissez le format avant de charger l'image de fond. L'image s'adaptera au contenu du format choisi.
                </p>

                {/* Format presets grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {FORMAT_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setSelectedFormat(preset.id)
                        if (preset.w && preset.h) {
                          // Auto-reposition elements to fit the new canvas
                          setElements(prev => scaleElementsToCanvas(prev, preset.w, preset.h, canvasWidth, canvasHeight))
                          setCanvasWidth(preset.w)
                          setCanvasHeight(preset.h)
                        }
                      }}
                      className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                        selectedFormat === preset.id
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-xs font-medium">{preset.label}</p>
                      <p className="text-[10px] text-gray-400">{preset.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <hr />

              {/* Custom dimensions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Dimensions (px)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Largeur</label>
                    <input
                      type="number"
                      min={MIN_CANVAS_DIMENSION}
                      max={MAX_CANVAS_DIMENSION}
                      value={canvasWidth}
                      onChange={(e) => {
                        setCanvasWidth(Math.max(MIN_CANVAS_DIMENSION, Math.min(MAX_CANVAS_DIMENSION, parseInt(e.target.value) || MIN_CANVAS_DIMENSION)))
                        setSelectedFormat('custom')
                      }}
                      className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Hauteur</label>
                    <input
                      type="number"
                      min={MIN_CANVAS_DIMENSION}
                      max={MAX_CANVAS_DIMENSION}
                      value={canvasHeight}
                      onChange={(e) => {
                        setCanvasHeight(Math.max(MIN_CANVAS_DIMENSION, Math.min(MAX_CANVAS_DIMENSION, parseInt(e.target.value) || MIN_CANVAS_DIMENSION)))
                        setSelectedFormat('custom')
                      }}
                      className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Ratio: {(canvasWidth/canvasHeight).toFixed(3)} {canvasWidth === canvasHeight ? '(Carré)' : canvasWidth > canvasHeight ? '(Paysage)' : '(Portrait)'}
                </p>
              </div>

              <hr />

              {/* Margins */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Marges (px)</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Zone de sécurité intérieure. Les éléments sont positionnés à l'intérieur de ces marges.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Haut</label>
                    <input
                      type="number"
                      min={0}
                      max={Math.floor(canvasHeight / 3)}
                      value={margins.top}
                      onChange={(e) => setMargins(m => ({ ...m, top: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Bas</label>
                    <input
                      type="number"
                      min={0}
                      max={Math.floor(canvasHeight / 3)}
                      value={margins.bottom}
                      onChange={(e) => setMargins(m => ({ ...m, bottom: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Gauche</label>
                    <input
                      type="number"
                      min={0}
                      max={Math.floor(canvasWidth / 3)}
                      value={margins.left}
                      onChange={(e) => setMargins(m => ({ ...m, left: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Droite</label>
                    <input
                      type="number"
                      min={0}
                      max={Math.floor(canvasWidth / 3)}
                      value={margins.right}
                      onChange={(e) => setMargins(m => ({ ...m, right: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
                {/* Quick margin presets */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[
                    { label: 'Aucune', t: 0, r: 0, b: 0, l: 0 },
                    { label: 'Petite (20px)', t: 20, r: 20, b: 20, l: 20 },
                    { label: 'Moyenne (40px)', t: 40, r: 40, b: 40, l: 40 },
                    { label: 'Grande (60px)', t: 60, r: 60, b: 60, l: 60 },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => setMargins({ top: preset.t, right: preset.r, bottom: preset.b, left: preset.l })}
                      className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                        margins.top === preset.t && margins.right === preset.r && margins.bottom === preset.b && margins.left === preset.l
                          ? 'bg-primary-100 border-primary-300 text-primary-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <hr />

              {/* Format summary */}
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-1">📐 Résumé du format</p>
                <div className="text-[11px] text-blue-600 space-y-0.5">
                  <p>Dimensions : {canvasWidth} × {canvasHeight} px</p>
                  <p>Zone utile : {canvasWidth - margins.left - margins.right} × {canvasHeight - margins.top - margins.bottom} px</p>
                  <p>Marges : {margins.top} / {margins.right} / {margins.bottom} / {margins.left} px</p>
                </div>
              </div>
            </div>
          )}

          {/* Background Panel */}
          {activePanel === 'background' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Image de fond</h3>
              <p className="text-xs text-gray-500">
                L'image s'adapte automatiquement au format défini. Définissez d'abord le format dans l'onglet « Format ».
              </p>

              {/* Format reminder */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="text-[11px] text-amber-700">
                  📐 Format actuel : <span className="font-medium">{canvasWidth} × {canvasHeight} px</span>
                  {margins.top + margins.right + margins.bottom + margins.left > 0 && (
                    <span> · Marges : {margins.top}/{margins.right}/{margins.bottom}/{margins.left}</span>
                  )}
                </p>
              </div>

              {/* Current background preview */}
              {backgroundImage && (
                <div className="relative rounded-lg overflow-hidden border bg-gray-100">
                  <div style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}`, maxHeight: '240px', margin: '0 auto' }} className="relative bg-white">
                    <img src={backgroundImage} alt="Fond" className="w-full h-full" style={{ objectFit: 'contain', objectPosition: 'center' }} />
                  </div>
                  <button
                    onClick={() => setBackgroundImage('')}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={backgroundUploading}
                className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {backgroundUploading ? (
                  <>
                    <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-primary-500 animate-spin" />
                    <span className="text-sm text-gray-600">Compression et envoi...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="h-8 w-8 text-gray-400" />
                    <span className="text-sm text-gray-600">Charger une image</span>
                    <span className="text-xs text-gray-400">JPG, PNG, WebP (max 10 Mo) — compressée automatiquement</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBackgroundUpload}
                className="hidden"
              />

              {/* Use template images */}
              {template?.previewImage && (
                <button
                  onClick={() => {
                    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
                    const previewUrl = template.previewImage.startsWith('http') ? template.previewImage : `${apiBase}${template.previewImage}`
                    setBackgroundImage(previewUrl)
                  }}
                  className="w-full text-sm text-primary-600 border border-primary-200 rounded-lg p-3 hover:bg-primary-50"
                >
                  Utiliser l'image du template
                </button>
              )}

              {/* Opacity */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Opacité du fond ({backgroundOpacity}%)
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={backgroundOpacity}
                  onChange={(e) => setBackgroundOpacity(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {activePanel === 'settings' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Type d'invitation</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Définit comment l'invité est adressé sur l'invitation.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setInvitationType('couple')}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      invitationType === 'couple'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">👫</div>
                    <p className="text-sm font-medium">Couple</p>
                    <p className="text-[10px] text-gray-500">M. & Mme</p>
                  </button>
                  <button
                    onClick={() => setInvitationType('singleton')}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      invitationType === 'singleton'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">🧑</div>
                    <p className="text-sm font-medium">Individuel</p>
                    <p className="text-[10px] text-gray-500">Une personne</p>
                  </button>
                </div>
              </div>

              <hr />

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Variables disponibles</h3>
                <div className="text-xs text-gray-500 space-y-1">
                  {Object.entries(SAMPLE_DATA).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <code className="text-primary-600">{`{{${key}}}`}</code>
                      <span className="truncate ml-2">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto bg-gray-200 p-6 flex items-start justify-center">
          <div
            style={{
              width: canvasWidth * zoom,
              height: canvasHeight * zoom,
              transform: `scale(1)`,
              transformOrigin: 'top center'
            }}
          >
            <div
              ref={canvasRef}
              data-canvas="true"
              onMouseDown={handleCanvasMouseDown}
              className="relative bg-white shadow-2xl overflow-hidden select-none"
              style={{
                width: canvasWidth,
                height: canvasHeight,
                transformOrigin: 'top left'
              }}
            >
              {/* Background Image — stretched to exact canvas dimensions */}
              {backgroundImage && (
                <img
                  src={backgroundImage}
                  alt="Background"
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: '100%', height: '100%', objectFit: 'fill', opacity: backgroundOpacity / 100 }}
                  data-canvas="true"
                />
              )}

              {/* Margin guides */}
              {(margins.top > 0 || margins.right > 0 || margins.bottom > 0 || margins.left > 0) && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: margins.top,
                    left: margins.left,
                    right: margins.right,
                    bottom: margins.bottom,
                    border: '1px dashed rgba(239, 68, 68, 0.4)',
                    zIndex: 999
                  }}
                />
              )}

              {/* Grid */}
              {showGrid && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.08 }}>
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#000" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              )}

              {/* Elements */}
              {elements.filter(el => el.visible).map((el, index) => (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                  className={`absolute transition-shadow ${
                    el.locked ? 'cursor-not-allowed' : 'cursor-move'
                  } ${
                    selectedId === el.id
                      ? 'ring-2 ring-primary-500 ring-offset-1'
                      : 'hover:ring-1 hover:ring-primary-300'
                  }`}
                  style={{
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                    zIndex: el.zIndex ?? (10 + index)
                  }}
                >
                  {renderElementContent(el)}

                  {/* Resize Handles (only when selected) */}
                  {selectedId === el.id && !el.locked && (
                    <>
                      {/* Corner handles */}
                      {['nw', 'ne', 'sw', 'se'].map(dir => (
                        <div
                          key={dir}
                          onMouseDown={(e) => handleResizeMouseDown(e, dir)}
                          className="absolute w-3 h-3 bg-primary-500 border border-white rounded-sm"
                          style={{
                            cursor: `${dir}-resize`,
                            ...(dir.includes('n') ? { top: -5 } : { bottom: -5 }),
                            ...(dir.includes('w') ? { left: -5 } : { right: -5 })
                          }}
                        />
                      ))}
                      {/* Edge handles */}
                      {['n', 'e', 's', 'w'].map(dir => (
                        <div
                          key={dir}
                          onMouseDown={(e) => handleResizeMouseDown(e, dir)}
                          className="absolute bg-primary-400 border border-white"
                          style={{
                            cursor: dir === 'n' || dir === 's' ? 'ns-resize' : 'ew-resize',
                            ...(dir === 'n' ? { top: -3, left: '50%', transform: 'translateX(-50%)', width: 14, height: 5, borderRadius: 2 } : {}),
                            ...(dir === 's' ? { bottom: -3, left: '50%', transform: 'translateX(-50%)', width: 14, height: 5, borderRadius: 2 } : {}),
                            ...(dir === 'e' ? { right: -3, top: '50%', transform: 'translateY(-50%)', width: 5, height: 14, borderRadius: 2 } : {}),
                            ...(dir === 'w' ? { left: -3, top: '50%', transform: 'translateY(-50%)', width: 5, height: 14, borderRadius: 2 } : {})
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Properties */}
        <div className="w-80 bg-white border-l flex flex-col shrink-0 overflow-hidden">
          {selectedElement ? (
            <div className="flex-1 overflow-y-auto">
              {/* Element Header */}
              <div className="px-4 py-3 border-b bg-gray-50">
                <h3 className="text-sm font-bold text-gray-900">{selectedElement.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Type: {selectedElement.type} — ID: {selectedElement.id}
                </p>
              </div>

              <div className="p-4 space-y-5">
                {/* Content */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contenu</label>
                  {selectedElement.type === 'qrcode' ? (
                    <p className="text-xs text-gray-400 italic">Le QR code est généré automatiquement</p>
                  ) : (
                    <textarea
                      value={selectedElement.content}
                      onChange={(e) => updateElement(selectedId, { content: e.target.value })}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      rows={2}
                    />
                  )}
                  {selectedElement.type !== 'custom' && selectedElement.type !== 'qrcode' && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      Utilisez {'{{'}variable{'}} '} pour insérer des données dynamiques
                    </p>
                  )}
                </div>

                {/* Icon Upload (for programme label elements only) */}
                {['communeLabel', 'egliseLabel', 'receptionLabel'].includes(selectedElement.type) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Icône personnalisée</label>
                    {selectedElement.iconUrl ? (
                      <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
                        <img
                          src={selectedElement.iconUrl.startsWith('data:') || selectedElement.iconUrl.startsWith('http') ? selectedElement.iconUrl : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${selectedElement.iconUrl}`}
                          alt="Icône"
                          className="w-10 h-10 object-contain rounded border bg-white p-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600 truncate">Icône chargée</p>
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => iconInputRef.current?.click()}
                              className="text-[10px] text-primary-600 hover:text-primary-700 font-medium"
                            >
                              Changer
                            </button>
                            <button
                              onClick={() => updateElement(selectedId, { iconUrl: '' })}
                              className="text-[10px] text-red-500 hover:text-red-600 font-medium"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => iconInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <ArrowUpTrayIcon className="w-4 h-4" />
                        Importer une icône (PNG, SVG)
                      </button>
                    )}
                    <input
                      ref={iconInputRef}
                      type="file"
                      accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/webp"
                      onChange={handleIconUpload}
                      className="hidden"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Formats : PNG, SVG, JPEG, WEBP (max 5 Mo)</p>
                  </div>
                )}

                {/* Position */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Position & Taille</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500">X</label>
                      <input
                        type="number"
                        value={selectedElement.x}
                        onChange={(e) => updateElement(selectedId, { x: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500">Y</label>
                      <input
                        type="number"
                        value={selectedElement.y}
                        onChange={(e) => updateElement(selectedId, { y: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500">Largeur</label>
                      <input
                        type="number"
                        value={selectedElement.width}
                        onChange={(e) => updateElement(selectedId, { width: parseInt(e.target.value) || 40 })}
                        className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500">Hauteur</label>
                      <input
                        type="number"
                        value={selectedElement.height}
                        onChange={(e) => updateElement(selectedId, { height: parseInt(e.target.value) || 20 })}
                        className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Font - only for text elements (not qrcode) */}
                {selectedElement.type !== 'qrcode' && (
                  <>
                    {/* Font Family */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Police</label>
                      <select
                        value={selectedElement.fontFamily}
                        onChange={(e) => updateElement(selectedId, { fontFamily: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-primary-500"
                        style={{ fontFamily: selectedElement.fontFamily }}
                      >
                        {FONT_FAMILIES.map(font => (
                          <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                        ))}
                      </select>
                    </div>

                    {/* Font Size */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Taille ({selectedElement.fontSize}px)
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="96"
                        value={selectedElement.fontSize}
                        onChange={(e) => updateElement(selectedId, { fontSize: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>8px</span>
                        <span>96px</span>
                      </div>
                    </div>

                    {/* Font Style */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Style</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateElement(selectedId, {
                            fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold'
                          })}
                          className={`flex-1 px-3 py-2 text-sm border rounded-lg font-bold transition-colors ${
                            selectedElement.fontWeight === 'bold' ? 'bg-primary-100 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          B
                        </button>
                        <button
                          onClick={() => updateElement(selectedId, {
                            fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic'
                          })}
                          className={`flex-1 px-3 py-2 text-sm border rounded-lg italic transition-colors ${
                            selectedElement.fontStyle === 'italic' ? 'bg-primary-100 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          I
                        </button>
                        <button
                          onClick={() => updateElement(selectedId, {
                            textTransform: selectedElement.textTransform === 'uppercase' ? 'none' : 'uppercase'
                          })}
                          className={`flex-1 px-3 py-2 text-xs border rounded-lg transition-colors ${
                            selectedElement.textTransform === 'uppercase' ? 'bg-primary-100 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          AA
                        </button>
                      </div>
                    </div>

                    {/* Text Alignment */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Alignement</label>
                      <div className="flex gap-2">
                        {[
                          { value: 'left', icon: '⫷' },
                          { value: 'center', icon: '≡' },
                          { value: 'right', icon: '⫸' }
                        ].map(align => (
                          <button
                            key={align.value}
                            onClick={() => updateElement(selectedId, { textAlign: align.value })}
                            className={`flex-1 px-3 py-2 text-sm border rounded-lg transition-colors ${
                              selectedElement.textAlign === align.value ? 'bg-primary-100 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {align.icon}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Couleur</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedElement.color}
                          onChange={(e) => updateElement(selectedId, { color: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border-0"
                        />
                        <input
                          type="text"
                          value={selectedElement.color}
                          onChange={(e) => updateElement(selectedId, { color: e.target.value })}
                          className="flex-1 px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-primary-500 font-mono"
                        />
                      </div>
                      {/* Quick colors */}
                      <div className="flex gap-1.5 mt-2">
                        {['#000000', '#333333', '#666666', '#999999', '#FFFFFF', '#8B7355', '#D4AF37', '#B76E79', '#2D5F3A', '#1E3A5F'].map(c => (
                          <button
                            key={c}
                            onClick={() => updateElement(selectedId, { color: c })}
                            aria-label={`Couleur ${c}`}
                            title={c}
                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                              selectedElement.color === c ? 'border-primary-500 scale-110' : 'border-gray-200'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Letter Spacing */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Espacement ({selectedElement.letterSpacing || 0}px)
                      </label>
                      <input
                        type="range"
                        min="-2"
                        max="20"
                        value={selectedElement.letterSpacing || 0}
                        onChange={(e) => updateElement(selectedId, { letterSpacing: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </>
                )}

                {/* Label (rename) */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Libellé</label>
                  <input
                    type="text"
                    value={selectedElement.label}
                    onChange={(e) => updateElement(selectedId, { label: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <CursorArrowRaysIcon className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-sm font-medium text-gray-700">Aucun élément sélectionné</h3>
              <p className="text-xs text-gray-500 mt-2">
                Cliquez sur un élément dans le canevas ou dans la liste pour modifier ses propriétés.
              </p>
              <div className="mt-6 text-left w-full bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-1">💡 Astuces</p>
                <ul className="text-[11px] text-blue-600 space-y-1">
                  <li>• Glisser-déposer pour positionner</li>
                  <li>• Poignées pour redimensionner</li>
                  <li>• Grille pour aligner (magnétique)</li>
                  <li>• Verrou pour bloquer la position</li>
                  <li>• Variables {'{{...}}'} pour données dynamiques</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
