export default function Map() {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden h-[360px] flex flex-col">
      {/* Header */}
      <div className="bg-[#C8B5E8] px-6 py-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900">Map</h2>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {/* Blank Map Placeholder */}
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <p className="text-gray-500 text-lg">Map will be integrated here</p>
        </div>
      </div>
    </div>
  )
}
