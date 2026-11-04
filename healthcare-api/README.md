# Healthcare Prototype API v2.4 — HTML5 Browser Geolocation & Live Datasets

A Node.js + Express prototype for a medical healthcare hackathon. 
**Zero hardcoding & Zero API keys needed.** Uses client-side **HTML5 Browser Geolocation API** (`navigator.geolocation`) for accurate GPS location and live OpenStreetMap + Government datasets for hospitals.

---

## 🌐 How HTML5 Browser Geolocation Works

Unlike IP-based geolocation (which only points to an ISP data center), the **HTML5 Browser Geolocation API**:
1. Uses your device's actual GPS, Wi-Fi access points, and cellular triangulation.
2. Prompts the user: *"Allow localhost:3000 to know your location?"*
3. Returns pinpoint latitude, longitude, and accuracy down to a few meters.
4. Feeds those exact coordinates directly to the backend to calculate nearby hospitals.

---

## 🚀 How to Run and Test in Browser

### Step 1 — Start the Server
```bash
npm start
```
*(Server runs at `http://localhost:3000`)*

### Step 2 — Open the Web Dashboard in Your Browser
Open your browser (Chrome / Edge / Firefox) and visit:
👉 **[http://localhost:3000/](http://localhost:3000/)**

1. Click the button: **"📍 Find Hospitals Near My Exact Location"**.
2. Click **"Allow"** when your browser asks for location permission.
3. Your exact GPS coordinates and the nearest hospitals (OpenStreetMap & Tamil Nadu/India official directory) will immediately display on screen!

---

## 📡 API Endpoints

### 1. 🌐 HTML5 Browser Geolocation Integration

#### `GET /`
Serves the responsive HTML5 Browser Geolocation frontend dashboard.

#### `POST /api/location/browser`
API endpoint to receive coordinates sent by `navigator.geolocation.getCurrentPosition()`.
* **Request Body:**
  ```json
  {
    "latitude": 13.0827,
    "longitude": 80.2707,
    "accuracy": 15,
    "limit": 6
  }
  ```
* **Response:** Returns resolved street address (reverse-geocoded) and nearest hospitals from both OpenStreetMap and the official dataset.

---

### 2. 🏥 Live Hospital Directory (570+ Tamil Nadu & India Hospitals)

| Endpoint | Description |
|----------|-------------|
| **`GET /api/india/hospitals?state=Tamil+Nadu`** | Returns all 570 Tamil Nadu hospitals from live GitHub dataset |
| **`GET /api/india/hospitals?district=Chennai`** | Returns all 179 hospitals in Chennai district |
| **`GET /api/india/hospitals?district=Coimbatore`** | Returns all 31 hospitals in Coimbatore |
| **`GET /api/india/hospitals?name=Apollo`** | Name filter (partial match) |
| **`GET /api/india/hospitals/nearby?lat=...&lon=...&radius=25`** | Finds nearest hospitals to coordinates |
| **`GET /api/india/hospitals/stats`** | Shows dataset statistics and raw GitHub sources |

---

### 3. 🗺️ OpenStreetMap POI Search & Utilities

| Endpoint | Description |
|----------|-------------|
| **`GET /api/hospitals?lat=...&lon=...&radius=5000`** | Nearby hospitals from OpenStreetMap |
| **`GET /api/hospitals/:osmId`** | Hospital details by OSM ID |
| **`GET /api/geocode/reverse?lat=...&lon=...`** | Reverse geocodes coordinates to street address |
| **`GET /api/health`** | Server and service health check |

---

## 📁 Project Structure

```
healthcare-api/
├── public/
│   └── index.html                     # HTML5 Browser Geolocation web dashboard
├── server.js                          # Express server & API routes
├── services/
│   ├── osmService.js                  # OpenStreetMap Overpass & Nominatim API
│   └── githubDatasetService.js        # 570+ TN & All-India Live GitHub Datasets
├── .env                               # Server configuration
├── package.json
└── README.md
```
