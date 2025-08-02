export interface UpdateItem {
  time: string
  action: string
  unread?: boolean // Add unread property
  type?: "activity" | "alert" // Add type property for different update styles
}

export interface ChecklistItem {
  name: string
  completed: boolean
}

export interface ChecklistSection {
  time: string
  items: ChecklistItem[]
}

// User configuration
export const USER_CONFIG = {
  userName: "User", // Change this or connect to your user management system
  brandName: "Everything is looking fine!", // Changed from "Brand name~~~~"
}

// Updates data - replace with API call
export const UPDATES_DATA: UpdateItem[] = [
  { time: "Just now", action: "Fall - 911 contacted", unread: true, type: "alert" }, // New alert
  { time: "9:30", action: "prepared for bed", unread: true, type: "activity" },
  { time: "8:15", action: "drank water", unread: true, type: "activity" },
  { time: "7:00", action: "took evening pills", unread: true, type: "activity" },
  { time: "6:30", action: "ate dinner", type: "activity" },
  { time: "4:00", action: "took afternoon medication", type: "activity" },
  { time: "2:45", action: "drank water", type: "activity" },
  { time: "2:15", action: "went for a walk", type: "activity" },
  { time: "12:50", action: "took pills", type: "activity" },
  { time: "12:30", action: "ate lunch", type: "activity" },
  { time: "8:50", action: "drank water", type: "activity" },
  { time: "8:45", action: "took 3 pills", type: "activity" },
  { time: "8:30", action: "ate breakfast", type: "activity" },
]

// Checklist data - replace with API call
export const CHECKLIST_DATA: ChecklistSection[] = [
  {
    time: "Morning",
    items: [
      { name: "Medication", completed: true },
      { name: "Food", completed: true },
      { name: "Water", completed: true },
    ],
  },
  {
    time: "Afternoon",
    items: [
      { name: "Medication", completed: true },
      { name: "Food", completed: false },
      { name: "Water", completed: false },
    ],
  },
  {
    time: "Evening",
    items: [
      { name: "Medication", completed: false },
      { name: "Food", completed: false },
      { name: "Water", completed: false },
    ],
  },
]

// Status indicators configuration
export const STATUS_CONFIG = {
  colors: {
    completed: "bg-green-500 border-green-500", // Green for completed
    incomplete: "bg-red-500 border-red-500", // Red for incomplete
    progress: "bg-green-500", // Progress bar color
  },
  mapStatus: "OK", // Change this based on your backend status
}
