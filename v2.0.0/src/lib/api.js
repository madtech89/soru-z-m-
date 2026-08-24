import axios from "axios";

const API_BASE = "/api";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const SCORE_TYPES = [
  { key: "sayisal", label: "Sayısal (SAY)", desc: "Mühendislik, Tıp, Diş Hekimliği, Fen Bilimleri" },
  { key: "esit_agirlik", label: "Eşit Ağırlık (EA)", desc: "Hukuk, İşletme, İktisat, Kamu Yönetimi" },
  { key: "sozel", label: "Sözel (SÖZ)", desc: "Edebiyat, Tarih, Felsefe, RPD, Sosyal Bilgiler" },
  { key: "dil", label: "Dil (DİL)", desc: "İngiliz Dili, Mütercim-Tercümanlık, Dil Edebiyatı" },
];

export const EXAM_TYPES = [
  { key: "YKS", label: "YKS (TYT + AYT)", desc: "Üniversiteye giriş sınavı" },
  { key: "DGS", label: "DGS", desc: "Dikey Geçiş Sınavı" },
  { key: "ALES", label: "ALES", desc: "Akademik Personel ve Lisansüstü Eğitimi Giriş Sınavı" },
];

export const EXAM_CATEGORIES = [
  { key: "universite", label: "Üniversite Sınavları", desc: "YKS, TYT, AYT, DGS, ALES, YDS, YÖKDİL" },
  { key: "kpss", label: "KPSS & Kamu", desc: "KPSS Lisans, Ön Lisans, Kaymakamlık, Banka" },
  { key: "saglik", label: "Sağlık & Tıp", desc: "TUS, DUS, Eczacılık, Hemşirelik" },
  { key: "ortaokul", label: "Ortaokul & Lise", desc: "LGS, Bursluluk" },
  { key: "mesleki", label: "Mesleki & Uzmanlık", desc: "SMM, İSG, Hakimlik" },
];

export function getLevelInfo(xp = 0) {
  const currentXP = Number(xp) || 0;
  const level = Math.floor(currentXP / 500) + 1;
  const currentLevelBaseXP = (level - 1) * 500;
  const nextLevelXP = level * 500;
  const progressXP = currentXP - currentLevelBaseXP;
  const progressPercent = Math.min(100, Math.round((progressXP / 500) * 100));

  return {
    level,
    title: level >= 10 ? "Büyük Usta" : level >= 5 ? "Uzman" : level >= 3 ? "Gelişmiş" : "Çırak",
    currentXP,
    nextLevelXP,
    progressPercent,
  };
}


// ============ EXAMS & SCORING ============
export async function fetchExams() {
  const res = await api.get("/exams");
  return res.data;
}

export async function fetchExamScoring(examId) {
  const res = await api.get(`/exams/${examId}`);
  return res.data?.scoring_config || { sections: [], base_score: 100, multiplier: 1, score_type: "Ham Puan" };
}

export async function saveExamScoring(examId, config) {
  // admin endpoint or exam update
}

export async function fetchSubjects(examId) {
  const res = await api.get(`/exams/${examId}/subjects`);
  return res.data;
}

export async function fetchTopics(examId, subjectId) {
  if (subjectId) {
    const res = await api.get(`/subjects/${subjectId}/topics`);
    return res.data;
  }
  const subs = await fetchSubjects(examId);
  let allTopics = [];
  for (const s of subs) {
    const res = await api.get(`/subjects/${s.id}/topics`);
    allTopics = allTopics.concat(res.data);
  }
  return allTopics;
}

export async function fetchSubtopics(topicId) {
  const res = await api.get(`/topics/${topicId}/subtopics`);
  return res.data;
}

// ============ QUESTIONS ============
export async function fetchQuestions({ exam_id, subject_id, difficulty, result_filter, page = 1, page_size = 8, userId }) {
  const params = { page, page_size };
  if (exam_id) params.exam_id = exam_id;
  if (subject_id) params.subject_id = subject_id;
  if (difficulty) params.difficulty = difficulty;

  const res = await api.get("/questions", { params });
  return res.data?.items || [];
}

