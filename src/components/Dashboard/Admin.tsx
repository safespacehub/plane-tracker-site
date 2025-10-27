import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

// Extended device type with owner info
// Note: devices table uses device_uuid as primary key (no separate id column)
interface DeviceWithOwner {
  device_uuid: string
  user_id: string | null
  plane_id: string | null
  name: string | null
  created_at: string
  updated_at: string
  last_seen: string | null
  // Joined data
  user: {
    email: string
  } | null
  plane: {
    id: string
    tail_number: string
    model: string | null
    manufacturer: string | null
  } | null
}

// User type for assigning devices
interface User {
  user_id: string
  email: string
  created_at: string
}

export default function Admin() {
  const [devices, setDevices] = useState<DeviceWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterOwner, setFilterOwner] = useState<string>('all')
  const [owners, setOwners] = useState<{ id: string; email: string }[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithOwner | null>(null)
  const [assignFormData, setAssignFormData] = useState({
    user_id: '',
    name: '',
  })
  
  // Autocomplete state for user email input
  const [emailInput, setEmailInput] = useState('')
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false)

  // Check if current user is an admin and fetch data
  useEffect(() => {
    checkAdminAndFetchData()
  }, [])

  // Close email suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('#assign_user') && !target.closest('.autocomplete-dropdown')) {
        setShowEmailSuggestions(false)
      }
    }

    if (showEmailSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmailSuggestions])

  const checkAdminAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      // Check if user is an admin by querying the admin_users table
      const { data: adminCheck, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .single()

      if (adminError && adminError.code !== 'PGRST116') {
        // PGRST116 is "not found" - user is not admin
        console.error('Error checking admin status:', adminError)
      }

      // If adminCheck exists, user is an admin
      const userIsAdmin = !!adminCheck
      setIsAdmin(userIsAdmin)

      if (!userIsAdmin) {
        setError('Access denied. Admin privileges required.')
        setLoading(false)
        return
      }

      // Call the admin function to get all devices with owner emails
      // This uses a secure SECURITY DEFINER function that joins with auth.users
      const { data: devicesData, error: devicesError } = await supabase
        .rpc('get_admin_devices')

      if (devicesError) {
        console.error('Error fetching admin devices:', devicesError)
        throw devicesError
      }

      // Transform the data into our component's expected format
      // RPC function returns device_uuid as primary identifier (no separate id)
      const devicesWithOwners: DeviceWithOwner[] = (devicesData || []).map((device: any) => ({
        device_uuid: device.device_uuid,
        user_id: device.user_id,
        plane_id: device.plane_id,
        name: device.name,
        created_at: device.created_at,
        updated_at: device.updated_at,
        last_seen: device.last_seen,
        user: device.owner_email ? { email: device.owner_email } : null,
        plane: device.plane_tail_number ? {
          id: device.plane_id,
          tail_number: device.plane_tail_number,
          model: device.plane_model,
          manufacturer: device.plane_manufacturer,
        } : null,
      }))

      // Extract unique owners for filter dropdown
      const uniqueOwners = devicesWithOwners
        .filter(d => d.user && d.user_id)
        .reduce((acc, device) => {
          if (device.user_id && !acc.find(o => o.id === device.user_id)) {
            acc.push({ id: device.user_id, email: device.user?.email || 'Unknown' })
          }
          return acc
        }, [] as { id: string; email: string }[])

      setOwners(uniqueOwners)
      setDevices(devicesWithOwners)

      // Fetch all users for the assign dropdown
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_admin_users')

      if (usersError) {
        console.error('Error fetching users:', usersError)
      } else {
        setAllUsers(usersData || [])
      }
    } catch (error: any) {
      console.error('Error fetching admin data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter devices based on search and owner filter
  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      device.device_uuid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.plane?.tail_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesOwner = 
      filterOwner === 'all' || 
      device.user_id === filterOwner ||
      (filterOwner === 'unassigned' && !device.user_id)

    return matchesSearch && matchesOwner
  })

  // Copy UUID to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  // Open assign modal for a device
  const openAssignModal = (device: DeviceWithOwner) => {
    setSelectedDevice(device)
    setAssignFormData({
      user_id: device.user_id || '',
      name: device.name || '',
    })
    
    // Set email input to current user's email if assigned
    const currentUser = allUsers.find(u => u.user_id === device.user_id)
    setEmailInput(currentUser?.email || '')
    setShowEmailSuggestions(false)
    
    setShowAssignModal(true)
  }

  // Handle email input change for autocomplete
  const handleEmailInputChange = (value: string) => {
    setEmailInput(value)
    setShowEmailSuggestions(true)
    
    // If input is cleared, clear the user_id selection
    if (!value.trim()) {
      setAssignFormData({ ...assignFormData, user_id: '' })
    }
  }

  // Handle selecting a user from autocomplete suggestions
  const handleSelectUser = (user: User) => {
    setEmailInput(user.email)
    setAssignFormData({ ...assignFormData, user_id: user.user_id })
    setShowEmailSuggestions(false)
  }

  // Filter users based on email input for autocomplete
  const filteredUserSuggestions = allUsers.filter(user =>
    user.email.toLowerCase().includes(emailInput.toLowerCase())
  ).slice(0, 10) // Limit to 10 suggestions for performance

  // Handle device assignment/update by admin
  const handleAssignDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedDevice) return

    try {
      // Admin updates device user_id and name
      const { error: updateError } = await supabase
        .from('devices')
        .update({
          user_id: assignFormData.user_id || null,
          name: assignFormData.name || null,
        })
        .eq('device_uuid', selectedDevice.device_uuid)

      if (updateError) throw updateError

      // Reset and refresh
      setShowAssignModal(false)
      setSelectedDevice(null)
      setAssignFormData({ user_id: '', name: '' })
      setEmailInput('')
      setShowEmailSuggestions(false)
      await checkAdminAndFetchData()
    } catch (error: any) {
      console.error('Error assigning device:', error)
      setError(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage all devices across the system. God mode activated.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Admin Mode
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="label">
              Search
            </label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              placeholder="Search by UUID, name, owner, or tail number..."
            />
          </div>

          {/* Owner filter */}
          <div>
            <label htmlFor="owner-filter" className="label">
              Filter by Owner
            </label>
            <select
              id="owner-filter"
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="input"
            >
              <option value="all">All Owners</option>
              <option value="unassigned">Unassigned Devices</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Devices</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{devices.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Assigned</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {devices.filter(d => d.plane_id).length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Unassigned</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {devices.filter(d => !d.plane_id).length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Unique Owners</p>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {owners.length}
          </p>
        </div>
      </div>

      {/* Devices table */}
      {filteredDevices.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || filterOwner !== 'all' ? 'No devices match your filters.' : 'No devices in the system yet.'}
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
                  <th>Owner</th>
                  <th>Assigned Plane</th>
                  <th>Last Seen</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device) => (
                  <tr key={device.device_uuid}>
                    <td>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                          {device.device_uuid}
                        </code>
                        <button
                          onClick={() => copyToClipboard(device.device_uuid)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Copy UUID"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="font-medium text-gray-900 dark:text-white">
                      {device.name || <span className="text-gray-400">Unnamed</span>}
                    </td>
                    <td className="text-sm text-gray-600 dark:text-gray-400">
                      {device.user?.email || <span className="text-gray-400">No owner</span>}
                    </td>
                    <td>
                      {device.plane ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 w-fit">
                            {device.plane.tail_number}
                          </span>
                          {device.plane.model && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {device.plane.model}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </td>
                    <td className="text-sm text-gray-600 dark:text-gray-400">
                      {device.last_seen ? (
                        <div className="flex flex-col">
                          <span>{formatDistanceToNow(new Date(device.last_seen), { addSuffix: true })}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(device.last_seen).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDistanceToNow(new Date(device.created_at), { addSuffix: true })}
                    </td>
                    <td>
                      <button
                        onClick={() => openAssignModal(device)}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium text-sm"
                      >
                        {device.user_id ? 'Edit' : 'Assign User'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info notice */}
      <div className="card p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Admin Tools</p>
            <p>
            image.png              Assign devices to users here. When an ESP32 sends data, it auto-creates an unassigned device. 
              Click "Assign User" to give ownership to a user—they'll see it in their Devices page. 
              Users can then assign the device to a plane. Device UUIDs are shown on the ESP32 serial console.
            </p>
          </div>
        </div>
      </div>

      {/* Assign Device Modal */}
      {showAssignModal && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="card p-6 max-w-md w-full animate-scale-in">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {selectedDevice.user_id ? 'Edit Device Assignment' : 'Assign Device to User'}
            </h2>
            <form onSubmit={handleAssignDevice} className="space-y-4">
              {/* Device UUID (read-only) */}
              <div>
                <label className="label">Device UUID</label>
                <input
                  type="text"
                  value={selectedDevice.device_uuid}
                  className="input bg-gray-100 dark:bg-gray-700"
                  disabled
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  UUID cannot be changed
                </p>
              </div>

              {/* Device Name */}
              <div>
                <label htmlFor="assign_name" className="label">
                  Device Name (optional)
                </label>
                <input
                  id="assign_name"
                  type="text"
                  value={assignFormData.name}
                  onChange={(e) => setAssignFormData({ ...assignFormData, name: e.target.value })}
                  className="input"
                  placeholder="Main Tracker"
                />
              </div>

              {/* User Assignment - Autocomplete */}
              <div className="relative">
                <label htmlFor="assign_user" className="label">
                  Assign to User
                </label>
                <input
                  id="assign_user"
                  type="text"
                  value={emailInput}
                  onChange={(e) => handleEmailInputChange(e.target.value)}
                  onFocus={() => setShowEmailSuggestions(true)}
                  className="input"
                  placeholder="Type email to search..."
                  autoComplete="off"
                />
                
                {/* Autocomplete suggestions dropdown */}
                {showEmailSuggestions && emailInput && filteredUserSuggestions.length > 0 && (
                  <div className="autocomplete-dropdown absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredUserSuggestions.map((user) => (
                      <button
                        key={user.user_id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm text-gray-900 dark:text-white first:rounded-t-lg last:rounded-b-lg"
                      >
                        {user.email}
                      </button>
                    ))}
                  </div>
                )}
                
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {assignFormData.user_id 
                    ? 'User will see this device in their Devices page' 
                    : 'Start typing to search for a user, or leave blank for unassigned'}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false)
                    setSelectedDevice(null)
                    setAssignFormData({ user_id: '', name: '' })
                    setEmailInput('')
                    setShowEmailSuggestions(false)
                    setError(null)
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {selectedDevice.user_id ? 'Update Assignment' : 'Assign Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

