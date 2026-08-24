import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM = `Sen Türkiye sınav hazırlık platformu 'Netor'un yapay zekâ çalışma koçusun. Öğrencinin GERÇEK performans verilerine dayanarak, motive edici ama gerçekçi, Türkçe öneriler üretirsin. Asla rastgele tavsiye verme; verilen verilere dayan. Cevabını YALNIZCA geçerli JSON olarak, şu şemayla döndür: {"analysis": "2-4 cümlelik kişisel analiz", "focus_topics": ["konu1", "konu2", "konu3"], "daily_questions": 30, "weekly_plan": [{"day": "Pazartesi", "subject": "Matematik", "topic": "Problemler", "task": "Ders notu + 30 soru"}], "motivation": "kısa motivasyon cümlesi"}. weekly_plan tam 7 gün içermeli (Pazartesi..Pazar).`;

function generateFallback(ctx) {
  const weak = ctx.weak || [];
  const weakNames = weak.map((w) => (typeof w === "object" ? w.topic_name : String(w)));
  const dailyGoal = ctx.daily_goal || 25;
  const targetExam = ctx.target_exam || "Genel Sınav";
  const targetScore = ctx.target_score || "Hedef Puan";
  const overall = ctx.overall_success || 0;

  const focus = weakNames.slice(0, 3).length > 0
    ? weakNames.slice(0, 3)
    : ["Temel Kavramlar", "Paragraf / Anlam Bilgisi", "Sayı Problemleri"];

  const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
  const weeklyPlan = days.map((day) => {
    const topic = focus[days.indexOf(day) % focus.length];
    if (day === "Pazar") return { day, subject: "Genel Deneme", topic, task: "Haftalık genel tekrar ve deneme sınavı çözümü" };
    if (day === "Cumartesi") return { day, subject: "Pekiştirme", topic, task: `${dailyGoal + 10} soru soru bankası çözümü ve eksik analizi` };
    return { day, subject: "Çalışma", topic, task: `Konu özeti okuma + ${dailyGoal} soru çözüm pratiği` };
  });

  const analysis = `${targetExam} hazırlığında genel başarı oranın %${overall}. ${weakNames.length > 0 ? `Zayıf olduğun ${focus.slice(0, 2).join(", ")} konularına öncelik vererek netlerini hızla artırabilirsin.` : "Düzenli soru çözümü ve deneme pratikleriyle hedefine emin adımlarla ilerliyorsun."} Günlük ${dailyGoal} soru hedefini aksatmadan 7 günlük planı takip etmelisin.`;

  return {
    analysis,
    focus_topics: focus,
    daily_questions: dailyGoal,
    weekly_plan: weeklyPlan,
    motivation: "Disiplin, yeteneğin her gün tekrar edilen halidir. Başarı adım adım gelir!",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const ctx = await req.json();
    const result = generateFallback(ctx);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
