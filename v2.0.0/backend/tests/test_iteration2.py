"""Iteration 2 tests: study notes, file upload/serving, CSV bulk import,
per-exam scoring config + score calculator, AI coach (LLM)."""
import io
import uuid

import pytest
import requests

from conftest import API, DEMO


# ---------- helpers ----------
def _exam_by_name(name="YKS"):
    exams = requests.get(f"{API}/exams", timeout=30).json()
    for e in exams:
        if e["name"].strip().lower() == name.lower():
            return e
    return exams[0]


# ============ STUDY NOTES ============
class TestNotes:
    def test_notes_requires_auth(self):
        r = requests.get(f"{API}/notes", timeout=30)
        assert r.status_code == 401, r.text

    def test_list_notes_seeded(self, user_client):
        r = user_client.get(f"{API}/notes", timeout=30)
        assert r.status_code == 200, r.text
        notes = r.json()
        assert isinstance(notes, list) and len(notes) > 0, "no seeded notes"
        n = notes[0]
        for k in ["id", "title", "exam_id", "content", "status"]:
            assert k in n, f"missing {k}"
        assert all(x["status"] == "published" for x in notes)
        assert all("_id" not in x for x in notes)

    def test_filter_notes_by_exam(self, user_client):
        exam = _exam_by_name("YKS")
        r = user_client.get(f"{API}/notes", params={"exam_id": exam["id"]}, timeout=30)
        assert r.status_code == 200
        notes = r.json()
        assert len(notes) > 0
        assert all(n["exam_id"] == exam["id"] for n in notes)

    def test_get_note_by_id_and_404(self, user_client):
        notes = user_client.get(f"{API}/notes", timeout=30).json()
        nid = notes[0]["id"]
        r = user_client.get(f"{API}/notes/{nid}", timeout=30)
        assert r.status_code == 200
        assert r.json()["id"] == nid
        assert user_client.get(f"{API}/notes/{uuid.uuid4()}", timeout=30).status_code == 404

    def test_topic_note_lookup(self, user_client):
        notes = user_client.get(f"{API}/notes", timeout=30).json()
        with_topic = next((n for n in notes if n.get("topic_id")), None)
        assert with_topic, "no seeded note linked to a topic"
        r = user_client.get(f"{API}/topics/{with_topic['topic_id']}/note", timeout=30)
        assert r.status_code == 200
        assert r.json().get("topic_id") == with_topic["topic_id"]

    def test_topic_note_missing_returns_empty(self, user_client):
        r = user_client.get(f"{API}/topics/{uuid.uuid4()}/note", timeout=30)
        assert r.status_code == 200
        assert r.json() == {}

    def test_filter_notes_by_topic(self, user_client):
        notes = user_client.get(f"{API}/notes", timeout=30).json()
        tid = next(n["topic_id"] for n in notes if n.get("topic_id"))
        r = user_client.get(f"{API}/notes", params={"topic_id": tid}, timeout=30)
        assert r.status_code == 200
        assert all(n["topic_id"] == tid for n in r.json())


# ============ ADMIN NOTES CRUD ============
class TestAdminNotes:
    created = []

    def test_non_admin_forbidden(self, user_client):
        exam = _exam_by_name()
        r = user_client.post(f"{API}/admin/notes",
                             json={"title": "TEST_x", "exam_id": exam["id"]}, timeout=30)
        assert r.status_code == 403, r.text
        assert user_client.put(f"{API}/admin/notes/{uuid.uuid4()}",
                               json={"title": "TEST_x", "exam_id": exam["id"]},
                               timeout=30).status_code == 403
        assert user_client.delete(f"{API}/admin/notes/{uuid.uuid4()}",
                                  timeout=30).status_code == 403

    def test_note_crud(self, admin_client, user_client):
        exam = _exam_by_name()
        payload = {"title": "TEST_Not Başlığı", "description": "TEST açıklama",
                   "exam_id": exam["id"], "content": "TEST içerik",
                   "video_url": "https://www.youtube.com/embed/abc123",
                   "status": "published"}
        r = admin_client.post(f"{API}/admin/notes", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["title"] == payload["title"]
        assert doc["video_url"] == payload["video_url"]
        assert "id" in doc and "_id" not in doc
        nid = doc["id"]
        TestAdminNotes.created.append(nid)

        # GET verifies persistence (as normal user)
        g = user_client.get(f"{API}/notes/{nid}", timeout=30)
        assert g.status_code == 200
        assert g.json()["content"] == "TEST içerik"

        # UPDATE
        payload["title"] = "TEST_Güncellendi"
        u = admin_client.put(f"{API}/admin/notes/{nid}", json=payload, timeout=30)
        assert u.status_code == 200, u.text
        assert u.json()["title"] == "TEST_Güncellendi"
        assert user_client.get(f"{API}/notes/{nid}", timeout=30).json()["title"] == "TEST_Güncellendi"

        # DELETE
        d = admin_client.delete(f"{API}/admin/notes/{nid}", timeout=30)
        assert d.status_code == 200
        assert user_client.get(f"{API}/notes/{nid}", timeout=30).status_code == 404
        TestAdminNotes.created.remove(nid)

    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, admin_client):
        yield
        for nid in list(TestAdminNotes.created):
            admin_client.delete(f"{API}/admin/notes/{nid}", timeout=30)


