import { UPDATES_DATA } from "@/lib/dashboard-config"

export default function Updates() {
  const activities = UPDATES_DATA

  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden h-[600px] flex flex-col">
      {/* Purple header */}
      <div className="bg-[#C8B5E8] px-8 py-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900">Updates</h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {activities.map((activity, index) => (
          <div
            key={index}
            className={`rounded-lg p-4 relative ${
              activity.type === "alert"
                ? "bg-red-100 border-l-4 border-red-500 animate-pulse" // Red styling for alert
                : activity.unread
                  ? "bg-blue-50 border-l-4 border-blue-500"
                  : "bg-gray-50"
            }`}
          >
            {activity.unread && (
              <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
            )}
            <div className="text-base text-gray-900">
              <span className="font-medium">{activity.time}</span>
              <span className="mx-2">-</span>
              <span className={activity.type === "alert" ? "font-bold text-red-700" : ""}>
                {capitalizeFirstLetter(activity.action)}
              </span>
              {activity.unread && (
                <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">NEW</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
