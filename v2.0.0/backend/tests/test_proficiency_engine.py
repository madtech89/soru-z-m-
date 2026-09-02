import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from proficiency_engine import calculate_topic_proficiency, DIFFICULTY_WEIGHTS, get_mastery_level

def test_mastery_level_mapping():
    assert get_mastery_level(25)[0] == "Kritik Eksik"
    assert get_mastery_level(50)[0] == "Geliştirilmeli"
    assert get_mastery_level(75)[0] == "İyi"
    assert get_mastery_level(90)[0] == "Güçlü"

def test_empty_answers():
    res = calculate_topic_proficiency([], topic_name="Matematik")
    assert res["proficiency"] == 0
    assert res["confidence"] == "none"

def test_low_confidence_hint():
    answers = [
        {"is_correct": True, "is_blank": False, "difficulty": "orta", "time_spent": 45}
    ]
    res = calculate_topic_proficiency(answers, topic_name="Temel Kavramlar")
    assert res["confidence"] == "low"
    assert "4 soru daha çöz" in res["confidence_hint"]

def test_difficulty_weighted_scoring():
    # 2 correct hard questions vs 2 wrong easy questions
    answers = [
        {"is_correct": True, "is_blank": False, "difficulty": "zor", "time_spent": 60},
        {"is_correct": True, "is_blank": False, "difficulty": "zor", "time_spent": 50},
        {"is_correct": False, "is_blank": False, "difficulty": "kolay", "time_spent": 20},
    ]
    res = calculate_topic_proficiency(answers, topic_name="Türev")
    assert res["proficiency"] > 60
    assert res["correct_count"] == 2
    assert res["wrong_count"] == 1

if __name__ == "__main__":
    test_mastery_level_mapping()
    test_empty_answers()
    test_low_confidence_hint()
    test_difficulty_weighted_scoring()
    print("✅ All proficiency engine unit tests passed successfully!")
