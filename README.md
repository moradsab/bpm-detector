# BPM Detector Microservice

BPM Detector is a real-time microservice that listens to live audio from microphone input, detects beats and calculates Beats Per Minute (BPM). The backend uses FastAPI, WebSockets, and NumPy, while the frontend is built with React (Vite).

---

## 🌐 Live Demo

Experience the BPM Detector by visiting the live [Demo](https://bpm-detector-ecf8c.web.app/).

---

## Overview

- **Real-time Detection:** Listens to microphone input and computes BPM instantly.
- **WebSocket Communication:** Ensures fast, continuous data flow between client and server.

---

## 📂 Project Structure
```
bpm-detector/
│── backend/                # Backend service (FastAPI, WebSockets, BPM detection)
│   │── main.py             # FastAPI server with WebSocket handling
│   │── bpm_processor.py    # Custom BPM detection logic
│── frontend/               # Frontend service (Vite React app)
│   │── src/
│   │── public/
│   │── package.json
│   │── index.html
│── README.md               # Project documentation
```
---

## Setup & Installation

### Prerequisites
- **Python:** Version 3.8 or higher
- **Node.js:** Version 22 or higher

## 🚀 Running Locally

### **Backend (FastAPI)**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### **Frontend (React Vite)**
```bash
cd frontend
npm install
npm run dev
```

---