export async function fetchQuestionsForExam(examId, limit = 30) {
  const res = await api.get("/questions", { params: { exam_id: examId, page_size: limit } });
  return res.data?.items || [];
}

export async function answerPracticeQuestion(questionId, selectedAnswer, userId) {
  const res = await api.post(`/questions/${questionId}/answer`, {
    selected_answer: selectedAnswer,
    time_spent: 30,
  });
  return res.data;
}

// ============ TESTS / DENEMELER ============
export async function fetchTests(examId) {
  const params = examId ? { exam_id: examId } : {};
  const res = await api.get("/tests", { params });
  return res.data;
}

export async function fetchTest(testId) {
  const res = await api.get(`/tests/${testId}`);
  return res.data;
}

export async function startTestSession(testId, userId) {
  const res = await api.post(`/tests/${testId}/start`);
  return res.data;
}

export async function submitTestSession(sessionId, testId, userId, answers, timeMap) {
  const formattedAnswers = Object.entries(answers || {}).map(([qid, ans]) => ({
    question_id: qid,
    selected_answer: ans || null,
    time_spent: timeMap ? (timeMap[qid] || 0) : 0,
  }));

  const res = await api.post(`/tests/${testId}/submit`, {
    session_id: sessionId,
    answers: formattedAnswers,
  });
  return res.data;
}

export async function fetchTestReview(sessionId, testId) {
  const res = await api.get(`/tests/${testId}/review/${sessionId}`);
  return res.data;
}

export async function fetchTestResult(resultId) {
  const dashboard = await fetchDashboard();
  const found = (dashboard.recent_results || []).find((r) => r.id === resultId || r.session_id === resultId);
  return found || null;
}

// ============ DASHBOARD & PERFORMANCE ============
export async function fetchDashboard(userId) {
  const res = await api.get("/user/dashboard");
  return res.data;
}

export async function fetchWeakTopicsData(userId) {
  const res = await api.get("/user/weak-topics");
  return res.data;
}

export async function fetchProficiency(userId) {
  const weak = await fetchWeakTopicsData(userId);
  return {
    critical_count: weak.critical?.length || 0,
    improvement_count: weak.improvement?.length || 0,
    good_count: weak.good?.length || 0,
  };
}

export async function fetchStudyNotes(examId, topicId) {
  const params = {};
  if (examId) params.exam_id = exam_id;
  if (topicId) params.topic_id = topicId;
  const res = await api.get("/study-notes", { params });
  return res.data;
}

export async function fetchLeaderboard(period = "all", metric = "xp", examId = null, userId = null) {
  const res = await api.get("/leaderboard", { params: { period, exam_id: examId } });
  return res.data;
}

// ============ BADGES (ROZETLER) ============
export async function fetchBadges() {
  const res = await api.get("/badges");
  return res.data;
}

export async function fetchUserBadges(userId) {
  const res = await api.get("/user/badges");
  return res.data;
}

export async function checkAndAwardBadges(userId, stats) {
  const res = await api.post("/user/badges/check");
  return res.data?.newly_awarded || [];
}

// ============ AI CHAT & COACH ============
export async function fetchChatConversations(userId) {
  const res = await api.get("/chat/conversations");
  return res.data;
}

export async function createChatConversation(userId, title = "Yeni Sohbet") {
  const res = await api.post("/chat/conversations", { title });
  return res.data;
}

export async function fetchChatMessages(conversationId) {
  const res = await api.get(`/chat/conversations/${conversationId}/messages`);
  return res.data;
}

export async function sendChatMessage(conversationId, userId, content, history = []) {
  const res = await api.post(`/chat/conversations/${conversationId}/messages`, { content });
  return res.data;
}

export async function deleteChatConversation(conversationId) {
  const res = await api.delete(`/chat/conversations/${conversationId}`);
  return res.data;
}

export async function fetchLatestAIRecommendation(userId) {
  const res = await api.get("/ai/coach/latest");
  return res.data;
}

