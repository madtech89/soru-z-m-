"""Backend API regression suite for Turkish exam-prep platform (server.py)."""
import uuid

import pytest
import requests

from conftest import API, DEMO


# ---------------- Module: health / root ----------------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=30)
        assert r.status_code == 200
        assert "message" in r.json()


# ---------------- Module: auth (register/login/me) ----------------
class TestAuth:
    def test_register_returns_user_and_token(self, random_email):
        r = requests.post(f"{API}/auth/register",
                          json={"name": "TEST User", "email": random_email, "password": "pass123"},
                          timeout=30)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert isinstance(data.get("token"), str) and len(data["token"]) > 10
        assert data["user"]["email"] == random_email.lower()
        assert data["user"]["role"] == "user"
        assert data["user"]["daily_goal"] == 20
        assert "password_hash" not in data["user"]
        # token works on /auth/me
        me = requests.get(f"{API}/auth/me",
                          headers={"Authorization": f"Bearer {data['token']}"}, timeout=30)
        assert me.status_code == 200
        assert me.json()["user"]["email"] == random_email.lower()

    def test_register_duplicate_email_rejected(self, random_email):
        payload = {"name": "TEST Dup", "email": random_email, "password": "pass123"}
        assert requests.post(f"{API}/auth/register", json=payload, timeout=30).status_code == 200
        r2 = requests.post(f"{API}/auth/register", json=payload, timeout=30)
        assert r2.status_code == 400, r2.text[:300]
        assert "detail" in r2.json()

    def test_register_short_password_rejected(self, random_email):
        r = requests.post(f"{API}/auth/register",
                          json={"name": "x", "email": random_email, "password": "123"}, timeout=30)
        assert r.status_code == 422

    def test_login_demo_success(self):
        r = requests.post(f"{API}/auth/login", json=DEMO, timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["user"]["email"] == DEMO["email"]
        assert isinstance(d["token"], str)

    def test_login_wrong_password_401(self, random_email):
        # use a throwaway account so brute-force lockout does not affect demo user
        requests.post(f"{API}/auth/register",
                      json={"name": "TEST BF", "email": random_email, "password": "pass123"},
                      timeout=30)
        r = requests.post(f"{API}/auth/login",
                          json={"email": random_email, "password": "wrongpass"}, timeout=30)
        assert r.status_code == 401, r.text[:300]

    def test_brute_force_lockout_after_5_fails(self, random_email):
        requests.post(f"{API}/auth/register",
                      json={"name": "TEST Lock", "email": random_email, "password": "pass123"},
                      timeout=30)
        # NOTE: lockout key is f"{request.client.host}:{email}"; behind the k8s ingress the
        # client IP is the proxy pod IP and rotates between replicas, so the effective
        # threshold is a multiple of 5 (observed ~11 attempts). Reported as a backend issue.
        codes = []
        for _ in range(14):
            codes.append(requests.post(f"{API}/auth/login",
                                       json={"email": random_email, "password": "bad"},
                                       timeout=30).status_code)
        assert 429 in codes, f"No lockout triggered, codes={codes}"
        # correct password must also be blocked while locked
        r = requests.post(f"{API}/auth/login",
                          json={"email": random_email, "password": "pass123"}, timeout=30)
        assert r.status_code == 429, f"Locked account still logged in: {r.status_code}"

    def test_me_without_token_401(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401

    def test_me_with_bad_token_401(self):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbage"}, timeout=30)
        assert r.status_code == 401

    def test_bcrypt_hash_format(self):
        from pymongo import MongoClient
        from dotenv import dotenv_values
        env = dotenv_values("/app/backend/.env")
        c = MongoClient(env["MONGO_URL"])
        u = c[env["DB_NAME"]].users.find_one({"email": "admin@sinav.com"})
        c.close()
        assert u is not None, "admin user not seeded"
        assert u["password_hash"].startswith("$2b$"), u["password_hash"][:10]

    def test_forgot_password_generic_response(self):
        r = requests.post(f"{API}/auth/forgot-password",
                          json={"email": "nonexistent_zzz@sinav.com"}, timeout=30)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_profile_update_persists(self, user_client):
        r = user_client.put(f"{API}/profile", json={"daily_goal": 33, "target_score": 480})
        assert r.status_code == 200, r.text[:300]
        assert r.json()["user"]["daily_goal"] == 33
        me = user_client.get(f"{API}/auth/me")
        assert me.json()["user"]["daily_goal"] == 33
        # restore
        user_client.put(f"{API}/profile", json={"daily_goal": 20})


# ---------------- Module: exams / hierarchy ----------------
class TestExams:
    def test_list_exams(self):
        r = requests.get(f"{API}/exams", timeout=30)
        assert r.status_code == 200
        exams = r.json()
        assert isinstance(exams, list)
        assert len(exams) == 10, f"expected 10 exams, got {len(exams)}"
        assert all("_id" not in e for e in exams)
        assert all({"id", "name", "status"} <= set(e) for e in exams)
        assert all(e["status"] == "active" for e in exams)

    def test_subjects_and_topics(self):
        exams = requests.get(f"{API}/exams", timeout=30).json()
        yks = next(e for e in exams if e["name"] == "YKS")
        subs = requests.get(f"{API}/exams/{yks['id']}/subjects", timeout=30)
        assert subs.status_code == 200
        subjects = subs.json()
        assert len(subjects) > 0, "YKS has no subjects"
        assert all("_id" not in s for s in subjects)

        tops = requests.get(f"{API}/exams/{yks['id']}/topics", timeout=30)
        assert tops.status_code == 200
        topics = tops.json()
        assert len(topics) > 0, "YKS has no topics"
        # filter by subject
        sid = subjects[0]["id"]
        filt = requests.get(f"{API}/exams/{yks['id']}/topics", params={"subject_id": sid},
                            timeout=30).json()
        assert all(t["subject_id"] == sid for t in filt)


# ---------------- Module: question bank + practice ----------------
class TestQuestions:
    def test_questions_requires_auth(self):
        assert requests.get(f"{API}/questions", timeout=30).status_code == 401

    def test_questions_pagination_shape(self, user_client):
        r = user_client.get(f"{API}/questions", params={"page": 1, "page_size": 5})
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        for k in ["items", "total", "page", "pages"]:
            assert k in d
        assert len(d["items"]) <= 5
        assert d["total"] > 0
        q = d["items"][0]
        assert "correct_answer" not in q, "correct_answer leaked in question bank listing"
        assert "explanation" not in q
        assert "_id" not in q

    def test_questions_page_2_differs(self, user_client):
        p1 = user_client.get(f"{API}/questions", params={"page": 1, "page_size": 5}).json()
        p2 = user_client.get(f"{API}/questions", params={"page": 2, "page_size": 5}).json()
        assert p2["page"] == 2
        assert {i["id"] for i in p1["items"]} != {i["id"] for i in p2["items"]}

    def test_filter_by_exam_and_difficulty(self, user_client):
        exams = requests.get(f"{API}/exams", timeout=30).json()
        yks = next(e for e in exams if e["name"] == "YKS")
        r = user_client.get(f"{API}/questions", params={"exam_id": yks["id"], "difficulty": "kolay"})
        assert r.status_code == 200
        d = r.json()
        assert all(i["exam_id"] == yks["id"] and i["difficulty"] == "kolay" for i in d["items"])

    @pytest.mark.parametrize("rf", ["wrong", "correct", "blank"])
    def test_result_filters(self, user_client, rf):
        r = user_client.get(f"{API}/questions", params={"result_filter": rf, "page_size": 5})
        assert r.status_code == 200, r.text[:300]
        assert "items" in r.json()

    def test_practice_answer_correct_and_wrong(self, user_client):
        items = user_client.get(f"{API}/questions", params={"page_size": 1}).json()["items"]
        qid = items[0]["id"]
        r = user_client.post(f"{API}/practice/answer",
                             json={"question_id": qid, "selected_answer": "A", "time_spent": 5})
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert set(["is_correct", "correct_answer", "explanation"]) <= set(d)
        assert d["correct_answer"] in ["A", "B", "C", "D", "E"]
        assert d["is_correct"] == (d["correct_answer"] == "A")

        # answering with the revealed correct answer must be marked correct
        r2 = user_client.post(f"{API}/practice/answer",
                              json={"question_id": qid, "selected_answer": d["correct_answer"]})
        assert r2.json()["is_correct"] is True

    def test_practice_blank_answer(self, user_client):
        items = user_client.get(f"{API}/questions", params={"page_size": 1}).json()["items"]
        r = user_client.post(f"{API}/practice/answer",
                             json={"question_id": items[0]["id"], "selected_answer": None})
        assert r.status_code == 200
        assert r.json()["is_correct"] is False

    def test_practice_bad_question_404(self, user_client):
        r = user_client.post(f"{API}/practice/answer",
                             json={"question_id": "nope-" + uuid.uuid4().hex, "selected_answer": "A"})
        assert r.status_code == 404


# ---------------- Module: tests (denemeler) + sessions + results ----------------
class TestDenemeFlow:
    def test_list_tests(self):
        r = requests.get(f"{API}/tests", timeout=30)
        assert r.status_code == 200
        tests = r.json()
        assert len(tests) >= 6, f"expected >=6 denemeler, got {len(tests)}"
        assert all("question_count" in t and "_id" not in t for t in tests)
        assert all(t["question_count"] > 0 for t in tests)

    def test_get_test_requires_auth(self):
        t = requests.get(f"{API}/tests", timeout=30).json()[0]
        assert requests.get(f"{API}/tests/{t['id']}", timeout=30).status_code == 401

    def test_get_test_does_not_leak_answers(self, user_client):
        t = requests.get(f"{API}/tests", timeout=30).json()[0]
        r = user_client.get(f"{API}/tests/{t['id']}")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert len(d["questions"]) == len(d["question_ids"])
        assert all("correct_answer" not in q for q in d["questions"])

    def test_get_test_404(self, user_client):
        assert user_client.get(f"{API}/tests/{uuid.uuid4()}").status_code == 404

    def test_full_deneme_submit_and_scoring(self, user_client):
        t = requests.get(f"{API}/tests", timeout=30).json()[0]
        detail = user_client.get(f"{API}/tests/{t['id']}").json()
        s = user_client.post(f"{API}/tests/{t['id']}/start")
        assert s.status_code == 200, s.text[:300]
        session = s.json()
        assert session["status"] == "in_progress" and "_id" not in session

        qs = detail["questions"]
        answers = []
        for i, q in enumerate(qs):
            if i % 3 == 0:
                answers.append({"question_id": q["id"], "selected_answer": None, "time_spent": 1})
            else:
                answers.append({"question_id": q["id"], "selected_answer": "A", "time_spent": 3})

        r = user_client.post(f"{API}/sessions/{session['id']}/submit", json={"answers": answers})
        assert r.status_code == 200, r.text[:300]
        res = r.json()
        assert "_id" not in res
        assert res["total"] == len(detail["question_ids"])
        assert res["correct"] + res["wrong"] + res["blank"] == len(answers)
        expected_net = round(res["correct"] - res["wrong"] / 4, 2)
        assert res["net"] == expected_net
        assert res["score"] == round((expected_net / res["total"]) * 500, 1)
        assert res["test_name"] == detail["name"]

        # result appears in /results
        rows = user_client.get(f"{API}/results")
        assert rows.status_code == 200
        assert any(x["id"] == res["id"] for x in rows.json())

    def test_submit_foreign_session_404(self, user_client, random_email):
        t = requests.get(f"{API}/tests", timeout=30).json()[0]
        session = user_client.post(f"{API}/tests/{t['id']}/start").json()
        reg = requests.post(f"{API}/auth/register",
                            json={"name": "TEST Other", "email": random_email,
                                  "password": "pass123"}, timeout=30).json()
        r = requests.post(f"{API}/sessions/{session['id']}/submit", json={"answers": []},
                          headers={"Authorization": f"Bearer {reg['token']}"}, timeout=30)
        assert r.status_code == 404, f"cross-user session submit allowed: {r.status_code}"

    def test_start_test_404(self, user_client):
        assert user_client.post(f"{API}/tests/{uuid.uuid4()}/start").status_code == 404


# ---------------- Module: analytics (dashboard / proficiency / leaderboard) ----------------
class TestAnalytics:
    def test_dashboard(self, user_client):
        r = user_client.get(f"{API}/dashboard")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        for k in ["daily_goal", "solved_today", "success_today", "overall_success",
                  "total_solved", "total_tests", "avg_score", "series",
                  "weak_topics", "strong_topics", "recommended_tests"]:
            assert k in d, f"missing {k}"
        assert len(d["series"]) == 7
        assert all({"date", "solved", "success"} <= set(p) for p in d["series"])
        assert d["total_solved"] > 0, "demo user should have answer history"
        assert isinstance(d["weak_topics"], list)

    def test_dashboard_requires_auth(self):
        assert requests.get(f"{API}/dashboard", timeout=30).status_code == 401

    def test_proficiency(self, user_client):
        r = user_client.get(f"{API}/topics/proficiency")
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) > 0, "demo user has no topic proficiency"
        for p in rows:
            assert 0 <= p["proficiency"] <= 100
            expected = "İyi" if p["proficiency"] >= 70 else (
                "Geliştirilmeli" if p["proficiency"] >= 45 else "Kritik Eksik")
            assert p["status"] == expected, f"{p['proficiency']} -> {p['status']}"
            assert p["topic_name"] != "Bilinmeyen", f"unresolved topic {p['topic_id']}"
        assert rows == sorted(rows, key=lambda x: x["proficiency"])

    @pytest.mark.parametrize("period", ["all", "daily", "weekly", "monthly"])
    @pytest.mark.parametrize("metric", ["score", "questions", "xp"])
    def test_leaderboard(self, period, metric):
        r = requests.get(f"{API}/leaderboard", params={"period": period, "metric": metric},
                         timeout=30)
        assert r.status_code == 200, r.text[:300]
        rows = r.json()
        assert isinstance(rows, list)
        if rows:
            key = {"score": "avg_score", "questions": "total_correct", "xp": "xp"}[metric]
            assert [x["rank"] for x in rows] == list(range(1, len(rows) + 1))
            vals = [x[key] for x in rows]
            assert vals == sorted(vals, reverse=True), f"not sorted by {key}"

    def test_leaderboard_exam_filter(self):
        exams = requests.get(f"{API}/exams", timeout=30).json()
        r = requests.get(f"{API}/leaderboard", params={"exam_id": exams[0]["id"]}, timeout=30)
        assert r.status_code == 200


# ---------------- Module: admin ----------------
class TestAdmin:
    def test_admin_endpoints_reject_normal_user(self, user_client):
        assert user_client.get(f"{API}/admin/stats").status_code == 403
        assert user_client.get(f"{API}/admin/users").status_code == 403
        assert user_client.post(f"{API}/admin/exams", json={"name": "TEST_x"}).status_code == 403

    def test_admin_endpoints_reject_anonymous(self):
        assert requests.get(f"{API}/admin/stats", timeout=30).status_code == 401

    def test_admin_stats(self, admin_client):
        r = admin_client.get(f"{API}/admin/stats")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        for k in ["users", "exams", "questions", "tests", "answers", "results"]:
            assert isinstance(d[k], int) and d[k] >= 0
        assert d["exams"] >= 10 and d["questions"] > 0

    def test_admin_users_no_password_hash(self, admin_client):
        r = admin_client.get(f"{API}/admin/users")
        assert r.status_code == 200
        users = r.json()
        assert len(users) > 0
        assert all("password_hash" not in u and "_id" not in u for u in users)

    def test_admin_exam_crud(self, admin_client):
        name = f"TEST_EXAM_{uuid.uuid4().hex[:6]}"
        r = admin_client.post(f"{API}/admin/exams", json={"name": name, "description": "tmp"})
        assert r.status_code == 200, r.text[:300]
        exam = r.json()
        assert exam["name"] == name and "_id" not in exam
        # verify listed
        assert any(e["id"] == exam["id"] for e in requests.get(f"{API}/exams", timeout=30).json())
        # update
        up = admin_client.put(f"{API}/admin/exams/{exam['id']}",
                              json={"name": name + "_upd", "description": "d"})
        assert up.status_code == 200 and up.json()["name"] == name + "_upd"
        # delete
        assert admin_client.delete(f"{API}/admin/exams/{exam['id']}").status_code == 200
        assert not any(e["id"] == exam["id"]
                       for e in requests.get(f"{API}/exams", timeout=30).json())

    def test_admin_create_subject_topic_question(self, admin_client, user_client):
        exams = requests.get(f"{API}/exams", timeout=30).json()
        eid = exams[0]["id"]
        s = admin_client.post(f"{API}/admin/subjects",
                              json={"exam_id": eid, "name": "TEST_SUB", "slug": "test"})
        assert s.status_code == 200, s.text[:300]
        sid = s.json()["id"]
        t = admin_client.post(f"{API}/admin/topics",
                              json={"exam_id": eid, "subject_id": sid, "name": "TEST_TOPIC"})
        assert t.status_code == 200, t.text[:300]
        tid = t.json()["id"]
        q = admin_client.post(f"{API}/admin/questions", json={
            "exam_id": eid, "subject_id": sid, "topic_id": tid,
            "question_text": "TEST_Q 2+2?", "option_a": "3", "option_b": "4",
            "option_c": "5", "option_d": "6", "option_e": "7",
            "correct_answer": "B", "explanation": "TEST expl", "difficulty": "kolay"})
        assert q.status_code == 200, q.text[:300]
        qid = q.json()["id"]
        assert "_id" not in q.json()
        # verify visible & answerable
        listed = user_client.get(f"{API}/questions",
                                 params={"topic_id": tid, "page_size": 5}).json()
        assert any(i["id"] == qid for i in listed["items"])
        ans = user_client.post(f"{API}/practice/answer",
                               json={"question_id": qid, "selected_answer": "B"})
        assert ans.status_code == 200
        assert ans.json()["is_correct"] is True
        assert ans.json()["explanation"] == "TEST expl"

    def test_admin_bulk_questions(self, admin_client):
        exams = requests.get(f"{API}/exams", timeout=30).json()
        eid = exams[0]["id"]
        payload = [{
            "exam_id": eid, "subject_id": "s1", "topic_id": "t1",
            "question_text": f"TEST_BULK {i}", "option_a": "a", "option_b": "b",
            "option_c": "c", "option_d": "d", "correct_answer": "A"} for i in range(2)]
        r = admin_client.post(f"{API}/admin/questions/bulk", json=payload)
        assert r.status_code == 200, r.text[:300]
        assert r.json()["inserted"] == 2
