import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from 'react-query'
import { checkinAPI, weddingAPI } from '../../services/api'
import { socketService } from '../../services/socket'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeftIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  UserGroupIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { getEventDisplayTitle } from '../../utils/eventTypes'

const MAX_FEED_ITEMS = 8

export default function LiveDisplay() {
  const { id: weddingId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [feed, setFeed] = useState([])

  const { data: weddingData } = useQuery(['wedding', weddingId], () => weddingAPI.getOne(weddingId))
  const wedding = weddingData?.data?.wedding

  const { data: statsData } = useQuery(
    ['checkinStats', weddingId],
    () => checkinAPI.getLive(weddingId),
    { refetchInterval: 8000 }
  )
  const stats = statsData?.data?.stats
  const recentCheckins = statsData?.data?.recentCheckIns || []

  // Seed the feed from the initial fetch, then only append via socket events.
  useEffect(() => {
    if (feed.length === 0 && recentCheckins.length > 0) {
      setFeed(recentCheckins.slice(0, MAX_FEED_ITEMS).map(c => ({
        id: c.id,
        name: `${c.guest.firstName} ${c.guest.lastName}`,
        tableNumber: c.guest.tableNumber
      })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentCheckins])

  useEffect(() => {
    socketService.connect()
    socketService.joinWedding(weddingId)

    socketService.onCheckIn((data) => {
      queryClient.invalidateQueries(['checkinStats', weddingId])
      setFeed((prev) => [
        { id: data.checkIn?.id || `${data.guest.id}-${Date.now()}`, name: data.guest.name, tableNumber: data.guest.tableNumber },
        ...prev
      ].slice(0, MAX_FEED_ITEMS))
    })

    return () => {
      socketService.leaveWedding(weddingId)
      socketService.offCheckIn()
    }
  }, [weddingId, queryClient])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }, [])

  const total = stats?.totalExpected || 0
  const checkedIn = stats?.checkedInWithPlusOnes || 0
  const percent = total > 0 ? Math.min(100, Math.round((checkedIn / total) * 100)) : 0
  const eventTitle = wedding ? getEventDisplayTitle(wedding) : ''

  return (
    <div className="min-h-screen w-full bg-[#0b0713] text-white overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={() => navigate(`/weddings/${weddingId}`)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Retour
        </button>
        <button
          onClick={toggleFullscreen}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isFullscreen ? <ArrowsPointingInIcon className="h-4 w-4" /> : <ArrowsPointingOutIcon className="h-4 w-4" />}
          {isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        </button>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-16 pt-6 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-primary-400">Bienvenue</p>
        <h1 className="mt-3 font-serif text-4xl font-bold sm:text-6xl">{eventTitle || '...'}</h1>
        {wedding?.weddingDate && (
          <p className="mt-2 text-white/50">{format(new Date(wedding.weddingDate), 'EEEE d MMMM yyyy', { locale: fr })}</p>
        )}

        {/* Progress */}
        <div className="mt-12 w-full max-w-xl">
          <div className="flex items-end justify-center gap-3">
            <span className="text-7xl font-bold tabular-nums sm:text-8xl">{checkedIn}</span>
            <span className="mb-2 text-2xl text-white/40">/ {total}</span>
          </div>
          <p className="mt-1 text-white/50">invités arrivés</p>
          <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-2 text-sm text-white/40">{percent}%</p>
        </div>

        {/* Live arrivals feed */}
        <div className="mt-14 w-full max-w-xl">
          <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-white/40">
            <UserGroupIcon className="h-4 w-4" /> Dernières arrivées
          </p>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {feed.length === 0 && (
                <p className="py-8 text-white/30">En attente des premières arrivées...</p>
              )}
              {feed.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-5 py-3 backdrop-blur"
                >
                  <span className="inline-flex items-center gap-2 font-medium">
                    <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
                    {item.name}
                  </span>
                  {item.tableNumber && (
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/60">Table {item.tableNumber}</span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
