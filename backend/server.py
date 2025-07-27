from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date
import csv
import io
from fastapi.responses import StreamingResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class MoodEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mood: str  # emoji representation of mood
    mood_name: str  # text name of mood (happy, sad, etc.)
    notes: Optional[str] = None
    date: date
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class MoodEntryCreate(BaseModel):
    mood: str
    mood_name: str
    notes: Optional[str] = None
    date: date

class MoodEntryResponse(BaseModel):
    id: str
    mood: str
    mood_name: str
    notes: Optional[str]
    date: date
    timestamp: datetime

# Mood tracking endpoints
@api_router.post("/moods", response_model=MoodEntryResponse)
async def create_mood_entry(entry: MoodEntryCreate):
    # Check if entry already exists for this date
    existing_entry = await db.mood_entries.find_one({"date": entry.date.isoformat()})
    if existing_entry:
        # Update existing entry
        mood_dict = entry.dict()
        mood_dict['date'] = entry.date.isoformat()
        await db.mood_entries.update_one(
            {"date": entry.date.isoformat()},
            {"$set": mood_dict}
        )
        updated_entry = await db.mood_entries.find_one({"date": entry.date.isoformat()})
        return MoodEntryResponse(
            id=updated_entry['id'],
            mood=updated_entry['mood'],
            mood_name=updated_entry['mood_name'],
            notes=updated_entry.get('notes'),
            date=datetime.fromisoformat(updated_entry['date']).date(),
            timestamp=updated_entry['timestamp']
        )
    else:
        # Create new entry
        mood_dict = entry.dict()
        mood_obj = MoodEntry(**mood_dict)
        mood_dict = mood_obj.dict()
        mood_dict['date'] = mood_obj.date.isoformat()
        await db.mood_entries.insert_one(mood_dict)
        return MoodEntryResponse(
            id=mood_obj.id,
            mood=mood_obj.mood,
            mood_name=mood_obj.mood_name,
            notes=mood_obj.notes,
            date=mood_obj.date,
            timestamp=mood_obj.timestamp
        )

@api_router.get("/moods", response_model=List[MoodEntryResponse])
async def get_mood_entries():
    mood_entries = await db.mood_entries.find().sort("date", -1).to_list(1000)
    return [
        MoodEntryResponse(
            id=entry['id'],
            mood=entry['mood'],
            mood_name=entry['mood_name'],
            notes=entry.get('notes'),
            date=datetime.fromisoformat(entry['date']).date(),
            timestamp=entry['timestamp']
        )
        for entry in mood_entries
    ]

@api_router.get("/moods/{entry_date}")
async def get_mood_by_date(entry_date: str):
    mood_entry = await db.mood_entries.find_one({"date": entry_date})
    if not mood_entry:
        return None
    return MoodEntryResponse(
        id=mood_entry['id'],
        mood=mood_entry['mood'],
        mood_name=mood_entry['mood_name'],
        notes=mood_entry.get('notes'),
        date=datetime.fromisoformat(mood_entry['date']).date(),
        timestamp=mood_entry['timestamp']
    )

@api_router.get("/moods/export/csv")
async def export_moods_csv():
    mood_entries = await db.mood_entries.find().sort("date", -1).to_list(1000)
    
    # Create CSV data
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Mood', 'Mood Name', 'Notes', 'Timestamp'])
    
    for entry in mood_entries:
        writer.writerow([
            entry['date'],
            entry['mood'],
            entry['mood_name'],
            entry.get('notes', ''),
            entry['timestamp'].isoformat()
        ])
    
    output.seek(0)
    
    # Return CSV as streaming response
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mood_tracker_data.csv"}
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()