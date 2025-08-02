# Navigation App - OpenStreetMap Version

This version uses **OpenStreetMap** and **Leaflet** - completely free with no API keys required!

## What's Different?

### No API Keys Needed! ✅
- Uses OpenStreetMap tiles (free)
- OSRM routing service (free)
- Nominatim geocoding (free)
- No registration or billing required

### Features Remain the Same
- Large "Take Me Home" button
- Voice guidance
- Emergency alerts
- SMS notifications
- Simple interface for elderly users

## How to Use

### 1. No Additional Setup Required!
Just run the app:
```bash
cd navigation_app
python app.py
```

### 2. Access the App
- Patient interface: `http://localhost:5001`
- Caregiver setup: `http://localhost:5001/setup`

## Technical Details

### Libraries Used
- **Leaflet**: Open-source JavaScript library for maps
- **Leaflet Routing Machine**: For turn-by-turn navigation
- **Leaflet Control Geocoder**: For address search
- **OSRM**: Open Source Routing Machine (free routing API)
- **Nominatim**: OpenStreetMap's geocoding service

### Free Services
1. **Map Tiles**: OpenStreetMap provides free map images
2. **Routing**: OSRM provides free walking directions
3. **Geocoding**: Nominatim converts addresses to coordinates for free

## Limitations vs Google Maps

### Pros:
- ✅ Completely free forever
- ✅ No API keys or registration
- ✅ Open source
- ✅ Privacy-focused (no tracking)

### Cons:
- ❌ Less detailed in some rural areas
- ❌ No Street View
- ❌ Simpler address search
- ❌ Less frequent map updates

## Troubleshooting

### Map Not Loading?
- Check internet connection
- OpenStreetMap servers might be slow (rare)

### Address Search Not Working?
- Try being more specific (city, state)
- Use landmarks or intersections

### Routing Issues?
- OSRM might not have walking paths in very rural areas
- Falls back to road routing

## Future Improvements
- Add offline map caching
- Use alternative routing services
- Add more map styles
- Implement custom markers

The app works great for most urban and suburban areas where Alzheimer's patients typically live!