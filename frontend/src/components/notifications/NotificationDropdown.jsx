import { useState, useRef, useEffect, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { userAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import socketService from '../../services/socket'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  BellIcon,
  BellAlertIcon,
  CheckIcon,
  CheckCircleIcon,
  TrashIcon,
  HeartIcon,
  UserGroupIcon,
  CreditCardIcon,
  TicketIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

const NOTIFICATION_ICONS = {
  wedding: HeartIcon,
  guest: UserGroupIcon,
  payment: CreditCardIcon,
  rsvp: TicketIcon,
  invitation: EnvelopeIcon,
  checkin: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
  system: BellIcon
}

const NOTIFICATION_COLORS = {
  wedding: 'text-pink-500 bg-pink-50',
  guest: 'text-blue-500 bg-blue-50',
  payment: 'text-green-500 bg-green-50',
  rsvp: 'text-purple-500 bg-purple-50',
  invitation: 'text-indigo-500 bg-indigo-50',
  checkin: 'text-emerald-500 bg-emerald-50',
  warning: 'text-amber-500 bg-amber-50',
  info: 'text-sky-500 bg-sky-50',
  system: 'text-gray-500 bg-gray-50'
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Connect socket and listen for real-time notifications
  useEffect(() => {
    if (!user?.id) return

    socketService.connect()
    socketService.joinUser(user.id)

    socketService.onNotification((notification) => {
      // Refresh notification list when a new one arrives
      queryClient.invalidateQueries('notifications')
    })

    return () => {
      socketService.socket?.off('notification')
    }
  }, [user?.id, queryClient])

  // Fetch notifications
  const { data, isLoading } = useQuery(
    'notifications',
    () => userAPI.getNotifications({ limit: 10 }),
    {
      refetchInterval: 30000,
      staleTime: 10000
    }
  )

  const notifications = data?.data?.notifications || []
  const unreadCount = data?.data?.unreadCount || 0

  // Mark single as read
  const markReadMutation = useMutation(
    (id) => userAPI.markNotificationRead(id),
    {
      onSuccess: () => queryClient.invalidateQueries('notifications')
    }
  )

  // Mark all as read
  const markAllReadMutation = useMutation(
    () => userAPI.markAllNotificationsRead(),
    {
      onSuccess: () => queryClient.invalidateQueries('notifications')
    }
  )

  // Delete notification
  const deleteMutation = useMutation(
    (id) => userAPI.deleteNotification(id),
    {
      onSuccess: () => queryClient.invalidateQueries('notifications')
    }
  )

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id)
    }

    // Navigate based on notification type/data
    if (notification.data?.link) {
      navigate(notification.data.link)
      setIsOpen(false)
    }
  }

  const getIcon = (type) => {
    const Icon = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.info
    return Icon
  }

  const getColorClass = (type) => {
    return NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS.info
  }

  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })
    } catch {
      return ''
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-6 w-6 text-primary-600 animate-pulse" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[32rem] bg-white rounded-xl shadow-2xl border border-gray-100 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <div className="flex items-center space-x-2">
              <BellIcon className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-primary-100 text-primary-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isLoading}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-primary-50 transition-colors"
                  title="Tout marquer comme lu"
                >
                  <CheckIcon className="h-4 w-4 inline mr-1" />
                  Tout lu
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto" />
                <p className="mt-2 text-sm text-gray-500">Chargement...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aucune notification</p>
                <p className="text-sm text-gray-400 mt-1">
                  Vous serez notifié des mises à jour importantes
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notification) => {
                  const Icon = getIcon(notification.type)
                  const colorClass = getColorClass(notification.type)

                  return (
                    <div
                      key={notification.id}
                      className={`group flex items-start px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.isRead ? 'bg-primary-50/30' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="flex-shrink-0 ml-2 w-2 h-2 bg-primary-500 rounded-full mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMutation.mutate(notification.id)
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                          title="Supprimer"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t px-4 py-2 bg-gray-50">
              <button
                onClick={() => {
                  navigate('/profile')
                  setIsOpen(false)
                }}
                className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-1"
              >
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
