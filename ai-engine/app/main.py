from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.match import router as match_router
from app.routes.health import router as health_router
from app.routes.learning_path import router as learning_path_router
from app.routes.escape_room import router as escape_room_router


@asynccontextmanager
async def lifespan(app):
    """Startup and shutdown lifecycle handler (replaces deprecated on_event)"""
    # Startup
    from app.services.db import connect_db
    from app.services.cache import connect_redis
    await connect_db()
    await connect_redis()
    yield
    # Shutdown
    from app.services.db import close_db
    from app.services.cache import close_redis
    await close_db()
    await close_redis()


app = FastAPI(
    title="PTM AI Engine",
    description="AI Recommendation Engine for Peer Tutoring Marketplace",
    version="1.0.0",
    lifespan=lifespan,
)

import os

# CORS
origins = os.getenv("CORS_ORIGIN", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health_router, tags=["Health"])
app.include_router(match_router, prefix="/match", tags=["Match"])
app.include_router(learning_path_router, prefix="/learning-path", tags=["Learning Path"])
app.include_router(escape_room_router, prefix="/escape-room", tags=["Escape Room"])

@app.get("/")
async def root():
    return {"message": "Welcome to the PTM AI Engine", "status": "online", "docs": "/docs"}