# ============ FILE UPLOAD / SERVING ============
class TestUploadAndFiles:
    def test_upload_requires_admin(self, user_client, demo_token):
        r = requests.post(f"{API}/admin/upload",
                          headers={"Authorization": f"Bearer {demo_token}"},
                          files={"file": ("t.txt", b"hello", "text/plain")}, timeout=60)
        assert r.status_code == 403, r.text

    def test_upload_and_download(self, admin_token, demo_token):
        content = b"TEST dosya icerigi netor"
        r = requests.post(f"{API}/admin/upload",
                          headers={"Authorization": f"Bearer {admin_token}"},
                          files={"file": ("TEST_note.txt", content, "text/plain")}, timeout=120)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "path" in body and body["name"] == "TEST_note.txt"
        path = body["path"]

        d = requests.get(f"{API}/files/{path}", params={"auth": demo_token}, timeout=60)
        assert d.status_code == 200, d.text
        assert d.content == content

        # Bearer header also works
        d2 = requests.get(f"{API}/files/{path}",
                          headers={"Authorization": f"Bearer {admin_token}"}, timeout=60)
        assert d2.status_code == 200

    def test_file_without_token_401(self):
        r = requests.get(f"{API}/files/netor/uploads/nope.txt", timeout=30)
        assert r.status_code == 401

    def test_unknown_file_404(self, demo_token):
        r = requests.get(f"{API}/files/netor/uploads/{uuid.uuid4()}.txt",
                         params={"auth": demo_token}, timeout=30)
        assert r.status_code == 404


# ============ CSV BULK IMPORT ============
CSV_HEADER = "exam,subject,topic,question,option_a,option_b,option_c,option_d,option_e,correct_answer,difficulty,explanation\n"


def _csv(rows):
    return (CSV_HEADER + "\n".join(rows)).encode("utf-8")


