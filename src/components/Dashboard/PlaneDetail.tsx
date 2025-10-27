import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, Plane, Device, Session } from '../../lib/supabase'

// Interface for session stats
interface SessionStats {
  totalSessions: number
  totalFlightTime: number // in seconds
  activeSessions: number
  averageFlightTime: number // in seconds
  longestFlight: number // in seconds
  shortestFlight: number // in seconds
}

// Interface for device with session stats
interface DeviceWithStats extends Device {
  sessionCount: number
  totalFlightTime: number
}

export default function PlaneDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [plane, setPlane] = useState<Plane | null>(null)
  const [devices, setDevices] = useState<DeviceWithStats[]>([])
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    totalFlightTime: 0,
    activeSessions: 0,
    averageFlightTime: 0,
    longestFlight: 0,
    shortestFlight: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchPlaneData()
    }
  }, [id])

  // Fetch all plane-related data
  const fetchPlaneData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch plane details
      const { data: planeData, error: planeError } = await supabase
        .from('planes')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (planeError) throw planeError
      if (!planeData) {
        setError('Plane not found')
        setLoading(false)
        return
      }

      setPlane(planeData)

      // Fetch devices assigned to this plane
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('*')
        .eq('plane_id', id)
        .eq('user_id', user.id)

      if (devicesError) throw devicesError

      // For each device, fetch session statistics
      const devicesWithStats: DeviceWithStats[] = await Promise.all(
        (devicesData || []).map(async (device) => {
          // Get session count and total flight time for this device
          const { data: sessionData } = await supabase
            .from('sessions')
            .select('run_seconds')
            .eq('device_uuid', device.device_uuid)

          const sessionCount = sessionData?.length || 0
          const totalFlightTime = sessionData?.reduce((sum, s) => sum + s.run_seconds, 0) || 0

          return {
            ...device,
            sessionCount,
            totalFlightTime,
          }
        })
      )

      setDevices(devicesWithStats)

      // Fetch all sessions for devices assigned to this plane
      const deviceUuids = devicesData?.map(d => d.device_uuid) || []
      
      if (deviceUuids.length > 0) {
        // Get all sessions for these devices
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .in('device_uuid', deviceUuids)
          .order('session_start', { ascending: false })

        if (sessionsError) throw sessionsError

        // Calculate statistics
        const allSessions = sessionsData || []
        const totalSessions = allSessions.length
        const totalFlightTime = allSessions.reduce((sum, s) => sum + s.run_seconds, 0)
        const activeSessions = allSessions.filter(s => s.status === 'open').length
        const closedSessions = allSessions.filter(s => s.status === 'closed')
        
        // Calculate average, longest, and shortest flight times (only for closed sessions)
        let averageFlightTime = 0
        let longestFlight = 0
        let shortestFlight = 0
        
        if (closedSessions.length > 0) {
          const times = closedSessions.map(s => s.run_seconds)
          averageFlightTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
          longestFlight = Math.max(...times)
          shortestFlight = Math.min(...times)
        }

        setStats({
          totalSessions,
          totalFlightTime,
          activeSessions,
          averageFlightTime,
          longestFlight,
          shortestFlight,
        })

        // Set recent sessions (top 10)
        setRecentSessions(allSessions.slice(0, 10))
      }

    } catch (error: any) {
      console.error('Error fetching plane data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Format seconds to hours and minutes
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  // Format seconds to Hobbs meter format (decimal hours)
  const formatHobbs = (seconds: number): string => {
    const hours = seconds / 3600
    return hours.toFixed(2)
  }

  // Format relative time (e.g., "2 hours ago")
  const formatRelativeTime = (timestamp: string | null): string => {
    if (!timestamp) return 'Never'
    const now = new Date()
    const past = new Date(timestamp)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  }

  // Format date
  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Error state
  if (error || !plane) {
    return (
      <div className="space-y-6">
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {error || 'Plane not found'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The requested plane doesn't exist or you don't have access to it.
          </p>
          <button onClick={() => navigate('/planes')} className="btn-primary">
            Back to Planes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/planes')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
          title="Back to Planes"
        >
          <svg
            className="w-6 h-6 text-gray-600 dark:text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {plane.tail_number}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {plane.model && plane.manufacturer 
              ? `${plane.manufacturer} ${plane.model}`
              : plane.model || plane.manufacturer || 'Aircraft Details'}
          </p>
        </div>
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-xl flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary-600 dark:text-primary-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7l6-3 6 3v13l-6 3-6-3V7zm6-3v16m6-13l6-3v13l-6 3"
            />
          </svg>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Flight Time */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Flight Time
            </span>
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-blue-600 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatDuration(stats.totalFlightTime)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {formatHobbs(stats.totalFlightTime)} Hobbs
          </p>
        </div>

        {/* Total Flights */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Flights
            </span>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalSessions}
          </p>
          {stats.activeSessions > 0 && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {stats.activeSessions} active now
            </p>
          )}
        </div>

        {/* Average Flight Time */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Average Flight
            </span>
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-purple-600 dark:text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.averageFlightTime > 0 ? formatDuration(stats.averageFlightTime) : 'N/A'}
          </p>
          {stats.averageFlightTime > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formatHobbs(stats.averageFlightTime)} Hobbs
            </p>
          )}
        </div>

        {/* Assigned Devices */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Assigned Devices
            </span>
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-orange-600 dark:text-orange-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {devices.length}
          </p>
        </div>
      </div>

      {/* Additional stats row */}
      {stats.longestFlight > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Longest Flight */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Longest Flight
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatDuration(stats.longestFlight)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatHobbs(stats.longestFlight)} Hobbs
                </p>
              </div>
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Shortest Flight */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Shortest Flight
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatDuration(stats.shortestFlight)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatHobbs(stats.shortestFlight)} Hobbs
                </p>
              </div>
              <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-teal-600 dark:text-teal-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assigned Devices */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Assigned Devices
        </h2>
        {devices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No devices assigned to this plane yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.device_uuid}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-primary-600 dark:text-primary-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {device.name || 'Unnamed Device'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {device.device_uuid}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {device.sessionCount} flight{device.sessionCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDuration(device.totalFlightTime)} ({formatHobbs(device.totalFlightTime)}h)
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Last seen: {formatRelativeTime(device.last_seen)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        {recentSessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No flight activity recorded yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Device
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Start Time
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Duration
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Hobbs
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session) => {
                  // Find the device for this session
                  const device = devices.find(d => d.device_uuid === session.device_uuid)
                  
                  return (
                    <tr
                      key={session.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        {device?.name || session.device_uuid.slice(0, 8) + '...'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(session.session_start)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium">
                        {formatDuration(session.run_seconds)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {formatHobbs(session.run_seconds)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            session.status === 'open'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {session.status === 'open' ? 'Active' : 'Completed'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/devices')}
            className="btn-secondary"
          >
            Manage Devices
          </button>
          <button
            onClick={() => navigate('/sessions')}
            className="btn-secondary"
          >
            View All Sessions
          </button>
          <button
            onClick={() => navigate('/planes')}
            className="btn-secondary"
          >
            Back to Planes
          </button>
        </div>
      </div>
    </div>
  )
}

