// API service for fetching events from MongoDB (Node.js server)
const API_BASE_URL = 'http://localhost:5001' // Node.js backend URL

export const fetchRecentEvents = async (limit = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recent-events?limit=${limit}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching recent events:', error)
    throw error // Re-throw to handle in component
  }
}

export const fetchEventStats = async (eventName, days = 1) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/event-stats?event=${eventName}&days=${days}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching event stats:', error)
    throw error
  }
}

export const fetchDailySummary = async (days = 1) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/daily-summary?days=${days}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching daily summary:', error)
    throw error
  }
}

export const insertTestData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/insert-test-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error inserting test data:', error)
    throw error
  }
}

export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error checking health:', error)
    throw error
  }
}

export const fetchMedicalSummary = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/medical-summary`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching medical summary:', error)
    throw error
  }
}

export const fetchChecklistData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/checklist-data`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching checklist data:', error)
    throw error
  }
} 