class TestCsvImport:
    def test_non_admin_forbidden(self, demo_token):
        r = requests.post(f"{API}/admin/questions/import-csv",
                          headers={"Authorization": f"Bearer {demo_token}"},
                          files={"file": ("a.csv", _csv([]), "text/csv")}, timeout=60)
        assert r.status_code == 403

    def test_import_mixed_report(self, admin_token, user_client):
        uniq = uuid.uuid4().hex[:8]
        q1 = f"TEST_{uniq} f(x)=2x+1 ise f(3) kactir?"
        rows = [
            # valid
            f"YKS,Matematik,Fonksiyonlar,{q1},4,5,6,7,8,C,kolay,Aciklama",
            # duplicate of the previous row (same question text)
            f"YKS,Matematik,Fonksiyonlar,{q1},4,5,6,7,8,C,kolay,Aciklama",
            # invalid exam
            f"YOKEXAM,Matematik,Fonksiyonlar,TEST_{uniq} soru2,1,2,3,4,5,A,orta,",
            # invalid subject
            f"YKS,YokDers,Fonksiyonlar,TEST_{uniq} soru3,1,2,3,4,5,A,orta,",
            # invalid topic
            f"YKS,Matematik,YokKonu,TEST_{uniq} soru4,1,2,3,4,5,A,orta,",
            # missing required (empty question + options)
            "YKS,Matematik,Fonksiyonlar,,,,,,,,,",
            # invalid correct answer
            f"YKS,Matematik,Fonksiyonlar,TEST_{uniq} soru6,1,2,3,4,5,Z,orta,",
        ]
        r = requests.post(f"{API}/admin/questions/import-csv",
                          headers={"Authorization": f"Bearer {admin_token}"},
                          files={"file": ("TEST.csv", _csv(rows), "text/csv")}, timeout=120)
        assert r.status_code == 200, r.text
        rep = r.json()
        for k in ["total", "inserted", "duplicates", "error_count", "errors"]:
            assert k in rep, f"missing {k} in report"
        assert rep["inserted"] == 1, rep
        assert rep["duplicates"] == 1, rep
        assert rep["error_count"] == 5, rep
        assert rep["total"] == 7, rep
        reasons = " | ".join(e["reason"] for e in rep["errors"])
        assert "Sınav bulunamadı" in reasons
        assert "Ders bulunamadı" in reasons
        assert "Konu bulunamadı" in reasons
        assert "Eksik alan" in reasons
        assert "cevap" in reasons.lower()
        assert all("row" in e for e in rep["errors"])

        # verify inserted question is actually persisted & queryable
        exam = _exam_by_name("YKS")
        topics = requests.get(f"{API}/exams/{exam['id']}/topics", timeout=30).json()
        tid = next(t["id"] for t in topics if t["name"].strip().lower() == "fonksiyonlar")
        found = user_client.get(f"{API}/questions",
                                params={"exam_id": exam["id"], "topic_id": tid,
                                        "page_size": 200}, timeout=60)
        assert found.status_code == 200, found.text
        payload = found.json()
        items = payload.get("items", payload) if isinstance(payload, dict) else payload
        match = next((i for i in items if q1 in (i.get("question_text") or "")), None)
        assert match, "imported question not found via /questions"
        assert match["difficulty"] == "kolay"

    def test_import_duplicate_second_call(self, admin_token):
        """Re-importing the same rows should be all duplicates."""
        uniq = uuid.uuid4().hex[:8]
        q = f"TEST_{uniq} tekrar soru"
        rows = [f"YKS,Matematik,Fonksiyonlar,{q},1,2,3,4,5,B,orta,"]
        h = {"Authorization": f"Bearer {admin_token}"}
        r1 = requests.post(f"{API}/admin/questions/import-csv", headers=h,
                           files={"file": ("a.csv", _csv(rows), "text/csv")}, timeout=120)
        assert r1.json()["inserted"] == 1
        r2 = requests.post(f"{API}/admin/questions/import-csv", headers=h,
                           files={"file": ("a.csv", _csv(rows), "text/csv")}, timeout=120)
        assert r2.json()["duplicates"] == 1, r2.json()
        assert r2.json()["inserted"] == 0


