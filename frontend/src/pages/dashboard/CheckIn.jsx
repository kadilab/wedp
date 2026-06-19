import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { checkinAPI, weddingAPI } from '../../services/api'
import { socketService } from '../../services/socket'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Html5Qrcode } from 'html5-qrcode'
import {
  ArrowLeftIcon,
  QrCodeIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  CameraIcon
} from '@heroicons/react/24/outline'

export default function CheckIn() {
  const { id: weddingId } = useParams()
  const [code, setCode] = useState('')
  const [lastScan, setLastScan] = useState(null)
  const [scannerActive, setScannerActive] = useState(false)
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const scannerRef = useRef(null)
  const scannerInstanceRef = useRef(null)
  const lastScannedCodeRef = useRef(null)
  const scanCooldownRef = useRef(false)
  const queryClient = useQueryClient()

  const { data: weddingData } = useQuery(['wedding', weddingId], () => weddingAPI.getOne(weddingId))
  const wedding = weddingData?.data?.wedding

  const { data: statsData, isLoading: statsLoading } = useQuery(
    ['checkinStats', weddingId],
    () => checkinAPI.getLive(weddingId),
    { refetchInterval: 10000 }
  )
  const stats = statsData?.data?.stats

  const recentCheckins = statsData?.data?.recentCheckIns || []

  const scanMutation = useMutation(
    (uniqueCode) => checkinAPI.scan({ uniqueCode, weddingId }),
    {
      onSuccess: (response) => {
        const { guest, checkIn } = response.data
        setLastScan({
          success: true,
          guest: guest,
          time: checkIn.checkedInAt
        })
        toast.success(`${guest.firstName} ${guest.lastName} enregistré(e) !`)
        queryClient.invalidateQueries(['checkinStats', weddingId])
        setCode('')
      },
      onError: (error) => {
        setLastScan({
          success: false,
          error: error.response?.data?.error || 'Code invalide'
        })
        toast.error(error.response?.data?.error || 'Erreur lors du scan')
      }
    }
  )

  const undoMutation = useMutation(
    (checkInId) => checkinAPI.undo(weddingId, checkInId),
    {
      onSuccess: () => {
        toast.success('Check-in annulé')
        queryClient.invalidateQueries(['checkinStats', weddingId])
      }
    }
  )

  // Socket connection for real-time updates
  useEffect(() => {
    socketService.connect()
    socketService.joinWedding(weddingId)

    socketService.onCheckIn((data) => {
      queryClient.invalidateQueries(['checkinStats', weddingId])
    })

    return () => {
      socketService.leaveWedding(weddingId)
      socketService.offCheckIn()
    }
  }, [weddingId, queryClient])

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.stop().catch(() => {})
        scannerInstanceRef.current.clear()
        scannerInstanceRef.current = null
      }
    }
  }, [])

  // Get available cameras
  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      setCameras(devices)
      if (devices.length > 0) {
        // Prefer back camera on mobile
        const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('arrière') || d.label.toLowerCase().includes('rear'))
        setSelectedCamera(backCam ? backCam.id : devices[0].id)
      }
    }).catch(() => {
      // Camera permission not yet granted or no cameras
    })
  }, [])

  const handleQrCodeSuccess = useCallback((decodedText) => {
    // Prevent duplicate scans within 3 seconds
    if (scanCooldownRef.current || decodedText === lastScannedCodeRef.current) return
    scanCooldownRef.current = true
    lastScannedCodeRef.current = decodedText

    // Extract invitation code from URL or raw code
    let uniqueCode = decodedText.trim()
    // If it's a URL like /i/slug/CODE, extract the code
    const urlMatch = uniqueCode.match(/\/i\/[^/]+\/([^/?]+)/)
    if (urlMatch) {
      uniqueCode = urlMatch[1]
    }

    // Play a beep sound
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime)
      oscillator.connect(audioCtx.destination)
      oscillator.start()
      oscillator.stop(audioCtx.currentTime + 0.15)
    } catch {}

    setCode(uniqueCode)
    scanMutation.mutate(uniqueCode)

    // Reset cooldown after 3 seconds
    setTimeout(() => {
      scanCooldownRef.current = false
      lastScannedCodeRef.current = null
    }, 3000)
  }, [scanMutation])

  const startScanner = useCallback(async () => {
    if (!selectedCamera) {
      // Try to get cameras first
      try {
        const devices = await Html5Qrcode.getCameras()
        setCameras(devices)
        if (devices.length === 0) {
          toast.error('Aucune caméra détectée')
          return
        }
        const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('arrière') || d.label.toLowerCase().includes('rear'))
        setSelectedCamera(backCam ? backCam.id : devices[0].id)
      } catch (err) {
        toast.error('Impossible d\'accéder à la caméra. Vérifiez les permissions.')
        return
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
        selectedCamera || { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        handleQrCodeSuccess,
        () => {} // ignore errors (no QR found in frame)
      )

      setScannerActive(true)
    } catch (err) {
      console.error('Scanner start error:', err)
      toast.error('Impossible de démarrer la caméra. Vérifiez les permissions du navigateur.')
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

  const switchCamera = useCallback(async (cameraId) => {
    setSelectedCamera(cameraId)
    if (scannerActive) {
      await stopScanner()
      // Small delay to let the DOM reset
      setTimeout(() => {
        const scanner = new Html5Qrcode('qr-reader')
        scannerInstanceRef.current = scanner
        scanner.start(
          cameraId,
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
          handleQrCodeSuccess,
          () => {}
        ).then(() => setScannerActive(true))
         .catch(() => toast.error('Erreur lors du changement de caméra'))
      }, 300)
    }
  }, [scannerActive, stopScanner, handleQrCodeSuccess])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (code.trim()) {
      scanMutation.mutate(code.trim())
    }
  }

  const checkinRate = stats?.totalGuests > 0
    ? Math.round((stats?.checkedIn / stats?.totalGuests) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to={`/weddings/${weddingId}`} className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Check-in</h1>
          {wedding && (
            <p className="text-gray-600">{wedding.brideName} & {wedding.groomName}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{stats?.totalGuests || 0}</p>
              <p className="stat-label">Invités attendus</p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{stats?.confirmed || 0}</p>
              <p className="stat-label">Confirmés</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="stat-card bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value text-primary-700">{stats?.checkedIn || 0}</p>
              <p className="stat-label text-primary-600">Arrivés</p>
            </div>
            <QrCodeIcon className="h-8 w-8 text-primary-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{checkinRate}%</p>
              <p className="stat-label">Taux d'arrivée</p>
            </div>
            <div className="w-12 h-12 relative">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#df6746"
                  strokeWidth="4"
                  strokeDasharray={`${checkinRate * 1.26} 126`}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Scan Form */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="max-w-xl mx-auto text-center">
          <QrCodeIcon className="h-16 w-16 text-primary-500 mx-auto mb-4" />
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">
            Scanner un QR Code
          </h2>
          <p className="text-gray-600 mb-6">
            Scannez le QR code avec la caméra ou entrez le code manuellement
          </p>

          {/* Camera Scanner */}
          <div className="mb-6">
            {/* Scanner viewport */}
            <div
              id="qr-reader"
              ref={scannerRef}
              className={`mx-auto rounded-xl overflow-hidden bg-gray-900 ${scannerActive ? 'mb-4' : ''}`}
              style={{
                width: '100%',
                maxWidth: 400,
                minHeight: scannerActive ? 300 : 0,
                display: scannerActive ? 'block' : 'none'
              }}
            />

            {/* Camera controls */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={scannerActive ? stopScanner : startScanner}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-lg transition-all ${
                  scannerActive
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                    : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {scannerActive ? (
                  <>
                    <VideoCameraSlashIcon className="h-6 w-6" />
                    Arrêter la caméra
                  </>
                ) : (
                  <>
                    <VideoCameraIcon className="h-6 w-6" />
                    Ouvrir la caméra
                  </>
                )}
              </button>

              {/* Camera selector */}
              {cameras.length > 1 && scannerActive && (
                <select
                  value={selectedCamera}
                  onChange={(e) => switchCamera(e.target.value)}
                  className="input py-3 px-4 text-sm"
                >
                  {cameras.map(cam => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Caméra ${cameras.indexOf(cam) + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {!scannerActive && cameras.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">
                <CameraIcon className="h-4 w-4 inline mr-1" />
                Cliquez pour autoriser l'accès à la caméra
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-sm text-gray-400 font-medium">ou saisie manuelle</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Code unique (ex: ABC123XY)"
              className="input text-center text-lg uppercase tracking-widest flex-1"
            />
            <button
              type="submit"
              disabled={!code.trim() || scanMutation.isLoading}
              className="btn-primary btn-lg"
            >
              {scanMutation.isLoading ? (
                <ArrowPathIcon className="h-6 w-6 animate-spin" />
              ) : (
                'Valider'
              )}
            </button>
          </form>

          {/* Last Scan Result */}
          {lastScan && (
            <div className={`mt-6 p-4 rounded-xl ${
              lastScan.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {lastScan.success ? (
                <div className="flex items-center justify-center space-x-3">
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                  <div className="text-left">
                    <p className="font-medium text-green-800">
                      {lastScan.guest.firstName} {lastScan.guest.lastName}
                    </p>
                    <p className="text-sm text-green-600">
                      Enregistré à {format(new Date(lastScan.time), 'HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <XCircleIcon className="h-8 w-8 text-red-500" />
                  <p className="text-red-800">{lastScan.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Check-ins */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-gray-900">
            Arrivées récentes
          </h2>
          <span className="pulse-dot text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">
            En direct
          </span>
        </div>

        {recentCheckins.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Aucune arrivée pour le moment
          </div>
        ) : (
          <div className="divide-y max-h-96 overflow-y-auto">
            {recentCheckins.map((checkIn) => (
              <div key={checkIn.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium">
                      {checkIn.guest?.firstName?.[0]}{checkIn.guest?.lastName?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {checkIn.guest?.firstName} {checkIn.guest?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(checkIn.checkedInAt), 'HH:mm', { locale: fr })}
                      {checkIn.guest?.tableNumber && (
                        <span className="ml-2">• Table {checkIn.guest.tableNumber}</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => undoMutation.mutate(checkIn.id)}
                  className="text-sm text-gray-500 hover:text-red-600"
                  disabled={undoMutation.isLoading}
                >
                  Annuler
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
