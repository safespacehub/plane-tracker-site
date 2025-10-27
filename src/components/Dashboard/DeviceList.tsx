import { useEffect, useState } from 'react'
import { supabase, Device, Plane } from '../../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

export default function DeviceList() {
  const [devices, setDevices] = useState<Device[]>([])
  const [planes, setPlanes] = useState<Plane[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    plane_id: '',
  })
  const [error, setError] = useState<string | null>(null)

  // Fetch devices and planes
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch devices with plane info
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('*, plane:planes(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (devicesError) throw devicesError

      // Fetch all planes for dropdown
      const { data: planesData, error: planesError } = await supabase
        .from('planes')
        .select('*')
        .eq('user_id', user.id)
        .order('tail_number', { ascending: true })

      if (planesError) throw planesError

      setDevices(devicesData || [])
      setPlanes(planesData || [])
    } catch (error: any) {
      console.error('Error fetching data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Update device
  // Note: devices table uses device_uuid as primary key
  const handleUpdateDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedDevice) return

    try {
      const { error } = await supabase
        .from('devices')
        .update({
          name: formData.name || null,
          plane_id: formData.plane_id || null,
        })
        .eq('device_uuid', selectedDevice.device_uuid)

      if (error) throw error

      // Reset form and close modal
      setFormData({ name: '', plane_id: '' })
      setShowEditModal(false)
      setSelectedDevice(null)
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  // Delete device
  // Note: Pass device_uuid (the primary key), not a separate id
  const handleDeleteDevice = async (deviceUuid: string) => {
    if (!confirm('Are you sure you want to delete this device? This will NOT delete associated session data.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('device_uuid', deviceUuid)

      if (error) throw error

      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  // Open edit modal
  const openEditModal = (device: Device) => {
    setSelectedDevice(device)
    setFormData({
      name: device.name || '',
      plane_id: device.plane_id || '',
    })
    setShowEditModal(true)
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Devices
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your tracking devices and plane assignments. Contact an admin to get devices assigned to your account.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Devices table */}
      {devices.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">📱</div>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            No devices assigned yet.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Contact an admin to have devices assigned to your account.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Device UUID</th>
                  <th>Name</th>
                  <th>Assigned Plane</th>
                  <th>Last Seen</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.device_uuid}>
                    <td>
                      <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {device.device_uuid.substring(0, 8)}...
                      </code>
                    </td>
                    <td className="font-medium text-gray-900 dark:text-white">
                      {device.name || <span className="text-gray-400">Unnamed</span>}
                    </td>
                    <td>
                      {device.plane ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                          {device.plane.tail_number}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </td>
                    <td className="text-sm text-gray-600 dark:text-gray-400">
                      {device.last_seen ? (
                        formatDistanceToNow(new Date(device.last_seen), { addSuffix: true })
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(device)}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device.device_uuid)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 font-medium text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="card p-6 max-w-md w-full animate-scale-in">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Edit Device
            </h2>
            <form onSubmit={handleUpdateDevice} className="space-y-4">
              <div>
                <label className="label">Device UUID</label>
                <input
                  type="text"
                  value={selectedDevice?.device_uuid || ''}
                  className="input bg-gray-100 dark:bg-gray-700"
                  disabled
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  UUID cannot be changed
                </p>
              </div>

              <div>
                <label htmlFor="edit_name" className="label">
                  Device Name
                </label>
                <input
                  id="edit_name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Main Tracker"
                />
              </div>

              <div>
                <label htmlFor="edit_plane_id" className="label">
                  Assign to Plane
                </label>
                <select
                  id="edit_plane_id"
                  value={formData.plane_id}
                  onChange={(e) => setFormData({ ...formData, plane_id: e.target.value })}
                  className="input"
                >
                  <option value="">None</option>
                  {planes.map((plane) => (
                    <option key={plane.id} value={plane.id}>
                      {plane.tail_number} - {plane.model || 'Unknown Model'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedDevice(null)
                    setFormData({ name: '', plane_id: '' })
                    setError(null)
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Update Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