# ============ SCORING ============
class TestScoring:
    def test_get_scoring_config(self):
        exam = _exam_by_name("YKS")
        r = requests.get(f"{API}/exams/{exam['id']}/scoring", timeout=30)
        assert r.status_code == 200, r.text
        cfg = r.json()
        assert cfg, "scoring_config empty for seeded exam"
        assert isinstance(cfg.get("sections"), list) and len(cfg["sections"]) > 0
        s = cfg["sections"][0]
        for k in ["name", "wrong_penalty", "coefficient"]:
            assert k in s

    def test_get_scoring_404(self):
        r = requests.get(f"{API}/exams/{uuid.uuid4()}/scoring", timeout=30)
        assert r.status_code == 404

    def test_put_scoring_requires_admin(self, user_client):
        exam = _exam_by_name("YKS")
        r = user_client.put(f"{API}/admin/exams/{exam['id']}/scoring",
                            json={"sections": [{"name": "A"}]}, timeout=30)
        assert r.status_code == 403

    def test_put_scoring_and_calculate(self, admin_client, user_client):
        exam = _exam_by_name("YKS")
        original = requests.get(f"{API}/exams/{exam['id']}/scoring", timeout=30).json()
        cfg = {
            "sections": [
                {"name": "TEST_Türkçe", "question_count": 40, "wrong_penalty": 0.25, "coefficient": 2.0},
                {"name": "TEST_Matematik", "question_count": 40, "wrong_penalty": 0.5, "coefficient": 3.0},
            ],
            "base_score": 100.0, "multiplier": 1.0, "score_type": "TEST Puan",
        }
        try:
            p = admin_client.put(f"{API}/admin/exams/{exam['id']}/scoring", json=cfg, timeout=30)
            assert p.status_code == 200, p.text
            assert p.json()["scoring_config"]["score_type"] == "TEST Puan"

            g = requests.get(f"{API}/exams/{exam['id']}/scoring", timeout=30).json()
            assert len(g["sections"]) == 2
            assert g["sections"][1]["wrong_penalty"] == 0.5

            calc = user_client.post(f"{API}/score/calculate", json={
                "exam_id": exam["id"],
                "sections": [
                    {"name": "TEST_Türkçe", "correct": 30, "wrong": 8, "blank": 2},
                    {"name": "TEST_Matematik", "correct": 20, "wrong": 10, "blank": 10},
                ]}, timeout=30)
            assert calc.status_code == 200, calc.text
            res = calc.json()
            # net1 = 30-8*0.25 = 28 ; net2 = 20-10*0.5 = 15
            assert res["total_net"] == 43.0, res
            # score = 100 + (28*2 + 15*3)*1 = 100+101 = 201
            assert res["score"] == 201.0, res
            assert res["score_type"] == "TEST Puan"
            assert len(res["breakdown"]) == 2
            assert res["breakdown"][0]["net"] == 28.0
            assert res["breakdown"][1]["coefficient"] == 3.0
        finally:
            if original:
                admin_client.put(f"{API}/admin/exams/{exam['id']}/scoring",
                                 json=original, timeout=30)

    def test_calculate_requires_auth(self):
        exam = _exam_by_name("YKS")
        r = requests.post(f"{API}/score/calculate",
                          json={"exam_id": exam["id"], "sections": []}, timeout=30)
        assert r.status_code == 401

    def test_calculate_bad_exam_404(self, user_client):
        r = user_client.post(f"{API}/score/calculate",
                             json={"exam_id": str(uuid.uuid4()), "sections": []}, timeout=30)
        assert r.status_code == 404

    def test_calculate_unknown_section_uses_defaults(self, user_client):
        exam = _exam_by_name("YKS")
        r = user_client.post(f"{API}/score/calculate", json={
            "exam_id": exam["id"],
            "sections": [{"name": "TEST_Bilinmeyen", "correct": 10, "wrong": 4, "blank": 0}]},
            timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["breakdown"][0]["net"] == 9.0  # 10 - 4*0.25


# ============ AI COACH (single real LLM call) ============
class TestAICoach:
    def test_requires_auth(self):
        assert requests.post(f"{API}/ai/coach", timeout=30).status_code == 401
        assert requests.get(f"{API}/ai/coach/latest", timeout=30).status_code == 401

    def test_generate_and_latest(self, user_client):
        r = user_client.post(f"{API}/ai/coach", timeout=180)
        assert r.status_code == 200, f"AI coach failed: {r.status_code} {r.text[:600]}"
        body = r.json()
        assert "result" in body, body
        res = body["result"]
        assert isinstance(res.get("analysis"), str) and len(res["analysis"]) > 20
        assert isinstance(res.get("focus_topics"), list) and len(res["focus_topics"]) >= 1
        assert isinstance(res.get("daily_questions"), (int, float))
        plan = res.get("weekly_plan")
        assert isinstance(plan, list) and len(plan) == 7, f"weekly_plan len={len(plan) if plan else None}"
        for d in plan:
            for k in ["day", "subject", "topic", "task"]:
                assert k in d, f"plan item missing {k}: {d}"
        assert isinstance(res.get("motivation"), str) and res["motivation"]

        latest = user_client.get(f"{API}/ai/coach/latest", timeout=60)
        assert latest.status_code == 200
        lb = latest.json()
        assert lb.get("id") == body["id"], "latest did not return the just-created recommendation"
        assert "_id" not in lb


# ============ REGRESSION SPOT CHECKS ============
class TestRegressionSpot:
    def test_dashboard(self, user_client):
        r = user_client.get(f"{API}/dashboard", timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["daily_goal", "solved_today", "overall_success", "total_solved",
                  "total_tests", "avg_score", "series", "weak_topics", "xp", "streak"]:
            assert k in d, f"dashboard missing {k}"
        assert len(d["series"]) == 7

    def test_leaderboard(self):
        r = requests.get(f"{API}/leaderboard", timeout=60)
        assert r.status_code == 200
        assert isinstance(r.json(), (list, dict))

    def test_login_demo(self):
        r = requests.post(f"{API}/auth/login", json=DEMO, timeout=30)
        assert r.status_code == 200
        assert r.json()["user"]["email"] == DEMO["email"]
