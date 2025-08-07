# TerraHack – AgeWell

AgeWell is an integrated suite of tools designed to improve day-to-day safety and independence for people living with Alzheimer’s disease while giving caregivers actionable, real-time information.

The project combines modern web technologies, computer-vision assisted safety checks, and tele-communications services into a single open-source repository.

---

## ✨ Core Features

1. **Dashboard Caregiver + Patient-Facing Web-App** (`app/`) 
   • Leaflet-based map & routing (indoor/outdoor)  
   • Caregiver and patient dashboards with live location and health event feeds  

2. **Computer-Vision Safety Modules** (`python/`)
   • `camera_ocr.py` – real-time OCR for reading pill bottles, documents, etc.  
   • `bodydetect.py` – YOLOv8 + MediaPipe fall / body-position detection 

3. **Emergency Communications**
   • SMS alerts via Twilio (`services/sms_service.py`)  
   • MongoDB logging utilities (`db/`)

---

## 📂 Repository Structure

```
project-terrahack/
├─ db/                 # MongoDB helpers (insert / check)
├─ app/     # Full-stack React + Express navigation client
│   ├─ src/            # Frontend source code
│   └─ server.js       # Express API / proxy
├─ python/             # CV & AI scripts
├─ services/           # Twilio SMS micro-service
├─ requirements.txt    # Python dependencies
└─ README.md           # You are here
```

---

## 🚀 Quick Start


### 1. Python Environment

```bash
python -m venv venv
source venv/bin/activate 
pip install -r requirements.txt
```

### 2. Frontend / Navigation App

```bash
cd app
npm install

# Start both Vite dev server and Express API concurrently
npm run dev:all
```
The React application will be available at `http://localhost:5173/` (default Vite port) and the Express API at `http://localhost:3000/`.

### 3. Run Computer-Vision Module

```bash
python python/camera_ocr.py --source 0
```

## ⚙️ Configuration & Environment Variables

Create a `.env` file at the project root (or within `app/` for Node) and supply:

```
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER="+1234567890"
MONGODB_URI=your_mongo_uri
```


## 🛠️ Development Scripts

| Command (run from `app/`) | Description |
| ------------------------------------ | ----------- |
| `npm run dev`        | Vite dev server (frontend only) |
| `npm run server`     | Start Express API only |
| `npm run dev:all`    | Run API & frontend concurrently |
| `npm run build`      | Build production-ready static assets |
| `npm run preview`    | Preview the built site |

