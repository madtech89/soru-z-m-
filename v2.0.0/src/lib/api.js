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

export const TERCIH_EXAM_TYPES = [
  { key: "YKS", label: "YKS (Üniversite Tercih Robotu)", desc: "4 Yıllık Lisans (SAY, EA, SÖZ, DİL) ve 2 Yıllık Önlisans (TYT) Programları" },
  { key: "LGS", label: "LGS (Lise Tercih Robotu)", desc: "Fen Liseleri, Anadolu Liseleri, Sosyal Bilimler ve Nitelikli Proje Liseleri" },
  { key: "KPSS", label: "KPSS (Kamu Atama & Kadro Robotu)", desc: "Lisans & Önlisans Merkezi Memurluk, Sağlıkçı ve Öğretmen Atama Taban Puanları" },
  { key: "DGS", label: "DGS (Dikey Geçiş Tercih Robotu)", desc: "2 Yıllık Önlisanstan 4 Yıllık Lisans Bölümlerine Geçiş Kontenjanları" },
];

export const EXAM_TYPES = [

  { key: "TYT", label: "YKS TYT", desc: "Temel Yeterlilik Testi" },
  { key: "AYT", label: "YKS AYT", desc: "Alan Yeterlilik Testi" },
  { key: "KPSS", label: "KPSS Lisans", desc: "Genel Yetenek & Genel Kültür" },
  { key: "KPSS-A", label: "KPSS Alan Bilgisi", desc: "İktisat, Maliye, Hukuk, Muhasebe" },
  { key: "KPSS-Egitim", label: "KPSS Eğitim Bilimleri", desc: "Öğretmenlik Alan Sınavı" },
  { key: "ALES", label: "ALES", desc: "Akademik Personel ve Lisansüstü Giriş Sınavı" },
  { key: "DGS", label: "DGS", desc: "Dikey Geçiş Sınavı" },
  { key: "TUS", label: "TUS", desc: "Tıpta Uzmanlık Sınavı (Temel + Klinik)" },
  { key: "DUS", label: "DUS", desc: "Diş Hekimliğinde Uzmanlık Sınavı" },
  { key: "SMMM", label: "SMMM", desc: "Mali Müşavirlik Staj ve Yeterlilik" },
  { key: "Hakimlik", label: "Hakimlik & Kaymakamlık", desc: "Adli ve İdari Yargı Sınavları" },
  { key: "YDS", label: "YDS", desc: "Yabancı Dil Bilgisi Seviye Tespit Sınavı" },
  { key: "YOKDIL", label: "YÖKDİL", desc: "YÖK Yabancı Dil Sınavı" },
  { key: "MSU", label: "MSÜ", desc: "Milli Savunma Üniversitesi Askeri Öğrenci Sınavı" },
  { key: "LGS", label: "LGS", desc: "Liselere Geçiş Sistemi" },
];

export const EXAM_CATEGORIES = [
  { key: "universite", label: "Üniversite & Lisansüstü", desc: "YKS TYT, YKS AYT, ALES, DGS" },
  { key: "kpss", label: "KPSS & Kariyer Meslek", desc: "KPSS Lisans, KPSS Alan (A Grubu), Eğitim Bilimleri" },
  { key: "saglik", label: "Sağlık & Tıp Uzmanlık", desc: "TUS (Temel & Klinik Tıp), DUS (Diş Hekimliği)" },
  { key: "mesleki", label: "Mesleki & Mali Ruhsat", desc: "SMMM Staja Başlama & Yeterlilik, Adli/İdari Hakimlik" },
  { key: "dil", label: "Yabancı Dil Sınavları", desc: "YDS (İngilizce), YÖKDİL (Sağlık, Fen, Sosyal)" },
  { key: "askeri", label: "Askeri & Güvenlik", desc: "MSÜ (Milli Savunma Üniversitesi), Polislik" },
  { key: "ortaokul", label: "Liselere Giriş (MEB)", desc: "LGS (Liselere Geçiş Sistemi), Bursluluk" },
];


