import { useState, useEffect } from 'react'
import { fetchRecentEvents } from '../api/events'

export default function Updates() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadRecentEvents()
  }, [])

  const loadRecentEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchRecentEvents(10)
      setActivities(data)
    } catch (error) {
      console.error('Error fetching events:', error)
      setError('Failed to load updates from database')
    } finally {
      setLoading(false)
    }
  }

  const capitalizeFirstLetter = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const formatTimestamp = (timestamp) => {
    const eventTime = new Date(timestamp)
    return eventTime.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getEventType = (eventName) => {
    const alertEvents = ['fallen', 'fall', 'emergency', '911']
    const eventLower = eventName.toLowerCase()
    
    if (alertEvents.some(alert => eventLower.includes(alert))) {
      return 'alert'
    }
    return 'activity'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-[#C8B5E8] px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Updates</h2>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-600">Loading updates from database...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-[#C8B5E8] px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Updates</h2>
        </div>
        <div className="p-6">
          <div className="text-center text-red-600">{error}</div>
          <button 
            onClick={loadRecentEvents}
            className="mt-4 mx-auto block bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Purple header */}
      <div className="bg-[#C8B5E8] px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900">Updates</h2>
      </div>

      {/* Content */}
      <div className="h-80 overflow-y-auto">
      <div className="p-6 space-y-3">
        {activities.length === 0 ? (
          <div className="text-center text-gray-600 py-8">
            No events found in database
          </div>
        ) : (
          activities.map((activity, index) => {
            const eventType = getEventType(activity.event || activity.action)
            const isUnread = index < 3 // Mark first 3 as unread
            const timeDisplay = formatTimestamp(activity.timestamp)
            const actionDisplay = activity.event || activity.action

            return (
              <div
                key={index}
                className={`rounded-lg p-4 relative ${
                  eventType === "alert"
                    ? "bg-red-100 border-l-4 border-red-500"
                    : isUnread
                      ? "bg-blue-50 border-l-4 border-blue-500"
                      : "bg-gray-50"
                }`}
              >
                {isUnread && (
                  <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
                <div className="text-base text-gray-900">
                  <span className="font-medium">{timeDisplay}</span>
                  <span className="mx-2">-</span>
                  <span className={eventType === "alert" ? "font-bold text-red-700" : ""}>
                    {capitalizeFirstLetter(actionDisplay)}
                  </span>
                  {isUnread && (
                    <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">NEW</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
      </div>
    </div>
  )
} 