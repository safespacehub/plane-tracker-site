import { useEffect, useState } from 'react'
import { supabase, Device, Plane, Session } from '../../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

interface Stats {
  totalDevices: number
  totalPlanes: number
  activeSessions: number
  totalFlightHours: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalDevices: 0,
    totalPlanes: 0,
    activeSessions: 0,
    totalFlightHours: 0,
  })
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch devices
      const { data: devicesData } = await supabase
        .from('devices')
        .select('*, plane:planes(*)')
        .eq('user_id', user.id)

      // Fetch planes
      const { data: planesData } = await supabase
        .from('planes')
        .select('*')
        .eq('user_id', user.id)

      // Fetch sessions for user's devices
      const deviceUuids = devicesData?.map(d => d.device_uuid) || []
      let sessionsData: Session[] = []
      let totalSeconds = 0

      if (deviceUuids.length > 0) {
        const { data } = await supabase
          .from('sessions')
          .select('*')
          .in('device_uuid', deviceUuids)
          .order('created_at', { ascending: false })
          .limit(10)

        sessionsData = data || []

        // Calculate total flight hours
        const { data: allSessions } = await supabase
          .from('sessions')
          .select('run_seconds')
          .in('device_uuid', deviceUuids)

        totalSeconds = allSessions?.reduce((sum, s) => sum + (s.run_seconds || 0), 0) || 0
      }

      // Count active sessions
      const activeSessions = sessionsData.filter(s => s.status === 'open').length

      setStats({
        totalDevices: devicesData?.length || 0,
        totalPlanes: planesData?.length || 0,
        activeSessions,
        totalFlightHours: Math.round(totalSeconds / 3600 * 10) / 10, // Convert to hours with 1 decimal
      })

      setRecentSessions(sessionsData)
      setDevices(devicesData || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your flight tracking at a glance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Devices */}
        <div className="card p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Devices
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.totalDevices}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-primary-600 dark:text-primary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Planes */}
        <div className="card p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Planes
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.totalPlanes}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
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
        </div>

        {/* Active Sessions */}
        <div className="card p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Sessions
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.activeSessions}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Flight Hours */}
        <div className="card p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Flight Hours
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.totalFlightHours}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
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
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        {recentSessions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No sessions yet. Connect a device to start tracking.
          </p>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => {
              const device = devices.find(d => d.device_uuid === session.device_uuid)
              const hours = Math.floor(session.run_seconds / 3600)
              const minutes = Math.floor((session.run_seconds % 3600) / 60)

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${session.status === 'open' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {device?.name || 'Unknown Device'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {device?.plane?.tail_number || 'No plane assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {hours}h {minutes}m
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(session.session_start), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/devices"
          className="card p-6 card-hover cursor-pointer text-center"
        >
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-primary-600 dark:text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Manage Devices
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add, edit, or assign devices to planes
          </p>
        </a>

        <a
          href="/planes"
          className="card p-6 card-hover cursor-pointer text-center"
        >
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Manage Planes
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add or edit your aircraft fleet
          </p>
        </a>

        <a
          href="/sessions"
          className="card p-6 card-hover cursor-pointer text-center"
        >
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-purple-600 dark:text-purple-400"
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
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            View All Sessions
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Detailed flight history and analytics
          </p>
        </a>
      </div>
    </div>
  )
}

