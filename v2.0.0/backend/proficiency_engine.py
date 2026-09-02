"""
HedefMatik Measurement & Topic Proficiency Engine
Scientifically computes student topic mastery, confidence level,
time efficiency, and Ebbinghaus forgetting curve risk.
"""
import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

DIFFICULTY_WEIGHTS = {
    "kolay": 0.8,
    "orta": 1.0,
    "zor": 1.35,
    "cok_zor": 1.6,
}

CONFIDENCE_THRESHOLDS = {
    "low": 5,      # < 5 questions: Low confidence
    "medium": 15,  # 5-14 questions: Medium confidence
    "high": 15,    # >= 15 questions: High confidence
}

MASTERY_LEVELS = [
    (0, 39, "Kritik Eksik", "#EF4444"),
    (40, 64, "Geliştirilmeli", "#F59E0B"),
    (65, 84, "İyi", "#3B82F6"),
    (85, 100, "Güçlü", "#10B981"),
]

def get_mastery_level(score: float) -> tuple[str, str]:
    for low, high, label, color in MASTERY_LEVELS:
        if low <= score <= high:
            return label, color
    return "Geliştirilmeli", "#F59E0B"

def calculate_topic_proficiency(
    answers: List[Dict[str, Any]],
    topic_name: str = "Konu",
    subject_name: str = "Ders",
    target_time_per_q: int = 60
) -> Dict[str, Any]:
    """
    Computes comprehensive topic proficiency metrics for a student.
    """
    total_solved = len(answers)
    if total_solved == 0:
        return {
            "topic_name": topic_name,
            "subject_name": subject_name,
            "proficiency": 0,
            "raw_accuracy": 0,
            "status": "Veri Yok",
            "status_color": "#9CA3AF",
            "confidence": "none",
            "confidence_label": "Yetersiz Veri",
            "confidence_hint": "Analiz için en az 5 soru çöz.",
            "total_solved": 0,
            "correct_count": 0,
            "wrong_count": 0,
            "blank_count": 0,
            "avg_time": 0,
            "days_since_last": None,
            "forgetting_risk": "Bilinmiyor",
            "next_action": "İlk 10 soru setini çözerek seviyeni belirle.",
        }

    correct_count = 0
    wrong_count = 0
    blank_count = 0
    weighted_score_sum = 0.0
    weighted_possible_sum = 0.0
    total_time = 0
    last_date = None

    now = datetime.now(timezone.utc)

    for ans in answers:
        is_correct = bool(ans.get("is_correct", False))
        is_blank = bool(ans.get("is_blank", False))
        diff = (ans.get("difficulty") or "orta").lower()
        diff_weight = DIFFICULTY_WEIGHTS.get(diff, 1.0)
        time_spent = int(ans.get("time_spent") or target_time_per_q)
        total_time += time_spent

        weighted_possible_sum += diff_weight

        if is_correct:
            correct_count += 1
            weighted_score_sum += diff_weight
        elif is_blank:
            blank_count += 1
            # No penalty for blank
        else:
            wrong_count += 1
            # 0.25 penalty
            weighted_score_sum -= (diff_weight * 0.25)

        # Parse date
        created_str = ans.get("created_at")
        if created_str:
            try:
                dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                if last_date is None or dt > last_date:
                    last_date = dt
            except Exception:
                pass

    # Normalized Proficiency (0 - 100)
    raw_acc = round((correct_count / max(1, total_solved)) * 100, 1)
    
    if weighted_possible_sum > 0:
        norm_score = max(0.0, min(100.0, (weighted_score_sum / weighted_possible_sum) * 100.0))
    else:
        norm_score = raw_acc

    # Confidence calculation
    if total_solved < CONFIDENCE_THRESHOLDS["low"]:
        confidence = "low"
        confidence_label = "Düşük Güven"
        needed = CONFIDENCE_THRESHOLDS["low"] - total_solved
        confidence_hint = f"Daha doğru analiz için {needed} soru daha çöz."
    elif total_solved < CONFIDENCE_THRESHOLDS["medium"]:
        confidence = "medium"
        confidence_label = "Orta Güven"
        needed = CONFIDENCE_THRESHOLDS["medium"] - total_solved
        confidence_hint = f"Yüksek güvenilirlik için {needed} soru daha çöz."
    else:
        confidence = "high"
        confidence_label = "Yüksek Güven"
        confidence_hint = "Ölçüm güvenilirliği yüksek."

    # Forgetting risk (Ebbinghaus curve estimation)
    days_since = None
    forgetting_risk = "Düşük"
    if last_date:
        days_since = max(0, (now - last_date).days)
        if days_since > 30:
            forgetting_risk = "Kritik (30+ gün önce çözüldü)"
            # Decay score slightly if inactive for over a month
            norm_score = max(20.0, norm_score * 0.85)
        elif days_since > 14:
            forgetting_risk = "Orta (14+ gün önce çözüldü)"
            norm_score = max(20.0, norm_score * 0.93)

    final_score = round(norm_score, 1)
    status_label, status_color = get_mastery_level(final_score)

    # Next action suggestion
    if final_score < 40:
        next_action = f"{topic_name} ders notunu oku ve 15 kolay/orta soru çöz."
    elif final_score < 65:
        next_action = f"Geliştirmek için 15 orta/zor soru çöz ve hatalarını incele."
    elif forgetting_risk != "Düşük":
        next_action = "Aralıklı tekrar vakti! Konuyu tazelemek için 10 soru çöz."
    else:
        next_action = "Mükemmel seviyedesin! Haftalık denemelerle formunu koru."

    return {
        "topic_name": topic_name,
        "subject_name": subject_name,
        "proficiency": int(round(final_score)),
        "raw_accuracy": raw_acc,
        "status": status_label,
        "status_color": status_color,
        "confidence": confidence,
        "confidence_label": confidence_label,
        "confidence_hint": confidence_hint,
        "total_solved": total_solved,
        "correct_count": correct_count,
        "wrong_count": wrong_count,
        "blank_count": blank_count,
        "avg_time": round(total_time / max(1, total_solved)),
        "days_since_last": days_since,
        "forgetting_risk": forgetting_risk,
        "next_action": next_action,
    }
