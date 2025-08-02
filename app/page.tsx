"use client"

import { useState } from "react"
import WelcomeBanner from "@/components/welcome-banner"
import Updates from "@/components/updates"
import Checklist from "@/components/checklist"
import Map from "@/components/map"
import MedicalSummary from "@/components/medical-summary"
import { USER_CONFIG } from "@/lib/dashboard-config"

export default function Dashboard() {
  const [userName] = useState(USER_CONFIG.userName)
  const [brandName] = useState(USER_CONFIG.brandName)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <WelcomeBanner userName={userName} brandName={brandName} />
            <Updates />
            <MedicalSummary />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Checklist />
            <Map />
          </div>
        </div>
      </div>
    </div>
  )
}
