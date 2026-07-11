import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminAPI, templateAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { processImage } from '../../utils/imageProcessor'
import { extractPalette } from '../../utils/extractColors'
import { EVENT_TYPES, EVENT_TYPE_LABELS, eventUsesCouple, eventUsesProgramme, eventUsesTables } from '../../utils/eventTypes'
import { ENTRANCE_OPTIONS, LOOP_OPTIONS, DEFAULT_ANIMATION, getEntranceMotion, getLoopMotion, isAnimated } from '../../utils/animations'
import { PHOTO_SHAPES, getClipPath, getImageStyle, DEFAULT_CUSTOM_CLIP_PATH, OBJECT_FIT_OPTIONS, OBJECT_POSITION_OPTIONS } from '../../utils/imageShapes'
import CurvedText, { hasArc } from '../../components/templates/CurvedText'
import AutoFitText from '../../components/templates/AutoFitText'
import FontStyles, { useCustomFonts } from '../../components/templates/FontStyles'
import { GOOGLE_FONT_NAMES } from '../../utils/fonts'
import { fontAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { DATE_FORMAT_OPTIONS, DEFAULT_DATE_FORMAT, containsDateVariable, formatEventDate, DATE_VARIABLE_KEYS, TIME_FORMAT_OPTIONS, DEFAULT_TIME_FORMAT, containsTimeVariable, formatEventTime, TIME_VARIABLE_KEYS, getElementDateKey } from '../../utils/dateFormats'
import MiniCalendar, { CALENDAR_MARKER_OPTIONS } from '../../components/templates/MiniCalendar'
import ShapeElement from '../../components/templates/ShapeElement'
import MapElement from '../../components/templates/MapElement'
import { textGradientStyle } from '../../utils/gradient'
import { searchIcons, iconPreviewUrl, fetchIconDataUrl, ICON_SUGGESTIONS, EMOJI_GROUPS } from '../../utils/elementLibrary'
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  PlusIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
  FaceSmileIcon,
  ArrowUpTrayIcon,
  LockClosedIcon,
  LockOpenIcon,
  DocumentDuplicateIcon,
  DocumentArrowDownIcon,
  Squares2X2Icon,
  CursorArrowRaysIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  CheckIcon,
  Cog6ToothIcon,
  SparklesIcon,
  StarIcon,
  ArrowsPointingOutIcon,
  ChevronDoubleLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronDoubleRightIcon,
  RectangleStackIcon,
  RectangleGroupIcon,
  MinusIcon,
  Bars2Icon,
  MapPinIcon,
  PlayIcon,
  StopIcon,
  ComputerDesktopIcon
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

// Left-panel tabs (shared by the expanded segmented bar and the collapsed rail).
const PANEL_TABS = [
  { id: 'format', label: 'Format', icon: ArrowsPointingOutIcon },
  { id: 'background', label: 'Fond', icon: PhotoIcon },
  { id: 'elements', label: 'Éléments', icon: CursorArrowRaysIcon },
  { id: 'layers', label: 'Calques', icon: RectangleStackIcon },
  { id: 'settings', label: 'Infos', icon: Cog6ToothIcon }
]

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

// Helper: hex color + opacity (0-100) -> rgba() string, used for the photo border style
const hexToRgba = (hex, alphaPercent = 100) => {
  let h = (hex || '#FFFFFF').replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const r = parseInt(h.substring(0, 2), 16) || 0
  const g = parseInt(h.substring(2, 4), 16) || 0
  const b = parseInt(h.substring(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(100, alphaPercent)) / 100})`
}

const DEFAULT_ELEMENTS = [
  {
    id: 'title',
    type: 'text',
    label: 'Titre',
    content: 'Invitation au Mariage',
    x: 100, y: 40, width: 600, height: 40,
    fontSize: 14, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#8B7355', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 4, textTransform: 'uppercase', locked: false, textShadow: 'none', shadowColor: '#000000'
  },
  {
    id: 'brideGroomNames',
    type: 'names',
    label: 'Noms des mariés',
    content: '{{bride_name}} & {{groom_name}}',
    x: 50, y: 100, width: 700, height: 80,
    fontSize: 48, fontFamily: 'Great Vibes', fontWeight: 'normal', fontStyle: 'normal',
    color: '#2D2D2D', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false, autoFit: true
  },
  {
    id: 'guestName',
    type: 'guest',
    label: "Nom de l'invité",
    content: 'Cher(e) {{guest_name}}',
    x: 150, y: 200, width: 500, height: 40,
    fontSize: 20, fontFamily: 'Cormorant Garamond', fontWeight: 'normal', fontStyle: 'italic',
    color: '#4A4A4A', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'invitationType',
    type: 'invitationType',
    label: "Type d'invitation",
    content: '{{invitation_type}}',
    x: 250, y: 250, width: 300, height: 30,
    fontSize: 14, fontFamily: 'Montserrat', fontWeight: 'bold', fontStyle: 'normal',
    color: '#8B7355', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 1, textTransform: 'uppercase', locked: false
  },
  {
    id: 'message',
    type: 'message',
    label: 'Message personnalisé',
    content: '{{custom_message}}',
    x: 100, y: 290, width: 600, height: 50,
    fontSize: 14, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'italic',
    color: '#666666', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false, autoFit: true
  },
  {
    id: 'date',
    type: 'date',
    label: 'Date du mariage',
    content: '{{wedding_date}}',
    x: 200, y: 360, width: 400, height: 40,
    fontSize: 24, fontFamily: 'Playfair Display', fontWeight: 'bold', fontStyle: 'normal',
    color: '#2D2D2D', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 1, textTransform: 'none', locked: false
  },
  {
    id: 'time',
    type: 'time',
    label: 'Heure de cérémonie',
    content: 'à {{ceremony_time}}',
    x: 280, y: 410, width: 240, height: 30,
    fontSize: 16, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#666666', textAlign: 'center', verticalAlign: 'middle', visible: true,
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
    color: '#2D2D2D', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'communeDate',
    type: 'communeDate',
    label: 'Commune — Date/Heure',
    content: '{{commune_date}} à {{commune_time}}',
    x: 50, y: 492, width: 220, height: 24,
    fontSize: 11, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#666666', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'communeVenue',
    type: 'communeVenue',
    label: 'Commune — Lieu',
    content: '{{commune_venue}}',
    x: 50, y: 518, width: 220, height: 24,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'italic',
    color: '#8B7355', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false, autoFit: true
  },
  {
    id: 'communeAddress',
    type: 'communeAddress',
    label: 'Commune — Adresse',
    content: '{{commune_address}}',
    x: 50, y: 544, width: 220, height: 22,
    fontSize: 10, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#999999', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false, autoFit: true
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
    color: '#2D2D2D', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'egliseDate',
    type: 'egliseDate',
    label: 'Église — Date/Heure',
    content: '{{eglise_date}} à {{eglise_time}}',
    x: 290, y: 492, width: 220, height: 24,
    fontSize: 11, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#666666', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'egliseVenue',
    type: 'egliseVenue',
    label: 'Église — Lieu',
    content: '{{eglise_venue}}',
    x: 290, y: 518, width: 220, height: 24,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'italic',
    color: '#8B7355', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false, autoFit: true
  },
  {
    id: 'egliseAddress',
    type: 'egliseAddress',
    label: 'Église — Adresse',
    content: '{{eglise_address}}',
    x: 290, y: 544, width: 220, height: 22,
    fontSize: 10, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#999999', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false, autoFit: true
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
    color: '#2D2D2D', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'receptionDate',
    type: 'receptionDate',
    label: 'Réception — Date/Heure',
    content: '{{reception_date}} à {{reception_time}}',
    x: 530, y: 492, width: 220, height: 24,
    fontSize: 11, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#666666', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'receptionVenue',
    type: 'receptionVenue',
    label: 'Réception — Lieu',
    content: '{{reception_venue}}',
    x: 530, y: 518, width: 220, height: 24,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'italic',
    color: '#8B7355', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false, autoFit: true
  },
  {
    id: 'receptionAddress',
    type: 'receptionAddress',
    label: 'Réception — Adresse',
    content: '{{reception_address}}',
    x: 530, y: 544, width: 220, height: 22,
    fontSize: 10, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#999999', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false, autoFit: true
  },
  {
    id: 'qrCode',
    type: 'qrcode',
    label: 'QR Code',
    content: '{{qr_code}}',
    x: 300, y: 610, width: 200, height: 200,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#333333', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'tableNumber',
    type: 'table',
    label: 'Numéro de table',
    content: 'Table {{table_number}}',
    x: 300, y: 830, width: 200, height: 35,
    fontSize: 16, fontFamily: 'Montserrat', fontWeight: 'bold', fontStyle: 'normal',
    color: '#8B7355', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'rsvpDate',
    type: 'rsvp',
    label: 'Date RSVP',
    content: 'RSVP avant le {{rsvp_date}}',
    x: 200, y: 880, width: 400, height: 30,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#999999', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'additionalInfo',
    type: 'additionalInfo',
    label: 'Informations supplémentaires',
    content: '{{additional_info}}',
    x: 100, y: 930, width: 600, height: 40,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'italic',
    color: '#999999', textAlign: 'center', verticalAlign: 'middle', visible: false,
    letterSpacing: 0, textTransform: 'none', locked: false, autoFit: true
  }
]

// Simplified element set for non-WEDDING event types (anniversaire, dot,
// cérémonie, conférence, autre) - just titre/date/heure/lieu/message/QR,
// no commune/église/réception programme and no bride&groom names.
const SIMPLE_EVENT_ELEMENTS = [
  {
    id: 'title',
    type: 'text',
    label: 'Titre',
    content: '{{event_type}}',
    x: 100, y: 40, width: 600, height: 40,
    fontSize: 14, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#8B7355', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 4, textTransform: 'uppercase', locked: false, textShadow: 'none', shadowColor: '#000000'
  },
  {
    id: 'eventTitle',
    type: 'text',
    label: "Titre de l'événement",
    content: '{{event_title}}',
    x: 50, y: 100, width: 700, height: 80,
    fontSize: 44, fontFamily: 'Great Vibes', fontWeight: 'normal', fontStyle: 'normal',
    color: '#2D2D2D', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'guestName',
    type: 'guest',
    label: "Nom de l'invité",
    content: 'Cher(e) {{guest_name}}',
    x: 150, y: 200, width: 500, height: 40,
    fontSize: 20, fontFamily: 'Cormorant Garamond', fontWeight: 'normal', fontStyle: 'italic',
    color: '#4A4A4A', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'message',
    type: 'message',
    label: 'Message personnalisé',
    content: '{{custom_message}}',
    x: 100, y: 260, width: 600, height: 60,
    fontSize: 14, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'italic',
    color: '#666666', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false, autoFit: true
  },
  {
    id: 'date',
    type: 'date',
    label: 'Date',
    content: '{{wedding_date}}',
    x: 200, y: 340, width: 400, height: 40,
    fontSize: 24, fontFamily: 'Playfair Display', fontWeight: 'bold', fontStyle: 'normal',
    color: '#2D2D2D', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 1, textTransform: 'none', locked: false
  },
  {
    id: 'time',
    type: 'time',
    label: 'Heure',
    content: 'à {{ceremony_time}}',
    x: 280, y: 390, width: 240, height: 30,
    fontSize: 16, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#666666', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'venueLabel',
    type: 'text',
    label: 'Lieu — Titre',
    content: '📍 Lieu',
    x: 250, y: 460, width: 300, height: 30,
    fontSize: 14, fontFamily: 'Montserrat', fontWeight: 'bold', fontStyle: 'normal',
    color: '#2D2D2D', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'venueName',
    type: 'text',
    label: 'Lieu — Nom',
    content: '{{venue_name}}',
    x: 200, y: 496, width: 400, height: 28,
    fontSize: 16, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'italic',
    color: '#8B7355', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'venueAddress',
    type: 'text',
    label: 'Lieu — Adresse',
    content: '{{venue_address}}',
    x: 200, y: 530, width: 400, height: 24,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#999999', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'qrCode',
    type: 'qrcode',
    label: 'QR Code',
    content: '{{qr_code}}',
    x: 300, y: 610, width: 200, height: 200,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#333333', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'rsvpDate',
    type: 'rsvp',
    label: 'Date RSVP',
    content: 'RSVP avant le {{rsvp_date}}',
    x: 200, y: 880, width: 400, height: 30,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
    color: '#999999', textAlign: 'center', verticalAlign: 'middle', visible: true,
    letterSpacing: 0, textTransform: 'none', locked: false
  },
  {
    id: 'additionalInfo',
    type: 'additionalInfo',
    label: 'Informations supplémentaires',
    content: '{{additional_info}}',
    x: 100, y: 930, width: 600, height: 40,
    fontSize: 12, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'italic',
    color: '#999999', textAlign: 'center', verticalAlign: 'middle', visible: false,
    letterSpacing: 0, textTransform: 'none', locked: false, autoFit: true
  }
]

// Element types that only make sense for a wedding-style event. When the user
// switches the template's event type, these are pulled off the canvas (and
// re-added if they switch back) so e.g. an "Anniversaire" no longer carries the
// bride & groom names or the commune/église/réception programme.
const COUPLE_ELEMENT_TYPES = ['names']
const PROGRAMME_ELEMENT_TYPES = [
  'communeLabel', 'communeDate', 'communeVenue', 'communeAddress',
  'egliseLabel', 'egliseDate', 'egliseVenue', 'egliseAddress',
  'receptionLabel', 'receptionDate', 'receptionVenue', 'receptionAddress'
]
const TABLE_ELEMENT_TYPES = ['table']
// The free-title headline ({{event_title}}) and the couple names headline are
// mutually exclusive: a couple event uses the names, every other type the title.
const TITLE_HEADLINE_IDS = ['eventTitle']

// Pick the right starter layout for the event type:
//  - WEDDING → full programme (commune/église/réception), no standalone address
//  - DOT (couple, no programme) → the simple layout (incl. main address) but
//    with the bride & groom names instead of the free title headline
//  - everything else → the simple layout (title + date/heure + main address)
const getDefaultElements = (eventType) => {
  if (eventUsesProgramme(eventType)) return DEFAULT_ELEMENTS
  if (eventUsesCouple(eventType)) {
    const namesEl = DEFAULT_ELEMENTS.find((e) => e.type === 'names')
    return SIMPLE_EVENT_ELEMENTS.map((el) =>
      el.id === 'eventTitle' && namesEl ? { ...namesEl } : el
    )
  }
  return SIMPLE_EVENT_ELEMENTS
}

// Keep only the elements that are relevant for the given event type, leaving
// every other (shared) element exactly as the user arranged it.
const filterElementsForEventType = (els, eventType) =>
  (els || []).filter((el) => {
    if (COUPLE_ELEMENT_TYPES.includes(el.type) && !eventUsesCouple(eventType)) return false
    if (PROGRAMME_ELEMENT_TYPES.includes(el.type) && !eventUsesProgramme(eventType)) return false
    if (TABLE_ELEMENT_TYPES.includes(el.type) && !eventUsesTables(eventType)) return false
    // Drop the free-title headline on couple events (the names headline replaces it).
    if (TITLE_HEADLINE_IDS.includes(el.id) && eventUsesCouple(eventType)) return false
    return true
  })

// Helper: parse date to separate components (day name, day num, month, year)
const parseDateComponents = (dateStr) => {
  if (!dateStr) return { day_name: '', day_num: '', month_name: '', year: '' }
  
  // Parse format "20 Juin 2026" or "1er Mai 2026"
  const match = dateStr.match(/(\d{1,2})(er)?\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/)
  if (!match) return { day_name: '', day_num: '', month_name: '', year: '' }
  
  const dayNum = match[1]
  const monthNameRaw = match[3]
  const monthNameUpper = monthNameRaw.toUpperCase()
  const year = match[4]
  
  // Month mapping
  const months = {
    'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
    'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11,
    'JANVIER': 0, 'FÉVRIER': 1, 'MARS': 2, 'AVRIL': 3, 'MAI': 4, 'JUIN': 5,
    'JUILLET': 6, 'AOÛT': 7, 'SEPTEMBRE': 8, 'OCTOBRE': 9, 'NOVEMBRE': 10, 'DÉCEMBRE': 11
  }
  
  const dayNames = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI']
  const monthNum = months[monthNameUpper]
  
  if (monthNum !== undefined) {
    const date = new Date(parseInt(year), monthNum, parseInt(dayNum))
    const dayName = dayNames[date.getDay()] || ''
    
    return {
      day_name: dayName || '',
      day_num: dayNum || '',
      month_name: monthNameUpper || '',
      year: year || ''
    }
  }
  return { day_name: '', day_num: '', month_name: '', year: '' }
}

// Parseable sample dates so the per-element date format selector visibly
// changes the editor preview (SAMPLE_DATA holds pre-formatted strings).
const SAMPLE_RAW_DATES = {
  wedding_date: '2026-06-20T10:30:00',
  rsvp_date: '2026-05-01T10:30:00',
  commune_date: '2026-06-20T10:00:00',
  eglise_date: '2026-06-20T14:00:00',
  reception_date: '2026-06-20T18:00:00'
}

const SAMPLE_DATA = {
  bride_name: 'Marie',
  groom_name: 'Jean',
  honoree_name: 'Sophie',
  // Non-WEDDING event types (anniversaire, dot, cérémonie, conférence, autre)
  // use these instead of bride/groom names + the commune/église/réception programme
  event_title: 'Anniversaire de Sophie',
  event_type: 'Anniversaire',
  venue_name: 'Salle des Fêtes',
  venue_address: '12 Rue des Fleurs, Dakar',
  guest_name: 'Sophie Dupont',
  custom_message: 'Nous serions honorés de votre présence pour célébrer notre union',
  additional_info: 'Parking disponible · Dress code : tenue de soirée',
  wedding_date: '20 Juin 2026',
  ceremony_time: '15h00',
  ceremony_hour: '15',
  ceremony_minute: '00',
  table_number: 'VIP',
  rsvp_date: '1er Mai 2026',
  invitation_type: 'Couple',
  qr_code: 'QR',
  // Wedding Date — Separated components
  wedding_day_name: parseDateComponents('20 Juin 2026').day_name || 'LUNDI',
  wedding_day_num: parseDateComponents('20 Juin 2026').day_num || '20',
  wedding_month_name: parseDateComponents('20 Juin 2026').month_name || 'JUIN',
  wedding_year: parseDateComponents('20 Juin 2026').year || '2026',
  // Programme — Commune
  commune_date: '20 Juin 2026',
  commune_time: '10h00',
  commune_hour: '10',
  commune_minute: '00',
  commune_venue: 'Mairie de Dakar',
  commune_address: 'Place de l\'Indépendance',
  commune_day_name: parseDateComponents('20 Juin 2026').day_name || 'LUNDI',
  commune_day_num: parseDateComponents('20 Juin 2026').day_num || '20',
  commune_month_name: parseDateComponents('20 Juin 2026').month_name || 'JUIN',
  commune_year: parseDateComponents('20 Juin 2026').year || '2026',
  // Programme — Église
  eglise_date: '20 Juin 2026',
  eglise_time: '14h00',
  eglise_hour: '14',
  eglise_minute: '00',
  eglise_venue: 'Cathédrale de Dakar',
  eglise_address: 'Blvd de la République',
  eglise_day_name: parseDateComponents('20 Juin 2026').day_name || 'LUNDI',
  eglise_day_num: parseDateComponents('20 Juin 2026').day_num || '20',
  eglise_month_name: parseDateComponents('20 Juin 2026').month_name || 'JUIN',
  eglise_year: parseDateComponents('20 Juin 2026').year || '2026',
  // Programme — Réception
  reception_date: '20 Juin 2026',
  reception_time: '18h00',
  reception_hour: '18',
  reception_minute: '00',
  reception_venue: 'Château des Roses',
  reception_address: '12 Rue des Fleurs, Dakar',
  reception_day_name: parseDateComponents('20 Juin 2026').day_name || 'LUNDI',
  reception_day_num: parseDateComponents('20 Juin 2026').day_num || '20',
  reception_month_name: parseDateComponents('20 Juin 2026').month_name || 'JUIN',
  reception_year: parseDateComponents('20 Juin 2026').year || '2026',
  // RSVP Date — Separated components
  rsvp_day_name: parseDateComponents('1er Mai 2026').day_name || 'MERCREDI',
  rsvp_day_num: parseDateComponents('1er Mai 2026').day_num || '1',
  rsvp_month_name: parseDateComponents('1er Mai 2026').month_name || 'MAI',
  rsvp_year: parseDateComponents('1er Mai 2026').year || '2026'
}

// Helper: scale elements to fit any canvas dimensions
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

const CATEGORIES = [
  { value: 'ELEGANT', label: 'Élégant' },
  { value: 'MODERN', label: 'Moderne' },
  { value: 'ROMANTIC', label: 'Romantique' },
  { value: 'MINIMALIST', label: 'Minimaliste' },
  { value: 'TRADITIONAL', label: 'Traditionnel' }
]

// Reusable gradient controls for text & shape elements. `baseColor` seeds the
// "from" colour so enabling a gradient starts from the element's current colour.
function GradientControls({ el, baseColor, onChange }) {
  const on = !!el.gradient
  const from = el.gradientFrom || baseColor || '#df6746'
  const to = el.gradientTo || '#8B7355'
  const angle = el.gradientAngle ?? 90
  const type = el.gradientType || 'linear'
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-6 rounded" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />
          Dégradé
        </span>
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onChange({ gradient: e.target.checked, ...(e.target.checked && !el.gradientFrom ? { gradientFrom: baseColor || from } : {}) })}
          className="h-4 w-4 accent-primary-600"
        />
      </label>
      {on && (
        <div className="mt-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="block text-[10px] text-gray-400 mb-1">Début</span>
              <div className="flex items-center gap-1.5">
                <input type="color" value={from} onChange={(e) => onChange({ gradientFrom: e.target.value })} className="h-8 w-9 shrink-0 rounded-lg cursor-pointer border border-gray-200" />
                <input type="text" value={from} onChange={(e) => onChange({ gradientFrom: e.target.value })} className="w-full min-w-0 px-1.5 py-1 text-[11px] border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div>
              <span className="block text-[10px] text-gray-400 mb-1">Fin</span>
              <div className="flex items-center gap-1.5">
                <input type="color" value={to} onChange={(e) => onChange({ gradientTo: e.target.value })} className="h-8 w-9 shrink-0 rounded-lg cursor-pointer border border-gray-200" />
                <input type="text" value={to} onChange={(e) => onChange({ gradientTo: e.target.value })} className="w-full min-w-0 px-1.5 py-1 text-[11px] border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {['linear', 'radial'].map((t) => (
              <button
                key={t}
                onClick={() => onChange({ gradientType: t })}
                className={`flex-1 px-2 py-1.5 text-xs rounded-lg border transition-colors ${type === t ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {t === 'linear' ? 'Linéaire' : 'Radial'}
              </button>
            ))}
          </div>
          {type === 'linear' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-400">Angle</span>
                <span className="text-[10px] text-gray-500 font-mono">{angle}°</span>
              </div>
              <input type="range" min="0" max="360" value={angle} onChange={(e) => onChange({ gradientAngle: Number(e.target.value) })} className="w-full accent-primary-600" />
              <div className="flex gap-1 mt-1">
                {[0, 45, 90, 135, 180].map((a) => (
                  <button key={a} onClick={() => onChange({ gradientAngle: a })} className={`flex-1 px-1 py-0.5 text-[10px] rounded border ${angle === a ? 'border-primary-500 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{a}°</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ===================== COMPONENT =====================

export default function TemplateDesigner({ clientMode = false }) {
  const params = useParams()
  const templateId = params.id || params.templateId
  const [searchParams] = useSearchParams()
  // Guard against the literal string "null"/"undefined" arriving in the query
  // (some entry points passed ?wedding=null): treat those as "no wedding".
  const rawWeddingId = searchParams.get('wedding')
  const weddingId = rawWeddingId && rawWeddingId !== 'null' && rawWeddingId !== 'undefined' ? rawWeddingId : null
  // Coming from "Créer un template pour ce type" on a specific event-type
  // section pre-selects that type instead of always defaulting to Mariage.
  const initialEventType = EVENT_TYPES.includes(searchParams.get('eventType')) ? searchParams.get('eventType') : 'WEDDING'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!templateId
  // Font import is available to staff and creators (both author templates).
  const authUser = useAuthStore((s) => s.user)
  const canUploadFont = !clientMode || authUser?.isCreator || authUser?.role === 'ADMIN' || authUser?.role === 'SUPER_ADMIN'

  // Leave the editor towards the right place:
  // - admin → back office template list
  // - editing a real event's invitation design → that event's invitations
  // - otherwise (creator building a template) → the actual previous page
  //   (template list) via history, with a safe fallback.
  const handleExit = () => {
    if (!clientMode) return navigate('/admin/templates')
    if (weddingId) return navigate(`/weddings/${weddingId}/invitations`)
    if (window.history.length > 1) return navigate(-1)
    navigate('/creator-templates')
  }

  // Template metadata
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateCategory, setTemplateCategory] = useState('MODERN')
  const [templateEventType, setTemplateEventType] = useState(initialEventType)
  const [isPremium, setIsPremium] = useState(false)
  const [pricePerInvitation, setPricePerInvitation] = useState('')
  const [previewImage, setPreviewImage] = useState('')

  // Design state
  const [elements, setElements] = useState(getDefaultElements(initialEventType))
  const [selectedId, setSelectedId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([]) // Multiple selection
  const [backgroundUrl, setBackgroundUrl] = useState('')
  const [backgroundOpacity, setBackgroundOpacity] = useState(100)
  const [palette, setPalette] = useState([]) // colours extracted from the background image
  const [extracting, setExtracting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDir, setResizeDir] = useState(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [elementStart, setElementStart] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [showGrid, setShowGrid] = useState(true)
  const [zoom, setZoom] = useState(0.65)
  const [guides, setGuides] = useState({ v: [], h: [] }) // smart alignment guides shown during drag
  // Animation preview: when on, the canvas plays each element's entrance + loop
  // (like the public invitation). previewKey bumps to replay the entrance.
  const [previewAnim, setPreviewAnim] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [fontSearch, setFontSearch] = useState('') // filters the font picker
  const [fontModal, setFontModal] = useState(null) // { file, family, weight, style }

  // ---- Fonts: Google list + admin-uploaded custom fonts ----
  const customFonts = useCustomFonts()
  const fontNames = [...GOOGLE_FONT_NAMES, ...customFonts.map(f => f.family)]
  const [fontUploading, setFontUploading] = useState(false)
  const fontInputRef = useRef(null)

  // Picking a file opens a small modal to set the family name + weight + style.
  const handleFontUpload = (e) => {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ''
    if (!file) return
    const defaultName = file.name
      .replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b(thin|extralight|light|regular|medium|semibold|bold|extrabold|black|italic)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    setFontModal({ file, family: defaultName || 'Ma police', weight: 400, style: 'normal' })
  }

  const submitFontUpload = async () => {
    if (!fontModal?.file || !fontModal.family.trim()) return
    setFontUploading(true)
    try {
      const res = await fontAPI.upload(fontModal.file, fontModal.family.trim(), fontModal.weight, fontModal.style)
      await queryClient.invalidateQueries('custom-fonts')
      toast.success(`Police « ${res.data.font.family} » importée`)
      if (selectedId) updateElement(selectedId, { fontFamily: res.data.font.family })
      setFontModal(null)
    } catch (err) {
      toast.error(err.response?.data?.error || "Échec de l'import de la police")
    } finally {
      setFontUploading(false)
    }
  }

  // ---- Undo / Redo history (snapshots of `elements`) ----
  const elementsRef = useRef(elements)
  elementsRef.current = elements
  const undoStack = useRef([])
  const redoStack = useRef([])
  const prevElementsRef = useRef(null)
  const skipHistoryRef = useRef(false)
  const commitTimerRef = useRef(null)
  const [history, setHistory] = useState({ canUndo: false, canRedo: false })
  const syncHistory = useCallback(() => {
    setHistory({ canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0 })
  }, [])
  const [activePanel, setActivePanel] = useState('format') // format, background, elements, properties, settings
  const [panelCollapsed, setPanelCollapsed] = useState(false) // collapse the left tools sidebar for a bigger canvas
  // Element library (icons via Iconify + emojis)
  const [libTab, setLibTab] = useState('icons') // 'icons' | 'emoji'
  const [iconQuery, setIconQuery] = useState('')
  const [iconResults, setIconResults] = useState([])
  const [iconLoading, setIconLoading] = useState(false)
  const [iconColor, setIconColor] = useState('#000000')
  const [iconAdding, setIconAdding] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_CANVAS_WIDTH)
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_CANVAS_HEIGHT)
  const [selectedFormat, setSelectedFormat] = useState('a5-portrait')
  const [margins, setMargins] = useState(DEFAULT_MARGINS)
  const [showSelectionBox, setShowSelectionBox] = useState(false) // Selection box for multi-select
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 })
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 })
  const [multiDragStart, setMultiDragStart] = useState({}) // id -> {x,y} snapshot taken when a drag starts

  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const iconInputRef = useRef(null)
  const markerInputRef = useRef(null)
  const previewInputRef = useRef(null)

  // Load existing template if editing
  const { data: templateData, isLoading } = useQuery(
    ['admin-template', templateId],
    () => clientMode ? templateAPI.getOne(templateId) : adminAPI.getTemplate(templateId),
    { enabled: isEditing }
  )

  // Initialize from existing template
  useEffect(() => {
    if (templateData?.data?.template) {
      const t = templateData.data.template
      console.log('Loading template DATA from server:', JSON.stringify(t, null, 2))
      console.log('Loading template:', {
        name: t.name,
        hasConfig: !!t.config,
        configKeys: t.config ? Object.keys(t.config) : [],
        designElementsCount: t.config?.designElements?.length || 0,
        backgroundUrl: t.backgroundUrl,
        previewImage: t.previewImage,
        canvasWidth: t.config?.canvasWidth || t.canvasWidth,
        canvasHeight: t.config?.canvasHeight || t.canvasHeight
      })

      setTemplateName(t.name || '')
      setTemplateDescription(t.description || '')
      setTemplateCategory(t.category || 'MODERN')
      setTemplateEventType(t.eventType || 'WEDDING')
      setIsPremium(t.isPremium || false)
      setPricePerInvitation(t.pricePerInvitation != null ? String(t.pricePerInvitation) : '0')
      setPreviewImage(t.previewImage || '')
      setBackgroundUrl(t.previewImage || t.backgroundUrl || t.config?.backgroundImage || '')
      setBackgroundOpacity(t.backgroundOpacity ?? t.config?.backgroundOpacity ?? 100)
      if (Array.isArray(t.config?.palette)) setPalette(t.config.palette)

      // Load canvas dimensions first
      if (t.config?.canvasWidth) {
        console.log('Setting canvas width from config:', t.config.canvasWidth)
        setCanvasWidth(t.config.canvasWidth)
      }
      if (t.config?.canvasHeight) {
        console.log('Setting canvas height from config:', t.config.canvasHeight)
        setCanvasHeight(t.config.canvasHeight)
      }
      
      // Load design elements - with logging
      if (t.config?.designElements) {
        console.log('Found designElements in config:', typeof t.config.designElements, Array.isArray(t.config.designElements))
        if (Array.isArray(t.config.designElements) && t.config.designElements.length > 0) {
          console.log('Setting elements from config - COUNT:', t.config.designElements.length)
          console.log('First element:', t.config.designElements[0])
          // Loading the template is not an undoable step.
          skipHistoryRef.current = true
          undoStack.current = []
          redoStack.current = []
          setElements(t.config.designElements)
        } else {
          console.warn('designElements exists but is not a valid array!', t.config.designElements)
        }
      } else {
        console.warn('No design elements found in template config!')
      }
      
      if (t.config?.margins) setMargins(t.config.margins)
      if (t.config?.selectedFormat) setSelectedFormat(t.config.selectedFormat)
      // Switch to elements panel since background is already set
      if (t.previewImage || t.backgroundUrl || t.config?.backgroundImage) {
        setActivePanel('elements')
      }
    }
  }, [templateData])

  const selectedElement = elements.find(el => el.id === selectedId)
  const selectionGroupIds = Array.from(new Set([selectedId, ...selectedIds].filter(Boolean)))

  // ===================== CANVAS MOUSE HANDLERS =====================

  const getCanvasCoords = useCallback((e) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasWidth / rect.width
    const scaleY = canvasHeight / rect.height
    // Works for both mouse and touch events.
    const point = e.touches?.[0] || e.changedTouches?.[0] || e
    return {
      x: (point.clientX - rect.left) * scaleX,
      y: (point.clientY - rect.top) * scaleY
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

    let groupIds
    if (e.ctrlKey || e.metaKey) {
      // Multi-select avec Ctrl/Cmd + Click — part de la sélection courante (simple ou multiple)
      const base = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : [])
      groupIds = base.includes(elementId) ? base.filter(id => id !== elementId) : [...base, elementId]
      setSelectedIds(groupIds)
      setSelectedId(elementId)
    } else if (selectedIds.length > 1 && selectedIds.includes(elementId)) {
      // Clic (sans Ctrl) sur un élément qui fait déjà partie d'une sélection multiple : on déplace tout le groupe
      groupIds = selectedIds
      setSelectedId(elementId)
    } else {
      // Sélection simple
      groupIds = [elementId]
      setSelectedIds([])
      setSelectedId(elementId)
    }

    setActivePanel('properties')
    const coords = getCanvasCoords(e)
    setDragStart(coords)
    setElementStart({ x: el.x, y: el.y, w: el.width, h: el.height })

    // Snapshot des positions de départ de tous les éléments du groupe : le même delta de souris
    // sera appliqué à chacun, ce qui préserve les distances relatives entre eux pendant le déplacement.
    const starts = {}
    groupIds.forEach(id => {
      const groupEl = elements.find(item => item.id === id)
      if (groupEl) starts[id] = { x: groupEl.x, y: groupEl.y }
    })
    setMultiDragStart(starts)

    setIsDragging(true)
  }, [elements, getCanvasCoords, selectedIds, selectedId])

  const handleResizeMouseDown = useCallback((e, direction) => {
    e.stopPropagation()
    if (!selectedElement || selectedElement.locked) return
    const coords = getCanvasCoords(e)
    setDragStart(coords)
    setElementStart({
      x: selectedElement.x, y: selectedElement.y,
      w: selectedElement.width, h: selectedElement.height
    })
    setResizeDir(direction)
    setIsResizing(true)
  }, [selectedElement, getCanvasCoords])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging && !isResizing) return
    // Prevent the page from scrolling while dragging an element on touch.
    if (e.touches && e.cancelable) e.preventDefault()
    const coords = getCanvasCoords(e)
    const dx = coords.x - dragStart.x
    const dy = coords.y - dragStart.y

    if (isDragging) {
      const draggingIds = Object.keys(multiDragStart)

      // Single-element drag: snap edges/centre to the canvas and to other
      // elements, showing magenta guide lines (the "pro" touch).
      if (draggingIds.length === 1) {
        const cur = elementsRef.current
        const el = cur.find(p => p.id === draggingIds[0])
        const start = multiDragStart[draggingIds[0]]
        if (el && start) {
          let x = Math.round(start.x + dx)
          let y = Math.round(start.y + dy)
          if (showGrid) { x = Math.round(x / 10) * 10; y = Math.round(y / 10) * 10 }
          x = Math.max(0, Math.min(canvasWidth - el.width, x))
          y = Math.max(0, Math.min(canvasHeight - el.height, y))

          const SNAP = 6
          const others = cur.filter(p => p.visible && p.id !== el.id)
          const vCand = [0, canvasWidth / 2, canvasWidth]
          const hCand = [0, canvasHeight / 2, canvasHeight]
          others.forEach(o => {
            vCand.push(o.x, o.x + o.width / 2, o.x + o.width)
            hCand.push(o.y, o.y + o.height / 2, o.y + o.height)
          })
          const gv = [], gh = []
          let bV = null
          ;[x, x + el.width / 2, x + el.width].forEach(pt => vCand.forEach(c => {
            const d = Math.abs(pt - c); if (d <= SNAP && (!bV || d < bV.d)) bV = { d, delta: c - pt, line: c }
          }))
          if (bV) { x = Math.round(x + bV.delta); gv.push(bV.line) }
          let bH = null
          ;[y, y + el.height / 2, y + el.height].forEach(pt => hCand.forEach(c => {
            const d = Math.abs(pt - c); if (d <= SNAP && (!bH || d < bH.d)) bH = { d, delta: c - pt, line: c }
          }))
          if (bH) { y = Math.round(y + bH.delta); gh.push(bH.line) }

          setElements(prev => prev.map(p => p.id === el.id ? { ...p, x, y } : p))
          setGuides({ v: gv, h: gh })
        }
        return
      }

      // Multi-element drag: keep relative distances, no snapping.
      setElements(prev => prev.map(el => {
        const start = multiDragStart[el.id]
        if (!start) return el
        let newX = Math.round(start.x + dx)
        let newY = Math.round(start.y + dy)
        if (showGrid) { newX = Math.round(newX / 10) * 10; newY = Math.round(newY / 10) * 10 }
        newX = Math.max(0, Math.min(canvasWidth - el.width, newX))
        newY = Math.max(0, Math.min(canvasHeight - el.height, newY))
        return { ...el, x: newX, y: newY }
      }))
      setGuides(g => (g.v.length || g.h.length) ? { v: [], h: [] } : g)
      return
    }

    // Resize only the primary selected element.
    setElements(prev => prev.map(el => {
      if (isResizing && el.id === selectedId) {
        let newW = elementStart.w, newH = elementStart.h, newX = elementStart.x, newY = elementStart.y
        if (resizeDir.includes('e')) newW = Math.max(40, elementStart.w + dx)
        if (resizeDir.includes('w')) { newW = Math.max(40, elementStart.w - dx); newX = elementStart.x + dx }
        if (resizeDir.includes('s')) newH = Math.max(20, elementStart.h + dy)
        if (resizeDir.includes('n')) { newH = Math.max(20, elementStart.h - dy); newY = elementStart.y + dy }
        if (showGrid) { newW = Math.round(newW / 10) * 10; newH = Math.round(newH / 10) * 10; newX = Math.round(newX / 10) * 10; newY = Math.round(newY / 10) * 10 }
        return { ...el, x: newX, y: newY, width: newW, height: newH }
      }
      return el
    }))
  }, [isDragging, isResizing, dragStart, elementStart, multiDragStart, selectedId, showGrid, resizeDir, canvasWidth, canvasHeight, getCanvasCoords])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeDir(null)
    setGuides(g => (g.v.length || g.h.length) ? { v: [], h: [] } : g)
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    // Touch (mobile) — touchmove must be non-passive so we can preventDefault.
    window.addEventListener('touchmove', handleMouseMove, { passive: false })
    window.addEventListener('touchend', handleMouseUp)
    window.addEventListener('touchcancel', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleMouseMove)
      window.removeEventListener('touchend', handleMouseUp)
      window.removeEventListener('touchcancel', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // ---- Undo / Redo ----
  // Record a history snapshot whenever `elements` settles after a change.
  // Debounced so a multi-step gesture (drag, resize) becomes a single undo step.
  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false
      prevElementsRef.current = elements
      return
    }
    if (prevElementsRef.current === null) {
      prevElementsRef.current = elements
      return
    }
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current)
    commitTimerRef.current = setTimeout(() => {
      const prev = prevElementsRef.current
      if (prev && prev !== elementsRef.current) {
        undoStack.current.push(prev)
        if (undoStack.current.length > 60) undoStack.current.shift()
        redoStack.current = []
        prevElementsRef.current = elementsRef.current
        syncHistory()
      }
    }, 350)
  }, [elements, syncHistory])

  const undo = useCallback(() => {
    if (commitTimerRef.current) { clearTimeout(commitTimerRef.current); commitTimerRef.current = null }
    // Flush a not-yet-committed change so it becomes its own undo step.
    if (prevElementsRef.current && prevElementsRef.current !== elementsRef.current) {
      undoStack.current.push(prevElementsRef.current)
      prevElementsRef.current = elementsRef.current
    }
    if (undoStack.current.length === 0) { syncHistory(); return }
    const prev = undoStack.current.pop()
    redoStack.current.push(elementsRef.current)
    skipHistoryRef.current = true
    prevElementsRef.current = prev
    setElements(prev)
    setSelectedId(null); setSelectedIds([])
    syncHistory()
  }, [syncHistory])

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return
    const next = redoStack.current.pop()
    undoStack.current.push(elementsRef.current)
    skipHistoryRef.current = true
    prevElementsRef.current = next
    setElements(next)
    setSelectedId(null); setSelectedIds([])
    syncHistory()
  }, [syncHistory])

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!canvasRef.current) return

      // Undo / Redo — allowed even while typing (standard editor behavior).
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase()
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
        if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return }
      }

      // Don't hijack keys while the user is typing in a field (content, sizes,
      // color hexes, the free-form clip-path textarea, etc.).
      const t = e.target
      const isTyping = t && (
        t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.tagName === 'SELECT' ||
        t.isContentEditable
      )
      if (isTyping) return

      // Arrow keys - nudge selected element(s) for precise positioning.
      // 1px by default, 10px with Shift.
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const groupIds = Array.from(new Set([selectedId, ...selectedIds].filter(Boolean)))
        if (groupIds.length === 0) return
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        setElements(prev => prev.map(el => {
          if (!groupIds.includes(el.id) || el.locked) return el
          const newX = Math.max(0, Math.min(canvasWidth - el.width, el.x + dx))
          const newY = Math.max(0, Math.min(canvasHeight - el.height, el.y + dy))
          return { ...el, x: newX, y: newY }
        }))
        return
      }

      // Delete key - delete selected or multi-selected elements
      if (e.key === 'Delete') {
        e.preventDefault()
        if (selectedIds.length > 0) {
          deleteSelectedElements()
        } else if (selectedId) {
          deleteElement(selectedId)
        }
      }

      // Ctrl+D (or Cmd+D on Mac) - duplicate selected elements
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        if (selectedIds.length > 0) {
          duplicateSelectedElements()
        } else if (selectedId) {
          duplicateElement(selectedId)
        }
      }

      // Escape - clear multi-selection
      if (e.key === 'Escape') {
        setSelectedIds([])
        setSelectedId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, selectedIds, canvasWidth, canvasHeight, undo, redo])

  // ===================== ELEMENT OPERATIONS =====================

  const updateElement = (id, updates) => {
    setElements(prev => {
      const updated = prev.map(el => el.id === id ? { ...el, ...updates } : el)
      // Ensure data integrity
      return updated.filter(el => el && el.id)
    })
  }

  const toggleVisibility = (id) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, visible: !el.visible } : el))
  }

  const toggleLock = (id) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, locked: !el.locked } : el))
  }

  // Reorder a layer in the stack. dir = +1 brings it forward (on top),
  // -1 sends it backward. zIndex is normalised to array order so the editor
  // canvas and the public/PDF render (which sort by zIndex) stay in sync.
  const moveLayer = (id, dir) => {
    setElements(prev => {
      const idx = prev.findIndex(e => e.id === id)
      if (idx === -1) return prev
      const swap = idx + dir
      if (swap < 0 || swap >= prev.length) return prev
      const next = [...prev]
      const tmp = next[idx]; next[idx] = next[swap]; next[swap] = tmp
      return next.map((e, i) => ({ ...e, zIndex: i }))
    })
  }

  const layerIcon = (el) => {
    if (el.type === 'photo' || el.type === 'image') return <PhotoIcon className="h-4 w-4" />
    if (el.type === 'map') return <MapPinIcon className="h-4 w-4" />
    if (el.type === 'shape') return el.shapeKind === 'line' ? <MinusIcon className="h-4 w-4" /> : <RectangleGroupIcon className="h-4 w-4" />
    return <Bars2Icon className="h-4 w-4" />
  }

  const addCustomText = () => {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const w = Math.min(400, Math.round(canvasWidth * 0.5))
    const h = 40
    const newElement = {
      id, type: 'custom', label: 'Texte personnalisé', content: 'Nouveau texte',
      x: Math.round((canvasWidth - w) / 2), y: Math.round(canvasHeight * 0.4), width: w, height: h,
      fontSize: 16, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
      color: '#333333', textAlign: 'center', verticalAlign: 'middle', visible: true,
      letterSpacing: 0, textTransform: 'none', locked: false
    }
    setElements(prev => [...prev, newElement])
    setSelectedId(id)
    setActivePanel('properties')
  }

  // Ajoute un emplacement photo (ex: photo des mariés) que le client remplira avec sa propre image
  const addPhotoElement = () => {
    const id = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const w = Math.min(300, Math.round(canvasWidth * 0.4))
    const h = w
    const newElement = {
      id, type: 'photo', label: 'Photo des mariés', content: '{{couple_photo}}',
      x: Math.round((canvasWidth - w) / 2), y: Math.round(canvasHeight * 0.3), width: w, height: h,
      visible: true, locked: false, shape: 'rect',
      objectFit: 'cover', borderWidth: 4, borderColor: '#FFFFFF', borderOpacity: 100, borderRadius: 12
    }
    setElements(prev => [...prev, newElement])
    setSelectedId(id)
    setActivePanel('properties')
  }

  // Ajoute une image décorative fixe (logo, ornement...) uploadée par l'admin -
  // contrairement à "photo" qui est un emplacement rempli par le client.
  const addImageElement = () => {
    const id = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const w = Math.min(200, Math.round(canvasWidth * 0.25))
    const h = w
    const newElement = {
      id, type: 'image', label: 'Image décorative', content: '', iconUrl: '',
      x: Math.round((canvasWidth - w) / 2), y: Math.round(canvasHeight * 0.1), width: w, height: h,
      visible: true, locked: false, shape: 'rect',
      objectFit: 'contain', borderWidth: 0, borderColor: '#FFFFFF', borderOpacity: 100, borderRadius: 0
    }
    setElements(prev => [...prev, newElement])
    setSelectedId(id)
    setActivePanel('properties')
  }

  // Adds a decorative shape (rectangle, circle, or line/divider).
  const addShapeElement = (shapeKind) => {
    const id = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const isLine = shapeKind === 'line'
    const w = isLine ? Math.round(canvasWidth * 0.5) : Math.min(220, Math.round(canvasWidth * 0.28))
    const h = isLine ? 20 : (shapeKind === 'circle' ? w : Math.round(w * 0.6))
    const newElement = {
      id, type: 'shape', shapeKind,
      label: shapeKind === 'circle' ? 'Cercle' : isLine ? 'Ligne' : 'Rectangle',
      content: '',
      x: Math.round((canvasWidth - w) / 2), y: Math.round(canvasHeight * 0.4),
      width: w, height: h, visible: true, locked: false,
      fillColor: isLine ? '#333333' : '#df6746', fillOpacity: 100,
      borderWidth: 0, borderColor: '#333333', borderRadius: 0,
      lineThickness: 2, opacity: 100, rotation: 0
    }
    setElements(prev => [...prev, newElement])
    setSelectedId(id)
    setActivePanel('properties')
  }

  // Adds a clickable map / location card. On the invitation it opens Google Maps
  // (directions) for the event venue; adding it makes the creation form ask for
  // the location.
  const addMapElement = () => {
    const id = `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const w = Math.min(340, Math.round(canvasWidth * 0.5))
    const h = Math.round(w * 0.7)
    const newElement = {
      id, type: 'map', label: 'Carte / Localisation', content: '',
      x: Math.round((canvasWidth - w) / 2), y: Math.round(canvasHeight * 0.55),
      width: w, height: h, visible: true, locked: false,
      color: '#df6746', fillColor: '#ffffff', borderRadius: 16,
      mapLabel: "Voir l'itinéraire", opacity: 100
    }
    setElements(prev => [...prev, newElement])
    setSelectedId(id)
    setActivePanel('properties')
  }

  // ---- Element library: icon search (Iconify) + emoji insertion ----
  const runIconSearch = async (q) => {
    const query = (q ?? iconQuery).trim()
    if (!query) { setIconResults([]); return }
    setIconLoading(true)
    try {
      const icons = await searchIcons(query, 60)
      setIconResults(icons)
      if (icons.length === 0) toast('Aucune icône trouvée', { icon: '🔍' })
    } catch {
      toast.error("Recherche d'icônes indisponible (vérifiez votre connexion)")
    } finally {
      setIconLoading(false)
    }
  }

  // Adds a library icon as a decorative "image" element (SVG embedded as a
  // data URL, recolored to the chosen color).
  const addIconElement = async (iconName) => {
    setIconAdding(iconName)
    try {
      const dataUrl = await fetchIconDataUrl(iconName, iconColor)
      const id = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const w = Math.min(160, Math.round(canvasWidth * 0.2))
      const newElement = {
        id, type: 'image', label: `Icône ${iconName}`, content: '', iconUrl: dataUrl,
        iconName, iconColor,
        x: Math.round((canvasWidth - w) / 2), y: Math.round(canvasHeight * 0.15), width: w, height: w,
        visible: true, locked: false, shape: 'rect',
        objectFit: 'contain', objectPosition: 'center', imageScale: 100, rotation: 0, opacity: 100,
        borderWidth: 0, borderColor: '#FFFFFF', borderOpacity: 100, borderRadius: 0
      }
      setElements(prev => [...prev, newElement])
      setSelectedId(id)
      setActivePanel('properties')
    } catch {
      toast.error("Impossible d'ajouter cette icône")
    } finally {
      setIconAdding(null)
    }
  }

  // Adds an emoji as a (resizable) text element.
  const addEmojiElement = (emoji) => {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const w = Math.min(120, Math.round(canvasWidth * 0.15))
    const newElement = {
      id, type: 'custom', label: `Emoji ${emoji}`, content: emoji,
      x: Math.round((canvasWidth - w) / 2), y: Math.round(canvasHeight * 0.15), width: w, height: w,
      fontSize: 64, fontFamily: 'Montserrat', fontWeight: 'normal', fontStyle: 'normal',
      color: '#000000', textAlign: 'center', verticalAlign: 'middle',
      letterSpacing: 0, textTransform: 'none', lineHeight: 1, visible: true, locked: false
    }
    setElements(prev => [...prev, newElement])
    setSelectedId(id)
    setActivePanel('properties')
  }

  // Re-color a placed library icon by re-fetching its SVG with a new color.
  const recolorIcon = async (id, color) => {
    const el = elements.find(e => e.id === id)
    if (!el || !el.iconName) return
    // Optimistic: store the chosen color right away so the picker stays in sync.
    updateElement(id, { iconColor: color })
    try {
      const dataUrl = await fetchIconDataUrl(el.iconName, color)
      updateElement(id, { iconUrl: dataUrl, iconColor: color })
    } catch {
      toast.error("Recoloration impossible (vérifiez la connexion)")
    }
  }

  const DELETABLE_TYPES = ['custom', 'photo', 'image', 'shape', 'map']

  const deleteElement = (id) => {
    const el = elements.find(e => e.id === id)
    if (DELETABLE_TYPES.includes(el?.type)) {
      setElements(prev => prev.filter(e => e.id !== id))
      if (selectedId === id) setSelectedId(null)
      if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(sid => sid !== id))
    }
  }

  const duplicateElement = (id) => {
    const el = elements.find(e => e.id === id)
    if (!el) return
    
    const newId = `${el.type}-${Date.now()}`
    const duplicate = {
      ...el,
      id: newId,
      x: el.x + 10,
      y: el.y + 10
    }
    setElements(prev => [...prev, duplicate])
    setSelectedId(newId)
    toast.success('Élément dupliqué')
  }

  // Opérations sur multi-sélection
  const deleteSelectedElements = () => {
    const toDelete = [selectedId, ...selectedIds].filter(Boolean)
    if (toDelete.length === 0) return toast.error('Aucun élément sélectionné')
    
    const customOnly = toDelete.every(id => DELETABLE_TYPES.includes(elements.find(e => e.id === id)?.type))
    if (!customOnly) return toast.error('Seuls les éléments personnalisés peuvent être supprimés')
    
    setElements(prev => prev.filter(e => !toDelete.includes(e.id)))
    setSelectedId(null)
    setSelectedIds([])
    toast.success(`${toDelete.length} élément(s) supprimé(s)`)
  }

  const toggleLockSelected = () => {
    const toToggle = [selectedId, ...selectedIds].filter(Boolean)
    if (toToggle.length === 0) return
    
    const firstLocked = elements.find(e => toToggle.includes(e.id))?.locked
    const newLocked = !firstLocked
    
    setElements(prev => prev.map(el => 
      toToggle.includes(el.id) ? { ...el, locked: newLocked } : el
    ))
    toast.success(`${toToggle.length} élément(s) ${newLocked ? 'verrouillé(s)' : 'déverrouillé(s)'}`)
  }

  const toggleVisibilitySelected = () => {
    const toToggle = [selectedId, ...selectedIds].filter(Boolean)
    if (toToggle.length === 0) return
    
    const firstVisible = elements.find(e => toToggle.includes(e.id))?.visible
    const newVisible = !firstVisible
    
    setElements(prev => prev.map(el => 
      toToggle.includes(el.id) ? { ...el, visible: newVisible } : el
    ))
    toast.success(`${toToggle.length} élément(s) ${newVisible ? 'affiché(s)' : 'caché(s)'}`)
  }

  const duplicateSelectedElements = () => {
    const toDuplicate = [selectedId, ...selectedIds].filter(Boolean)
    if (toDuplicate.length === 0) return
    
    const newElements = []
    toDuplicate.forEach(id => {
      const original = elements.find(e => e.id === id)
      if (original) {
        const duplicated = {
          ...JSON.parse(JSON.stringify(original)),
          id: `${original.id}_copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          x: original.x + 20,
          y: original.y + 20
        }
        newElements.push(duplicated)
      }
    })
    
    setElements(prev => [...prev, ...newElements])
    setSelectedIds(newElements.map(el => el.id))
    toast.success(`${newElements.length} élément(s) dupliqué(s)`)
  }

  // Aligne les éléments sélectionnés entre eux (gauche/centre/droite, haut/centre/bas)
  // en se basant sur le rectangle englobant de la sélection — comportement standard des outils de design.
  const alignSelected = (mode) => {
    const ids = selectionGroupIds
    if (ids.length < 2) return toast.error('Sélectionnez au moins 2 éléments')

    const group = elements.filter(e => ids.includes(e.id))
    const minX = Math.min(...group.map(e => e.x))
    const maxX = Math.max(...group.map(e => e.x + e.width))
    const minY = Math.min(...group.map(e => e.y))
    const maxY = Math.max(...group.map(e => e.y + e.height))
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    setElements(prev => prev.map(el => {
      if (!ids.includes(el.id) || el.locked) return el
      let newX = el.x, newY = el.y
      switch (mode) {
        case 'left': newX = minX; break
        case 'centerH': newX = Math.round(centerX - el.width / 2); break
        case 'right': newX = maxX - el.width; break
        case 'top': newY = minY; break
        case 'centerV': newY = Math.round(centerY - el.height / 2); break
        case 'bottom': newY = maxY - el.height; break
        default: break
      }
      newX = Math.max(0, Math.min(canvasWidth - el.width, newX))
      newY = Math.max(0, Math.min(canvasHeight - el.height, newY))
      return { ...el, x: newX, y: newY }
    }))
    toast.success('Éléments alignés')
  }

  const resetLayout = () => {
    setElements(scaleElementsToCanvas(getDefaultElements(templateEventType), canvasWidth, canvasHeight))
    setSelectedId(null)
    setSelectedIds([])
  }

  // Switching event type on a brand-new (not-yet-saved) template swaps the
  // starter layout to match - a Dot/Anniversaire invitation has no
  // commune/église/réception programme and no bride&groom names, so the
  // wedding skeleton would just leave those fields blank/incoherent.
  // Existing templates keep their elements untouched when re-categorized.
  const handleEventTypeChange = (newType) => {
    setTemplateEventType(newType)
    // Switching the event type adapts the canvas in place (works while editing
    // too): drop the elements that are specific to the previous type and add
    // the ones the new type needs but that aren't on the canvas yet. Shared
    // elements (title, guest, date, venue, QR, message...) are left untouched.
    setElements((prev) => {
      const kept = filterElementsForEventType(prev, newType)
      const presentIds = new Set(kept.map((e) => e.id))
      // Re-add any element the new type's default layout needs but the canvas is
      // missing (e.g. the main address block when coming from a wedding, or the
      // bride & groom names when switching back to a couple event).
      const defaults = scaleElementsToCanvas(getDefaultElements(newType), canvasWidth, canvasHeight)
      const missing = defaults.filter((d) => !presentIds.has(d.id))
      return [...kept, ...missing]
    })
  }

  // ===================== BACKGROUND UPLOAD =====================

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    try {
      // Resize + re-encode (WebP when supported) in the browser first -
      // keeps the editor responsive and never stuffs a multi-MB base64
      // string into the template's saved JSON config.
      const result = await processImage(file, 'background', { maxSizeMB: 10 })

      const formData = new FormData()
      formData.append('templateBackground', result.upload, result.filename)
      // Editing an existing template (incl. a client customizing their own
      // invitation) uses the per-template route, which only requires being
      // logged in. The ID-less route is admin-only (brand new template,
      // before it has a row to attach the image to).
      const res = templateId
        ? await templateAPI.uploadBackgroundForTemplate(templateId, formData)
        : await templateAPI.uploadBackground(formData)
      setBackgroundUrl(res.data.backgroundUrl || res.data.backgroundImage)
      toast.success('Image de fond chargée !')
      setActivePanel('elements')

      // Extract a colour palette from the local blob (no CORS taint) so the
      // creator can reuse the image's colours on text elements.
      try {
        const objUrl = URL.createObjectURL(result.upload)
        const colors = await extractPalette(objUrl, 6)
        URL.revokeObjectURL(objUrl)
        if (colors.length) {
          setPalette(colors)
          toast.success(`${colors.length} couleurs extraites de l'image`)
        }
      } catch { /* extraction is best-effort */ }
    } catch (err) {
      toast.error(err.message || err.response?.data?.error || "Erreur lors de l'upload de l'image de fond")
    } finally {
      setUploading(false)
    }
  }

  // Re-run palette extraction on the current background (same-origin images
  // load onto the canvas cleanly; cross-origin needs CORS on the image host).
  const reextractPalette = async () => {
    if (!backgroundUrl) return
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
    const src = backgroundUrl.startsWith('data:') || backgroundUrl.startsWith('http') ? backgroundUrl : `${apiBase}${backgroundUrl}`
    setExtracting(true)
    try {
      const colors = await extractPalette(src, 6)
      if (colors.length) {
        setPalette(colors)
        toast.success(`${colors.length} couleurs extraites`)
      } else {
        toast.error("Impossible d'analyser cette image (rechargez-la pour extraire les couleurs)")
      }
    } finally {
      setExtracting(false)
    }
  }

  // ===================== ICON UPLOAD =====================

  const handleIconUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (iconInputRef.current) iconInputRef.current.value = ''

    // SVGs are vector and already tiny - upload as-is, skip the canvas pipeline.
    if (file.type === 'image/svg+xml') {
      if (file.size > 5 * 1024 * 1024) return toast.error('Icône trop volumineuse (max 5 Mo)')
      try {
        const formData = new FormData()
        formData.append('icon', file)
        const res = await templateAPI.uploadIcon(formData)
        updateElement(selectedId, { iconUrl: res.data.iconUrl })
        toast.success('Icône chargée !')
      } catch (err) {
        toast.error(err.response?.data?.error || "Erreur lors de l'upload de l'icône")
      }
      return
    }

    try {
      const result = await processImage(file, 'logo', { maxSizeMB: 5 })
      const formData = new FormData()
      formData.append('icon', result.upload, result.filename)
      const res = await templateAPI.uploadIcon(formData)
      updateElement(selectedId, { iconUrl: res.data.iconUrl })
      toast.success('Icône chargée !')
    } catch (err) {
      toast.error(err.message || err.response?.data?.error || "Erreur lors de l'upload de l'icône")
    }
  }

  // Custom marker image for the visual calendar's highlighted day (heart/sticker...).
  const handleMarkerUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (markerInputRef.current) markerInputRef.current.value = ''

    if (file.type === 'image/svg+xml') {
      if (file.size > 5 * 1024 * 1024) return toast.error('Image trop volumineuse (max 5 Mo)')
      try {
        const formData = new FormData()
        formData.append('icon', file)
        const res = await templateAPI.uploadIcon(formData)
        updateElement(selectedId, { calendarMarker: 'image', calendarMarkerUrl: res.data.iconUrl })
        toast.success('Marqueur chargé !')
      } catch (err) {
        toast.error(err.response?.data?.error || "Erreur lors de l'upload du marqueur")
      }
      return
    }

    try {
      const result = await processImage(file, 'logo', { maxSizeMB: 5 })
      const formData = new FormData()
      formData.append('icon', result.upload, result.filename)
      const res = await templateAPI.uploadIcon(formData)
      updateElement(selectedId, { calendarMarker: 'image', calendarMarkerUrl: res.data.iconUrl })
      toast.success('Marqueur chargé !')
    } catch (err) {
      toast.error(err.message || err.response?.data?.error || "Erreur lors de l'upload du marqueur")
    }
  }

  const handlePreviewUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (previewInputRef.current) previewInputRef.current.value = ''

    try {
      const result = await processImage(file, 'background', { maxSizeMB: 5 })
      const formData = new FormData()
      formData.append('previewImage', result.upload, result.filename)
      const res = await templateAPI.uploadPreviewImage(formData)
      setPreviewImage(res.data.previewUrl)
      toast.success('Aperçu chargé !')
    } catch (err) {
      console.error('Preview upload error:', err)
      toast.error(err.message || err.response?.data?.error || 'Erreur lors du chargement de l\'aperçu')
    }
  }

  // ===================== SAVE =====================

  const handleSave = async ({ publish = false } = {}) => {
    if (!clientMode && !templateName.trim()) {
      toast.error('Veuillez entrer un nom pour le template')
      setActivePanel('settings')
      return
    }
    if (!clientMode && !(parseFloat(pricePerInvitation) > 0)) {
      toast.error('Veuillez définir un prix par invitation supérieur à 0')
      setActivePanel('settings')
      return
    }
    if (!clientMode && !backgroundUrl) {
      toast.error("Veuillez d'abord choisir une image de fond")
      setActivePanel('background')
      return
    }
    if (!elements || elements.length === 0) {
      toast.error('Le template doit contenir au moins un élément')
      return
    }

    setSaving(true)
    try {
      // Ensure all element properties are preserved
      const cleanElements = elements.map(el => ({
        id: el.id,
        type: el.type,
        label: el.label,
        content: el.content,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        fontSize: el.fontSize ?? 16,
        fontFamily: el.fontFamily || 'Montserrat',
        fontWeight: el.fontWeight ?? 'normal',
        fontStyle: el.fontStyle ?? 'normal',
        color: el.color || '#000000',
        textAlign: el.textAlign ?? 'center',
        verticalAlign: el.verticalAlign ?? 'middle',
        visible: el.visible ?? true,
        letterSpacing: el.letterSpacing ?? 0,
        lineHeight: el.lineHeight ?? 1.2,
        textTransform: el.textTransform ?? 'none',
        locked: el.locked ?? false,
        textShadow: el.textShadow ?? 'none',
        shadowColor: el.shadowColor ?? '#000000',
        zIndex: el.zIndex ?? 0,
        dateFormat: el.dateFormat || 'datetime',  // Per-element date variable format
        timeFormat: el.timeFormat || 'colon',  // Per-element time variable format
        calendarMarker: el.calendarMarker || 'circle',  // Visual calendar: highlighted-day marker
        calendarMarkerUrl: el.calendarMarkerUrl || '',
        calendarMarkerSize: el.calendarMarkerSize ?? 1,
        curve: el.curve ?? 0,  // Arc/curved text amount (-100..100)
        autoFit: el.autoFit ?? false,  // Shrink long text to fit the box
        iconUrl: el.iconUrl || '',  // Preserve icon URLs for programme labels and decorative images
        iconName: el.iconName || '',  // Library icon name (for re-coloring)
        iconColor: el.iconColor || '',
        // Photo/image element styling (border/opacity/radius/cadrage/forme)
        objectFit: el.objectFit || 'cover',
        objectPosition: el.objectPosition || 'center',
        imageScale: el.imageScale ?? 100,
        rotation: el.rotation ?? 0,
        opacity: el.opacity ?? 100,
        borderWidth: el.borderWidth ?? 0,
        borderColor: el.borderColor || '#FFFFFF',
        borderOpacity: el.borderOpacity ?? 100,
        borderRadius: el.borderRadius ?? 0,
        shape: el.shape || 'rect',
        customClipPath: el.customClipPath || '',  // Free-form shape (clip-path CSS)
        // Decorative shape elements (rect / circle / line)
        shapeKind: el.shapeKind || 'rect',
        fillColor: el.fillColor || '#df6746',
        fillOpacity: el.fillOpacity ?? 100,
        lineThickness: el.lineThickness ?? 2,
        // Map / location element
        mapLabel: el.mapLabel || '',
        mapPlaceholder: el.mapPlaceholder || '',
        mapAddress: el.mapAddress || '',
        // QR / barcode element styling (applied to generated invitations)
        codeType: el.codeType || 'qr',
        qrColor: el.qrColor || '#000000',
        qrBgColor: el.qrBgColor || '#FFFFFF',
        qrTransparentBg: el.qrTransparentBg ?? false,
        // Per-element animation (played only on the public invitation view)
        animation: el.animation || null,
        // Gradient fill (text & shapes) — mirrored on generated invitations/PDF
        gradient: el.gradient ?? false,
        gradientFrom: el.gradientFrom || '',
        gradientTo: el.gradientTo || '',
        gradientAngle: el.gradientAngle ?? 90,
        gradientType: el.gradientType || 'linear'
      }))

      // Debug: verify clean elements
      if (cleanElements.length === 0) {
        console.error('ERROR: cleanElements is empty after mapping!')
        toast.error('Erreur: Aucun élément à sauvegarder')
        setSaving(false)
        return
      }

      console.log('Clean elements created successfully:', {
        count: cleanElements.length,
        first: cleanElements[0],
        last: cleanElements[cleanElements.length - 1]
      })

      const templateData = {
        name: templateName.trim(),
        description: templateDescription,
        category: templateCategory,
        eventType: templateEventType,
        isPremium,
        pricePerInvitation: parseFloat(pricePerInvitation) || 0,
        backgroundUrl,
        backgroundOpacity,
        previewImage: previewImage || backgroundUrl, // Use preview image or fallback to background
        designElements: cleanElements, // Required at root level for POST /templates endpoint
        canvasWidth,
        canvasHeight,
        margins,
        selectedFormat,
        // Publish → make it visible to clients; otherwise leave the draft state
        // untouched (new templates default to unpublished on the backend).
        ...(publish ? { isActive: true } : {}),
        config: {
          designElements: cleanElements,
          backgroundImage: backgroundUrl,
          backgroundOpacity,
          canvasWidth,
          canvasHeight,
          margins,
          selectedFormat,
          palette
        }
      }

      console.log('Template data to send:', templateData)

      if (clientMode) {
        // Client saves via design endpoint (owner permission)
        await templateAPI.saveDesign(templateId, {
          designElements: cleanElements,
          backgroundImage: backgroundUrl,
          backgroundOpacity,
          canvasWidth,
          canvasHeight,
          margins,
          selectedFormat,
          palette
        })
        queryClient.invalidateQueries(['admin-template', templateId])
        toast.success('Template sauvegardé avec succès !')
      } else if (isEditing) {
        // Update existing
        console.log('Updating template:', templateId)
        await adminAPI.updateTemplate(templateId, templateData)
        // Invalidate cache to ensure fresh data
        queryClient.invalidateQueries(['admin-template', templateId])
        queryClient.invalidateQueries(['admin-templates'])
        toast.success(publish ? 'Template publié — visible par les clients !' : 'Template mis à jour !')
      } else {
        // Create new
        console.log('Creating new template')
        const res = await adminAPI.createTemplate(templateData)
        console.log('Template created response:', res.data)
        
        const newId = res.data.template?.id
        if (newId) {
          // Immediately invalidate the new template's cache so it loads fresh from backend
          queryClient.invalidateQueries(['admin-template', newId])
          queryClient.invalidateQueries(['admin-templates'])
          
          toast.success(publish ? 'Template publié — visible par les clients !' : 'Template créé (brouillon).')
          console.log('Redirecting to template:', newId)
          navigate(`/admin/templates/${newId}/design`, { replace: true })
        } else {
          toast.error('Erreur: ID du template non reçu')
        }
      }
    } catch (err) {
      console.error('Erreur sauvegarde complète:', err)
      console.error('Response data:', err.response?.data)
      console.error('Error message:', err.message)
      const errorMessage = err.response?.data?.error || err.message || 'Erreur lors de la sauvegarde'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  // ===================== RENDER ELEMENT CONTENT =====================

  const renderElementContent = (el) => {

    // Decorative shape (rectangle / circle / line) — no text content.
    if (el.type === 'shape') {
      return <ShapeElement el={el} />
    }

    // Map / location card (static preview in the editor).
    if (el.type === 'map') {
      return <div className="w-full h-full" style={{ fontSize: Math.max(9, Math.round((el.width || 320) / 26)) }}><MapElement el={el} /></div>
    }

    // Helper pour formater une date en JJ-MM-YYYY HH:mm
    function formatDateTime(str) {
      if (!str) return '';
      // Essaye de parser les formats "2026-02-10 20:00" ou "2026-02-10T20:00"
      let d = str.includes('T') ? new Date(str) : new Date(str.replace(' ', 'T'));
      if (isNaN(d.getTime())) return str;
      const pad = n => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    // Calendar (visual) date format — render a mini month calendar with the
    // event day highlighted instead of a text date.
    if (el.dateFormat === 'calendar' && !['qrcode', 'photo', 'image'].includes(el.type)) {
      const dk = getElementDateKey(el.content)
      if (dk) {
        const base = Math.max(6, Math.round((el.width || 220) / 18))
        return (
          <div className="w-full h-full" style={{ fontSize: base, fontFamily: `'${el.fontFamily}', serif` }}>
            <MiniCalendar date={SAMPLE_RAW_DATES[dk]} accent={el.color || '#df6746'} textColor={el.color || '#1f2937'} marker={el.calendarMarker || 'circle'} markerUrl={el.calendarMarkerUrl || ''} markerSize={el.calendarMarkerSize || 1} />
          </div>
        )
      }
    }

    let text = el.content || '';
    // Date variables first, using THIS element's chosen format with a parseable
    // sample date (so the format selector visibly changes the preview).
    DATE_VARIABLE_KEYS.forEach((key) => {
      if (text.includes(`{{${key}}}`)) {
        text = text.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          formatEventDate(SAMPLE_RAW_DATES[key], el.dateFormat || DEFAULT_DATE_FORMAT)
        );
      }
    });
    // Time variables, using THIS element's chosen time format.
    TIME_VARIABLE_KEYS.forEach((key) => {
      if (text.includes(`{{${key}}}`)) {
        text = text.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          formatEventTime(SAMPLE_DATA[key], el.timeFormat || DEFAULT_TIME_FORMAT)
        );
      }
    });
    // Remaining (non-date, non-time) variables from the sample data.
    Object.entries(SAMPLE_DATA).forEach(([key, val]) => {
      if (DATE_VARIABLE_KEYS.includes(key) || TIME_VARIABLE_KEYS.includes(key)) return;
      text = text.replace(new RegExp(`\\{\\{${key}\\}\}`, 'g'), String(val || ''));
    });

    if (el.type === 'qrcode') {
      const qrColor = el.qrColor || '#000000'
      const transparent = !!el.qrTransparentBg
      const qrBg = transparent ? 'transparent' : (el.qrBgColor || '#FFFFFF')
      const isBarcode = (el.codeType || 'qr') === 'barcode'
      const bgStyle = {
        backgroundColor: qrBg,
        backgroundImage: transparent
          ? 'linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)'
          : 'none',
        backgroundSize: '10px 10px',
        backgroundPosition: '0 0,0 5px,5px -5px,-5px 0',
        // Rotation is applied on the element wrapper (so the selection frame
        // rotates with it) — not here, to avoid double rotation.
      }
      if (isBarcode) {
        // Barcode placeholder — vertical bars of varying widths.
        const bars = [2,1,3,1,2,4,1,2,1,3,2,1,4,1,2,3,1,2,1,3,2,4,1,2,1,3,1,2]
        return (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 rounded-lg px-2" style={bgStyle}>
            <div className="flex items-end h-3/4 w-full justify-center gap-[2px]">
              {bars.map((w, i) => (
                <span key={i} style={{ width: w, height: '100%', backgroundColor: qrColor, display: 'inline-block' }} />
              ))}
            </div>
          </div>
        )
      }
      return (
        <div className="w-full h-full flex items-center justify-center rounded-lg" style={bgStyle}>
          <svg className="w-3/4 h-3/4" viewBox="0 0 24 24" fill="none" stroke={qrColor}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 14.625v2.25m0 3v.75m3-3h.75m-6 0h.75m3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-3.75 3.75a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
      )
    }

    // Image placeholder (ex: photo des mariés, rempli par le client) or a
    // fixed decorative image uploaded by the admin - both support shapes
    // (rectangle/cercle/hexagone/losange/octogone/étoile) via clip-path.
    if (el.type === 'photo' || el.type === 'image') {
      const clipPath = getClipPath(el.shape, el.customClipPath)
      const borderColor = hexToRgba(el.borderColor || '#FFFFFF', el.borderOpacity ?? 100)
      const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
      const imgSrc = el.type === 'image' && el.iconUrl
        ? (el.iconUrl.startsWith('data:') || el.iconUrl.startsWith('http') ? el.iconUrl : `${apiBase}${el.iconUrl}`)
        : null
      const outerStyle = clipPath
        ? { clipPath, background: el.borderWidth ? borderColor : 'transparent', padding: el.borderWidth || 0, boxSizing: 'border-box' }
        : { border: `${el.borderWidth || 0}px solid ${borderColor}`, borderRadius: `${el.borderRadius || 0}px`, boxSizing: 'border-box' }

      // No gray placeholder fill once a real image is set - many decorative
      // uploads (PNG logos, ornaments) rely on transparency.
      const placeholderBg = imgSrc ? '' : 'bg-gray-100'
      return (
        <div className={`w-full h-full overflow-hidden ${placeholderBg} flex items-center justify-center`} style={outerStyle}>
          <div className={`w-full h-full overflow-hidden ${placeholderBg} flex items-center justify-center`} style={clipPath ? { clipPath } : undefined}>
            {imgSrc ? (
              <img src={imgSrc} alt="" style={getImageStyle(el)} />
            ) : (
              <div className="text-center text-gray-400">
                <PhotoIcon className="h-8 w-8 mx-auto mb-1" />
                <span className="text-[10px]">{el.type === 'image' ? 'Cliquez pour ajouter une image' : 'Photo des mariés'}</span>
              </div>
            )}
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
            alignItems: el.verticalAlign === 'top' ? 'flex-start' : el.verticalAlign === 'bottom' ? 'flex-end' : 'center',
            gap: '6px',
            justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
            lineHeight: el.lineHeight || 1.2,
            ...(textGradientStyle(el) || {})
          }}
        >
          <img src={iconSrc} alt="" className="inline-block flex-shrink-0" style={{ height: `${el.fontSize + 4}px`, width: `${el.fontSize + 4}px`, objectFit: 'contain' }} />
          {text}
        </span>
      )
    }

    // Rotation is applied on the element wrapper (so the selection frame rotates
    // with the content) — see the canvas element <div>. Not applied here.

    // Curved (arc) text
    if (hasArc(el)) {
      return (
        <div className="w-full h-full">
          <CurvedText el={el} text={text} />
        </div>
      )
    }

    const textStyle = {
      fontFamily: el.fontFamily,
      fontSize: `${el.fontSize}px`,
      fontWeight: el.fontWeight,
      fontStyle: el.fontStyle,
      color: el.color,
      textAlign: el.textAlign,
      letterSpacing: `${el.letterSpacing || 0}px`,
      textTransform: el.textTransform || 'none',
      display: 'flex',
      alignItems: el.verticalAlign === 'top' ? 'flex-start' : el.verticalAlign === 'bottom' ? 'flex-end' : 'center',
      justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
      textShadow: el.textShadow && el.textShadow !== 'none' ? `${el.textShadow} ${el.shadowColor || '#000000'}` : 'none',
      lineHeight: el.lineHeight || 1.2,
      ...(textGradientStyle(el) || {})
    }
    const textClass = 'block w-full h-full overflow-visible whitespace-pre-wrap break-words leading-tight'

    if (el.autoFit) {
      return <AutoFitText text={text} fontSize={el.fontSize} className={textClass} style={textStyle} />
    }

    return (
      <span className={textClass} style={textStyle}>
        {text}
      </span>
    )
  }

  // ===================== LOADING STATE =====================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // ===================== RENDER =====================

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Google Fonts + custom uploaded fonts (dropdown preview + canvas) */}
      <FontStyles />

      {/* Font import modal — family name + weight + style */}
      {fontModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm" onClick={() => !fontUploading && setFontModal(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg font-bold text-gray-900">Importer une police</h3>
            <p className="mt-0.5 text-xs text-gray-500 truncate">Fichier : {fontModal.file?.name}</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nom de la famille</label>
                <input
                  type="text"
                  value={fontModal.family}
                  onChange={(e) => setFontModal(m => ({ ...m, family: e.target.value }))}
                  placeholder="ex : Great Vibes"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-[11px] text-gray-400">Gardez le même nom pour ajouter d'autres graisses à cette famille.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Graisse</label>
                  <select
                    value={fontModal.weight}
                    onChange={(e) => setFontModal(m => ({ ...m, weight: parseInt(e.target.value, 10) }))}
                    className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={100}>100 — Thin</option>
                    <option value={200}>200 — ExtraLight</option>
                    <option value={300}>300 — Light</option>
                    <option value={400}>400 — Regular</option>
                    <option value={500}>500 — Medium</option>
                    <option value={600}>600 — SemiBold</option>
                    <option value={700}>700 — Bold</option>
                    <option value={800}>800 — ExtraBold</option>
                    <option value={900}>900 — Black</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Style</label>
                  <select
                    value={fontModal.style}
                    onChange={(e) => setFontModal(m => ({ ...m, style: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="italic">Italique</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setFontModal(null)} disabled={fontUploading} className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Annuler</button>
              <button onClick={submitFontUpload} disabled={fontUploading || !fontModal.family.trim()} className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50">
                {fontUploading ? 'Import…' : 'Importer'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Top Bar */}
      <div className="bg-white/95 backdrop-blur border-b border-gray-200 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <button onClick={handleExit} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors shrink-0" title="Retour">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate leading-tight">
              {clientMode ? 'Personnaliser mon template' : isEditing ? 'Modifier le template' : 'Créer un template'}
            </h1>
            <p className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
                {!backgroundUrl ? '1' : !templateName ? '2' : '3'}
              </span>
              {!backgroundUrl
                ? 'Définissez le format, puis chargez une image de fond'
                : !templateName
                  ? 'Positionnez les éléments puis renseignez le nom'
                  : 'Positionnez les éléments et sauvegardez'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Zoom */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setZoom(z => Math.max(0.3, +(z - 0.1).toFixed(2)))} className="w-7 h-7 rounded-lg hover:bg-white text-gray-600 flex items-center justify-center transition-colors" title="Dézoomer"><MinusIcon className="h-4 w-4" /></button>
            <button onClick={() => setZoom(0.65)} className="text-xs font-semibold w-11 text-center text-gray-700 tabular-nums hover:text-primary-600 transition-colors" title="Réinitialiser le zoom">{Math.round(zoom * 100)}%</button>
            <button onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))} className="w-7 h-7 rounded-lg hover:bg-white text-gray-600 flex items-center justify-center transition-colors" title="Zoomer"><PlusIcon className="h-4 w-4" /></button>
          </div>

          <div className="hidden sm:block w-px h-6 bg-gray-200" />

          {/* Undo / Redo */}
          <div className="hidden sm:flex items-center gap-0.5">
            <button
              onClick={undo}
              disabled={!history.canUndo}
              className="p-2 rounded-xl text-gray-500 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Annuler (Ctrl+Z)"
            >
              <ArrowUturnLeftIcon className="h-5 w-5" />
            </button>
            <button
              onClick={redo}
              disabled={!history.canRedo}
              className="p-2 rounded-xl text-gray-500 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Rétablir (Ctrl+Y)"
            >
              <ArrowUturnRightIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="hidden sm:block w-px h-6 bg-gray-200" />

          {/* Grid */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`hidden sm:block p-2 rounded-xl transition-colors ${showGrid ? 'bg-primary-50 text-primary-600 ring-1 ring-primary-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="Grille d'alignement"
          >
            <Squares2X2Icon className="h-5 w-5" />
          </button>

          {/* Animation preview */}
          <button
            onClick={() => { setPreviewAnim(p => !p); setPreviewKey(k => k + 1) }}
            className={`hidden sm:flex px-3 py-2 rounded-xl text-sm font-medium items-center gap-1.5 transition-colors ${previewAnim ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'}`}
            title="Prévisualiser les animations (comme sur l'invitation publiée)"
          >
            {previewAnim ? <StopIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
            <span className="hidden sm:inline">{previewAnim ? 'Arrêter' : 'Aperçu anim.'}</span>
          </button>
          {previewAnim && (
            <button
              onClick={() => setPreviewKey(k => k + 1)}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
              title="Rejouer les animations"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          )}

          {/* Reset */}
          <button onClick={resetLayout} className="hidden sm:block p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Réinitialiser les éléments">
            <ArrowPathIcon className="h-5 w-5" />
          </button>

          <div className="hidden sm:block w-px h-6 bg-gray-200" />

          {/* Save (draft) */}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl disabled:opacity-50 font-semibold text-sm transition-colors ${clientMode ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/25' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            {saving ? (
              <div className={`w-4 h-4 border-2 ${clientMode ? 'border-white' : 'border-gray-500'} border-t-transparent rounded-full animate-spin`} />
            ) : (
              <CheckIcon className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{clientMode ? 'Sauvegarder' : 'Enregistrer le brouillon'}</span>
            <span className="sm:hidden">{clientMode ? 'Save' : 'Brouillon'}</span>
          </button>

          {/* Publish (admin only) — primary action, brand orange */}
          {!clientMode && (
            <button
              onClick={() => handleSave({ publish: true })}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 font-semibold text-sm shadow-sm shadow-primary-600/25 transition-colors"
              title="Enregistrer et rendre visible aux clients"
            >
              <SparklesIcon className="h-4 w-4" />
              Publier
            </button>
          )}
        </div>
      </div>

      {/* Mobile hint — the editor is designed for desktop */}
      <div className="lg:hidden shrink-0 bg-amber-50 border-b border-amber-100 px-3 py-1.5 text-[11px] text-amber-700 text-center flex items-center justify-center gap-1.5">
        <ComputerDesktopIcon className="h-3.5 w-3.5 shrink-0" />
        Éditeur optimisé pour ordinateur — certains outils sont masqués sur mobile.
      </div>

      {/* Main Area — stacks vertically on mobile (panel on top, canvas below) */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Collapsed rail - thin strip with the panel tabs as icons + expand button */}
        {panelCollapsed && (
          <div className="w-12 bg-white border-r flex flex-col items-center py-2 gap-1 shrink-0">
            <button
              onClick={() => setPanelCollapsed(false)}
              className="p-2 mb-1 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
              title="Afficher le panneau"
            >
              <ChevronDoubleRightIcon className="h-5 w-5" />
            </button>
            {PANEL_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActivePanel(tab.id); setPanelCollapsed(false) }}
                className={`p-2 rounded-lg transition-colors ${activePanel === tab.id ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                title={tab.label}
              >
                <tab.icon className="h-5 w-5" />
              </button>
            ))}
          </div>
        )}

        {/* Left Panel */}
        <div className={`${panelCollapsed ? 'hidden' : 'w-full lg:w-72 max-h-[45vh] lg:max-h-none'} bg-white border-b lg:border-b-0 lg:border-r flex flex-col shrink-0 overflow-hidden`}>
          {/* Panel Tabs — segmented control */}
          <div className="flex items-center gap-1.5 p-2 border-b">
            <div className="flex-1 grid grid-cols-5 gap-0.5 bg-gray-100/80 rounded-xl p-1">
              {PANEL_TABS.map(tab => {
                const active = activePanel === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActivePanel(tab.id)}
                    className={`flex flex-col items-center gap-1 py-1.5 rounded-lg text-[10px] font-medium leading-none whitespace-nowrap transition-all ${
                      active ? 'bg-white text-primary-700 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title={tab.label}
                  >
                    <tab.icon className={`h-[18px] w-[18px] ${active ? 'text-primary-600' : 'text-gray-400'}`} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setPanelCollapsed(true)}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg shrink-0"
              title="Masquer le panneau"
            >
              <ChevronDoubleLeftIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Format Panel */}
          {activePanel === 'format' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Format de l'invitation</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Définissez les dimensions et marges de votre invitation. L'image de fond s'adaptera à ce format.
                </p>

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

              <hr className="border-gray-100" />

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
                        // Clamp only the max while typing so intermediate digits
                        // (e.g. "8" then "80" then "800") aren't snapped to the min.
                        const v = parseInt(e.target.value, 10)
                        if (!Number.isNaN(v)) setCanvasWidth(Math.min(MAX_CANVAS_DIMENSION, v))
                        setSelectedFormat('custom')
                      }}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10)
                        setCanvasWidth(Math.max(MIN_CANVAS_DIMENSION, Math.min(MAX_CANVAS_DIMENSION, Number.isNaN(v) ? MIN_CANVAS_DIMENSION : v)))
                      }}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                        const v = parseInt(e.target.value, 10)
                        if (!Number.isNaN(v)) setCanvasHeight(Math.min(MAX_CANVAS_DIMENSION, v))
                        setSelectedFormat('custom')
                      }}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10)
                        setCanvasHeight(Math.max(MIN_CANVAS_DIMENSION, Math.min(MAX_CANVAS_DIMENSION, Number.isNaN(v) ? MIN_CANVAS_DIMENSION : v)))
                      }}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Ratio: {(canvasWidth/canvasHeight).toFixed(3)} {canvasWidth === canvasHeight ? '(Carré)' : canvasWidth > canvasHeight ? '(Paysage)' : '(Portrait)'}
                </p>
              </div>

              <hr className="border-gray-100" />

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Marges (px)</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Zone de sécurité intérieure affichée sur le canevas.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Haut</label>
                    <input type="number" min={0} max={Math.floor(canvasHeight / 3)} value={margins.top}
                      onChange={(e) => setMargins(m => ({ ...m, top: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Bas</label>
                    <input type="number" min={0} max={Math.floor(canvasHeight / 3)} value={margins.bottom}
                      onChange={(e) => setMargins(m => ({ ...m, bottom: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Gauche</label>
                    <input type="number" min={0} max={Math.floor(canvasWidth / 3)} value={margins.left}
                      onChange={(e) => setMargins(m => ({ ...m, left: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Droite</label>
                    <input type="number" min={0} max={Math.floor(canvasWidth / 3)} value={margins.right}
                      onChange={(e) => setMargins(m => ({ ...m, right: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[
                    { label: 'Aucune', t: 0, r: 0, b: 0, l: 0 },
                    { label: '20px', t: 20, r: 20, b: 20, l: 20 },
                    { label: '40px', t: 40, r: 40, b: 40, l: 40 },
                    { label: '60px', t: 60, r: 60, b: 60, l: 60 },
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

              <hr className="border-gray-100" />

              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-1">📐 Résumé</p>
                <div className="text-[11px] text-blue-600 space-y-0.5">
                  <p>Dimensions : {canvasWidth} × {canvasHeight} px</p>
                  <p>Zone utile : {canvasWidth - margins.left - margins.right} × {canvasHeight - margins.top - margins.bottom} px</p>
                  <p>Marges : {margins.top} / {margins.right} / {margins.bottom} / {margins.left} px</p>
                </div>
              </div>

              <button
                onClick={() => setActivePanel('background')}
                className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Suivant : Charger l'image de fond →
              </button>
            </div>
          )}

          {/* Background Panel */}
          {activePanel === 'background' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Image de fond</h3>
                <p className="text-xs text-gray-500 mt-1">
                  L'image s'adapte automatiquement au format défini ({canvasWidth}×{canvasHeight} px).
                </p>
              </div>

              {/* Format reminder */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="text-[11px] text-amber-700">
                  📐 Format : <span className="font-medium">{canvasWidth} × {canvasHeight} px</span>
                  {margins.top + margins.right + margins.bottom + margins.left > 0 && (
                    <span> · Marges : {margins.top}/{margins.right}/{margins.bottom}/{margins.left}</span>
                  )}
                </p>
              </div>

              {/* Current background preview */}
              {backgroundUrl && (
                <div className="relative rounded-lg overflow-hidden border shadow-sm bg-gray-100">
                  <div style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}`, maxHeight: '280px', margin: '0 auto' }} className="wysiwyg-canvas relative bg-white">
                    <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${backgroundUrl}`} alt="Fond" className="w-full h-full object-contain" />
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => setBackgroundUrl('')}
                      className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center gap-2 p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors"
              >
                {uploading ? (
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowUpTrayIcon className="h-10 w-10 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-600">
                  {backgroundUrl ? 'Changer l\'image' : 'Charger une image de fond'}
                </span>
                <span className="text-xs text-gray-400">JPG, PNG, WebP (max 10 Mo)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBackgroundUpload}
                className="hidden"
              />

              {/* Opacity */}
              {backgroundUrl && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Opacité du fond ({backgroundOpacity}%)
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={backgroundOpacity}
                    onChange={(e) => setBackgroundOpacity(parseInt(e.target.value))}
                    className="w-full accent-primary-600"
                  />
                </div>
              )}

              {/* Extracted palette from the background image */}
              {backgroundUrl && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">🎨 Palette de l'image</label>
                    <button
                      onClick={reextractPalette}
                      disabled={extracting}
                      className="text-[11px] text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                    >
                      {extracting ? 'Analyse…' : palette.length ? 'Ré-extraire' : 'Extraire les couleurs'}
                    </button>
                  </div>
                  {palette.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {palette.map((c) => (
                        <button
                          key={c}
                          onClick={() => { navigator.clipboard?.writeText(c); toast.success(`${c} copié`) }}
                          className="w-7 h-7 rounded-lg border border-gray-200 hover:scale-110 transition-transform shadow-sm"
                          style={{ backgroundColor: c }}
                          title={`${c} — cliquer pour copier`}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400">Les couleurs dominantes de l'image apparaîtront ici, réutilisables sur vos textes.</p>
                  )}
                </div>
              )}

              {backgroundUrl && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-700 font-medium">Image chargée</p>
                  <p className="text-xs text-green-600 mt-1">
                    Passez maintenant à l'onglet "Éléments" pour positionner les textes sur l'image.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Elements Panel */}
          {activePanel === 'elements' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Éléments</h3>
                <div className="flex items-center gap-2">
                  <button onClick={addCustomText} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                    <PlusIcon className="h-3.5 w-3.5" />
                    Texte
                  </button>
                  <button onClick={addPhotoElement} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                    <PhotoIcon className="h-3.5 w-3.5" />
                    Photo
                  </button>
                  <button onClick={addImageElement} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                    <PhotoIcon className="h-3.5 w-3.5" />
                    Image
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-400 mb-3">
                Cliquez sur un élément pour le sélectionner. Utilisez Ctrl+Clic pour la sélection multiple.
              </p>

              {/* ===== Decorative shapes ===== */}
              <div className="border border-gray-200 rounded-lg p-2.5 mb-3">
                <div className="flex items-center gap-1 mb-2">
                  <RectangleGroupIcon className="h-4 w-4 text-primary-500" />
                  <h4 className="text-xs font-semibold text-gray-700">Formes & traits</h4>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button onClick={() => addShapeElement('rect')} className="flex flex-col items-center gap-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                    <RectangleGroupIcon className="h-5 w-5" />
                    <span className="text-[11px] font-medium">Rectangle</span>
                  </button>
                  <button onClick={() => addShapeElement('circle')} className="flex flex-col items-center gap-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                    <span className="h-5 w-5 rounded-full border-2 border-current" />
                    <span className="text-[11px] font-medium">Cercle</span>
                  </button>
                  <button onClick={() => addShapeElement('line')} className="flex flex-col items-center gap-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                    <MinusIcon className="h-5 w-5" />
                    <span className="text-[11px] font-medium">Ligne</span>
                  </button>
                </div>
                <button onClick={addMapElement} className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                  <MapPinIcon className="h-5 w-5" />
                  <span className="text-[11px] font-medium">Carte / Localisation</span>
                </button>
              </div>

              {/* ===== Element library: icons (Iconify) + emojis ===== */}
              <div className="border border-gray-200 rounded-lg p-2.5 mb-3 bg-gradient-to-br from-primary-50/40 to-white">
                <div className="flex items-center gap-1 mb-2">
                  <SparklesIcon className="h-4 w-4 text-primary-500" />
                  <h4 className="text-xs font-semibold text-gray-700">Bibliothèque d'éléments</h4>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() => setLibTab('icons')}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      libTab === 'icons' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <MagnifyingGlassIcon className="h-3.5 w-3.5" /> Icônes
                  </button>
                  <button
                    onClick={() => setLibTab('emoji')}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      libTab === 'emoji' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <FaceSmileIcon className="h-3.5 w-3.5" /> Emojis
                  </button>
                </div>

                {libTab === 'icons' && (
                  <div>
                    {/* Search + color */}
                    <form onSubmit={(e) => { e.preventDefault(); runIconSearch() }} className="flex items-center gap-1.5 mb-2">
                      <input
                        type="text"
                        value={iconQuery}
                        onChange={(e) => setIconQuery(e.target.value)}
                        placeholder="ex: coeur, fleur, anneau…"
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-primary-400 focus:ring-1 focus:ring-primary-200"
                      />
                      <input
                        type="color"
                        value={iconColor}
                        onChange={(e) => setIconColor(e.target.value)}
                        title="Couleur de l'icône"
                        className="w-8 h-8 flex-shrink-0 rounded cursor-pointer border border-gray-200"
                      />
                      <button type="submit" className="flex-shrink-0 px-2.5 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
                        OK
                      </button>
                    </form>

                    {/* Suggestion chips */}
                    {iconResults.length === 0 && !iconLoading && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {ICON_SUGGESTIONS.slice(0, 12).map(s => (
                          <button
                            key={s}
                            onClick={() => { setIconQuery(s); runIconSearch(s) }}
                            className="px-2 py-0.5 text-[11px] border border-gray-200 rounded-full text-gray-600 hover:border-primary-300 hover:bg-primary-50"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}

                    {iconLoading && <p className="text-xs text-gray-400 py-3 text-center">Recherche…</p>}

                    {/* Results grid */}
                    {iconResults.length > 0 && (
                      <div className="grid grid-cols-6 gap-1 max-h-44 overflow-y-auto pr-1">
                        {iconResults.map(name => (
                          <button
                            key={name}
                            onClick={() => addIconElement(name)}
                            disabled={iconAdding === name}
                            title={name}
                            className="aspect-square flex items-center justify-center border border-gray-100 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-40"
                          >
                            <img src={iconPreviewUrl(name, iconColor)} alt={name} className="w-6 h-6" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      Icônes Iconify (libres). L'icône est intégrée au template à sa couleur choisie.
                    </p>
                  </div>
                )}

                {libTab === 'emoji' && (
                  <div className="max-h-52 overflow-y-auto pr-1 space-y-2">
                    {EMOJI_GROUPS.map(group => (
                      <div key={group.label}>
                        <p className="text-[11px] font-medium text-gray-500 mb-1">{group.label}</p>
                        <div className="grid grid-cols-7 gap-1">
                          {group.emojis.map((emoji, i) => (
                            <button
                              key={`${group.label}-${i}`}
                              onClick={() => addEmojiElement(emoji)}
                              className="aspect-square flex items-center justify-center text-lg border border-gray-100 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Multi-select Toolbar */}
              {selectedIds.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-700">{selectedIds.length} élément(s) sélectionné(s)</span>
                    <button
                      onClick={() => setSelectedIds([])}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Désélectionner
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={duplicateSelectedElements}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-blue-200 rounded hover:bg-blue-50 text-blue-700 font-medium transition-colors"
                      title="Dupliquer les éléments sélectionnés"
                    >
                      📋 Dupliquer
                    </button>
                    <button
                      onClick={toggleLockSelected}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-blue-200 rounded hover:bg-blue-50 text-blue-700 font-medium transition-colors"
                      title="Verrouiller/Déverrouiller les éléments sélectionnés"
                    >
                      🔒 Verrouiller
                    </button>
                    <button
                      onClick={toggleVisibilitySelected}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-blue-200 rounded hover:bg-blue-50 text-blue-700 font-medium transition-colors"
                      title="Afficher/Masquer les éléments sélectionnés"
                    >
                      👁️ Visibilité
                    </button>
                    <button
                      onClick={deleteSelectedElements}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-red-200 rounded hover:bg-red-50 text-red-700 font-medium transition-colors"
                      title="Supprimer les éléments sélectionnés"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>

                  {selectionGroupIds.length >= 2 && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <p className="text-[10px] text-blue-600 font-medium mb-1">Alignement ({selectionGroupIds.length} éléments)</p>
                      <div className="grid grid-cols-3 gap-1">
                        <button onClick={() => alignSelected('left')} className="px-2 py-1 text-[11px] bg-white border border-blue-200 rounded hover:bg-blue-50 text-blue-700 font-medium" title="Aligner à gauche">⫷ Gauche</button>
                        <button onClick={() => alignSelected('centerH')} className="px-2 py-1 text-[11px] bg-white border border-blue-200 rounded hover:bg-blue-50 text-blue-700 font-medium" title="Centrer horizontalement">↔ Centre</button>
                        <button onClick={() => alignSelected('right')} className="px-2 py-1 text-[11px] bg-white border border-blue-200 rounded hover:bg-blue-50 text-blue-700 font-medium" title="Aligner à droite">⫸ Droite</button>
                        <button onClick={() => alignSelected('top')} className="px-2 py-1 text-[11px] bg-white border border-blue-200 rounded hover:bg-blue-50 text-blue-700 font-medium" title="Aligner en haut">⤒ Haut</button>
                        <button onClick={() => alignSelected('centerV')} className="px-2 py-1 text-[11px] bg-white border border-blue-200 rounded hover:bg-blue-50 text-blue-700 font-medium" title="Centrer verticalement">↕ Centre</button>
                        <button onClick={() => alignSelected('bottom')} className="px-2 py-1 text-[11px] bg-white border border-blue-200 rounded hover:bg-blue-50 text-blue-700 font-medium" title="Aligner en bas">⤓ Bas</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {elements.map((el) => {
                const isSelected = selectedIds.includes(el.id);
                return (
                  <div
                    key={el.id}
                    onClick={() => {
                      if (selectedId !== el.id) {
                        setSelectedId(el.id);
                        setActivePanel('properties');
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm ${
                      isSelected
                        ? 'bg-primary-100 border-2 border-primary-400 text-primary-800'
                        : selectedId === el.id
                        ? 'bg-primary-50 border border-primary-200 text-primary-700'
                        : 'border border-transparent hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedIds(prev =>
                          isSelected
                            ? prev.filter(id => id !== el.id)
                            : [...prev, el.id]
                        );
                      }}
                      className="rounded cursor-pointer accent-primary-600"
                    />
                    <span className={`shrink-0 ${selectedId === el.id || isSelected ? 'text-primary-500' : 'text-gray-400'}`}>{layerIcon(el)}</span>
                    <span className="flex-1 truncate text-xs">{el.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id) }}
                        className={`p-1 rounded ${el.visible ? 'text-gray-400 hover:text-gray-600' : 'text-red-400'}`}
                      >
                        {el.visible ? <EyeIcon className="h-3.5 w-3.5" /> : <EyeSlashIcon className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLock(el.id) }}
                        className={`p-1 rounded ${el.locked ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {el.locked ? <LockClosedIcon className="h-3.5 w-3.5" /> : <LockOpenIcon className="h-3.5 w-3.5" />}
                      </button>
                      {DELETABLE_TYPES.includes(el.type) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteElement(el.id) }}
                          className="p-1 rounded text-gray-400 hover:text-red-500"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Layers Panel */}
          {activePanel === 'layers' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Calques</h3>
                <span className="text-[11px] text-gray-400">{elements.length} élément(s)</span>
              </div>
              <p className="text-[11px] text-gray-400 -mt-1">Du plus haut (avant) au plus bas (arrière). Cliquez pour sélectionner, double-cliquez le nom pour renommer.</p>
              {elements.length === 0 && <p className="text-xs text-gray-400 py-8 text-center">Aucun élément.</p>}
              <div className="space-y-1">
                {elements.slice().reverse().map((el) => {
                  const idx = elements.findIndex(e => e.id === el.id)
                  const isTop = idx === elements.length - 1
                  const isBottom = idx === 0
                  const selected = selectedId === el.id
                  const canDelete = DELETABLE_TYPES.includes(el.type)
                  return (
                    <div
                      key={el.id}
                      onClick={() => { setSelectedId(el.id); setSelectedIds([]) }}
                      className={`group flex items-center gap-0.5 px-2 py-1.5 rounded-lg border cursor-pointer transition-colors ${selected ? 'border-primary-400 bg-primary-50' : 'border-transparent hover:bg-gray-50'}`}
                    >
                      <span className="text-gray-400 shrink-0">{layerIcon(el)}</span>
                      <input
                        value={el.label || el.type || ''}
                        onChange={(e) => updateElement(el.id, { label: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        className={`flex-1 min-w-0 bg-transparent text-xs truncate outline-none focus:bg-white focus:ring-1 focus:ring-primary-300 rounded px-1 ${el.visible ? 'text-gray-700' : 'text-gray-400 line-through'}`}
                        title="Renommer le calque"
                      />
                      <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, +1) }} disabled={isTop} className="p-1 text-gray-400 hover:text-primary-600 disabled:opacity-20" title="Avancer">
                        <ChevronUpIcon className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, -1) }} disabled={isBottom} className="p-1 text-gray-400 hover:text-primary-600 disabled:opacity-20" title="Reculer">
                        <ChevronDownIcon className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id) }} className="p-1 text-gray-400 hover:text-gray-700" title={el.visible ? 'Masquer' : 'Afficher'}>
                        {el.visible ? <EyeIcon className="h-3.5 w-3.5" /> : <EyeSlashIcon className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleLock(el.id) }} className="p-1 text-gray-400 hover:text-gray-700" title={el.locked ? 'Déverrouiller' : 'Verrouiller'}>
                        {el.locked ? <LockClosedIcon className="h-3.5 w-3.5" /> : <LockOpenIcon className="h-3.5 w-3.5" />}
                      </button>
                      {canDelete && (
                        <button onClick={(e) => { e.stopPropagation(); deleteElement(el.id) }} className="p-1 text-gray-300 hover:text-red-500" title="Supprimer">
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Settings Panel (Template Metadata) */}
          {activePanel === 'settings' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Informations du template</h3>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom du template <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex: Élégance dorée"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Description du template..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <hr className="border-gray-100" />

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Aperçu du template</label>
                {previewImage ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <img
                      src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${previewImage}`}
                      alt="Aperçu"
                      className="w-20 h-28 object-cover rounded border bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 mb-2">Aperçu chargé</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => previewInputRef.current?.click()}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-primary-50"
                        >
                          Changer
                        </button>
                        <button
                          onClick={() => setPreviewImage('')}
                          className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => previewInputRef.current?.click()}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:text-primary-600 hover:border-primary-500 transition-colors"
                  >
                    + Ajouter un aperçu personnalisé
                  </button>
                )}
                <input
                  type="file"
                  ref={previewInputRef}
                  accept="image/*"
                  onChange={handlePreviewUpload}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type d'événement</label>
                <select
                  value={templateEventType}
                  onChange={(e) => handleEventTypeChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type} value={type}>{EVENT_TYPE_LABELS[type]}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Détermine pour quel type d'événement ce template apparaît</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie (style)</label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix par invitation (FC)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={pricePerInvitation}
                  onChange={(e) => setPricePerInvitation(e.target.value)}
                  placeholder="Ex : 2500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Montant facturé au client par invitation générée. À <strong>0</strong>, les invitations de ce template sont gratuites.</p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <input
                  type="checkbox"
                  id="isPremium"
                  checked={isPremium}
                  onChange={(e) => setIsPremium(e.target.checked)}
                  className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="isPremium" className="flex items-center gap-2 cursor-pointer">
                  <StarIcon className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-700">Template Premium</span>
                </label>
              </div>

              <hr className="border-gray-100" />

              <div>
                <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Variables disponibles</h4>
                <div className="text-xs text-gray-500 space-y-1 bg-gray-50 rounded-lg p-3">
                  {Object.entries(SAMPLE_DATA).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <code className="text-primary-600">{`{{${key}}}`}</code>
                      <span className="truncate ml-2 text-gray-400">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Properties Panel (selected element) */}
          {activePanel === 'properties' && (
            <div className="flex-1 overflow-y-auto">
              {selectedElement ? (
                <>
                  <div className="px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600">{layerIcon(selectedElement)}</span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-gray-900">{selectedElement.label}</h3>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">{selectedElement.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-5">
                    {/* ===== Shape element properties ===== */}
                    {selectedElement.type === 'shape' && (
                      <div className="space-y-4">
                        {selectedElement.shapeKind !== 'line' && (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Couleur de remplissage</label>
                              <div className="flex items-center gap-2">
                                <input type="color" value={selectedElement.fillColor || '#df6746'} onChange={(e) => updateElement(selectedId, { fillColor: e.target.value })} className="h-9 w-10 shrink-0 rounded-lg cursor-pointer border border-gray-200" />
                                <input type="text" value={selectedElement.fillColor || '#df6746'} onChange={(e) => updateElement(selectedId, { fillColor: e.target.value })} className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
                              </div>
                              {palette.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {palette.map((c) => (
                                    <button key={c} onClick={() => updateElement(selectedId, { fillColor: c })} className="w-6 h-6 rounded-full border-2 border-gray-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1"><span>Opacité du remplissage</span><span className="text-gray-400">{selectedElement.fillOpacity ?? 100}%</span></label>
                              <input type="range" min="0" max="100" value={selectedElement.fillOpacity ?? 100} onChange={(e) => updateElement(selectedId, { fillOpacity: parseInt(e.target.value) })} className="w-full accent-primary-600" />
                            </div>
                          </>
                        )}
                        {selectedElement.shapeKind === 'line' && (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Couleur du trait</label>
                              <div className="flex items-center gap-2">
                                <input type="color" value={selectedElement.fillColor || '#333333'} onChange={(e) => updateElement(selectedId, { fillColor: e.target.value })} className="h-9 w-10 shrink-0 rounded-lg cursor-pointer border border-gray-200" />
                                <input type="text" value={selectedElement.fillColor || '#333333'} onChange={(e) => updateElement(selectedId, { fillColor: e.target.value })} className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
                              </div>
                            </div>
                            <div>
                              <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1"><span>Épaisseur du trait</span><span className="text-gray-400">{selectedElement.lineThickness ?? 2}px</span></label>
                              <input type="range" min="1" max="40" value={selectedElement.lineThickness ?? 2} onChange={(e) => updateElement(selectedId, { lineThickness: parseInt(e.target.value) })} className="w-full accent-primary-600" />
                            </div>
                          </>
                        )}
                        {/* Gradient (shape) */}
                        <GradientControls
                          el={selectedElement}
                          baseColor={selectedElement.fillColor || (selectedElement.shapeKind === 'line' ? '#333333' : '#df6746')}
                          onChange={(patch) => updateElement(selectedId, patch)}
                        />
                        {selectedElement.shapeKind === 'rect' && (
                          <div>
                            <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1"><span>Arrondi des coins</span><span className="text-gray-400">{selectedElement.borderRadius ?? 0}px</span></label>
                            <input type="range" min="0" max="200" value={selectedElement.borderRadius ?? 0} onChange={(e) => updateElement(selectedId, { borderRadius: parseInt(e.target.value) })} className="w-full accent-primary-600" />
                          </div>
                        )}
                        {selectedElement.shapeKind !== 'line' && (
                          <>
                            <div>
                              <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1"><span>Bordure</span><span className="text-gray-400">{selectedElement.borderWidth ?? 0}px</span></label>
                              <input type="range" min="0" max="30" value={selectedElement.borderWidth ?? 0} onChange={(e) => updateElement(selectedId, { borderWidth: parseInt(e.target.value) })} className="w-full accent-primary-600" />
                            </div>
                            {(selectedElement.borderWidth ?? 0) > 0 && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Couleur de la bordure</label>
                                <div className="flex items-center gap-2">
                                  <input type="color" value={selectedElement.borderColor || '#333333'} onChange={(e) => updateElement(selectedId, { borderColor: e.target.value })} className="h-9 w-10 shrink-0 rounded-lg cursor-pointer border border-gray-200" />
                                  <input type="text" value={selectedElement.borderColor || '#333333'} onChange={(e) => updateElement(selectedId, { borderColor: e.target.value })} className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        <div>
                          <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1"><span>Opacité générale</span><span className="text-gray-400">{selectedElement.opacity ?? 100}%</span></label>
                          <input type="range" min="0" max="100" value={selectedElement.opacity ?? 100} onChange={(e) => updateElement(selectedId, { opacity: parseInt(e.target.value) })} className="w-full accent-primary-600" />
                        </div>
                      </div>
                    )}

                    {/* ===== Map / location element properties ===== */}
                    {selectedElement.type === 'map' && (
                      <div className="space-y-4">
                        <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5 text-[11px] text-blue-700">
                          📍 Carte cliquable : sur l'invitation, un clic ouvre l'itinéraire Google Maps. En ajoutant cet élément, le formulaire de création demandera la <strong>localisation de l'événement</strong>.
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Texte du bouton</label>
                          <input type="text" value={selectedElement.mapLabel || ''} onChange={(e) => updateElement(selectedId, { mapLabel: e.target.value })} placeholder="Voir l'itinéraire" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Couleur d'accent (pin + bouton)</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={selectedElement.color || '#df6746'} onChange={(e) => updateElement(selectedId, { color: e.target.value })} className="h-9 w-10 shrink-0 rounded-lg cursor-pointer border border-gray-200" />
                            <input type="text" value={selectedElement.color || '#df6746'} onChange={(e) => updateElement(selectedId, { color: e.target.value })} className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
                          </div>
                          {palette.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {palette.map((c) => (
                                <button key={c} onClick={() => updateElement(selectedId, { color: c })} className="w-6 h-6 rounded-full border-2 border-gray-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Couleur du fond</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={selectedElement.fillColor || '#ffffff'} onChange={(e) => updateElement(selectedId, { fillColor: e.target.value })} className="h-9 w-10 shrink-0 rounded-lg cursor-pointer border border-gray-200" />
                            <input type="text" value={selectedElement.fillColor || '#ffffff'} onChange={(e) => updateElement(selectedId, { fillColor: e.target.value })} className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
                          </div>
                        </div>
                        <div>
                          <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1"><span>Arrondi des coins</span><span className="text-gray-400">{selectedElement.borderRadius ?? 16}px</span></label>
                          <input type="range" min="0" max="40" value={selectedElement.borderRadius ?? 16} onChange={(e) => updateElement(selectedId, { borderRadius: parseInt(e.target.value) })} className="w-full accent-primary-600" />
                        </div>
                      </div>
                    )}

                    {!['shape', 'map'].includes(selectedElement.type) && (<>
                    {/* Content */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Contenu</label>
                      {selectedElement.type === 'qrcode' ? (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-400 italic">
                            Le contenu est généré automatiquement. Définissez ci-dessous le <strong>type</strong> et le <strong>style</strong> — appliqués aux invitations de ce template.
                          </p>
                          {/* Code type: QR or Barcode */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Type de code</label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[{ id: 'qr', label: 'QR code' }, { id: 'barcode', label: 'Code-barres' }].map(opt => {
                                const active = (selectedElement.codeType || 'qr') === opt.id
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => updateElement(selectedId, { codeType: opt.id })}
                                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${active ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                  >
                                    {opt.label}
                                  </button>
                                )
                              })}
                            </div>
                            {(selectedElement.codeType || 'qr') === 'barcode' && (
                              <p className="mt-1 text-[11px] text-amber-600">Astuce : privilégiez un format large (paysage) pour un code-barres lisible.</p>
                            )}
                          </div>
                          {/* Color */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Couleur {(selectedElement.codeType || 'qr') === 'barcode' ? 'des barres' : 'du QR'}</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={selectedElement.qrColor || '#000000'}
                                onChange={(e) => updateElement(selectedId, { qrColor: e.target.value })}
                                className="h-9 w-10 shrink-0 cursor-pointer rounded border-0"
                              />
                              <input
                                type="text"
                                value={selectedElement.qrColor || '#000000'}
                                onChange={(e) => updateElement(selectedId, { qrColor: e.target.value })}
                                className="w-full rounded-lg border px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                          </div>
                          {/* QR background */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Arrière-plan du QR</label>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateElement(selectedId, { qrTransparentBg: false })}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${!selectedElement.qrTransparentBg ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                              >
                                Couleur
                              </button>
                              <button
                                type="button"
                                onClick={() => updateElement(selectedId, { qrTransparentBg: true })}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${selectedElement.qrTransparentBg ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                              >
                                Transparent
                              </button>
                              {!selectedElement.qrTransparentBg && (
                                <input
                                  type="color"
                                  value={selectedElement.qrBgColor || '#FFFFFF'}
                                  onChange={(e) => updateElement(selectedId, { qrBgColor: e.target.value })}
                                  className="h-9 w-10 shrink-0 cursor-pointer rounded border-0"
                                  title="Couleur de fond du QR"
                                />
                              )}
                            </div>
                            <p className="mt-1 text-[11px] text-gray-400">Transparent : idéal sur un fond d'invitation coloré.</p>
                          </div>
                          {/* Rotation */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Rotation ({selectedElement.rotation ?? 0}°)</label>
                            <input
                              type="range" min="-180" max="180"
                              value={selectedElement.rotation ?? 0}
                              onChange={(e) => updateElement(selectedId, { rotation: parseInt(e.target.value) })}
                              className="w-full accent-primary-600"
                            />
                            <div className="mt-1 flex gap-1">
                              {[0, 90, 180, 270].map(deg => (
                                <button
                                  key={deg}
                                  type="button"
                                  onClick={() => updateElement(selectedId, { rotation: deg > 180 ? deg - 360 : deg })}
                                  className="flex-1 rounded-md border border-gray-200 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                                >
                                  {deg}°
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : selectedElement.type === 'photo' ? (
                        <p className="text-xs text-gray-400 italic">L'image est fournie par le client, pas de contenu texte ici</p>
                      ) : selectedElement.type === 'image' ? (
                        <p className="text-xs text-gray-400 italic">Image fixe décorative, pas de contenu texte ici</p>
                      ) : (
                        <textarea
                          value={selectedElement.content}
                          onChange={(e) => updateElement(selectedId, { content: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          rows={2}
                        />
                      )}
                    </div>

                    {/* Date format — only for text elements containing a date variable */}
                    {!['qrcode', 'photo', 'image'].includes(selectedElement.type) && containsDateVariable(selectedElement.content) && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Format de date</label>
                        <select
                          value={selectedElement.dateFormat || DEFAULT_DATE_FORMAT}
                          onChange={(e) => updateElement(selectedId, { dateFormat: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {DATE_FORMAT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label} — {opt.example}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">S'applique aux variables date (ex. {'{{wedding_date}}'}).</p>
                      </div>
                    )}

                    {/* Calendar day marker — only when the calendar (visual) format is chosen */}
                    {!['qrcode', 'photo', 'image'].includes(selectedElement.type) && containsDateVariable(selectedElement.content) && selectedElement.dateFormat === 'calendar' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Marqueur du jour</label>
                        <select
                          value={selectedElement.calendarMarker || 'circle'}
                          onChange={(e) => updateElement(selectedId, { calendarMarker: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {CALENDAR_MARKER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">Entoure le jour de l'événement. La forme reprend la couleur du texte.</p>

                        {selectedElement.calendarMarker === 'image' && (
                          <div className="mt-2">
                            {selectedElement.calendarMarkerUrl ? (
                              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
                                <img
                                  src={selectedElement.calendarMarkerUrl.startsWith('data:') || selectedElement.calendarMarkerUrl.startsWith('http') ? selectedElement.calendarMarkerUrl : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${selectedElement.calendarMarkerUrl}`}
                                  alt="Marqueur"
                                  className="w-10 h-10 object-contain rounded border bg-white p-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-600 truncate">Image chargée</p>
                                  <div className="flex gap-2 mt-1">
                                    <button onClick={() => markerInputRef.current?.click()} className="text-[10px] text-primary-600 hover:text-primary-700 font-medium">Changer</button>
                                    <button onClick={() => updateElement(selectedId, { calendarMarkerUrl: '' })} className="text-[10px] text-red-500 hover:text-red-600 font-medium">Supprimer</button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => markerInputRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              >
                                <ArrowUpTrayIcon className="w-4 h-4" />
                                Importer un marqueur (cœur PNG, SVG...)
                              </button>
                            )}
                            <input
                              ref={markerInputRef}
                              type="file"
                              accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/webp"
                              onChange={handleMarkerUpload}
                              className="hidden"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Transparent de préférence. Le numéro du jour s'affiche par-dessus.</p>

                            {selectedElement.calendarMarkerUrl && (
                              <div className="mt-2">
                                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1">
                                  <span>Taille de l'image</span>
                                  <span className="text-gray-400">{Math.round((selectedElement.calendarMarkerSize || 1) * 100)}%</span>
                                </label>
                                <input
                                  type="range"
                                  min="0.6"
                                  max="3"
                                  step="0.1"
                                  value={selectedElement.calendarMarkerSize || 1}
                                  onChange={(e) => updateElement(selectedId, { calendarMarkerSize: parseFloat(e.target.value) })}
                                  className="w-full accent-primary-600"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Time format — only for text elements containing a time variable */}
                    {!['qrcode', 'photo', 'image'].includes(selectedElement.type) && containsTimeVariable(selectedElement.content) && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Format d'heure</label>
                        <select
                          value={selectedElement.timeFormat || DEFAULT_TIME_FORMAT}
                          onChange={(e) => updateElement(selectedId, { timeFormat: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {TIME_FORMAT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label} — {opt.example}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">S'applique aux variables heure (ex. {'{{ceremony_time}}'}).</p>
                      </div>
                    )}

                    {/* Image Upload (decorative "image" elements) */}
                    {selectedElement.type === 'image' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Image</label>
                        {selectedElement.iconUrl ? (
                          <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
                            <img
                              src={selectedElement.iconUrl.startsWith('data:') || selectedElement.iconUrl.startsWith('http') ? selectedElement.iconUrl : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${selectedElement.iconUrl}`}
                              alt="Image"
                              className="w-10 h-10 object-contain rounded border bg-white p-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-600 truncate">Image chargée</p>
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => iconInputRef.current?.click()} className="text-[10px] text-primary-600 hover:text-primary-700 font-medium">
                                  Changer
                                </button>
                                <button onClick={() => updateElement(selectedId, { iconUrl: '' })} className="text-[10px] text-red-500 hover:text-red-600 font-medium">
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
                            Importer une image (PNG, SVG, JPEG, WEBP)
                          </button>
                        )}
                        <input
                          ref={iconInputRef}
                          type="file"
                          accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/webp"
                          onChange={handleIconUpload}
                          className="hidden"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Logo, ornement, sticker... max 5 Mo</p>
                      </div>
                    )}

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
                    </>)}

                    {/* Position */}
                    <details className="group border-t pt-3" open>
                      <summary className="flex items-center justify-between cursor-pointer list-none text-xs font-medium text-gray-700 mb-2 select-none">
                        <span>Position & Taille</span>
                        <ChevronDownIcon className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'X', key: 'x' },
                          { label: 'Y', key: 'y' },
                          { label: 'Largeur', key: 'width' },
                          { label: 'Hauteur', key: 'height' }
                        ].map(f => (
                          <div key={f.key}>
                            <label className="block text-[10px] text-gray-500">{f.label}</label>
                            <input
                              type="number"
                              value={selectedElement[f.key]}
                              onChange={(e) => updateElement(selectedId, { [f.key]: parseInt(e.target.value) || 0 })}
                              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        ))}
                      </div>
                    </details>

                    {/* Animation (jouée uniquement sur l'invitation publiée) */}
                    {(() => {
                      const anim = { ...DEFAULT_ANIMATION, ...(selectedElement.animation || {}) }
                      const setAnim = (patch) => updateElement(selectedId, { animation: { ...anim, ...patch } })
                      return (
                        <details className="group border-t pt-3">
                          <summary className="flex items-start justify-between cursor-pointer list-none mb-2 select-none">
                            <span className="text-xs font-medium text-gray-700">
                              ✨ Animation
                              <span className="block text-[10px] font-normal text-gray-400">Visible uniquement sur l'invitation publiée (le lien partagé)</span>
                            </span>
                            <ChevronDownIcon className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180 shrink-0 mt-0.5" />
                          </summary>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">Entrée</label>
                              <select
                                value={anim.in}
                                onChange={(e) => setAnim({ in: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                              >
                                {ENTRANCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">Boucle continue</label>
                              <select
                                value={anim.loop}
                                onChange={(e) => setAnim({ loop: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                              >
                                {LOOP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">Durée entrée (s)</label>
                              <input
                                type="number" min="0" step="0.1"
                                value={anim.duration}
                                onChange={(e) => setAnim({ duration: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">Délai (s)</label>
                              <input
                                type="number" min="0" step="0.1"
                                value={anim.delay}
                                onChange={(e) => setAnim({ delay: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                          </div>
                        </details>
                      )
                    })()}

                    {(selectedElement.type === 'photo' || selectedElement.type === 'image') && (
                      <>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs text-blue-700">
                            {selectedElement.type === 'photo'
                              ? "📷 Emplacement réservé à une photo (ex: photo des mariés). Le client l'ajoutera lors de la création ou modification de son mariage."
                              : '🖼️ Image fixe décorative (logo, ornement...) - identique pour toutes les invitations.'}
                          </p>
                        </div>

                        {/* Icon recolor (only for library icons) */}
                        {selectedElement.iconName && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Couleur de l'icône</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={selectedElement.iconColor || '#000000'}
                                onChange={(e) => recolorIcon(selectedId, e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                              />
                              <input
                                type="text"
                                value={selectedElement.iconColor || '#000000'}
                                onChange={(e) => recolorIcon(selectedId, e.target.value)}
                                className="input text-xs flex-1"
                              />
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {['#000000', '#FFFFFF', '#D4AF37', '#B76E79', '#8B7355', '#6B7B5E', '#1E3A5F', '#C17767'].map(c => (
                                <button
                                  key={c}
                                  onClick={() => recolorIcon(selectedId, c)}
                                  title={c}
                                  className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1.5">
                              Icône de la bibliothèque — recolorée en direct.
                            </p>
                          </div>
                        )}

                        {/* Shape */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Forme</label>
                          <div className="grid grid-cols-3 gap-2">
                            {PHOTO_SHAPES.map(shape => (
                              <button
                                key={shape.id}
                                onClick={() => updateElement(selectedId, { shape: shape.id })}
                                className={`px-2 py-2 text-xs border rounded-lg font-medium transition-colors ${
                                  (selectedElement.shape || 'rect') === shape.id
                                    ? 'bg-primary-100 border-primary-400 text-primary-700'
                                    : 'border-gray-200 text-gray-600 hover:border-primary-300'
                                }`}
                              >
                                {shape.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom (free-form) clip-path */}
                        {selectedElement.shape === 'custom' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Forme libre (clip-path CSS)
                            </label>
                            <textarea
                              rows={3}
                              value={selectedElement.customClipPath || DEFAULT_CUSTOM_CLIP_PATH}
                              onChange={(e) => updateElement(selectedId, { customClipPath: e.target.value })}
                              placeholder="polygon(50% 0%, 100% 100%, 0% 100%)"
                              className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2 focus:border-primary-400 focus:ring-1 focus:ring-primary-200"
                            />
                            <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                              Coordonnées en %. Ex : triangle{' '}
                              <code className="bg-gray-100 px-1 rounded">polygon(50% 0%, 100% 100%, 0% 100%)</code>.
                              Générateur : <span className="text-primary-600">bennettfeely.com/clippy</span>
                            </p>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {[
                                { label: 'Triangle', v: 'polygon(50% 0%, 100% 100%, 0% 100%)' },
                                { label: 'Pentagone', v: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' },
                                { label: 'Goutte', v: 'polygon(50% 0%, 90% 35%, 90% 75%, 50% 100%, 10% 75%, 10% 35%)' },
                                { label: 'Flèche', v: 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)' },
                                { label: 'Parallélo.', v: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)' },
                                { label: 'Biseau', v: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)' }
                              ].map(preset => (
                                <button
                                  key={preset.label}
                                  onClick={() => updateElement(selectedId, { customClipPath: preset.v })}
                                  className="px-2 py-1.5 text-[11px] border border-gray-200 rounded-lg text-gray-600 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Object fit */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Cadrage de l'image</label>
                          <div className="grid grid-cols-3 gap-2">
                            {OBJECT_FIT_OPTIONS.map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => updateElement(selectedId, { objectFit: opt.id })}
                                className={`px-2 py-2 text-xs border rounded-lg font-medium transition-colors ${
                                  (selectedElement.objectFit || 'cover') === opt.id
                                    ? 'bg-primary-100 border-primary-400 text-primary-700'
                                    : 'border-gray-200 text-gray-600 hover:border-primary-300'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1">
                            Remplir = recadre · Ajuster = image entière · Étirer = déforme
                          </p>
                        </div>

                        {/* Object position (anchor) */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Position dans le cadre</label>
                          <div className="grid grid-cols-3 gap-1.5 w-max">
                            {OBJECT_POSITION_OPTIONS.map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => updateElement(selectedId, { objectPosition: opt.id })}
                                title={opt.id}
                                className={`w-9 h-9 text-base border rounded-lg font-medium transition-colors ${
                                  (selectedElement.objectPosition || 'center') === opt.id
                                    ? 'bg-primary-100 border-primary-400 text-primary-700'
                                    : 'border-gray-200 text-gray-500 hover:border-primary-300'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Zoom */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Zoom ({selectedElement.imageScale ?? 100}%)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range" min="50" max="300" step="5"
                              value={selectedElement.imageScale ?? 100}
                              onChange={(e) => updateElement(selectedId, { imageScale: parseInt(e.target.value) })}
                              className="w-full accent-primary-600"
                            />
                            <button
                              onClick={() => updateElement(selectedId, { imageScale: 100 })}
                              className="text-[11px] text-primary-600 hover:underline whitespace-nowrap"
                            >
                              Réinit.
                            </button>
                          </div>
                        </div>

                        {/* Rotation */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Rotation ({selectedElement.rotation ?? 0}°)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range" min="-180" max="180" step="1"
                              value={selectedElement.rotation ?? 0}
                              onChange={(e) => updateElement(selectedId, { rotation: parseInt(e.target.value) })}
                              className="w-full accent-primary-600"
                            />
                            <input
                              type="number" min="-180" max="180"
                              value={selectedElement.rotation ?? 0}
                              onChange={(e) => updateElement(selectedId, { rotation: parseInt(e.target.value) || 0 })}
                              className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1"
                            />
                          </div>
                          <div className="flex gap-1.5 mt-1.5">
                            {[0, 90, 180, 270].map(deg => (
                              <button
                                key={deg}
                                onClick={() => updateElement(selectedId, { rotation: deg > 180 ? deg - 360 : deg })}
                                className="px-2 py-1 text-[11px] border border-gray-200 rounded-lg text-gray-600 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                              >
                                {deg}°
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Opacity */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Opacité ({selectedElement.opacity ?? 100}%)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range" min="0" max="100" step="1"
                              value={selectedElement.opacity ?? 100}
                              onChange={(e) => updateElement(selectedId, { opacity: parseInt(e.target.value) })}
                              className="w-full accent-primary-600"
                            />
                            <button
                              onClick={() => updateElement(selectedId, { opacity: 100 })}
                              className="text-[11px] text-primary-600 hover:underline whitespace-nowrap"
                            >
                              Réinit.
                            </button>
                          </div>
                        </div>

                        {/* Border width */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Épaisseur de la bordure ({selectedElement.borderWidth || 0}px)
                          </label>
                          <input
                            type="range" min="0" max="30"
                            value={selectedElement.borderWidth || 0}
                            onChange={(e) => updateElement(selectedId, { borderWidth: parseInt(e.target.value) })}
                            className="w-full accent-primary-600"
                          />
                        </div>

                        {/* Border color */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Couleur de la bordure</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={selectedElement.borderColor || '#FFFFFF'} onChange={(e) => updateElement(selectedId, { borderColor: e.target.value })} className="h-9 w-10 shrink-0 rounded-lg cursor-pointer border border-gray-200" />
                            <input type="text" value={selectedElement.borderColor || '#FFFFFF'} onChange={(e) => updateElement(selectedId, { borderColor: e.target.value })} className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
                          </div>
                          <div className="flex gap-1.5 mt-2">
                            {['#FFFFFF', '#000000', '#D4AF37', '#8B7355', '#B76E79', '#2D5F3A', '#1E3A5F'].map(c => (
                              <button
                                key={c}
                                onClick={() => updateElement(selectedId, { borderColor: c })}
                                className={`w-6 h-6 rounded-full border-2 hover:scale-110 ${selectedElement.borderColor === c ? 'border-primary-500 scale-110' : 'border-gray-200'}`}
                                style={{ backgroundColor: c }}
                                aria-label={`Couleur ${c}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Border opacity */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Opacité de la bordure ({selectedElement.borderOpacity ?? 100}%)
                          </label>
                          <input
                            type="range" min="0" max="100"
                            value={selectedElement.borderOpacity ?? 100}
                            onChange={(e) => updateElement(selectedId, { borderOpacity: parseInt(e.target.value) })}
                            className="w-full accent-primary-600"
                            disabled={!selectedElement.borderWidth}
                          />
                        </div>

                        {/* Border radius - only meaningful for the rectangle shape;
                            other shapes are already clipped via CSS clip-path */}
                        {(selectedElement.shape || 'rect') === 'rect' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Arrondi des coins ({selectedElement.borderRadius || 0}px)
                            </label>
                            <input
                              type="range" min="0" max={Math.round(Math.min(selectedElement.width, selectedElement.height) / 2)}
                              value={Math.min(selectedElement.borderRadius || 0, Math.round(Math.min(selectedElement.width, selectedElement.height) / 2))}
                              onChange={(e) => updateElement(selectedId, { borderRadius: parseInt(e.target.value) })}
                              className="w-full accent-primary-600"
                            />
                            <button
                              onClick={() => updateElement(selectedId, { borderRadius: Math.round(Math.min(selectedElement.width, selectedElement.height) / 2) })}
                              className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
                            >
                              ⬤ Rendre circulaire
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {!['qrcode', 'photo', 'image', 'shape', 'map'].includes(selectedElement.type) && (
                      <>
                        {/* Font Family */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-gray-700">Police</label>
                            {canUploadFont && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => fontInputRef.current?.click()}
                                  disabled={fontUploading}
                                  className="text-[11px] text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                                >
                                  {fontUploading ? 'Import…' : '+ Importer une police'}
                                </button>
                                <input
                                  ref={fontInputRef}
                                  type="file"
                                  accept=".ttf,.otf,.woff,.woff2"
                                  onChange={handleFontUpload}
                                  className="hidden"
                                />
                              </>
                            )}
                          </div>
                          {/* Font search — filters both custom & Google lists */}
                          <div className="relative mb-1.5">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={fontSearch}
                              onChange={(e) => setFontSearch(e.target.value)}
                              placeholder="Rechercher une police…"
                              className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          {(() => {
                            const q = fontSearch.trim().toLowerCase()
                            const match = (n) => !q || n.toLowerCase().includes(q)
                            const gFonts = GOOGLE_FONT_NAMES.filter(match)
                            // Unique families (a family may have several weights)
                            const cFamilies = [...new Set(customFonts.filter(f => match(f.family)).map(f => f.family))]
                            const current = selectedElement.fontFamily || 'Montserrat'
                            const noResult = gFonts.length === 0 && cFamilies.length === 0
                            return (
                              <select
                                value={current}
                                onChange={(e) => updateElement(selectedId, { fontFamily: e.target.value })}
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                style={{ fontFamily: current }}
                                size={q ? Math.min(8, (cFamilies.length + gFonts.length) || 1) : undefined}
                              >
                                {/* keep the current value selectable even if filtered out */}
                                {q && !gFonts.includes(current) && !cFamilies.includes(current) && (
                                  <option value={current} style={{ fontFamily: current }}>{current} (actuelle)</option>
                                )}
                                {noResult && <option disabled>Aucune police trouvée</option>}
                                {cFamilies.length > 0 && (
                                  <optgroup label="Mes polices importées">
                                    {cFamilies.map(fam => (
                                      <option key={fam} value={fam} style={{ fontFamily: fam }}>{fam}</option>
                                    ))}
                                  </optgroup>
                                )}
                                {gFonts.length > 0 && (
                                  <optgroup label="Polices Google">
                                    {gFonts.map(font => (
                                      <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            )
                          })()}
                          {/* Font preview */}
                          <div
                            className="mt-1.5 px-2 py-1.5 bg-gray-50 rounded border text-sm text-center truncate"
                            style={{ fontFamily: selectedElement.fontFamily || 'Montserrat', fontSize: '15px' }}
                          >
                            Aa — Élégance & Amour
                          </div>
                        </div>

                        {/* Font Size */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Taille de police
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range" min="6" max="400"
                              value={selectedElement.fontSize || 16}
                              onChange={(e) => updateElement(selectedId, { fontSize: parseInt(e.target.value) })}
                              className="flex-1 accent-primary-600"
                            />
                            <input
                              type="number"
                              min="6" max="400"
                              value={selectedElement.fontSize || 16}
                              onChange={(e) => {
                                // Clamp only the max while typing so the leading
                                // digit isn't snapped up to the min (e.g. "18").
                                const v = parseInt(e.target.value, 10)
                                if (!Number.isNaN(v)) updateElement(selectedId, { fontSize: Math.min(400, v) })
                              }}
                              onBlur={(e) => {
                                const v = parseInt(e.target.value, 10)
                                updateElement(selectedId, { fontSize: Math.max(6, Math.min(400, Number.isNaN(v) ? 16 : v)) })
                              }}
                              className="w-16 px-2 py-1 text-xs border rounded text-center focus:ring-1 focus:ring-primary-500"
                            />
                            <span className="text-xs text-gray-400 shrink-0">px</span>
                          </div>
                        </div>

                        {/* Line Height */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Interligne
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range" min="0.8" max="3" step="0.1"
                              value={selectedElement.lineHeight || 1.2}
                              onChange={(e) => updateElement(selectedId, { lineHeight: parseFloat(e.target.value) })}
                              className="flex-1 accent-primary-600"
                            />
                            <input
                              type="number"
                              min="0.8" max="3" step="0.1"
                              value={selectedElement.lineHeight || 1.2}
                              onChange={(e) => {
                                const v = Math.max(0.8, Math.min(3, parseFloat(e.target.value) || 1.2))
                                updateElement(selectedId, { lineHeight: v })
                              }}
                              className="w-16 px-2 py-1 text-xs border rounded text-center focus:ring-1 focus:ring-primary-500"
                            />
                          </div>
                        </div>

                        {/* Style Buttons */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Style</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateElement(selectedId, { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
                              className={`flex-1 px-3 py-2 text-sm border rounded-lg font-bold ${selectedElement.fontWeight === 'bold' ? 'bg-primary-100 border-primary-300 text-primary-700' : 'border-gray-200'}`}
                            >B</button>
                            <button
                              onClick={() => updateElement(selectedId, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
                              className={`flex-1 px-3 py-2 text-sm border rounded-lg italic ${selectedElement.fontStyle === 'italic' ? 'bg-primary-100 border-primary-300 text-primary-700' : 'border-gray-200'}`}
                            >I</button>
                            <button
                              onClick={() => updateElement(selectedId, { textTransform: selectedElement.textTransform === 'uppercase' ? 'none' : 'uppercase' })}
                              className={`flex-1 px-3 py-2 text-xs border rounded-lg ${selectedElement.textTransform === 'uppercase' ? 'bg-primary-100 border-primary-300 text-primary-700' : 'border-gray-200'}`}
                            >AA</button>
                          </div>
                        </div>
                        {/* Ombre du texte */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Ombre du texte</label>
                          <div className="flex gap-2 items-center">
                            <select
                              value={selectedElement.textShadow || 'none'}
                              onChange={e => updateElement(selectedId, { textShadow: e.target.value })}
                              className="px-2 py-1.5 text-xs border rounded"
                            >
                              <option value="none">Aucune</option>
                              <option value="1px 1px 2px">Douce</option>
                              <option value="2px 2px 4px">Moyenne</option>
                              <option value="3px 3px 6px">Forte</option>
                            </select>
                            <input
                              type="color"
                              value={selectedElement.shadowColor || '#000000'}
                              onChange={e => updateElement(selectedId, { shadowColor: e.target.value })}
                              className="w-8 h-8 rounded border-0"
                              disabled={selectedElement.textShadow === 'none'}
                              title="Couleur de l'ombre"
                            />
                          </div>
                        </div>

                        {/* Alignment (9-position grid) */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Alignement du texte</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { h: 'left', v: 'top', icon: '↖' },
                              { h: 'center', v: 'top', icon: '↑' },
                              { h: 'right', v: 'top', icon: '↗' },
                              { h: 'left', v: 'middle', icon: '←' },
                              { h: 'center', v: 'middle', icon: '⊙' },
                              { h: 'right', v: 'middle', icon: '→' },
                              { h: 'left', v: 'bottom', icon: '↙' },
                              { h: 'center', v: 'bottom', icon: '↓' },
                              { h: 'right', v: 'bottom', icon: '↘' }
                            ].map((align, idx) => (
                              <button
                                key={idx}
                                onClick={() => updateElement(selectedId, { textAlign: align.h, verticalAlign: align.v })}
                                className={`w-full px-2 py-3 text-lg border rounded-lg font-semibold transition-colors ${
                                  selectedElement.textAlign === align.h && selectedElement.verticalAlign === align.v
                                    ? 'bg-primary-100 border-primary-400 text-primary-700'
                                    : 'border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
                                }`}
                                title={`${align.h} - ${align.v}`}
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
                            <input type="color" value={selectedElement.color} onChange={(e) => updateElement(selectedId, { color: e.target.value })} className="h-9 w-10 shrink-0 rounded-lg cursor-pointer border border-gray-200" />
                            <input type="text" value={selectedElement.color} onChange={(e) => updateElement(selectedId, { color: e.target.value })} className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
                          </div>
                          <div className="flex gap-1.5 mt-2">
                            {['#000000', '#333333', '#666666', '#FFFFFF', '#8B7355', '#D4AF37', '#B76E79', '#2D5F3A', '#1E3A5F'].map(c => (
                              <button
                                key={c}
                                onClick={() => updateElement(selectedId, { color: c })}
                                className={`w-6 h-6 rounded-full border-2 hover:scale-110 ${selectedElement.color === c ? 'border-primary-500 scale-110' : 'border-gray-200'}`}
                                style={{ backgroundColor: c }}
                                aria-label={`Couleur ${c}`}
                              />
                            ))}
                          </div>
                          {palette.length > 0 && (
                            <div className="mt-2">
                              <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1">🎨 Couleurs de l'image</p>
                              <div className="flex flex-wrap gap-1.5">
                                {palette.map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => updateElement(selectedId, { color: c })}
                                    className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${selectedElement.color?.toUpperCase() === c.toUpperCase() ? 'border-primary-500 scale-110' : 'border-gray-200'}`}
                                    style={{ backgroundColor: c }}
                                    title={c}
                                    aria-label={`Couleur ${c}`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Gradient (text) */}
                        <GradientControls
                          el={selectedElement}
                          baseColor={selectedElement.color}
                          onChange={(patch) => updateElement(selectedId, patch)}
                        />

                        {/* Letter Spacing */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Espacement ({selectedElement.letterSpacing || 0}px)
                          </label>
                          <input type="range" min="-2" max="20" value={selectedElement.letterSpacing || 0} onChange={(e) => updateElement(selectedId, { letterSpacing: parseInt(e.target.value) })} className="w-full accent-primary-600" />
                        </div>

                        {/* Text arc / curve */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Courbe / Arc ({selectedElement.curve || 0})
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range" min="-100" max="100" step="1"
                              value={selectedElement.curve || 0}
                              onChange={(e) => updateElement(selectedId, { curve: parseInt(e.target.value) })}
                              className="w-full accent-primary-600"
                            />
                            <button
                              onClick={() => updateElement(selectedId, { curve: 0 })}
                              className="text-[11px] text-primary-600 hover:underline whitespace-nowrap"
                            >
                              Réinit.
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1">
                            Négatif = vallée · Positif = arc-en-ciel. Idéal pour un texte court (noms, titre).
                          </p>
                        </div>

                        {/* Text rotation */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Rotation du texte ({selectedElement.rotation ?? 0}°)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range" min="-180" max="180" step="1"
                              value={selectedElement.rotation ?? 0}
                              onChange={(e) => updateElement(selectedId, { rotation: parseInt(e.target.value) })}
                              className="w-full accent-primary-600"
                            />
                            <input
                              type="number" min="-180" max="180"
                              value={selectedElement.rotation ?? 0}
                              onChange={(e) => updateElement(selectedId, { rotation: parseInt(e.target.value) || 0 })}
                              className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1"
                            />
                          </div>
                          <div className="flex gap-1.5 mt-1.5">
                            {[0, 90, 180, 270].map(deg => (
                              <button
                                key={deg}
                                onClick={() => updateElement(selectedId, { rotation: deg > 180 ? deg - 360 : deg })}
                                className="px-2 py-1 text-[11px] border border-gray-200 rounded-lg text-gray-600 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                              >
                                {deg}°
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Auto-fit (shrink long text to fit the box) */}
                        <div className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-xs font-medium text-gray-700">Ajuster automatiquement</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Réduit la police pour que les textes longs (adresses, message) tiennent dans la boîte.
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
                            <input
                              type="checkbox"
                              checked={!!selectedElement.autoFit}
                              onChange={(e) => updateElement(selectedId, { autoFit: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                          </label>
                        </div>
                      </>
                    )}

                    {/* Label rename */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Libellé</label>
                      <input
                        type="text" value={selectedElement.label}
                        onChange={(e) => updateElement(selectedId, { label: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <span className="mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-primary-50 text-primary-500">
                    <CursorArrowRaysIcon className="h-8 w-8" />
                  </span>
                  <h3 className="text-sm font-semibold text-gray-800">Aucun élément sélectionné</h3>
                  <p className="text-xs text-gray-500 mt-1.5 max-w-[15rem]">Cliquez sur un élément dans le canevas pour modifier ses propriétés.</p>
                  <button onClick={() => setActivePanel('elements')} className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3.5 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition-colors">
                    <CursorArrowRaysIcon className="h-4 w-4" />
                    Voir la liste des éléments
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Canvas Area — subtle dotted "workspace" background (Figma/Canva feel) */}
        <div
          className="flex-1 overflow-auto p-8 flex items-start justify-center"
          style={{
            backgroundColor: '#eef1f5',
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '18px 18px'
          }}
        >
          <div style={{ width: canvasWidth * zoom, height: canvasHeight * zoom, transformOrigin: 'top center' }}>
            <div
              ref={canvasRef}
              data-canvas="true"
              onMouseDown={handleCanvasMouseDown}
              className="wysiwyg-canvas relative bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden select-none"
              style={{ width: canvasWidth, height: canvasHeight, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            >
              {/* Background Image — stretched to exact canvas dimensions */}
              {backgroundUrl && (
                <img
                  src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${backgroundUrl}`}
                  alt="Background"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ objectFit: 'fill', opacity: backgroundOpacity / 100 }}
                  data-canvas="true"
                />
              )}

              {/* No background placeholder */}
              {!backgroundUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50" data-canvas="true">
                  <span className="mb-4 grid h-24 w-24 place-items-center rounded-3xl bg-white text-primary-400 shadow-sm ring-1 ring-gray-100">
                    <PhotoIcon className="h-12 w-12" />
                  </span>
                  <p className="text-gray-500 text-lg font-semibold">Aucune image de fond</p>
                  <p className="text-gray-400 text-sm mt-1">Utilisez le panneau « Fond » pour charger une image</p>
                  <button
                    onClick={() => { setActivePanel('background'); fileInputRef.current?.click() }}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold shadow-sm shadow-primary-600/25 hover:bg-primary-700 transition-colors"
                  >
                    <PhotoIcon className="h-4 w-4" />
                    Charger une image
                  </button>
                </div>
              )}

              {/* Margin guides */}
              {(margins.top > 0 || margins.right > 0 || margins.bottom > 0 || margins.left > 0) && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: margins.top,
                    left: margins.left,
                    width: canvasWidth - margins.left - margins.right,
                    height: canvasHeight - margins.top - margins.bottom,
                    border: '2px dashed rgba(239, 68, 68, 0.6)',
                    zIndex: 999,
                    boxSizing: 'border-box',
                  }}
                />
              )}

              {/* Grid de positionnement */}
              {showGrid && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ opacity: 0.15, zIndex: 10 }}
                  width={canvasWidth}
                  height={canvasHeight}
                >
                  {/* Lignes verticales */}
                  {Array.from({ length: Math.floor(canvasWidth / 50) + 1 }).map((_, i) => (
                    <line
                      key={`v-${i}`}
                      x1={i * 50}
                      y1={0}
                      x2={i * 50}
                      y2={canvasHeight}
                      stroke="#888"
                      strokeWidth={i % 2 === 0 ? 0.7 : 0.3}
                    />
                  ))}
                  {/* Lignes horizontales */}
                  {Array.from({ length: Math.floor(canvasHeight / 50) + 1 }).map((_, i) => (
                    <line
                      key={`h-${i}`}
                      x1={0}
                      y1={i * 50}
                      x2={canvasWidth}
                      y2={i * 50}
                      stroke="#888"
                      strokeWidth={i % 2 === 0 ? 0.7 : 0.3}
                    />
                  ))}
                </svg>
              )}

              {/* Smart alignment guides (magenta) shown while dragging */}
              {(guides.v.length > 0 || guides.h.length > 0) && (
                <svg className="absolute inset-0 pointer-events-none" width={canvasWidth} height={canvasHeight} style={{ zIndex: 998 }}>
                  {guides.v.map((x, i) => (
                    <line key={`gv-${i}`} x1={x} y1={0} x2={x} y2={canvasHeight} stroke="#e11d84" strokeWidth={1 / zoom} />
                  ))}
                  {guides.h.map((y, i) => (
                    <line key={`gh-${i}`} x1={0} y1={y} x2={canvasWidth} y2={y} stroke="#e11d84" strokeWidth={1 / zoom} />
                  ))}
                </svg>
              )}

              {/* Elements */}
              {backgroundUrl && elements && elements.filter(el => el.visible && el.id).map((el) => {
                if (!el || !el.id) return null
                const isSelected = selectedId === el.id
                const isMultiSelected = selectedIds.includes(el.id)

                // Preview mode: play this element's entrance + loop like the
                // public invitation. No drag handlers / selection chrome.
                if (previewAnim) {
                  const entrance = getEntranceMotion(el.animation)
                  const loop = getLoopMotion(el.animation)
                  const inner = renderElementContent(el)
                  return (
                    <motion.div
                      key={`${el.id}-${previewKey}`}
                      className="absolute"
                      style={{ left: el.x, top: el.y, width: el.width, height: el.height, pointerEvents: 'none', rotate: (el.type !== 'photo' && el.type !== 'image') ? (el.rotation || 0) : 0 }}
                      initial={isAnimated(el.animation) ? entrance?.initial : undefined}
                      animate={isAnimated(el.animation) ? entrance?.animate : undefined}
                      transition={isAnimated(el.animation) ? entrance?.transition : undefined}
                    >
                      {loop ? (
                        <motion.div style={{ width: '100%', height: '100%' }} animate={loop.animate} transition={loop.transition}>
                          {inner}
                        </motion.div>
                      ) : inner}
                    </motion.div>
                  )
                }

                return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                  onTouchStart={(e) => handleElementMouseDown(e, el.id)}
                  className={`absolute transition-shadow ${el.locked ? 'cursor-not-allowed' : 'cursor-move'} ${
                    isSelected ? 'ring-2 ring-primary-500 ring-offset-1' : isMultiSelected ? 'ring-2 ring-blue-400 ring-offset-1' : 'hover:ring-1 hover:ring-primary-300'
                  }`}
                  style={{
                    left: el.x, top: el.y, width: el.width, height: el.height, touchAction: 'none',
                    // Rotate the whole element box (content + selection frame) so
                    // rotating an element keeps its frame aligned. Photos/images
                    // rotate their image inside the frame instead (getImageStyle).
                    transform: (el.type !== 'photo' && el.type !== 'image' && el.rotation) ? `rotate(${el.rotation}deg)` : undefined,
                    transformOrigin: 'center center',
                  }}
                >
                  {renderElementContent(el)}

                  {/* Floating quick-action toolbar for the selected element.
                      Counter-scaled so it stays readable at any zoom. */}
                  {isSelected && (
                    <div
                      className="absolute left-0 flex items-center gap-0.5 bg-gray-900/95 text-white rounded-lg shadow-lg px-1 py-1"
                      style={{ top: -40, transform: `scale(${1 / zoom})`, transformOrigin: 'bottom left', zIndex: 1000 }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <button onClick={(e) => { e.stopPropagation(); duplicateElement(el.id) }} title="Dupliquer" className="p-1.5 hover:bg-white/15 rounded">
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleLock(el.id) }} title={el.locked ? 'Déverrouiller' : 'Verrouiller'} className="p-1.5 hover:bg-white/15 rounded">
                        {el.locked ? <LockClosedIcon className="h-4 w-4" /> : <LockOpenIcon className="h-4 w-4" />}
                      </button>
                      <div className="w-px h-4 bg-white/20 mx-0.5" />
                      <button onClick={(e) => { e.stopPropagation(); deleteElement(el.id) }} title="Supprimer" className="p-1.5 hover:bg-red-500/30 text-red-300 rounded">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Resize Handles (only for single selected element) */}
                  {isSelected && !el.locked && (
                    <>
                      {['nw', 'ne', 'sw', 'se'].map(dir => (
                        <div
                          key={dir}
                          onMouseDown={(e) => handleResizeMouseDown(e, dir)}
                          onTouchStart={(e) => handleResizeMouseDown(e, dir)}
                          className="absolute w-3 h-3 bg-primary-500 border border-white rounded-sm"
                          style={{
                            cursor: `${dir}-resize`,
                            ...(dir.includes('n') ? { top: -5 } : { bottom: -5 }),
                            ...(dir.includes('w') ? { left: -5 } : { right: -5 })
                          }}
                        />
                      ))}
                      {['n', 'e', 's', 'w'].map(dir => (
                        <button
                          key={dir}
                          onMouseDown={(e) => handleResizeMouseDown(e, dir)}
                          onTouchStart={(e) => handleResizeMouseDown(e, dir)}
                          className="absolute bg-primary-400 border border-white"
                          aria-label={`Resize ${dir}`}
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
              )
              })}
            </div>
          </div>

          {/* Keyboard Shortcuts Help */}
          
        </div>
      </div>
    </div>
  )
}
