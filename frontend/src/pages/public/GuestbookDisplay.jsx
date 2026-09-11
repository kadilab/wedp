import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { guestbookAPI } from '../../services/api'
import { socketService } from '../../services/socket'
import { AnimatePresence, motion } from 'framer-motion'
import { QrCodeIcon } from '@heroicons/react/24/outline'
import { QRCodeCanvas } from 'qrcode.react'

const ROTATE_MS = 7000

export default function GuestbookDisplay() {
  const { slug } = useParams()
  const [posts, setPosts] = useState([])
  const [index, setIndex] = useState(0)

  const { data } = useQuery(['guestbook-wall', slug], () => guestbookAPI.getWall(slug))
  const wedding = data?.data?.wedding

  useEffect(() => {
    if (data?.data?.posts) setPosts(data.data.posts)
  }, [data])

  useEffect(() => {
    if (!wedding?.id) return
    socketService.connect()
    socketService.joinWedding(wedding.id)
    socketService.onGuestbookPost(({ post }) => {
      setPosts((prev) => [post, ...prev])
      setIndex(0)
    })
    return () => {
      socketService.leaveWedding(wedding.id)
      socketService.offGuestbookPost()
    }
  }, [wedding?.id])

  useEffect(() => {
    if (posts.length < 2) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % posts.length), ROTATE_MS)
    return () => clearInterval(timer)
  }, [posts.length])

  const current = posts[index]
  const submitUrl = useMemo(() => `${window.location.origin}/gb/${slug}`, [slug])

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0b0713] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,92,0,0.18),_transparent_60%)]" />

      <div className="relative flex items-center justify-between px-8 py-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary-400">Livre d'or</p>
          <h1 className="font-serif text-2xl font-bold sm:text-3xl">{wedding?.title || '...'}</h1>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 backdrop-blur">
          <div className="rounded-lg bg-white p-1.5">
            <QRCodeCanvas value={submitUrl} size={64} />
          </div>
          <div className="text-left text-xs text-white/60">
            <p className="inline-flex items-center gap-1 font-medium text-white"><QrCodeIcon className="h-4 w-4" /> Scannez</p>
            <p>pour partager une photo</p>
          </div>
        </div>
      </div>

      <div className="relative flex min-h-[70vh] items-center justify-center px-6 pb-16">
        {posts.length === 0 ? (
          <p className="text-white/30">En attente des premiers messages...</p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={current?.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.6 }}
              className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center"
            >
              {current?.photoUrl && (
                <img
                  src={current.photoUrl}
                  alt=""
                  className="max-h-[50vh] rounded-2xl object-contain shadow-2xl"
                />
              )}
              {current?.message && (
                <p className="font-serif text-2xl leading-relaxed sm:text-3xl">"{current.message}"</p>
              )}
              <p className="text-lg font-medium text-primary-300">— {current?.authorName}</p>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {posts.length > 1 && (
        <div className="relative flex justify-center gap-1.5 pb-8">
          {posts.slice(0, 20).map((p, i) => (
            <span
              key={p.id}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-primary-400' : 'w-1.5 bg-white/20'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
