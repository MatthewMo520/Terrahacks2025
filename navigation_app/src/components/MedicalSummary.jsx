export default function MedicalSummary() {
  const handleDownloadSummary = () => {
    // This function will be connected to your backend later
    // For example, it could trigger an API call to download a file:
    // window.location.href = '/api/download-medical-report';
    console.log("Downloading medical summary...")
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
          <p className="text-sm text-gray-600">Download comprehensive report for healthcare provider</p>
          <button
            onClick={handleDownloadSummary}
            className="bg-[#C8B5E8] hover:bg-[#B8A5D8] text-gray-900 px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
          >
            Download Report
          </button>
        </div>
      </div>
    </div>
  )
} 