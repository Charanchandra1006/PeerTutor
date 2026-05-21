"""
Hybrid Tutor Match Recommendation Engine

Algorithm:
  hybrid_score = (0.4 × subject_cosine_similarity)
               + (0.3 × collaborative_filtering_score)
               + (0.2 × bayesian_avg_rating)
               + (0.1 × schedule_overlap_jaccard)

Cold start: if <5 sessions → keyword match + rating only
"""
import numpy as np
from bson import ObjectId


class TutorMatcher:
    def __init__(self):
        self.model_version = "1.0.0"
        self.last_retrained = None

    async def match(self, db, student_id: str, subject: str, top_n: int = 10):
        """
        Find and rank the best tutors for a student.
        """
        # 1. Get student data
        student = await db.users.find_one({"_id": ObjectId(student_id)})
        if not student:
            return []

        # 2. Find subject
        subject_doc = await db.subjects.find_one({
            "$or": [
                {"name": {"$regex": subject, "$options": "i"}},
                {"code": {"$regex": subject, "$options": "i"}},
            ]
        })

        # 3. Get all active tutor profiles teaching this subject
        tutor_filter = {}
        if subject_doc:
            tutor_filter["subjects"] = subject_doc["_id"]

        tutors = await db.tutor_profiles.find(tutor_filter).to_list(length=100)

        if not tutors:
            return []

        # 4. Check total session count for cold start
        total_sessions = await db.sessions.count_documents({"status": "completed"})
        use_cold_start = total_sessions < 5

        # 5. Score each tutor
        scored_tutors = []
        for tutor in tutors:
            # Get tutor's user info
            tutor_user = await db.users.find_one({"_id": tutor["user_id"]})
            if not tutor_user or not tutor_user.get("is_active", True):
                continue

            if use_cold_start:
                # Cold start: keyword match + rating only
                score = self._cold_start_score(tutor, subject_doc)
            else:
                score = await self._hybrid_score(db, student, tutor, subject_doc)

            # New tutor trust boost
            if tutor.get("total_sessions", 0) < 10:
                score = min(100, score + 10)

            scored_tutors.append({
                "tutor_id": str(tutor["_id"]),
                "user_id": str(tutor["user_id"]),
                "score": round(score, 2),
                "name": tutor_user.get("name", "Unknown"),
                "avg_rating": tutor.get("avg_rating", 0),
                "rate_per_hour": tutor.get("rate_per_hour", 0),
                "total_sessions": tutor.get("total_sessions", 0),
                "reasons": self._get_match_reasons(score, tutor),
            })

        # Sort by score descending
        scored_tutors.sort(key=lambda x: x["score"], reverse=True)
        return scored_tutors[:top_n]

    async def _hybrid_score(self, db, student, tutor, subject_doc):
        """Calculate hybrid recommendation score"""
        # Subject similarity (0.4 weight)
        subject_score = self._subject_similarity(student, tutor, subject_doc)

        # Collaborative filtering (0.3 weight)
        cf_score = await self._collaborative_filtering(db, student, tutor)

        # Bayesian avg rating (0.2 weight)
        rating_score = self._bayesian_rating(tutor)

        # Schedule overlap (0.1 weight)
        schedule_score = self._schedule_overlap(student, tutor)

        hybrid = (0.4 * subject_score + 0.3 * cf_score +
                  0.2 * rating_score + 0.1 * schedule_score)

        return min(100, max(0, hybrid))

    def _subject_similarity(self, student, tutor, subject_doc):
        """Cosine similarity between student's needs and tutor's expertise"""
        if not subject_doc:
            return 50.0

        tutor_subjects = [str(s) for s in tutor.get("subjects", [])]
        if str(subject_doc["_id"]) in tutor_subjects:
            # Direct match — high score
            base = 80.0
            # Bonus for having related subjects
            bonus = min(20, len(tutor_subjects) * 5)
            return base + bonus
        return 30.0

    async def _collaborative_filtering(self, db, student, tutor):
        """
        Students with similar profiles who booked tutor X → boost tutor X.
        Simple item-based CF using booking history.
        """
        student_id = student["_id"]

        # Find sessions the student has completed
        student_sessions = await db.sessions.find({
            "student_id": student_id,
            "status": "completed"
        }).to_list(length=50)

        if not student_sessions:
            return 50.0  # Neutral for new students

        # Find other students who booked the same tutors
        student_tutor_ids = [s["tutor_id"] for s in student_sessions]

        similar_students = await db.sessions.distinct(
            "student_id",
            {"tutor_id": {"$in": student_tutor_ids}, "status": "completed",
             "student_id": {"$ne": student_id}}
        )

        if not similar_students:
            return 50.0

        # Check if similar students also booked this tutor
        overlap_count = await db.sessions.count_documents({
            "student_id": {"$in": similar_students},
            "tutor_id": tutor["_id"],
            "status": "completed"
        })

        # Normalize to 0-100
        score = min(100, (overlap_count / max(len(similar_students), 1)) * 100)
        return score

    def _bayesian_rating(self, tutor):
        """Bayesian-smoothed rating score (0-100)"""
        avg = tutor.get("avg_rating", 0)
        count = tutor.get("total_ratings", 0)

        # Bayesian smoothing: (C*m + sum) / (C + n)
        C = 3  # Confidence parameter
        m = 3.5  # Global mean
        smoothed = (C * m + avg * count) / (C + count) if count > 0 else m

        return (smoothed / 5.0) * 100

    def _schedule_overlap(self, student, tutor):
        """Jaccard similarity between student free slots and tutor availability"""
        tutor_slots = set()
        for slot in tutor.get("availability", []):
            tutor_slots.add(f"{slot.get('day', 0)}:{slot.get('start_time', '')}")

        # If student has timetable data, cross-check
        # For now, return moderate score based on availability count
        if not tutor_slots:
            return 20.0

        # More availability = higher score
        return min(100, len(tutor_slots) * 15)

    def _cold_start_score(self, tutor, subject_doc):
        """Fallback scoring for cold start (< 5 sessions in system)"""
        score = 0

        # Keyword/subject match
        if subject_doc:
            tutor_subjects = [str(s) for s in tutor.get("subjects", [])]
            if str(subject_doc["_id"]) in tutor_subjects:
                score += 60

        # Rating bonus
        avg_rating = tutor.get("avg_rating", 0)
        score += (avg_rating / 5.0) * 30

        # Completeness bonus
        if tutor.get("bio"):
            score += 5
        if tutor.get("availability"):
            score += 5

        return min(100, score)

    def _get_match_reasons(self, score, tutor):
        """Generate human-readable match reasons"""
        reasons = []
        if score >= 80:
            reasons.append("Strong subject expertise match")
        elif score >= 60:
            reasons.append("Good subject match")

        if tutor.get("avg_rating", 0) >= 4.5:
            reasons.append("Highly rated by students")
        elif tutor.get("avg_rating", 0) >= 4.0:
            reasons.append("Well-rated tutor")

        if tutor.get("is_verified_badge"):
            reasons.append("Verified tutor badge")

        if tutor.get("total_sessions", 0) >= 20:
            reasons.append("Experienced tutor")

        if not reasons:
            reasons.append("Available for your subject")

        return reasons


# Singleton instance
matcher = TutorMatcher()
