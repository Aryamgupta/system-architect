import asyncio
import json
import logging
from typing import Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from backend.app.config import settings
from backend.app.services.collector import collector_manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("system-architect")

app = FastAPI(
    title="System Architect Telemetry API",
    description="Real-time system telemetry server for desktop live wallpaper",
    version="1.0.0"
)

# Allow CORS for local development frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
import os

# Active WebSocket connections
active_connections: Set[WebSocket] = set()

# Lock to synchronize access to active_connections
connections_lock = asyncio.Lock()

async def broadcast_telemetry_loop():
    """
    Background loop that continuously collects telemetry and broadcasts
    it to all connected WebSocket clients.
    """
    logger.info("Starting telemetry broadcast loop...")
    while True:
        try:
            # Gather telemetry
            # Run blocking collector call in a separate thread to prevent blocking the event loop
            loop = asyncio.get_event_loop()
            telemetry = await loop.run_in_executor(None, collector_manager.get_telemetry)
            
            # Serialize to JSON
            payload = json.dumps(telemetry)
            
            # Broadcast to all active websockets
            async with connections_lock:
                if active_connections:
                    # Create send tasks for all connections to run them concurrently
                    disconnected = []
                    for ws in active_connections:
                        try:
                            await ws.send_text(payload)
                        except Exception:
                            disconnected.append(ws)
                            
                    # Remove any failed connections
                    for ws in disconnected:
                        active_connections.remove(ws)
                        logger.info(f"Removed disconnected client. Total clients: {len(active_connections)}")
                        
        except Exception as e:
            logger.error(f"Error in telemetry broadcast loop: {e}", exc_info=True)
            
        # Sleep for the configured update interval
        await asyncio.sleep(settings.UPDATE_INTERVAL)

@app.on_event("startup")
async def startup_event():
    # Start the broadcast loop in the background
    asyncio.create_task(broadcast_telemetry_loop())
    logger.info("Application startup complete.")

@app.get("/api/telemetry")
def get_current_telemetry():
    """
    REST endpoint to query current telemetry snapshot on-demand (fallback/polling/debugging).
    """
    return collector_manager.get_telemetry()


@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    async with connections_lock:
        active_connections.add(websocket)
        logger.info(f"New client connected. Total clients: {len(active_connections)}")
        
    try:
        # Keep connection open. We can also handle incoming settings from the client here!
        while True:
            # Wait for any incoming messages (e.g. client setting changes or simple pings)
            data = await websocket.receive_text()
            # If we receive messages, we can parse them (e.g. theme changes, update rate changes)
            try:
                msg = json.loads(data)
                logger.info(f"Received message from client: {msg}")
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        async with connections_lock:
            if websocket in active_connections:
                active_connections.remove(websocket)
        logger.info(f"Client disconnected. Total clients: {len(active_connections)}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        async with connections_lock:
            if websocket in active_connections:
                active_connections.remove(websocket)

# Serve frontend static assets in production if compiled
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
if os.path.exists(frontend_dist):
    logger.info(f"Mounting frontend static files from: {frontend_dist}")
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
else:
    logger.warning(f"Frontend static files directory not found at: {frontend_dist}")

if __name__ == "__main__":
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