export async function generateAICoach(context) {
  const res = await api.post("/ai/coach");
  return res.data;
}

// ============ SCORE CALCULATOR ============
export async function calculateScore(examId, sections) {
  const res = await api.post("/score/calculate", {
    exam_id: examId,
    sections: sections || [],
  });
  return res.data;
}

// ============ TERCİH ROBOTU ============
export async function fetchProgramRecommendations(scoreType, userScore, filters = {}) {
  const params = {
    score_type: scoreType,
    user_score: userScore,
    page_size: 60,
  };
  if (filters.cities && filters.cities.length > 0) {
    params.city = filters.cities[0];
  }
  if (filters.universities && filters.universities.length > 0) {
    params.university = filters.universities[0];
  }
  if (filters.programKeyword) {
    params.search = filters.programKeyword;
  }

  const res = await api.get("/tercih/programs", { params });
  const items = res.data?.items || [];
  const safe = Number(userScore) || 0;

  const guaranteed = items.filter((p) => p.recommendation_category === "guaranteed");
  const likely = items.filter((p) => p.recommendation_category === "likely");
  const reach = items.filter((p) => p.recommendation_category === "reach");

  return {
    guaranteed: guaranteed.slice(0, 20),
    likely: likely.slice(0, 20),
    reach: reach.slice(0, 15),
    total: res.data?.total || items.length,
  };
}

export async function fetchDistinctCities() {
  const res = await api.get("/tercih/cities");
  return res.data || [];
}

export async function fetchDistinctUniversities() {
  const res = await api.get("/tercih/universities");
  return res.data || [];
}

// ============ PLACEMENT TEST ============
export async function createPlacementTest(examId) {
  const questions = await fetchQuestionsForExam(examId, 15);
  return {
    id: "placement-test-session",
    name: "Seviye Tespit Sınavı",
    duration_minutes: 20,
    questions: questions,
  };
}

export async function submitPlacementTest(examId, userId, answers, timeMap) {
  const total = Object.keys(answers).length;
  let correct = 0;
  for (const [qid, ans] of Object.entries(answers)) {
    if (ans) correct++;
  }
  return {
    total,
    correct,
    level: correct > 10 ? 3 : correct > 5 ? 2 : 1,
    success_rate: Math.round((correct / Math.max(1, total)) * 100),
  };
}

export async function savePlacementResult(localResult, examId, userId) {
  return updateProfile(userId, {
    placement_completed: true,
    level: localResult?.level || 1,
  });
}

// ============ PROFILE & ADMIN ============
export async function updateProfile(userId, updates) {
  const res = await api.put("/profile", updates);
  return res.data?.user;
}

export async function fetchAdminStats() {
  const res = await api.get("/admin/stats");
  return res.data;
}

export async function createExam(name, description, category = "universite") {
  const res = await api.post("/admin/exams", { name, description, category });
  return res.data;
}

export async function createSubject(examId, name, slug = "general", order = 0) {
  const res = await api.post("/admin/subjects", { exam_id: examId, name, slug, order });
  return res.data;
}

export async function createTopic(examId, subjectId, name, order = 0) {
  const res = await api.post("/admin/topics", { exam_id: examId, subject_id: subjectId, name, order });
  return res.data;
}

export async function createSubtopic(topicId, name, order = 0) {
  const res = await api.post("/admin/subtopics", { topic_id: topicId, name, order });
  return res.data;
}

export async function createTest(examId, name, description, durationMinutes, difficulty, questionIds) {
  const res = await api.post("/admin/tests", {
    exam_id: examId,
    name,
    description,
    duration_minutes: durationMinutes,
    difficulty,
    question_ids: questionIds,
  });
  return res.data;
}

export async function createQuestion(q) {
  const res = await api.post("/admin/questions", q);
  return res.data;
}

export async function createNote(note) {
  const res = await api.post("/admin/notes", note);
  return res.data;
}

export async function saveExamScoring(examId, config) {
  const res = await api.put(`/admin/exams/${examId}/scoring`, config);
  return res.data;
}

