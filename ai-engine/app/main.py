from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.match import router as match_router
from app.routes.health import router as health_router
from app.routes.learning_path import router as learning_path_router

app = FastAPI(
    title="PTM AI Engine",
    description="AI Recommendation Engine for Peer Tutoring Marketplace",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health_router, tags=["Health"])
app.include_router(match_router, prefix="/match", tags=["Match"])
app.include_router(learning_path_router, prefix="/learning-path", tags=["Learning Path"])

@app.on_event("startup")
async def startup():
    from app.services.db import connect_db
    from app.services.cache import connect_redis
    await connect_db()
    await connect_redis()

@app.on_event("shutdown")
async def shutdown():
    from app.services.db import close_db
    from app.services.cache import close_redis
    await close_db()
    await close_redis()
