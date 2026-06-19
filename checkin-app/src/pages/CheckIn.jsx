import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Html5Qrcode } from 'html5-qrcode'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeftIcon,
  QrCodeIcon,
  UserGroupIcon,
  UsersIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  WifiIcon,
  SignalSlashIcon
} from '@heroicons/react/24/outline'
import { checkinAPI } from '../services/api'
import useOnlineStatus from '../hooks/useOnlineStatus'
import {
  saveManifest,
  getMeta,
  getAllGuests,
  getGuestByCode,
  markGuestCheckedInLocally,
  addPendingScan,
  getPendingScans,
  removePendingScan,
  countPendingScans
} from '../services/db'

export default function CheckIn() {
  const { id: weddingId } = useParams()
  const isOnline = useOnlineStatus()

  const [meta, setMeta] = useState(null)
  const [guests, setGuests] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [code, setCode] = useState('')
  const [lastScan, setLastScan] = useState(null)
  const [scannerActive, setScannerActive] = useState(false)
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState('')

  const scannerInstanceRef = useRef(null)
  const lastScannedCodeRef = useRef(null)
  const scanCooldownRef = useRef(false)

  const refreshLocalState = useCallback(async () => {
    const [m, g, p] = await Promise.all([
      getMeta(weddingId),
      getAllGuests(weddingId),
      countPendingScans(weddingId)
    ])
    setMeta(m || null)
    setGuests(g)
    setPendingCount(p)
  }, [weddingId])

  useEffect(() => {
    refreshLocalState()
  }, [refreshLocalState])

  const syncPending = useCallback(async () => {
    if (!isOnline) return
    const pending = await getPendingScans(weddingId)
    if (pending.length === 0) return

    setSyncing(true)
    try {
      const { data } = await checkinAPI.sync(
        weddingId,
        pending.map(p => ({ uniqueCode: p.uniqueCode, scannedAt: p.scannedAt, deviceId: p.deviceId }))
      )
      const byCode = new Map(data.results.map(r => [r.uniqueCode, r]))
      let invalidCount = 0
      for (const p of pending) {
        const result = byCode.get(p.uniqueCode)
        if (!result) continue
        if (result.status === 'invalid') invalidCount++
        // ok / duplicate / invalid are all resolved server-side, nothing more to retry
        await removePendingScan(p.id)
      }
      if (invalidCount > 0) {
        toast.error(`${invalidCount} check-in(s) hors-ligne invalide(s) (code inconnu sur le serveur)`)
      }
      await refreshLocalState()
    } catch {
      // Network error mid-sync: leave the queue untouched, will retry on next trigger.
    } finally {
      setSyncing(false)
    }
  }, [weddingId, isOnline, refreshLocalState])

  // Auto-sync when connectivity returns or on mount if already online
  useEffect(() => {
    if (isOnline) syncPending()
  }, [isOnline, syncPending])

  // Camera setup
  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      setCameras(devices)
      if (devices.length > 0) {
        const backCam = devices.find(d => /back|arri[eè]re|rear/i.test(d.label))
        setSelectedCamera(backCam ? backCam.id : devices[0].id)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.stop().catch(() => {})
        scannerInstanceRef.current.clear()
        scannerInstanceRef.current = null
      }
    }
  }, [])

  const handleDownload = async () => {
    if (!isOnline) {
      toast.error('Connexion requise pour télécharger la liste des invités')
      return
    }
    setDownloading(true)
    try {
      const { data } = await checkinAPI.manifest(weddingId)
      await saveManifest(weddingId, data.wedding, data.guests)
      await refreshLocalState()
      toast.success(`${data.guests.length} invités téléchargés pour le check-in hors-ligne`)
    } catch {
      toast.error('Échec du téléchargement')
    } finally {
      setDownloading(false)
    }
  }

  const playBeep = (ok) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(ok ? 1200 : 400, ctx.currentTime)
      osc.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } catch {}
  }

  const processCode = useCallback(async (rawCode) => {
    let uniqueCode = rawCode.trim()
    const urlMatch = uniqueCode.match(/\/i\/[^/]+\/([^/?]+)/)
    if (urlMatch) uniqueCode = urlMatch[1]

    const guest = await getGuestByCode(uniqueCode)

    if (!guest || guest.weddingId !== weddingId) {
      playBeep(false)
      setLastScan({ success: false, error: 'Code invalide ou invités non téléchargés' })
      return
    }

    if (guest.checkedIn) {
      playBeep(false)
      setLastScan({ success: true, alreadyCheckedIn: true, guest })
      return
    }

    const scannedAt = new Date().toISOString()
    await markGuestCheckedInLocally(uniqueCode, scannedAt)
    await addPendingScan({
      weddingId,
      uniqueCode,
      scannedAt,
      deviceId: navigator.userAgent.slice(0, 60)
    })

    playBeep(true)
    setLastScan({ success: true, alreadyCheckedIn: false, guest: { ...guest, checkedIn: true } })
    await refreshLocalState()
    syncPending()
  }, [weddingId, refreshLocalState, syncPending])

  const handleQrCodeSuccess = useCallback((decodedText) => {
    if (scanCooldownRef.current || decodedText === lastScannedCodeRef.current) return
    scanCooldownRef.current = true
    lastScannedCodeRef.current = decodedText
    processCode(decodedText)
    setCode('')
    setTimeout(() => {
      scanCooldownRef.current = false
      lastScannedCodeRef.current = null
    }, 3000)
  }, [processCode])

  const startScanner = useCallback(async () => {
    let camId = selectedCamera
    if (!camId) {
      try {
        const devices = await Html5Qrcode.getCameras()
        setCameras(devices)
        if (devices.length === 0) return toast.error('Aucune caméra détectée')
        const backCam = devices.find(d => /back|arri[eè]re|rear/i.test(d.label))
        camId = backCam ? backCam.id : devices[0].id
        setSelectedCamera(camId)
      } catch {
        return toast.error('Impossible d\'accéder à la caméra. Vérifiez les permissions.')
      }
    }

    try {
      if (scannerInstanceRef.current) {
        await scannerInstanceRef.current.stop().catch(() => {})
        scannerInstanceRef.current.clear()
      }
      const scanner = new Html5Qrcode('qr-reader')
      scannerInstanceRef.current = scanner
      await scanner.start(
        camId || { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        handleQrCodeSuccess,
        () => {}
      )
      setScannerActive(true)
    } catch {
      toast.error('Impossible de démarrer la caméra.')
    }
  }, [selectedCamera, handleQrCodeSuccess])

  const stopScanner = useCallback(async () => {
    if (scannerInstanceRef.current) {
      try {
        await scannerInstanceRef.current.stop()
        scannerInstanceRef.current.clear()
      } catch {}
      scannerInstanceRef.current = null
    }
    setScannerActive(false)
  }, [])

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (code.trim()) processCode(code.trim())
  }

  const checkedInCount = guests.filter(g => g.checkedIn).length
  const recentCheckIns = guests
    .filter(g => g.checkedIn)
    .sort((a, b) => new Date(b.checkedInAt) - new Date(a.checkedInAt))
    .slice(0, 15)

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <header className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/" className="p-1 text-gray-500"><ArrowLeftIcon className="h-5 w-5" /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif font-bold text-gray-900 truncate">
            {meta?.weddingInfo ? `${meta.weddingInfo.brideName} & ${meta.weddingInfo.groomName}` : 'Check-in'}
          </h1>
        </div>
        {isOnline ? (
          <WifiIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
        ) : (
          <SignalSlashIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
        )}
      </header>

      <main className="p-4 space-y-4">
        {/* Download / sync bar */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {meta ? `${meta.guestCount} invités en cache` : 'Aucune liste téléchargée'}
              </p>
              {meta && (
                <p className="text-xs text-gray-400">
                  Mis à jour {format(new Date(meta.generatedAt), 'd MMM HH:mm', { locale: fr })}
                </p>
              )}
            </div>
            <button onClick={handleDownload} disabled={downloading || !isOnline} className="btn-secondary text-sm">
              <CloudArrowDownIcon className="h-4 w-4 mr-1.5" />
              {downloading ? 'Téléchargement...' : meta ? 'Mettre à jour' : 'Télécharger'}
            </button>
          </div>

          {pendingCount > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <span className="text-sm text-amber-700">{pendingCount} check-in(s) en attente de synchro</span>
              <button onClick={syncPending} disabled={syncing || !isOnline} className="text-amber-700 disabled:opacity-50">
                <CloudArrowUpIcon className={`h-5 w-5 ${syncing ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {!meta && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
            Téléchargez la liste des invités pendant que vous avez du réseau : le scan fonctionnera ensuite même sans connexion.
          </div>
        )}

        {/* Stats */}
        {meta && (
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card text-center">
              <p className="stat-value">{guests.length}</p>
              <p className="stat-label">Attendus</p>
            </div>
            <div className="stat-card text-center bg-primary-50 border-primary-100">
              <p className="stat-value text-primary-700">{checkedInCount}</p>
              <p className="stat-label text-primary-600">Arrivés</p>
            </div>
            <div className="stat-card text-center">
              <p className="stat-value">{guests.length > 0 ? Math.round((checkedInCount / guests.length) * 100) : 0}%</p>
              <p className="stat-label">Taux</p>
            </div>
          </div>
        )}

        {/* Scanner */}
        <div className="card p-5 text-center">
          <QrCodeIcon className="h-10 w-10 text-primary-500 mx-auto mb-2" />
          <h2 className="font-serif font-bold text-gray-900 mb-3">Scanner un QR Code</h2>

          <div
            id="qr-reader"
            className={`mx-auto rounded-xl overflow-hidden bg-gray-900 ${scannerActive ? 'mb-3' : ''}`}
            style={{ width: '100%', maxWidth: 360, minHeight: scannerActive ? 280 : 0, display: scannerActive ? 'block' : 'none' }}
          />

          <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
            <button
              type="button"
              onClick={scannerActive ? stopScanner : startScanner}
              disabled={!meta}
              className={scannerActive ? 'btn-danger' : 'btn-primary'}
            >
              {scannerActive ? (
                <><VideoCameraSlashIcon className="h-5 w-5 mr-2" />Arrêter</>
              ) : (
                <><VideoCameraIcon className="h-5 w-5 mr-2" />Ouvrir la caméra</>
              )}
            </button>
            {cameras.length > 1 && scannerActive && (
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="input text-sm py-2"
              >
                {cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>{cam.label || 'Caméra'}</option>
                ))}
              </select>
            )}
          </div>

          {!meta && <p className="text-xs text-gray-400 mb-4">Téléchargez la liste des invités pour activer le scan.</p>}

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400">ou saisie manuelle</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Code (ex: ABC123XY)"
              disabled={!meta}
              className="input text-center uppercase tracking-widest flex-1"
            />
            <button type="submit" disabled={!code.trim() || !meta} className="btn-primary">
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </form>

          {/* Result card */}
          {lastScan && (
            <div className={`mt-4 p-4 rounded-xl text-left ${
              !lastScan.success ? 'bg-red-50 border border-red-200' :
              lastScan.alreadyCheckedIn ? 'bg-amber-50 border border-amber-200' :
              'bg-green-50 border border-green-200'
            }`}>
              {!lastScan.success ? (
                <div className="flex items-center gap-3">
                  <XCircleIcon className="h-9 w-9 text-red-500 flex-shrink-0" />
                  <p className="text-red-800 font-medium">{lastScan.error}</p>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  {lastScan.alreadyCheckedIn ? (
                    <CheckCircleIcon className="h-9 w-9 text-amber-500 flex-shrink-0" />
                  ) : (
                    <CheckCircleIcon className="h-9 w-9 text-green-500 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-gray-900 text-lg">
                      {lastScan.guest.firstName} {lastScan.guest.lastName}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <UserGroupIcon className="h-4 w-4" />
                        Table {lastScan.guest.tableNumber || '—'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {lastScan.guest.invitationType === 'Couple' ? (
                          <UsersIcon className="h-4 w-4" />
                        ) : (
                          <UserIcon className="h-4 w-4" />
                        )}
                        {lastScan.guest.invitationType}
                      </span>
                    </div>
                    {lastScan.alreadyCheckedIn && (
                      <p className="text-amber-700 text-sm mt-1 font-medium">Déjà enregistré précédemment</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent check-ins */}
        <div className="card">
          <div className="p-4 border-b">
            <h2 className="font-serif font-bold text-gray-900">Arrivées récentes</h2>
          </div>
          {recentCheckIns.length === 0 ? (
            <p className="p-8 text-center text-gray-400 text-sm">Aucune arrivée pour le moment</p>
          ) : (
            <div className="divide-y max-h-80 overflow-y-auto">
              {recentCheckIns.map((g) => (
                <div key={g.uniqueCode} className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-600 text-sm font-medium">{g.firstName?.[0]}{g.lastName?.[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{g.firstName} {g.lastName}</p>
                    <p className="text-xs text-gray-500">
                      Table {g.tableNumber || '—'} • {g.invitationType}
                      {g.checkedInAt && ` • ${format(new Date(g.checkedInAt), 'HH:mm')}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
