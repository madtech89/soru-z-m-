import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function todayISO() {
  return new Date().toISOString();
}

function dateDaysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function startOfDayISO(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDayISO(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export async function fetchExams() {
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .order("order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchExamScoring(examId) {
  const { data, error } = await supabase
    .from("exams")
    .select("scoring_config")
    .eq("id", examId)
    .maybeSingle();
  if (error) throw error;
  return data?.scoring_config || { sections: [], base_score: 100, multiplier: 1, score_type: "Ham Puan" };
}

export async function saveExamScoring(examId, config) {
  const { error } = await supabase
    .from("exams")
    .update({ scoring_config: config })
    .eq("id", examId);
  if (error) throw error;
}

export async function fetchSubjects(examId) {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("exam_id", examId)
    .order("order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchTopics(examId, subjectId) {
  let q = supabase.from("topics").select("*").eq("exam_id", examId).order("order", { ascending: true });
  if (subjectId) q = q.eq("subject_id", subjectId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function fetchQuestions({ exam_id, subject_id, difficulty, result_filter, page = 1, page_size = 8, userId }) {
  let q = supabase.from("questions").select("*").eq("status", "active");

  if (exam_id) q = q.eq("exam_id", exam_id);
  if (subject_id) q = q.eq("subject_id", subject_id);
  if (difficulty) q = q.eq("difficulty", difficulty);

  const { count, error: countError } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .eq("exam_id", exam_id || "")
    .eq("subject_id", subject_id || "")
    .eq("difficulty", difficulty || "");

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  q = q.range(from, to);
  const { data, error } = await q;
  if (error) throw error;

  let items = data || [];
  if (userId && result_filter) {
    const { data: answers } = await supabase
      .from("user_answers")
      .select("question_id, is_correct, is_blank")
      .eq("user_id", userId);

    const answerMap = {};
    (answers || []).forEach((a) => { answerMap[a.question_id] = a; });

    if (result_filter === "wrong") items = items.filter((q) => answerMap[q.id] && !answerMap[q.id].is_correct && !answerMap[q.id].is_blank);
    else if (result_filter === "correct") items = items.filter((q) => answerMap[q.id]?.is_correct);
    else if (result_filter === "blank") items = items.filter((q) => answerMap[q.id]?.is_blank);
  }

  const total = count || 0;
  return {
    items,
    page,
    pages: Math.max(1, Math.ceil(total / page_size)),
    total,
  };
}

export async function fetchTests(examId) {
  let q = supabase.from("tests").select("*").eq("status", "published").order("created_at", { ascending: false });
  if (examId) q = q.eq("exam_id", examId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function fetchTest(testId) {
  const { data: test, error } = await supabase.from("tests").select("*").eq("id", testId).maybeSingle();
  if (error) throw error;
  if (!test) return null;

  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("*")
    .in("id", test.question_ids)
    .eq("status", "active");
  if (qErr) throw qErr;

  const orderMap = {};
  test.question_ids.forEach((qid, i) => { orderMap[qid] = i; });
  questions.sort((a, b) => (orderMap[a.id] ?? 0) - (orderMap[b.id] ?? 0));

  return { ...test, questions };
}

export async function startTestSession(testId, userId) {
  const { data, error } = await supabase
    .from("test_sessions")
    .insert({ test_id: testId, user_id: userId, status: "in_progress" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function submitTestSession(sessionId, testId, userId, answers, timeMap) {
  const { data: test } = await supabase.from("tests").select("*").eq("id", testId).maybeSingle();
  const { data: questions } = await supabase.from("questions").select("*").in("id", test.question_ids);

  let correct = 0, wrong = 0, blank = 0;
  const answerRows = [];

  for (const q of questions) {
    const sel = answers[q.id] || null;
    const isBlank = !sel;
    const isCorrect = sel === q.correct_answer;
    if (isBlank) blank++;
    else if (isCorrect) correct++;
    else wrong++;

    answerRows.push({
      user_id: userId,
      question_id: q.id,
      exam_id: q.exam_id,
      subject_id: q.subject_id,
      topic_id: q.topic_id,
      selected_answer: sel,
      correct_answer: q.correct_answer,
      is_correct: isCorrect,
      is_blank: isBlank,
      time_spent: timeMap[q.id] || 0,
      exam_session_id: sessionId,
    });
  }

  const net = Math.round((correct - wrong / 4) * 100) / 100;

  const { data: scoringConfig } = await supabase
    .from("exams")
    .select("scoring_config")
    .eq("id", test.exam_id)
    .maybeSingle();

  let score = 0;
  const cfg = scoringConfig?.scoring_config;
  if (cfg?.sections?.length > 0) {
    const subjMap = {};
    questions.forEach((q) => {
      if (!subjMap[q.subject_id]) {
        subjMap[q.subject_id] = { correct: 0, wrong: 0, blank: 0, subject_id: q.subject_id };
      }
      const sel = answers[q.id];
      if (sel === q.correct_answer) subjMap[q.subject_id].correct++;
      else if (!sel) subjMap[q.subject_id].blank++;
      else subjMap[q.subject_id].wrong++;
    });

    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, name")
      .in("id", Object.keys(subjMap));

    const subjNameMap = {};
    (subjects || []).forEach((s) => { subjNameMap[s.id] = s.name; });

    const breakdown = [];
    for (const s of cfg.sections) {
      const matchSubj = Object.entries(subjMap).find(([_, v]) => subjNameMap[v.subject_id] === s.name);
      const stats = matchSubj ? matchSubj[1] : { correct: 0, wrong: 0, blank: 0 };
      const secNet = stats.correct - stats.wrong * (s.wrong_penalty || 0.25);
      score += secNet * (s.coefficient || 1.0);
      breakdown.push({ name: s.name, net: secNet, coefficient: s.coefficient || 1.0 });
    }
    score = Math.round((score + (cfg.base_score || 100)) * (cfg.multiplier || 1.0));
  } else {
    score = Math.round(net * 10 + 100);
  }

  const successRate = questions.length > 0 ? Math.round((correct / (correct + wrong || 1)) * 1000) / 10 : 0;

  const { error: ansError } = await supabase.from("user_answers").insert(answerRows);
  if (ansError) throw ansError;

  const { data: result, error: resError } = await supabase
    .from("user_test_results")
    .insert({
      user_id: userId,
      session_id: sessionId,
      test_id: testId,
      test_name: test.name,
      exam_id: test.exam_id,
      total: questions.length,
      correct,
      wrong,
      blank,
      net,
      score,
      success_rate: successRate,
      section_breakdown: {},
    })
    .select()
    .single();
  if (resError) throw resError;

  await supabase.from("test_sessions").update({ status: "completed", end_time: todayISO() }).eq("id", sessionId);

  const xpGain = correct * 5 + (correct === questions.length ? 50 : 0);
  const { data: profile } = await supabase.from("profiles").select("xp").eq("id", userId).maybeSingle();
  if (profile) {
    await supabase.from("profiles").update({ xp: (profile.xp || 0) + xpGain }).eq("id", userId);
  }

  return result;
}

export async function answerPracticeQuestion(questionId, selectedAnswer, userId) {
  const { data: q, error } = await supabase.from("questions").select("*").eq("id", questionId).maybeSingle();
  if (error) throw error;

  const isCorrect = selectedAnswer === q.correct_answer;
  const isBlank = !selectedAnswer;

  const { error: ansError } = await supabase.from("user_answers").insert({
    user_id: userId,
    question_id: questionId,
    exam_id: q.exam_id,
    subject_id: q.subject_id,
    topic_id: q.topic_id,
    selected_answer: selectedAnswer,
    correct_answer: q.correct_answer,
    is_correct: isCorrect,
    is_blank: isBlank,
    time_spent: 0,
  });
  if (ansError) throw ansError;

  if (isCorrect) {
    const { data: profile } = await supabase.from("profiles").select("xp").eq("id", userId).maybeSingle();
    if (profile) {
      await supabase.from("profiles").update({ xp: (profile.xp || 0) + 5 }).eq("id", userId);
    }
  }

  return {
    correct_answer: q.correct_answer,
    is_correct: isCorrect,
    explanation: q.explanation || "",
  };
}

export async function fetchDashboard(userId) {
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

  const todayStart = startOfDayISO(0);
  const todayEnd = endOfDayISO(0);
  const { count: solvedToday } = await supabase
    .from("user_answers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd);

  const { count: correctToday } = await supabase
    .from("user_answers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_correct", true)
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd);

  const successToday = solvedToday > 0 ? Math.round((correctToday / solvedToday) * 100) : 0;

  const { data: results } = await supabase
    .from("user_test_results")
    .select("score, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const avgScore = results?.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;

  const { count: totalSolved } = await supabase
    .from("user_answers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: totalCorrect } = await supabase
    .from("user_answers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_correct", true);

  const overallSuccess = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;

  const series = [];
  for (let i = 6; i >= 0; i--) {
    const ds = startOfDayISO(i);
    const de = endOfDayISO(i);
    const { count: daySolved } = await supabase
      .from("user_answers")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", ds)
      .lte("created_at", de);
    series.push({
      date: new Date(ds).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      solved: daySolved || 0,
    });
  }

  const weakTopics = await fetchWeakTopicsData(userId);

  const targetExams = profile?.target_exams || [];
  let recommendedTests = [];
  if (targetExams.length > 0) {
    const { data: tests } = await supabase
      .from("tests")
      .select("id, name, question_count, duration_minutes")
      .in("exam_id", targetExams)
      .eq("status", "published")
      .limit(3);
    recommendedTests = tests || [];
  }

  return {
    streak: profile?.streak || 0,
    xp: profile?.xp || 0,
    solved_today: solvedToday || 0,
    daily_goal: profile?.daily_goal || 20,
    success_today: successToday,
    avg_score: avgScore,
    total_tests: results?.length || 0,
    overall_success: overallSuccess,
    total_solved: totalSolved || 0,
    series,
    weak_topics: weakTopics.slice(0, 5),
    recommended_tests: recommendedTests,
  };
}

export async function fetchWeakTopicsData(userId) {
  const { data: answers } = await supabase
    .from("user_answers")
    .select("question_id, topic_id, is_correct, is_blank, time_spent, created_at")
    .eq("user_id", userId);

  if (!answers || answers.length === 0) return [];

  const topicStats = {};
  for (const a of answers) {
    if (!a.topic_id) continue;
    if (!topicStats[a.topic_id]) {
      topicStats[a.topic_id] = { solved: 0, correct: 0, wrong: 0, blank: 0, totalTime: 0, count: 0 };
    }
    const t = topicStats[a.topic_id];
    t.solved++;
    t.count++;
    t.totalTime += a.time_spent || 0;
    if (a.is_blank) t.blank++;
    else if (a.is_correct) t.correct++;
    else t.wrong++;
  }

  const topicIds = Object.keys(topicStats);
  if (topicIds.length === 0) return [];

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subject_id, exam_id")
    .in("id", topicIds);

  const subjectIds = [...new Set((topics || []).map((t) => t.subject_id))];
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, slug")
    .in("id", subjectIds);

  const subjMap = {};
  (subjects || []).forEach((s) => { subjMap[s.id] = s; });

  const result = (topics || []).map((t) => {
    const stats = topicStats[t.id];
    const proficiency = stats.solved > 0 ? Math.round((stats.correct / stats.solved) * 100) : 0;
    const status = proficiency >= 70 ? "İyi" : proficiency >= 40 ? "Geliştirilmeli" : "Kritik Eksik";
    return {
      topic_id: t.id,
      topic_name: t.name,
      subject_id: t.subject_id,
      subject_name: subjMap[t.subject_id]?.name || "",
      subject_slug: subjMap[t.subject_id]?.slug || "general",
      solved: stats.solved,
      correct: stats.correct,
      wrong: stats.wrong,
      blank: stats.blank,
      avg_time: stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0,
      proficiency,
      status,
    };
  });

  return result.sort((a, b) => a.proficiency - b.proficiency);
}

export async function fetchProficiency(userId) {
  return fetchWeakTopicsData(userId);
}

export async function fetchStudyNotes(examId, topicId) {
  let q = supabase.from("study_notes").select("*").eq("status", "published").order("created_at", { ascending: false });
  if (examId) q = q.eq("exam_id", examId);
  if (topicId) q = q.eq("topic_id", topicId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function fetchLeaderboard(period, metric, examId, userId) {
  let dateFilter = null;
  if (period === "daily") dateFilter = startOfDayISO(0);
  else if (period === "weekly") dateFilter = dateDaysAgoISO(7);
  else if (period === "monthly") dateFilter = dateDaysAgoISO(30);

  let q = supabase.from("user_test_results").select("user_id, score, correct, test_id, exam_id, created_at");
  if (dateFilter) q = q.gte("created_at", dateFilter);
  if (examId) q = q.eq("exam_id", examId);

  const { data: results, error } = await q;
  if (error) throw error;

  const { data: profiles } = await supabase.from("profiles").select("id, name, xp");
  const profileMap = {};
  (profiles || []).forEach((p) => { profileMap[p.id] = p; });

  const userAgg = {};
  for (const r of results || []) {
    if (!userAgg[r.user_id]) {
      userAgg[r.user_id] = { user_id: r.user_id, scores: [], total_correct: 0, test_count: 0 };
    }
    userAgg[r.user_id].scores.push(r.score);
    userAgg[r.user_id].total_correct += r.correct || 0;
    userAgg[r.user_id].test_count++;
  }

  let rows = Object.values(userAgg).map((u) => {
    const avgScore = u.scores.length > 0 ? Math.round(u.scores.reduce((s, v) => s + v, 0) / u.scores.length) : 0;
    const xp = profileMap[u.user_id]?.xp || 0;
    let value = 0;
    if (metric === "score") value = avgScore;
    else if (metric === "questions") value = u.total_correct;
    else value = xp;
    return {
      user_id: u.user_id,
      name: profileMap[u.user_id]?.name || "?",
      tests: u.test_count,
      avg_score: avgScore,
      total_correct: u.total_correct,
      xp,
      value,
    };
  });

  rows.sort((a, b) => b.value - a.value);
  rows = rows.slice(0, 50);
  rows.forEach((r, i) => { r.rank = i + 1; });

  return rows;
}

export async function fetchAdminStats() {
  const [users, exams, questions, tests, answers, results] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("exams").select("*", { count: "exact", head: true }),
    supabase.from("questions").select("*", { count: "exact", head: true }),
    supabase.from("tests").select("*", { count: "exact", head: true }),
    supabase.from("user_answers").select("*", { count: "exact", head: true }),
    supabase.from("user_test_results").select("*", { count: "exact", head: true }),
  ]);
  return {
    users: users.count || 0,
    exams: exams.count || 0,
    questions: questions.count || 0,
    tests: tests.count || 0,
    answers: answers.count || 0,
    results: results.count || 0,
  };
}

export async function createExam(name, description, category = "universite") {
  const { data, error } = await supabase
    .from("exams")
    .insert({ name, description, exam_type: "general", status: "active", category })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createSubject(examId, name, slug = "general", order = 0) {
  const { data, error } = await supabase
    .from("subjects")
    .insert({ exam_id: examId, name, slug, order, status: "active" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createTopic(examId, subjectId, name, order = 0) {
  const { data, error } = await supabase
    .from("topics")
    .insert({ exam_id: examId, subject_id: subjectId, name, order, status: "active" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createSubtopic(topicId, name, order = 0) {
  const { data, error } = await supabase
    .from("subtopics")
    .insert({ topic_id: topicId, name, order })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createTest(examId, name, description, durationMinutes, difficulty, questionIds) {
  const { data, error } = await supabase
    .from("tests")
    .insert({
      exam_id: examId,
      name,
      description: description || "",
      duration_minutes: durationMinutes || 30,
      difficulty: difficulty || "orta",
      question_ids: questionIds,
      status: "published",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchQuestionsForExam(examId, limit = 30) {
  const { data, error } = await supabase
    .from("questions")
    .select("id")
    .eq("exam_id", examId)
    .eq("status", "active")
    .limit(limit);
  if (error) throw error;
  return (data || []).map((q) => q.id);
}

export async function createQuestion(q) {
  const { data, error } = await supabase
    .from("questions")
    .insert({ ...q, subtopic_id: q.subtopic_id || null, tags: [], year: null, source: "Admin", status: "active", question_type: "multiple_choice" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createNote(note) {
  const { data, error } = await supabase
    .from("study_notes")
    .insert({ ...note, status: "published" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchLatestAIRecommendation(userId) {
  const { data, error } = await supabase
    .from("ai_recommendations")
    .select("result, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data?.result || null;
}

export async function generateAICoach(context) {
  const url = `${SUPABASE_URL}/functions/v1/ai-coach`;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || ANON_KEY;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(context),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "AI önerisi üretilemedi");
  }

  const data = await resp.json();

  const { error } = await supabase
    .from("ai_recommendations")
    .insert({ user_id: context.userId, result: data });
  if (error) console.error("Failed to save AI recommendation:", error);

  return data;
}

export async function calculateScore(examId, sections) {
  const { data: exam } = await supabase
    .from("exams")
    .select("scoring_config")
    .eq("id", examId)
    .maybeSingle();

  const cfg = exam?.scoring_config || { sections: [], base_score: 100, multiplier: 1, score_type: "Ham Puan" };
  let totalScore = 0;
  const breakdown = [];

  for (const s of sections) {
    const secCfg = cfg.sections?.find((c) => c.name === s.name) || { wrong_penalty: 0.25, coefficient: 1.0 };
    const net = s.correct - s.wrong * (secCfg.wrong_penalty || 0.25);
    totalScore += net * (secCfg.coefficient || 1.0);
    breakdown.push({ name: s.name, net: Math.round(net * 100) / 100, coefficient: secCfg.coefficient || 1.0 });
  }

  totalScore = Math.round((totalScore + (cfg.base_score || 100)) * (cfg.multiplier || 1.0));
  const totalNet = sections.reduce((s, r) => s + (r.correct - r.wrong * 0.25), 0);

  return {
    score: totalScore,
    score_type: cfg.score_type || "Ham Puan",
    total_net: Math.round(totalNet * 100) / 100,
    breakdown,
  };
}

// ============ EXAM CATEGORIES ============
export const EXAM_CATEGORIES = [
  { key: "universite", label: "Üniversite", icon: "GraduationCap" },
  { key: "lise", label: "Lise", icon: "School" },
  { key: "ortaokul", label: "Ortaokul", icon: "BookOpen" },
  { key: "kpss", label: "Kamu Personeli", icon: "Landmark" },
  { key: "saglik", label: "Sağlık", icon: "Stethoscope" },
  { key: "surucu", label: "Sürücü", icon: "Car" },
  { key: "mesleki", label: "Mesleki", icon: "Briefcase" },
  { key: "dil", label: "Yabancı Dil", icon: "Languages" },
];

// ============ SUBTOPICS ============
export async function fetchSubtopics(topicId) {
  const { data, error } = await supabase
    .from("subtopics")
    .select("*")
    .eq("topic_id", topicId)
    .order("order", { ascending: true });
  if (error) throw error;
  return data;
}

// ============ PLACEMENT TEST ============
export async function createPlacementTest(examId) {
  const { data: subjectRows } = await supabase
    .from("subjects")
    .select("id, name, slug")
    .eq("exam_id", examId)
    .order("order", { ascending: true });
  let subjects = subjectRows;

  if (!subjects || subjects.length === 0) {
    const { data: allExams } = await supabase.from("exams").select("id").limit(1);
    if (allExams?.[0]) {
      const { data: fallbackSubj } = await supabase
        .from("subjects")
        .select("id, name, slug")
        .eq("exam_id", allExams[0].id)
        .order("order", { ascending: true });
      if (fallbackSubj) subjects = fallbackSubj;
    }
  }

  if (!subjects || subjects.length === 0) return null;

  const perSubject = Math.max(3, Math.ceil(30 / subjects.length));
  const allQs = [];

  for (const s of subjects) {
    const { data: qs } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", examId)
      .eq("subject_id", s.id)
      .eq("status", "active")
      .limit(perSubject);
    if (qs) allQs.push(...qs);
  }

  while (allQs.length > 30) allQs.pop();
  while (allQs.length < 30 && subjects.length > 0) {
    const { data: more } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", examId)
      .eq("status", "active")
      .not("id", "in", `(${allQs.map((q) => `"${q.id}"`).join(",")})`)
      .limit(30 - allQs.length);
    if (!more || more.length === 0) break;
    allQs.push(...more);
  }

  if (allQs.length === 0) return null;

  return {
    examId,
    questions: allQs,
    duration_minutes: allQs.length,
    isPlacement: true,
  };
}

export async function submitPlacementTest(examId, userId, answers, timeMap) {
  const questions = await createPlacementTest(examId);
  if (!questions) return null;
  const qs = questions.questions;

  let correct = 0, wrong = 0, blank = 0;
  const answerRows = [];
  const topicStats = {};

  for (const q of qs) {
    const sel = answers[q.id] || null;
    const isBlank = !sel;
    const isCorrect = sel === q.correct_answer;
    if (isBlank) blank++;
    else if (isCorrect) correct++;
    else wrong++;

    answerRows.push({
      user_id: userId,
      question_id: q.id,
      exam_id: q.exam_id,
      subject_id: q.subject_id,
      topic_id: q.topic_id,
      selected_answer: sel,
      correct_answer: q.correct_answer,
      is_correct: isCorrect,
      is_blank: isBlank,
      time_spent: timeMap[q.id] || 0,
    });

    if (!topicStats[q.topic_id]) {
      topicStats[q.topic_id] = { topic_id: q.topic_id, subject_id: q.subject_id, solved: 0, correct: 0, wrong: 0, blank: 0 };
    }
    const ts = topicStats[q.topic_id];
    ts.solved++;
    if (isBlank) ts.blank++;
    else if (isCorrect) ts.correct++;
    else ts.wrong++;
  }

  const { error: ansError } = await supabase.from("user_answers").insert(answerRows);
  if (ansError) throw ansError;

  const { data: profile } = await supabase.from("profiles").select("xp, level").eq("id", userId).maybeSingle();
  const xpGain = correct * 5;
  const newXp = (profile?.xp || 0) + xpGain;
  const newLevel = Math.floor(newXp / 500) + 1;

  await supabase.from("profiles").update({
    target_exams: [examId],
    placement_completed: true,
    xp: newXp,
    level: Math.max(profile?.level || 1, newLevel),
  }).eq("id", userId);

  await checkAndAwardBadges(userId, {
    questions_solved: qs.length,
    xp: newXp,
    level: newLevel,
  });

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .in("id", Object.keys(topicStats));

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, slug")
    .in("id", [...new Set(Object.values(topicStats).map((t) => t.subject_id))]);

  const subjMap = {};
  (subjects || []).forEach((s) => { subjMap[s.id] = s; });
  const topicMap = {};
  (topics || []).forEach((t) => { topicMap[t.id] = t; });

  const weakTopics = Object.values(topicStats).map((ts) => {
    const proficiency = ts.solved > 0 ? Math.round((ts.correct / ts.solved) * 100) : 0;
    const topic = topicMap[ts.topic_id];
    const subj = subjMap[ts.subject_id];
    return {
      topic_id: ts.topic_id,
      topic_name: topic?.name || "Bilinmeyen",
      subject_name: subj?.name || "",
      subject_slug: subj?.slug || "general",
      solved: ts.solved,
      correct: ts.correct,
      wrong: ts.wrong,
      blank: ts.blank,
      proficiency,
      status: proficiency >= 70 ? "İyi" : proficiency >= 40 ? "Geliştirilmeli" : "Kritik Eksik",
    };
  }).sort((a, b) => a.proficiency - b.proficiency);

  return {
    total: qs.length,
    correct,
    wrong,
    blank,
    net: Math.round((correct - wrong / 4) * 100) / 100,
    score: Math.round((correct - wrong * 0.25) * 10 + 100),
    success_rate: qs.length > 0 ? Math.round((correct / (correct + wrong || 1)) * 1000) / 10 : 0,
    weak_topics: weakTopics,
    questions: qs.map((q) => ({
      ...q,
      selected_answer: answers[q.id] || null,
      is_correct: answers[q.id] === q.correct_answer,
      is_blank: !answers[q.id],
    })),
    examId,
  };
}

// Compute placement results locally (no DB write) — for unauthenticated users
export function computePlacementResultLocal(test, answers) {
  const qs = test.questions;
  let correct = 0, wrong = 0, blank = 0;
  const topicStats = {};

  for (const q of qs) {
    const sel = answers[q.id] || null;
    const isBlank = !sel;
    const isCorrect = sel === q.correct_answer;
    if (isBlank) blank++;
    else if (isCorrect) correct++;
    else wrong++;

    if (!topicStats[q.topic_id]) {
      topicStats[q.topic_id] = { topic_id: q.topic_id, subject_id: q.subject_id, solved: 0, correct: 0, wrong: 0, blank: 0 };
    }
    const ts = topicStats[q.topic_id];
    ts.solved++;
    if (isBlank) ts.blank++;
    else if (isCorrect) ts.correct++;
    else ts.wrong++;
  }

  return {
    total: qs.length,
    correct,
    wrong,
    blank,
    net: Math.round((correct - wrong / 4) * 100) / 100,
    score: Math.round((correct - wrong * 0.25) * 10 + 100),
    success_rate: qs.length > 0 ? Math.round((correct / (correct + wrong || 1)) * 1000) / 10 : 0,
    weak_topics: Object.values(topicStats).map((ts) => {
      const proficiency = ts.solved > 0 ? Math.round((ts.correct / ts.solved) * 100) : 0;
      return {
        topic_id: ts.topic_id,
        subject_id: ts.subject_id,
        solved: ts.solved,
        correct: ts.correct,
        wrong: ts.wrong,
        blank: ts.blank,
        proficiency,
        status: proficiency >= 70 ? "İyi" : proficiency >= 40 ? "Geliştirilmeli" : "Kritik Eksik",
      };
    }).sort((a, b) => a.proficiency - b.proficiency),
    questions: qs.map((q) => ({
      ...q,
      selected_answer: answers[q.id] || null,
      is_correct: answers[q.id] === q.correct_answer,
      is_blank: !answers[q.id],
    })),
    examId: test.examId,
  };
}

// Enrich local result with topic/subject names from DB, then save to user account
export async function savePlacementResult(localResult, examId, userId) {
  const topicIds = localResult.weak_topics.map((t) => t.topic_id);
  const subjectIds = [...new Set(localResult.weak_topics.map((t) => t.subject_id))];

  const { data: topics } = await supabase.from("topics").select("id, name, subject_id").in("id", topicIds);
  const { data: subjects } = await supabase.from("subjects").select("id, name, slug").in("id", subjectIds);

  const subjMap = {};
  (subjects || []).forEach((s) => { subjMap[s.id] = s; });
  const topicMap = {};
  (topics || []).forEach((t) => { topicMap[t.id] = t; });

  const enrichedWeak = localResult.weak_topics.map((ts) => {
    const topic = topicMap[ts.topic_id];
    const subj = subjMap[ts.subject_id];
    return {
      ...ts,
      topic_name: topic?.name || "Bilinmeyen",
      subject_name: subj?.name || "",
      subject_slug: subj?.slug || "general",
    };
  });

  // Save answers to DB
  const answerRows = localResult.questions.map((q) => ({
    user_id: userId,
    question_id: q.id,
    exam_id: q.exam_id,
    subject_id: q.subject_id,
    topic_id: q.topic_id,
    selected_answer: q.selected_answer,
    correct_answer: q.correct_answer,
    is_correct: q.is_correct,
    is_blank: q.is_blank,
    time_spent: 0,
  }));

  await supabase.from("user_answers").insert(answerRows);

  const xpGain = localResult.correct * 5;
  const { data: profile } = await supabase.from("profiles").select("xp, level").eq("id", userId).maybeSingle();
  const newXp = (profile?.xp || 0) + xpGain;
  const newLevel = Math.floor(newXp / 500) + 1;

  await supabase.from("profiles").update({
    target_exams: [examId],
    placement_completed: true,
    xp: newXp,
    level: Math.max(profile?.level || 1, newLevel),
  }).eq("id", userId);

  await checkAndAwardBadges(userId, {
    questions_solved: localResult.total,
    xp: newXp,
    level: newLevel,
  });

  return { ...localResult, weak_topics: enrichedWeak };
}

// ============ BADGES & LEVELS ============
export async function fetchBadges() {
  const { data, error } = await supabase.from("badges").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchUserBadges(userId) {
  const { data, error } = await supabase
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", userId);
  if (error) throw error;
  return data || [];
}

export async function checkAndAwardBadges(userId, stats) {
  const { data: badges } = await supabase.from("badges").select("*");
  if (!badges) return;

  const { data: earned } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId);
  const earnedIds = new Set((earned || []).map((e) => e.badge_id));

  const toAward = [];
  for (const b of badges) {
    if (earnedIds.has(b.id)) continue;
    let met = false;
    switch (b.requirement_type) {
      case "questions_solved": met = stats.questions_solved >= b.requirement_threshold; break;
      case "xp": met = stats.xp >= b.requirement_threshold; break;
      case "streak": met = (stats.streak || 0) >= b.requirement_threshold; break;
      case "level": met = (stats.level || 1) >= b.requirement_threshold; break;
      case "tests_completed": met = (stats.tests_completed || 0) >= b.requirement_threshold; break;
      case "perfect_test": met = stats.perfect_test === true; break;
    }
    if (met) toAward.push({ user_id: userId, badge_id: b.id });
  }

  if (toAward.length > 0) {
    await supabase.from("user_badges").insert(toAward);
  }
}

export function getLevelInfo(xp) {
  const level = Math.floor(xp / 500) + 1;
  const xpInLevel = xp % 500;
  const xpForNext = 500;
  const progress = Math.round((xpInLevel / xpForNext) * 100);
  return { level, xpInLevel, xpForNext, progress, xpToNext: xpForNext - xpInLevel };
}

// ============ AI CHAT COACH ============
export async function fetchChatConversations(userId) {
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createChatConversation(userId, title = "Yeni Sohbet") {
  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({ user_id: userId, title })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchChatMessages(conversationId) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function sendChatMessage(conversationId, userId, content, history = []) {
  const { error: msgError } = await supabase
    .from("chat_messages")
    .insert({ conversation_id: conversationId, user_id: userId, role: "user", content });
  if (msgError) throw msgError;

  await supabase
    .from("chat_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  const url = `${SUPABASE_URL}/functions/v1/ai-chat`;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || ANON_KEY;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ message: content, history, userId }),
  });

  if (!resp.ok) {
    throw new Error("AI yanıt veremedi");
  }

  const data = await resp.json();
  const aiReply = data.reply || "Üzgünüm, yanıt oluşturamadım.";

  const { error: aiMsgError } = await supabase
    .from("chat_messages")
    .insert({ conversation_id: conversationId, user_id: userId, role: "assistant", content: aiReply });
  if (aiMsgError) throw aiMsgError;

  return aiReply;
}

export async function deleteChatConversation(conversationId) {
  const { error } = await supabase
    .from("chat_conversations")
    .delete()
    .eq("id", conversationId);
  if (error) throw error;
}

// ============ EXAM REVIEW ============
export async function fetchTestReview(sessionId, testId) {
  const { data: test } = await supabase.from("tests").select("*").eq("id", testId).maybeSingle();
  if (!test) return null;

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .in("id", test.question_ids)
    .eq("status", "active");

  const orderMap = {};
  test.question_ids.forEach((qid, i) => { orderMap[qid] = i; });
  questions.sort((a, b) => (orderMap[a.id] ?? 0) - (orderMap[b.id] ?? 0));

  const { data: answers } = await supabase
    .from("user_answers")
    .select("*")
    .eq("exam_session_id", sessionId)
    .order("created_at", { ascending: true });

  const answerMap = {};
  (answers || []).forEach((a) => { answerMap[a.question_id] = a; });

  return questions.map((q) => ({
    ...q,
    selected_answer: answerMap[q.id]?.selected_answer || null,
    is_correct: answerMap[q.id]?.is_correct ?? false,
    is_blank: answerMap[q.id]?.is_blank ?? true,
    time_spent: answerMap[q.id]?.time_spent || 0,
  }));
}

export async function fetchTestResult(resultId) {
  const { data, error } = await supabase
    .from("user_test_results")
    .select("*")
    .eq("id", resultId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ============ TERCİH ROBOTU (UNIVERSITY PROGRAMS) ============
export const SCORE_TYPES = [
  { key: "sayisal", label: "Sayısal (SAY)", desc: "Mühendislik, Tıp, Diş Hekimliği, Eczacılık" },
  { key: "esit_agirlik", label: "Eşit Ağırlık (EA)", desc: "Hukuk, İşletme, İktisat, Kamu Yönetimi" },
  { key: "sozel", label: "Sözel (SÖZ)", desc: "Edebiyat, Tarih, Felsefe, RPD, Sosyal Bilgiler" },
  { key: "dil", label: "Dil (DİL)", desc: "İngiliz Dili, Mütercim-Tercümanlık, Dil Edebiyatı" },
];

export const EXAM_TYPES = [
  { key: "YKS", label: "YKS (TYT + AYT)", desc: "Üniversiteye giriş sınavı" },
  { key: "DGS", label: "DGS", desc: "Dikey Geçiş Sınavı" },
  { key: "ALES", label: "ALES", desc: "Akademik Personel ve Lisansüstü Eğitimi Giriş Sınavı" },
];

export async function fetchProgramRecommendations(scoreType, userScore, filters = {}) {
  let q = supabase
    .from("university_programs")
    .select("*")
    .eq("score_type", scoreType)
    .eq("status", "active");

  if (filters.cities && filters.cities.length > 0) {
    q = q.in("city", filters.cities);
  }
  if (filters.universities && filters.universities.length > 0) {
    q = q.in("university", filters.universities);
  }
  if (filters.programKeyword) {
    q = q.ilike("program", `%${filters.programKeyword}%`);
  }

  const { data, error } = await q.order("score_2025", { ascending: false });
  if (error) throw error;

  const programs = data || [];
  const safe = Number(userScore) || 0;

  const safePrograms = programs.filter((p) => Number(p.score_2025) > 0);
  const sorted = [...safePrograms].sort((a, b) => Number(b.score_2025) - Number(a.score_2025));

  const guaranteed = sorted.filter((p) => safe >= Number(p.score_2025) + 5);
  const likely = sorted.filter((p) => {
    const s = Number(p.score_2025);
    return safe >= s - 15 && safe < s + 5;
  });
  const reach = sorted.filter((p) => {
    const s = Number(p.score_2025);
    return safe >= s - 40 && safe < s - 15;
  });

  return {
    guaranteed: guaranteed.slice(0, 20),
    likely: likely.slice(0, 20),
    reach: reach.slice(0, 15),
    total: sorted.length,
  };
}

export async function fetchDistinctCities() {
  const { data, error } = await supabase
    .from("university_programs")
    .select("city")
    .eq("status", "active")
    .neq("city", "");
  if (error) return [];
  const unique = [...new Set((data || []).map((d) => d.city))].sort();
  return unique;
}

export async function fetchDistinctUniversities() {
  const { data, error } = await supabase
    .from("university_programs")
    .select("university")
    .eq("status", "active");
  if (error) return [];
  const unique = [...new Set((data || []).map((d) => d.university))].sort();
  return unique;
}
