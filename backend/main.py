from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time
import secrets
import os
from bpm_detector import BPMDetector

app = FastAPI()

frontend_url = os.getenv("FRONTEND_URL")
#allowed origins
origins = [frontend_url,"http://localhost:5173", 
]
# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track connected clients and their session tokens
active_connections = {}
session_store = {}
server_start_time = time.time()

def create_session(user_id: str):
    """Generate a session token for user authentication."""
    session_id = secrets.token_hex(16)
    session_store[session_id] = user_id
    return session_id

def verify_session(session_id: str):
    """Verify session in session store."""
    if session_id not in session_store:
        raise HTTPException(status_code=401, detail="Invalid session")
    return session_store[session_id]


@app.get("/")
async def health_check():
    """Verify the server is running."""
    return {"status": "healthy", "connections": len(active_connections)}

@app.get("/status")
async def connection_status():
    """Return server status and active connections."""
    return {
        "status": "running",
        "active_connections": len(active_connections),
        "uptime": time.time() - server_start_time
    }

@app.post("/login")
def login(username: str):
    """Authenticate connection"""
    # Send new session token to user
    session_id = create_session(username)
    return {"session_id": session_id}


@app.websocket("/ws/bpm")
async def websocket_endpoint(websocket: WebSocket, session_id: str = Query(...)):
    """BPM detection endpoint"""
    # Verify session token
    try:
        user_id = verify_session(session_id)
    except HTTPException as e:
        await websocket.close()
        return
    
    client_id = id(websocket)
    
    # Accept the connection
    try:
        await websocket.accept()
        active_connections[client_id] = websocket
        print(f"Client {client_id} (User: {user_id}) connected. Total clients: {len(active_connections)}")
        
        await websocket.send_text("STATUS: Connected to BPM detector server")
        
        detector = BPMDetector()
        
        # Process audio data
        while True:
            try:
                audio_data = await websocket.receive_bytes()
                bpm = detector.process_audio_chunk(audio_data)

                if bpm:
                    await websocket.send_text(f"BPM: {bpm}")
                    
            except WebSocketDisconnect:
                print(f"Client {client_id} (User: {user_id}) disconnected")
                break
                
            except Exception as e:
                error_msg = str(e)
                print(f"Error processing data from client {client_id}: {error_msg}")
                try:
                    await websocket.send_text(f"ERROR: {error_msg}")
                except:
                    break
    
    except Exception as e:
        print(f"Error establishing WebSocket connection: {e}")
    
    finally:
        # Clean up connection tracking
        if client_id in active_connections:
            del active_connections[client_id]
        print(f"Client {client_id} connection ended. Remaining clients: {len(active_connections)}")


if __name__ == "__main__":
    print("Starting BPM detector server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
