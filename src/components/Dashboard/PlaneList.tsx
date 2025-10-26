import { useEffect, useState } from 'react'
import { supabase, Plane } from '../../lib/supabase'

export default function PlaneList() {
  const [planes, setPlanes] = useState<Plane[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPlane, setSelectedPlane] = useState<Plane | null>(null)
  const [formData, setFormData] = useState({
    tail_number: '',
    model: '',
    manufacturer: '',
  })
  const [error, setError] = useState<string | null>(null)

  // Fetch planes
  useEffect(() => {
    fetchPlanes()
  }, [])

  const fetchPlanes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('planes')
        .select('*')
        .eq('user_id', user.id)
        .order('tail_number', { ascending: true })

      if (error) throw error

      setPlanes(data || [])
    } catch (error: any) {
      console.error('Error fetching planes:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Add new plane
  const handleAddPlane = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('planes')
        .insert([{
          tail_number: formData.tail_number,
          model: formData.model || null,
          manufacturer: formData.manufacturer || null,
          user_id: user.id,
        }])

      if (error) throw error

      // Reset form and close modal
      setFormData({ tail_number: '', model: '', manufacturer: '' })
      setShowAddModal(false)
      fetchPlanes()
    } catch (error: any) {
      setError(error.message)
    }
  }

  // Update plane
  const handleUpdatePlane = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedPlane) return

    try {
      const { error } = await supabase
        .from('planes')
        .update({
          tail_number: formData.tail_number,
          model: formData.model || null,
          manufacturer: formData.manufacturer || null,
        })
        .eq('id', selectedPlane.id)

      if (error) throw error

      // Reset form and close modal
      setFormData({ tail_number: '', model: '', manufacturer: '' })
      setShowEditModal(false)
      setSelectedPlane(null)
      fetchPlanes()
    } catch (error: any) {
      setError(error.message)
    }
  }

  // Delete plane
  const handleDeletePlane = async (planeId: string) => {
    if (!confirm('Are you sure you want to delete this plane? Devices assigned to this plane will be unassigned.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('planes')
        .delete()
        .eq('id', planeId)

      if (error) throw error

      fetchPlanes()
    } catch (error: any) {
      setError(error.message)
    }
  }

  // Open edit modal
  const openEditModal = (plane: Plane) => {
    setSelectedPlane(plane)
    setFormData({
      tail_number: plane.tail_number,
      model: plane.model || '',
      manufacturer: plane.manufacturer || '',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Planes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your aircraft fleet.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          + Add Plane
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Planes grid */}
      {planes.length === 0 ? (
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
                d="M3 7l6-3 6 3v13l-6 3-6-3V7zm6-3v16m6-13l6-3v13l-6 3"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No planes yet. Add your first aircraft.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            Add Your First Plane
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {planes.map((plane) => (
            <div key={plane.id} className="card p-6 card-hover">
              <div className="flex items-start justify-between mb-4">
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
                      d="M3 7l6-3 6 3v13l-6 3-6-3V7zm6-3v16m6-13l6-3v13l-6 3"
                    />
                  </svg>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(plane)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-gray-600 dark:text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeletePlane(plane.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-red-600 dark:text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {plane.tail_number}
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <span className="font-medium w-24">Model:</span>
                  <span>{plane.model || 'Not specified'}</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <span className="font-medium w-24">Manufacturer:</span>
                  <span>{plane.manufacturer || 'Not specified'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Plane Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="card p-6 max-w-md w-full animate-scale-in">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Add Plane
            </h2>
            <form onSubmit={handleAddPlane} className="space-y-4">
              <div>
                <label htmlFor="tail_number" className="label">
                  Tail Number *
                </label>
                <input
                  id="tail_number"
                  type="text"
                  value={formData.tail_number}
                  onChange={(e) => setFormData({ ...formData, tail_number: e.target.value })}
                  className="input"
                  placeholder="N12345"
                  required
                />
              </div>

              <div>
                <label htmlFor="model" className="label">
                  Model
                </label>
                <input
                  id="model"
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="input"
                  placeholder="Cessna 172"
                />
              </div>

              <div>
                <label htmlFor="manufacturer" className="label">
                  Manufacturer
                </label>
                <input
                  id="manufacturer"
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="input"
                  placeholder="Cessna"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setFormData({ tail_number: '', model: '', manufacturer: '' })
                    setError(null)
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Add Plane
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Plane Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="card p-6 max-w-md w-full animate-scale-in">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Edit Plane
            </h2>
            <form onSubmit={handleUpdatePlane} className="space-y-4">
              <div>
                <label htmlFor="edit_tail_number" className="label">
                  Tail Number *
                </label>
                <input
                  id="edit_tail_number"
                  type="text"
                  value={formData.tail_number}
                  onChange={(e) => setFormData({ ...formData, tail_number: e.target.value })}
                  className="input"
                  placeholder="N12345"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_model" className="label">
                  Model
                </label>
                <input
                  id="edit_model"
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="input"
                  placeholder="Cessna 172"
                />
              </div>

              <div>
                <label htmlFor="edit_manufacturer" className="label">
                  Manufacturer
                </label>
                <input
                  id="edit_manufacturer"
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="input"
                  placeholder="Cessna"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedPlane(null)
                    setFormData({ tail_number: '', model: '', manufacturer: '' })
                    setError(null)
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Update Plane
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