export const DEFAULT_EXAMS = [
  { id: "yks-tyt", name: "YKS TYT", exam_type: "TYT", category: "universite", description: "Temel Yeterlilik Testi (120 Soru / 165 Dk)" },
  { id: "yks-ayt", name: "YKS AYT", exam_type: "AYT", category: "universite", description: "Alan Yeterlilik Testi (80 Soru / 180 Dk)" },
  { id: "ales", name: "ALES", exam_type: "ALES", category: "universite", description: "Akademik Personel ve Lisansüstü Giriş Sınavı" },
  { id: "dgs", name: "DGS", exam_type: "DGS", category: "universite", description: "Dikey Geçiş Sınavı" },
  { id: "kpss-lisans", name: "KPSS Lisans", exam_type: "KPSS", category: "kpss", description: "Genel Yetenek & Genel Kültür (B Grubu)" },
  { id: "kpss-alan", name: "KPSS Alan Bilgisi (A Grubu)", exam_type: "KPSS-A", category: "kpss", description: "Müfettişlik, Uzmanlık ve Kariyer Meslekler" },
  { id: "kpss-egitim", name: "KPSS Eğitim Bilimleri", exam_type: "KPSS-Egitim", category: "kpss", description: "Öğretmenlik Alan Sınavı" },
  { id: "kpss-onlisans", name: "KPSS Ön Lisans", exam_type: "KPSS-OnLisans", category: "kpss", description: "Ön Lisans Mezunları İçin" },
  { id: "kpss-ortaogretim", name: "KPSS Ortaöğretim", exam_type: "KPSS-Lise", category: "kpss", description: "Lise Mezunları İçin" },
  { id: "tus", name: "TUS (Tıpta Uzmanlık)", exam_type: "TUS", category: "saglik", description: "Tıpta Uzmanlık Eğitimi Giriş Sınavı" },
  { id: "dus", name: "DUS (Diş Hekimliği)", exam_type: "DUS", category: "saglik", description: "Diş Hekimliğinde Uzmanlık Sınavı" },
  { id: "smmm", name: "SMMM Staja Başlama", exam_type: "SMMM", category: "mesleki", description: "Mali Müşavirlik Sınavları" },
  { id: "hakimlik", name: "Adli & İdari Yargı Hakimlik", exam_type: "Hakimlik", category: "mesleki", description: "Hakim / Savcı Yardımcılığı Sınavı" },
  { id: "yds", name: "YDS (İngilizce)", exam_type: "YDS", category: "dil", description: "Yabancı Dil Bilgisi Seviye Tespit Sınavı" },
  { id: "yokdil", name: "YÖKDİL", exam_type: "YOKDIL", category: "dil", description: "YÖK Yabancı Dil Sınavı" },
  { id: "msu", name: "MSÜ", exam_type: "MSU", category: "askeri", description: "Milli Savunma Üniversitesi Askeri Öğrenci Sınavı" },
  { id: "lgs", name: "LGS (Liselere Geçiş)", exam_type: "LGS", category: "ortaokul", description: "Liselere Geçiş Sistemi Sınavı" },
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
  try {
    const res = await api.get("/exams", { timeout: 4000 });
    if (Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
    return DEFAULT_EXAMS;
  } catch {
    return DEFAULT_EXAMS;
  }
}

export async function updateExamDate(examId, dateString) {
  const res = await api.put(`/admin/exams/${examId}/date`, { exam_date: dateString });
  return res.data;
}

export async function fetchExamScoring(examId) {
  const res = await api.get(`/exams/${examId}`);
  return res.data?.scoring_config || { sections: [], base_score: 100, multiplier: 1, score_type: "Ham Puan" };
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

// ============ MISTAKE LEDGER (YANLIŞ DEFTERİ) & FEEDBACK ============
export async function fetchUserMistakes(params = {}) {
  const res = await api.get("/user/mistakes", { params });
  return res.data;
}

export async function updateMistakeReason(answerId, reason) {
  const res = await api.post(`/user/mistakes/${answerId}/reason`, { reason });
  return res.data;
}

export async function resolveMistake(answerId, isReviewed = true) {
  const res = await api.post(`/user/mistakes/${answerId}/resolve`, { is_reviewed: isReviewed });
  return res.data;
}

export async function submitQuestionFeedback(questionId, reason, description = "") {
  const res = await api.post(`/questions/${questionId}/feedback`, { reason, description });
  return res.data;
}

export async function fetchAdminQuestionFeedbacks(status = "pending") {
  const res = await api.get("/admin/question-feedbacks", { params: { status } });
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
  return res.data || { topics: [], critical: [], improvement: [], good: [], strong: [] };
}

export async function fetchProficiency(userId) {
  const data = await fetchWeakTopicsData(userId);
  return data.topics || [];
}

export async function fetchStudyNotes(examId, topicId) {
  const params = {};
  if (examId) params.exam_id = examId;
  if (topicId) params.topic_id = topicId;
  const res = await api.get("/study-notes", { params });
  return res.data;
}

export async function fetchAdminNotes(params = {}) {
  const res = await api.get("/admin/notes", { params });
  return res.data;
}

export async function createAdminNote(payload) {
  const res = await api.post("/admin/notes", payload);
  return res.data;
}

export async function updateAdminNote(noteId, payload) {
  const res = await api.put(`/admin/notes/${noteId}`, payload);
  return res.data;
}

export async function deleteAdminNote(noteId) {
  const res = await api.delete(`/admin/notes/${noteId}`);
  return res.data;
}

export async function generateAiNote(payload) {
  const res = await api.post("/admin/notes/ai-generate", payload);
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
export async function fetchProgramRecommendations(scoreType, userScore, userRank, filters = {}) {
  const params = {
    score_type: scoreType,
    user_score: userScore ? Number(userScore) : undefined,
    user_rank: userRank ? Number(userRank) : undefined,
    sort_by: filters.sortBy || "chance",
    category_filter: filters.categoryFilter || "all",
    page_size: 120,
  };
  if (filters.cities && filters.cities.length > 0) {
    params.cities = filters.cities.join(",");
  }
  if (filters.universities && filters.universities.length > 0) {
    params.universities = filters.universities.join(",");
  }
  if (filters.programs && filters.programs.length > 0) {
    params.programs = filters.programs.join(",");
  }
  if (filters.search) {
    params.search = filters.search;
  }

  const res = await api.get("/tercih/programs", { params });
  const items = res.data?.items || [];

  const guaranteed = items.filter((p) => p.recommendation_category === "guaranteed");
  const likely = items.filter((p) => p.recommendation_category === "likely");
  const reach = items.filter((p) => p.recommendation_category === "reach");
  const dream = items.filter((p) => p.recommendation_category === "dream");

  return {
    all: items,
    guaranteed,
    likely,
    reach,
    dream,
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

export async function fetchDistinctDepartments() {
  const res = await api.get("/tercih/departments");
  return res.data || [];
}

// Admin Tercih APIs
export async function fetchAdminTercihPrograms(params = {}) {
  const res = await api.get("/admin/tercih/programs", { params });
  return res.data;
}

export async function createAdminTercihProgram(data) {
  const res = await api.post("/admin/tercih/programs", data);
  return res.data;
}

export async function updateAdminTercihProgram(id, data) {
  const res = await api.put(`/admin/tercih/programs/${id}`, data);
  return res.data;
}

export async function deleteAdminTercihProgram(id) {
  const res = await api.delete(`/admin/tercih/programs/${id}`);
  return res.data;
}

export async function bulkImportAdminTercih(programs) {
  const res = await api.post("/admin/tercih/bulk-import", { programs });
  return res.data;
}


// ============ PLACEMENT & DIAGNOSTIC TEST ============
export async function createPlacementTest(examId) {
  const res = await api.get(`/placement-test/${examId}`);
  return res.data;
}

export async function evaluatePlacementTest(payload) {
  const res = await api.post("/placement-test/evaluate", payload);
  return res.data;
}

export async function savePlacementResult(localResult, examId, userId) {
  if (localResult?.answers) {
    return evaluatePlacementTest({
      exam_id: examId,
      answers: localResult.answers,
      time_spent_seconds: localResult.time_spent || 0,
      user_id: userId,
    });
  }
  return updateProfile(userId, {
    placement_completed: true,
    level: localResult?.level || 1,
    target_exams: [examId],
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

export async function updateExam(examId, payload) {
  const res = await api.put(`/admin/exams/${examId}`, payload);
  return res.data;
}

export async function deleteExam(examId) {
  const res = await api.delete(`/admin/exams/${examId}`);
  return res.data;
}

export async function updateSubject(subjectId, payload) {
  const res = await api.put(`/admin/subjects/${subjectId}`, payload);
  return res.data;
}

export async function deleteSubject(subjectId) {
  const res = await api.delete(`/admin/subjects/${subjectId}`);
  return res.data;
}

export async function updateTopic(topicId, payload) {
  const res = await api.put(`/admin/topics/${topicId}`, payload);
  return res.data;
}

export async function deleteTopic(topicId) {
  const res = await api.delete(`/admin/topics/${topicId}`);
  return res.data;
}

export async function updateSubtopic(subtopicId, payload) {
  const res = await api.put(`/admin/subtopics/${subtopicId}`, payload);
  return res.data;
}

export async function deleteSubtopic(subtopicId) {
  const res = await api.delete(`/admin/subtopics/${subtopicId}`);
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

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/admin/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function saveExamScoring(examId, config) {
  const res = await api.put(`/admin/exams/${examId}/scoring`, config);
  return res.data;
}

export async function fetchAdminQuestions(filters = {}) {
  const res = await api.get("/admin/questions", { params: filters });
  return res.data;
}

export async function bulkCreateQuestions(payload) {
  const res = await api.post("/admin/questions/bulk", payload);
  return res.data;
}

export async function deleteQuestion(questionId) {
  const res = await api.delete(`/admin/questions/${questionId}`);
  return res.data;
}

export async function autoGenerateTest(payload) {
  const res = await api.post("/admin/tests/auto-generate", payload);
  return res.data;
}

export async function recordNoteActivity(noteId, secondsSpent) {
  const res = await api.post("/user/note-activity", {
    note_id: noteId,
    seconds_spent: secondsSpent,
  });
  return res.data;
}

export async function fetchUserActivitySummary() {
  const res = await api.get("/user/activity-summary");
  return res.data;
}

export async function fetchAdminUsers(params = {}) {
  const res = await api.get("/admin/users", { params });
  return res.data;
}

export async function updateUserPlan(userId, planData) {
  const res = await api.put(`/admin/users/${userId}/plan`, planData);
  return res.data;
}

export async function analyzeExamPerformanceAI(payload) {
  const res = await api.post("/ai/analyze-test-performance", payload);
  return res.data;
}

export async function extractQuestionsFromPDF(file, examId) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("exam_id", examId);
  const res = await api.post("/admin/questions/extract-pdf", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function bulkImportCategorizedQuestions(payload) {
  const res = await api.post("/admin/questions/bulk-import-categorized", payload);
  return res.data;
}


// ============ KREDİ SİSTEMİ ============
export async function fetchCreditBalance() {
  const res = await api.get("/credits/balance");
  return res.data; // { balance: number }
}

export async function fetchCreditHistory() {
  const res = await api.get("/credits/history");
  return res.data;
}

export async function fetchCreditPackages() {
  const res = await api.get("/credits/packages");
  return res.data;
}

export async function purchaseCredits(packageId) {
  const res = await api.post("/credits/purchase", { package_id: packageId });
  return res.data;
}

export async function adminGrantCredits(userId, amount, description) {
  const res = await api.post("/admin/credits/grant", { user_id: userId, amount, description });
  return res.data;
}

export async function startTopicQuiz(topicId, count = 20) {
  const res = await api.post(`/topics/${topicId}/start-quiz?count=${count}`);
  return res.data;
}

export async function generateQuestionsWithAI(payload) {
  const res = await api.post("/admin/questions/ai-generate", payload);
  return res.data;
}

// ============ AI BÖLÜM & MESLEK REHBERİ SEO MAKALE FABRİKASI ============
export async function fetchDepartmentCatalog() {
  const res = await api.get("/admin/blog/department-catalog");
  return res.data;
}

export async function startDepartmentArticlesGen(payload) {
  const res = await api.post("/admin/blog/generate-department-articles", payload);
  return res.data;
}

export async function fetchDepartmentArticlesStatus() {
  const res = await api.get("/admin/blog/generate-department-articles/status");
  return res.data;
}

export async function cancelDepartmentArticlesGen() {
  const res = await api.delete("/admin/blog/generate-department-articles/cancel");
  return res.data;
}

// ============ AI EXAM ARCHITECT & ONE-CLICK PROVISIONING ============
export async function discoverAiExam(payload) {
  const res = await api.post("/admin/exams/ai-discover", payload);
  return res.data;
}

export async function provisionAiExam(payload) {
  const res = await api.post("/admin/exams/ai-provision", payload);
  return res.data;
}

export async function fetchExamDistributionAudit() {
  const res = await api.get("/admin/exams/distribution-audit");
  return res.data;
}


