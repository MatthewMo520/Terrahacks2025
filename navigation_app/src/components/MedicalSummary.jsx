import { useState } from 'react'
import { fetchMedicalSummary } from '../api/events'

export default function MedicalSummary() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleDownloadSummary = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log("Generating medical summary from MongoDB...")
      const data = await fetchMedicalSummary()
      
      // Create a text file with the summary
      const blob = new Blob([data.summary], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `medical-summary-${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log("Medical summary downloaded successfully!")
    } catch (error) {
      console.error('Error generating medical summary:', error)
      setError('Failed to generate medical summary')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Purple header */}
      <div className="bg-[#C8B5E8] px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900">Medical Summary</h2>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Generate comprehensive report from MongoDB data</p>
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
          <button
            onClick={handleDownloadSummary}
            disabled={loading}
            className={`bg-[#C8B5E8] hover:bg-[#B8A5D8] text-gray-900 px-6 py-3 rounded-lg font-medium transition-colors shadow-sm ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Generating...' : 'Download Report'}
          </button>
        </div>
      </div>
    </div>
  )
} 