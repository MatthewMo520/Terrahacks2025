import { useState, useEffect } from "react"
import { fetchChecklistData } from "../api/events"

export default function Checklist() {
  const [checklistData, setChecklistData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadChecklistData()
  }, [])

  const loadChecklistData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchChecklistData()
      
      // Convert MongoDB data to checklist format
      const convertedData = [
        {
          time: "Morning (6AM-12PM)",
          items: [
            { name: "Breakfast", completed: data.checklist.morning.food },
            { name: "Water", completed: data.checklist.morning.water },
            { name: "Medication", completed: data.checklist.morning.medication }
          ]
        },
        {
          time: "Afternoon (12PM-6PM)",
          items: [
            { name: "Lunch", completed: data.checklist.afternoon.food },
            { name: "Water", completed: data.checklist.afternoon.water },
            { name: "Medication", completed: data.checklist.afternoon.medication }
          ]
        },
        {
          time: "Evening (6PM-10PM)",
          items: [
            { name: "Dinner", completed: data.checklist.evening.food },
            { name: "Water", completed: data.checklist.evening.water },
            { name: "Medication", completed: data.checklist.evening.medication }
          ]
        }
      ]
      
      setChecklistData(convertedData)
    } catch (error) {
      console.error('Error loading checklist data:', error)
      setError('Failed to load checklist from database')
    } finally {
      setLoading(false)
    }
  }

  const STATUS_CONFIG = {
    colors: {
      completed: "bg-green-500 border-green-500",
      incomplete: "bg-red-500 border-red-500",
      progress: "bg-green-500",
    }
  }

  const calculateProgress = () => {
    if (!checklistData) return 0
    const totalItems = checklistData.reduce((total, section) => total + section.items.length, 0)
    const completedItems = checklistData.reduce(
      (total, section) => total + section.items.filter((item) => item.completed).length,
      0,
    )
    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0
  }

  const toggleItem = (sectionIndex, itemIndex) => {
    const newData = [...checklistData]
    newData[sectionIndex].items[itemIndex].completed = !newData[sectionIndex].items[itemIndex].completed
    setChecklistData(newData)
  }

  const progressPercentage = calculateProgress()

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-[#C8B5E8] px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Checklist</h2>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-600">Loading checklist from database...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-[#C8B5E8] px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Checklist</h2>
        </div>
        <div className="p-6">
          <div className="text-center text-red-600">{error}</div>
          <button
            onClick={loadChecklistData}
            className="mt-4 mx-auto block bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!checklistData) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-[#C8B5E8] px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Checklist</h2>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-600">No checklist data available</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#C8B5E8] px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900">Checklist</h2>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="bg-gray-200 h-3 rounded-full overflow-hidden">
            <div
              className={`${STATUS_CONFIG.colors.progress} h-full transition-all duration-300 rounded-full`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Checklist Sections */}
        <div className="space-y-6">
          {checklistData.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <div className="text-sm font-medium text-gray-600 mb-3">{section.time}</div>

              <div className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleItem(sectionIndex, itemIndex)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md ${
                          item.completed
                            ? `${STATUS_CONFIG.colors.completed} hover:bg-green-600 hover:border-green-600`
                            : `${STATUS_CONFIG.colors.incomplete} hover:bg-red-600 hover:border-red-600`
                        }`}
                      >
                        {item.completed && <div className="w-2 h-2 bg-white rounded-full" />}
                      </button>

                      <span className={`text-base ${item.completed ? "text-gray-500" : "text-gray-900"}`}>
                        {item.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 