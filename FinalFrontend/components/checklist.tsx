"use client"

import { useState } from "react"
import { CHECKLIST_DATA, STATUS_CONFIG, type ChecklistSection } from "@/lib/dashboard-config"

interface ChecklistItem {
  name: string
  completed: boolean
}

export default function Checklist() {
  const [checklistData, setChecklistData] = useState<ChecklistSection[]>(CHECKLIST_DATA)

  const calculateProgress = () => {
    const totalItems = checklistData.reduce((total, section) => total + section.items.length, 0)
    const completedItems = checklistData.reduce(
      (total, section) => total + section.items.filter((item) => item.completed).length,
      0,
    )
    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0
  }

  const toggleItem = (sectionIndex: number, itemIndex: number) => {
    const newData = [...checklistData]
    newData[sectionIndex].items[itemIndex].completed = !newData[sectionIndex].items[itemIndex].completed
    setChecklistData(newData)
  }

  const progressPercentage = calculateProgress()

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
