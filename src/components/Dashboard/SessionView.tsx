import { useEffect, useState } from 'react'
import { supabase, Session, Device } from '../../lib/supabase'
import { format, formatDistanceToNow } from 'date-fns'

interface SessionWithDevice extends Session {
  device?: Device
}

export default function SessionView() {
  const [sessions, setSessions] = useState<SessionWithDevice[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDevice, setFilterDevice] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Fetch sessions and devices
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch user's devices with plane info
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('*, plane:planes(*)')
        .eq('user_id', user.id)

      if (devicesError) throw devicesError

      const deviceUuids = devicesData?.map(d => d.device_uuid) || []

      // Fetch sessions for user's devices
      let sessionsQuery = supabase
        .from('sessions')
        .select('*')
        .in('device_uuid', deviceUuids)
        .order('session_start', { ascending: false })

      const { data: sessionsData, error: sessionsError } = await sessionsQuery

      if (sessionsError) throw sessionsError

      // Merge device info into sessions
      const sessionsWithDevices = sessionsData?.map(session => ({
        ...session,
        device: devicesData?.find(d => d.device_uuid === session.device_uuid),
      })) || []

      setDevices(devicesData || [])
      setSessions(sessionsWithDevices)
    } catch (error: any) {
      console.error('Error fetching data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    if (filterDevice && session.device_uuid !== filterDevice) return false
    if (filterStatus && session.status !== filterStatus) return false
    return true
  })

  // Calculate total hours for filtered sessions
  const totalHours = filteredSessions.reduce((sum, s) => sum + (s.run_seconds || 0), 0) / 3600

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Session Start', 'Device', 'Plane', 'Duration', 'Status', 'Last Update']
    const rows = filteredSessions.map(session => [
      session.session_start,
      session.device?.name || session.device_uuid,
      session.device?.plane?.tail_number || 'N/A',
      formatDuration(session.run_seconds),
      session.status,
      session.last_update || 'N/A',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sessions-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Flight Sessions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete history of all tracked flight time.
          </p>
        </div>
        {filteredSessions.length > 0 && (
          <button
            onClick={exportToCSV}
            className="btn-secondary"
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total Sessions
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {filteredSessions.length}
          </p>
        </div>
        <div className="card p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total Flight Hours
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {totalHours.toFixed(1)}
          </p>
        </div>
        <div className="card p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Active Sessions
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {filteredSessions.filter(s => s.status === 'open').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filter_device" className="label">
              Device
            </label>
            <select
              id="filter_device"
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value)}
              className="input"
            >
              <option value="">All Devices</option>
              {devices.map((device) => (
                <option key={device.device_uuid} value={device.device_uuid}>
                  {device.name || device.device_uuid.substring(0, 8)}
                  {device.plane ? ` (${device.plane.tail_number})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter_status" className="label">
              Status
            </label>
            <select
              id="filter_status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sessions table */}
      {filteredSessions.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
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
          <p className="text-gray-500 dark:text-gray-400">
            No sessions found. Your devices will appear here once they start tracking.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Session Start</th>
                  <th>Device</th>
                  <th>Plane</th>
                  <th>Duration</th>
                  <th>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            session.status === 'open' ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        ></div>
                        <span className="capitalize text-sm font-medium">
                          {session.status}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {format(new Date(session.session_start), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(session.session_start), 'h:mm a')}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {session.device?.name || 'Unknown Device'}
                        </p>
                        <code className="text-xs text-gray-500 dark:text-gray-400">
                          {session.device_uuid.substring(0, 8)}...
                        </code>
                      </div>
                    </td>
                    <td>
                      {session.device?.plane ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                          {session.device.plane.tail_number}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Not assigned</span>
                      )}
                    </td>
                    <td className="font-medium text-gray-900 dark:text-white">
                      {formatDuration(session.run_seconds)}
                    </td>
                    <td className="text-sm text-gray-600 dark:text-gray-400">
                      {session.last_update ? (
                        formatDistanceToNow(new Date(session.last_update), { addSuffix: true })
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary by plane */}
      {filteredSessions.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Flight Time by Plane
          </h3>
          <div className="space-y-3">
            {devices
              .filter(device => device.plane)
              .map((device) => {
                const deviceSessions = filteredSessions.filter(
                  s => s.device_uuid === device.device_uuid
                )
                const totalSeconds = deviceSessions.reduce(
                  (sum, s) => sum + (s.run_seconds || 0),
                  0
                )
                const hours = totalSeconds / 3600

                if (hours === 0) return null

                return (
                  <div
                    key={device.device_uuid}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {device.plane?.tail_number}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {device.plane?.model || 'Unknown Model'} • {deviceSessions.length} sessions
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {hours.toFixed(1)}h
                      </p>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

