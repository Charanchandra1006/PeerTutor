from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.db import get_db
from app.services.llm import llm_service
from bson import ObjectId

router = APIRouter()


class LearningPathRequest(BaseModel):
    student_id: str
    target_subject: str
    weeks: Optional[int] = 4


@router.post("")
async def generate_learning_path(request: LearningPathRequest):
    """
    POST /learning-path
    Generates a weekly session plan for a student targeting a subject.
    """
    db = get_db()

    # Find subject
    subject = await db.subjects.find_one({
        "$or": [
            {"name": {"$regex": request.target_subject, "$options": "i"}},
            {"code": {"$regex": request.target_subject, "$options": "i"}},
        ]
    })

    if not subject:
        return {"success": False, "error": "Subject not found"}

    # Find available tutors for this subject, sorted by rating
    tutors = await db.tutor_profiles.find(
        {"subjects": subject["_id"]}
    ).sort("avg_rating", -1).to_list(length=10)

    # Generate weekly plan using LLM
    prompt = f"Provide a {request.weeks}-week syllabus for '{subject['name']}'. For each week, provide a focus area and 2 milestones. Format strictly as:\nWeek 1: [Focus] | [Milestone 1], [Milestone 2]\nWeek 2: [Focus] | [Milestone 1], [Milestone 2]"
    ai_text = await llm_service.generate_text(prompt)
    
    llm_weeks = {}
    for line in ai_text.split('\n'):
        line = line.strip()
        if line.lower().startswith('week'):
            try:
                parts = line.split(':', 1)
                week_num = int(parts[0].lower().replace('week', '').strip())
                focus_and_milestones = parts[1].split('|')
                focus = focus_and_milestones[0].strip()
                milestones = [m.strip() for m in focus_and_milestones[1].split(',')] if len(focus_and_milestones) > 1 else []
                llm_weeks[week_num] = {"focus": focus, "milestones": milestones}
            except Exception:
                pass

    weeks = []
    for week_num in range(1, request.weeks + 1):
        # Rotate tutors for variety
        tutor_idx = (week_num - 1) % max(len(tutors), 1)
        tutor = tutors[tutor_idx] if tutors else None

        week_data = llm_weeks.get(week_num)

        week_plan = {
            "week": week_num,
            "focus": week_data["focus"] if week_data else _get_weekly_focus(week_num, request.weeks),
            "sessions": [
                {
                    "day": "Monday" if week_num % 2 == 1 else "Tuesday",
                    "duration_minutes": 60,
                    "type": "concept_review",
                    "suggested_tutor_id": str(tutor["_id"]) if tutor else None,
                },
                {
                    "day": "Thursday" if week_num % 2 == 1 else "Friday",
                    "duration_minutes": 60,
                    "type": "practice_session",
                    "suggested_tutor_id": str(tutor["_id"]) if tutor else None,
                },
            ],
            "milestones": week_data["milestones"] if week_data and week_data["milestones"] else _get_milestones(week_num, request.weeks),
        }
        weeks.append(week_plan)

    return {
        "success": True,
        "data": {
            "student_id": request.student_id,
            "subject": subject["name"],
            "total_weeks": request.weeks,
            "plan": weeks,
        },
    }


def _get_weekly_focus(week: int, total_weeks: int):
    """Generate focus area based on week progression"""
    progress = week / total_weeks
    if progress <= 0.25:
        return "Fundamentals & Core Concepts"
    elif progress <= 0.5:
        return "Applied Problem Solving"
    elif progress <= 0.75:
        return "Advanced Topics & Edge Cases"
    else:
        return "Review, Practice & Exam Preparation"


def _get_milestones(week: int, total_weeks: int):
    """Generate weekly milestones"""
    progress = week / total_weeks
    if progress <= 0.25:
        return ["Complete fundamentals review", "Solve 5 basic problems"]
    elif progress <= 0.5:
        return ["Apply concepts to 3 medium problems", "Create summary notes"]
    elif progress <= 0.75:
        return ["Tackle 3 advanced problems", "Review common mistakes"]
    else:
        return ["Complete practice exam", "Final concept review"]
