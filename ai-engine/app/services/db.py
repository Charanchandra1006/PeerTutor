import motor.motor_asyncio
from app.config import settings

client = None
db = None

async def connect_db():
    global client, db
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    db = client.get_default_database()
    print("✅ AI Engine: MongoDB connected")

async def close_db():
    global client
    if client:
        client.close()

def get_db():
    return db
