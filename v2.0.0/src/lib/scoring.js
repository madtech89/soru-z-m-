/**
 * Türkiye Ulusal Sınavları Güncel ÖSYM & MEB Resmi Puan Hesaplama Motoru
 * (YKS TYT/AYT/YDT, LGS, KPSS P3/P93/P94/P10/P121, ALES, DGS, MSÜ, TUS, DUS, YDS/YÖKDİL)
 */

// Soru sayıları ve resmi katsayılar
export const EXAM_SCORING_PRESETS = {
  YKS: {
    name: "YKS (Yükseköğretim Kurumları Sınavı)",
    hasOBP: true,
    tabs: ["TYT", "AYT_SAY", "AYT_EA", "AYT_SOZ", "YDT_DIL"],
    sections: {
      tyt_turkce: { name: "TYT Türkçe", max: 40, penalty: 0.25, exam: "TYT" },
      tyt_matematik: { name: "TYT Temel Matematik", max: 40, penalty: 0.25, exam: "TYT" },
      tyt_sosyal: { name: "TYT Sosyal Bilimler (Tarih 5, Coğ 5, Fel 5, Din 5)", max: 20, penalty: 0.25, exam: "TYT" },
      tyt_fen: { name: "TYT Fen Bilimleri (Fizik 7, Kimya 7, Biyo 6)", max: 20, penalty: 0.25, exam: "TYT" },
      ayt_matematik: { name: "AYT Matematik (Mat-2 + Geometri)", max: 40, penalty: 0.25, exam: "AYT" },
      ayt_fizik: { name: "AYT Fizik", max: 14, penalty: 0.25, exam: "AYT" },
      ayt_kimya: { name: "AYT Kimya", max: 13, penalty: 0.25, exam: "AYT" },
      ayt_biyoloji: { name: "AYT Biyoloji", max: 13, penalty: 0.25, exam: "AYT" },
      ayt_edebiyat: { name: "AYT Türk Dili ve Edebiyatı", max: 24, penalty: 0.25, exam: "AYT" },
      ayt_tarih1: { name: "AYT Tarih-1", max: 10, penalty: 0.25, exam: "AYT" },
      ayt_cografya1: { name: "AYT Coğrafya-1", max: 6, penalty: 0.25, exam: "AYT" },
      ayt_tarih2: { name: "AYT Tarih-2", max: 11, penalty: 0.25, exam: "AYT" },
      ayt_cografya2: { name: "AYT Coğrafya-2", max: 11, penalty: 0.25, exam: "AYT" },
      ayt_felsefe: { name: "AYT Felsefe Grubu (Mantık, Psikoloji, Sosyoloji)", max: 12, penalty: 0.25, exam: "AYT" },
      ayt_din: { name: "AYT Din Kültürü / Ek Felsefe", max: 6, penalty: 0.25, exam: "AYT" },
      ydt_dil: { name: "YDT Yabancı Dil", max: 80, penalty: 0.25, exam: "YDT" },
    },
  },

  LGS: {
    name: "LGS (Liseye Geçiş Sistemi)",
    hasOBP: false,
    penalty: 0.333333, // 3 yanlış 1 doğruyu götürür
    sections: {
      lgs_turkce: { name: "Türkçe", max: 20, penalty: 0.333333, weight: 4.0 },
      lgs_matematik: { name: "Matematik", max: 20, penalty: 0.333333, weight: 4.0 },
      lgs_fen: { name: "Fen Bilimleri", max: 20, penalty: 0.333333, weight: 4.0 },
      lgs_inkilap: { name: "T.C. İnkılap Tarihi ve Atatürkçülük", max: 10, penalty: 0.333333, weight: 1.0 },
      lgs_din: { name: "Din Kültürü ve Ahlak Bilgisi", max: 10, penalty: 0.333333, weight: 1.0 },
      lgs_ingilizce: { name: "Yabancı Dil (İngilizce)", max: 10, penalty: 0.333333, weight: 1.0 },
    },
  },

  KPSS_LISANS: {
    name: "KPSS Lisans (B Grubu, Eğitim Bilimleri & ÖABT)",
    hasOBP: false,
    sections: {
      kpss_gy: { name: "Genel Yetenek (Türkçe 30, Mat 30)", max: 60, penalty: 0.25 },
      kpss_gk: { name: "Genel Kültür (Tarih 27, Coğ 18, Vatandaşlık 9, Güncel 6)", max: 60, penalty: 0.25 },
      kpss_egitim: { name: "Eğitim Bilimleri (Öğretmenlik)", max: 80, penalty: 0.25 },
      kpss_oabt: { name: "ÖABT Alan Bilgisi", max: 75, penalty: 0.25 },
    },
  },

  KPSS_ONLISANS: {
    name: "KPSS Ön Lisans (P93)",
    hasOBP: false,
    sections: {
      kpss_gy: { name: "Genel Yetenek (Türkçe 30, Mat 30)", max: 60, penalty: 0.25 },
      kpss_gk: { name: "Genel Kültür (Tarih 27, Coğ 18, Vatandaşlık 9, Güncel 6)", max: 60, penalty: 0.25 },
    },
  },

  ALES: {
    name: "ALES (Akademik Personel ve Lisansüstü Giriş Sınavı)",
    hasOBP: false,
    sections: {
      ales_sayisal: { name: "Sayısal (Matematik / Mantık)", max: 50, penalty: 0.25 },
      ales_sozel: { name: "Sözel (Türkçe / Muhakeme)", max: 50, penalty: 0.25 },
    },
  },

  DGS: {
    name: "DGS (Dikey Geçiş Sınavı)",
    hasOBP: true, // ÖBP (Ön Lisans Başarı Puanı)
    sections: {
      dgs_sayisal: { name: "Sayısal (Matematik/Geometri)", max: 50, penalty: 0.25 },
      dgs_sozel: { name: "Sözel (Türkçe)", max: 50, penalty: 0.25 },
    },
  },

  MSU: {
    name: "MSÜ (Milli Savunma Üniversitesi)",
    hasOBP: false,
    sections: {
      msu_turkce: { name: "Türkçe", max: 40, penalty: 0.25 },
      msu_matematik: { name: "Temel Matematik", max: 40, penalty: 0.25 },
      msu_sosyal: { name: "Sosyal Bilimler", max: 20, penalty: 0.25 },
      msu_fen: { name: "Fen Bilimleri", max: 20, penalty: 0.25 },
    },
  },

  TUS: {
    name: "TUS (Tıpta Uzmanlık Sınavı)",
    hasOBP: false,
    sections: {
      tus_temel: { name: "Temel Tıp Bilimleri", max: 100, penalty: 0.25 },
      tus_klinik: { name: "Klinik Tıp Bilimleri", max: 100, penalty: 0.25 },
    },
  },

  DUS: {
    name: "DUS (Diş Hekimliğinde Uzmanlık Sınavı)",
    hasOBP: false,
    sections: {
      dus_temel: { name: "Temel Bilimler", max: 40, penalty: 0.25 },
      dus_klinik: { name: "Klinik Bilimler", max: 80, penalty: 0.25 },
    },
  },

  YDS: {
    name: "YDS / YÖKDİL (Yabancı Dil Sınavı)",
    hasOBP: false,
    sections: {
      yds_soru: { name: "Yabancı Dil (İngilizce / Almanca / Fransızca)", max: 80, penalty: 0.0 }, // Yanlış doğruyu götürmez
    },
  },
};

// ============ HESAPLAMA FONKSİYONLARI ============

export function calculateNet(correct = 0, wrong = 0, penalty = 0.25) {
  const c = Math.max(0, Number(correct) || 0);
  const w = Math.max(0, Number(wrong) || 0);
  return Math.max(0, Math.round((c - w * penalty) * 100) / 100);
}

export function computeExamScores(examKey, inputs = {}, obpScore = 80, isKirikOBP = false) {
  const nets = {};
  for (const [k, v] of Object.entries(inputs)) {
    const penalty = v.penalty !== undefined ? v.penalty : 0.25;
    nets[k] = calculateNet(v.correct, v.wrong, penalty);
  }

  // Diploma / OBP hesaplama: OBP = Diploma Notu * 5 (250-500 arası)
  const safeDiploma = Math.min(100, Math.max(50, Number(obpScore) || 80));
  const obp = safeDiploma * 5;
  const obpMultiplier = isKirikOBP ? 0.06 : 0.12;
  const obpAddon = Math.round(obp * obpMultiplier * 100) / 100;

  let results = {};

  // 1. YKS
  if (examKey === "YKS" || examKey === "TYT" || examKey === "AYT") {
    const tytTurkce = nets.tyt_turkce || 0;
    const tytMat = nets.tyt_matematik || 0;
    const tytSos = nets.tyt_sosyal || 0;
    const tytFen = nets.tyt_fen || 0;
    const totalTytNet = tytTurkce + tytMat + tytSos + tytFen;

    // TYT Ham Puan Formülü (~100 taban + Türkçe*3.3 + Mat*3.3 + Sosyal*3.4 + Fen*3.4)
    const tytHam = totalTytNet > 0
      ? Math.min(500, Math.round((100 + tytTurkce * 3.32 + tytMat * 3.32 + tytSos * 3.42 + tytFen * 3.44) * 100) / 100)
      : 100;

    // AYT Netleri
    const aytMat = nets.ayt_matematik || 0;
    const aytFiz = nets.ayt_fizik || 0;
    const aytKim = nets.ayt_kimya || 0;
    const aytBiyo = nets.ayt_biyoloji || 0;
    const aytEdeb = nets.ayt_edebiyat || 0;
    const aytTar1 = nets.ayt_tarih1 || 0;
    const aytCog1 = nets.ayt_cografya1 || 0;
    const aytTar2 = nets.ayt_tarih2 || 0;
    const aytCog2 = nets.ayt_cografya2 || 0;
    const aytFel = nets.ayt_felsefe || 0;
    const aytDin = nets.ayt_din || 0;
    const ydtDil = nets.ydt_dil || 0;

    // SAYISAL (TYT %40 + Mat %30 + Fizik %10 + Kimya %10 + Biyoloji %10)
    const sayNet = aytMat + aytFiz + aytKim + aytBiyo;
    const sayHam = sayNet > 0 || totalTytNet > 0
      ? Math.min(500, Math.round((100 + (tytHam - 100) * 0.4 + aytMat * 3.0 + aytFiz * 2.85 + aytKim * 3.07 + aytBiyo * 3.07) * 100) / 100)
      : 100;

    // EŞİT AĞIRLIK (TYT %40 + Mat %30 + Edebiyat %18 + Tarih-1 %7 + Coğrafya-1 %5)
    const eaNet = aytMat + aytEdeb + aytTar1 + aytCog1;
    const eaHam = eaNet > 0 || totalTytNet > 0
      ? Math.min(500, Math.round((100 + (tytHam - 100) * 0.4 + aytMat * 3.0 + aytEdeb * 3.0 + aytTar1 * 2.8 + aytCog1 * 3.33) * 100) / 100)
      : 100;

    // SÖZEL (TYT %40 + Edebiyat %18 + Tarih-1 %7 + Coğ-1 %5 + Tarih-2 %8 + Coğ-2 %8 + Felsefe %9 + Din %5)
    const sozNet = aytEdeb + aytTar1 + aytCog1 + aytTar2 + aytCog2 + aytFel + aytDin;
    const sozHam = sozNet > 0 || totalTytNet > 0
      ? Math.min(500, Math.round((100 + (tytHam - 100) * 0.4 + aytEdeb * 3.0 + aytTar1 * 2.8 + aytCog1 * 3.33 + aytTar2 * 2.91 + aytCog2 * 2.91 + aytFel * 3.0 + aytDin * 3.33) * 100) / 100)
      : 100;

    // DİL (TYT %40 + YDT %60)
    const dilHam = ydtDil > 0 || totalTytNet > 0
      ? Math.min(500, Math.round((100 + (tytHam - 100) * 0.4 + ydtDil * 3.75) * 100) / 100)
      : 100;

    results = {
      primaryScore: tytHam,
      primaryType: "TYT Puanı",
      obpAddon,
      scores: [
        { type: "TYT Ham", score: tytHam, yerlestirme: Math.min(560, Math.round((tytHam + obpAddon) * 100) / 100), net: totalTytNet, color: "#4F46E5" },
        { type: "AYT Sayısal (SAY)", score: sayHam, yerlestirme: Math.min(560, Math.round((sayHam + obpAddon) * 100) / 100), net: totalTytNet + sayNet, color: "#10B981" },
        { type: "AYT Eşit Ağırlık (EA)", score: eaHam, yerlestirme: Math.min(560, Math.round((eaHam + obpAddon) * 100) / 100), net: totalTytNet + eaNet, color: "#F59E0B" },
        { type: "AYT Sözel (SÖZ)", score: sozHam, yerlestirme: Math.min(560, Math.round((sozHam + obpAddon) * 100) / 100), net: totalTytNet + sozNet, color: "#EC4899" },
        { type: "YDT Dil (DİL)", score: dilHam, yerlestirme: Math.min(560, Math.round((dilHam + obpAddon) * 100) / 100), net: totalTytNet + ydtDil, color: "#06B6D4" },
      ],
    };
  }

  // 2. LGS
  else if (examKey === "LGS") {
    const tur = nets.lgs_turkce || 0;
    const mat = nets.lgs_matematik || 0;
    const fen = nets.lgs_fen || 0;
    const ink = nets.lgs_inkilap || 0;
    const din = nets.lgs_din || 0;
    const ing = nets.lgs_ingilizce || 0;
    const totalNet = tur + mat + fen + ink + din + ing;

    // MEB Resmi LGS Ağırlıklı Standart Puan Formülü (Taban: 100, Tavan: 500)
    // Türkçe*4 + Mat*4 + Fen*4 + İnkılap*1 + Din*1 + İngilizce*1
    const weightedSum = (tur * 4.0) + (mat * 4.0) + (fen * 4.0) + (ink * 1.0) + (din * 1.0) + (ing * 1.0);
    // Maksimum ağırlıklı toplam: 20*4 + 20*4 + 20*4 + 10*1 + 10*1 + 10*1 = 270
    const lgsScore = totalNet > 0
      ? Math.min(500, Math.round((100 + (weightedSum / 270.0) * 400.0) * 100) / 100)
      : 100;

    results = {
      primaryScore: lgsScore,
      primaryType: "LGS Puanı",
      totalNet,
      scores: [
        { type: "LGS Merkezi Sınav Puanı", score: lgsScore, net: totalNet, color: "#4F46E5" },
      ],
    };
  }

  // 3. KPSS LİSANS
  else if (examKey === "KPSS_LISANS" || examKey.includes("KPSS")) {
    const gy = nets.kpss_gy || 0;
    const gk = nets.kpss_gk || 0;
    const egitim = nets.kpss_egitim || 0;
    const oabt = nets.kpss_oabt || 0;

    // P3: Lisans B Grubu (GY %50 + GK %50)
    const p3 = Math.min(100, Math.max(40, Math.round((40 + gy * 0.52 + gk * 0.48) * 100) / 100));
    // P10: Öğretmenlik (GY %30 + GK %30 + Eğitim %40)
    const p10 = Math.min(100, Math.max(40, Math.round((40 + gy * 0.30 + gk * 0.30 + egitim * 0.45) * 100) / 100));
    // P121: ÖABT'li Öğretmenlik (GY %15 + GK %15 + Eğitim %20 + ÖABT %50)
    const p121 = Math.min(100, Math.max(40, Math.round((40 + gy * 0.15 + gk * 0.15 + egitim * 0.20 + oabt * 0.55) * 100) / 100));

    results = {
      primaryScore: p3,
      primaryType: "KPSS P3 (Lisans)",
      scores: [
        { type: "KPSS P3 (Memurluk)", score: p3, net: gy + gk, color: "#4F46E5" },
        { type: "KPSS P10 (Eğitim Bilimleri)", score: p10, net: gy + gk + egitim, color: "#10B981" },
        { type: "KPSS P121 (ÖABT Öğretmenlik)", score: p121, net: gy + gk + egitim + oabt, color: "#F59E0B" },
      ],
    };
  }

  // 4. ALES
  else if (examKey === "ALES") {
    const say = nets.ales_sayisal || 0;
    const soz = nets.ales_sozel || 0;

    const alesSay = Math.min(100, Math.max(50, Math.round((50 + say * 0.75 + soz * 0.25) * 100) / 100));
    const alesSoz = Math.min(100, Math.max(50, Math.round((50 + soz * 0.75 + say * 0.25) * 100) / 100));
    const alesEa = Math.min(100, Math.max(50, Math.round((50 + say * 0.50 + soz * 0.50) * 100) / 100));

    results = {
      primaryScore: alesSay,
      primaryType: "ALES Sayısal",
      scores: [
        { type: "ALES Sayısal", score: alesSay, net: say + soz, color: "#10B981" },
        { type: "ALES Eşit Ağırlık", score: alesEa, net: say + soz, color: "#F59E0B" },
        { type: "ALES Sözel", score: alesSoz, net: say + soz, color: "#EC4899" },
      ],
    };
  }

  // 5. DGS
  else if (examKey === "DGS") {
    const say = nets.dgs_sayisal || 0;
    const soz = nets.dgs_sozel || 0;
    const obpAdd = Math.round(safeDiploma * 0.6 * 100) / 100;

    const dgsSay = Math.min(380, Math.max(100, Math.round((100 + say * 3.0 + soz * 0.6 + obpAdd) * 100) / 100));
    const dgsSoz = Math.min(380, Math.max(100, Math.round((100 + soz * 3.0 + say * 0.6 + obpAdd) * 100) / 100));
    const dgsEa = Math.min(380, Math.max(100, Math.round((100 + say * 1.8 + soz * 1.8 + obpAdd) * 100) / 100));

    results = {
      primaryScore: dgsSay,
      primaryType: "DGS Sayısal",
      obpAddon: obpAdd,
      scores: [
        { type: "DGS Sayısal (ÖBP Dahil)", score: dgsSay, net: say + soz, color: "#10B981" },
        { type: "DGS Eşit Ağırlık (ÖBP Dahil)", score: dgsEa, net: say + soz, color: "#F59E0B" },
        { type: "DGS Sözel (ÖBP Dahil)", score: dgsSoz, net: say + soz, color: "#EC4899" },
      ],
    };
  }

  // 6. MSÜ
  else if (examKey === "MSU" || examKey === "MSÜ") {
    const tur = nets.msu_turkce || 0;
    const mat = nets.msu_matematik || 0;
    const sos = nets.msu_sosyal || 0;
    const fen = nets.msu_fen || 0;
    const tot = tur + mat + sos + fen;

    const msuSay = Math.min(500, Math.max(100, Math.round((100 + tur * 2.5 + mat * 3.9 + fen * 3.6 + sos * 1.0) * 100) / 100));
    const msuEa = Math.min(500, Math.max(100, Math.round((100 + tur * 3.5 + mat * 3.7 + sos * 2.8 + fen * 1.0) * 100) / 100));
    const msuSoz = Math.min(500, Math.max(100, Math.round((100 + tur * 3.9 + sos * 3.9 + mat * 2.2 + fen * 1.0) * 100) / 100));
    const msuGenel = Math.min(500, Math.max(100, Math.round((100 + tur * 3.3 + mat * 3.3 + sos * 1.7 + fen * 1.7) * 100) / 100));

    results = {
      primaryScore: msuSay,
      primaryType: "MSÜ Sayısal",
      scores: [
        { type: "MSÜ Sayısal (Hava/Deniz Harp)", score: msuSay, net: tot, color: "#10B981" },
        { type: "MSÜ Eşit Ağırlık (Kara Harp)", score: msuEa, net: tot, color: "#F59E0B" },
        { type: "MSÜ Sözel (Kara Harp)", score: msuSoz, net: tot, color: "#EC4899" },
        { type: "MSÜ Genel (Astsubay MYO)", score: msuGenel, net: tot, color: "#4F46E5" },
      ],
    };
  }

  // 7. TUS & DUS
  else if (examKey === "TUS") {
    const t = nets.tus_temel || 0;
    const k = nets.tus_klinik || 0;
    const tusT = Math.min(85, Math.max(35, Math.round((35 + t * 0.35 + k * 0.15) * 100) / 100));
    const tusK = Math.min(85, Math.max(35, Math.round((35 + k * 0.35 + t * 0.15) * 100) / 100));
    const tusG = Math.min(85, Math.max(35, Math.round((35 + (t + k) * 0.25) * 100) / 100));

    results = {
      primaryScore: tusK,
      primaryType: "TUS Klinik Puanı",
      scores: [
        { type: "TUS Klinik Puanı (K)", score: tusK, net: t + k, color: "#4F46E5" },
        { type: "TUS Temel Puanı (T)", score: tusT, net: t + k, color: "#10B981" },
        { type: "TUS Genel Ağırlıklı", score: tusG, net: t + k, color: "#F59E0B" },
      ],
    };
  } else if (examKey === "DUS") {
    const t = nets.dus_temel || 0;
    const k = nets.dus_klinik || 0;
    const dusScore = Math.min(85, Math.max(35, Math.round((35 + t * 0.375 + k * 0.4375) * 100) / 100));
    results = {
      primaryScore: dusScore,
      primaryType: "DUS Puanı",
      scores: [{ type: "DUS Uzmanlık Puanı", score: dusScore, net: t + k, color: "#4F46E5" }],
    };
  }

  // 8. YDS / YÖKDİL
  else if (examKey === "YDS" || examKey === "YÖKDİL") {
    const dogru = (inputs.yds_soru?.correct || 0);
    const score = Math.min(100, Math.round(dogru * 1.25 * 100) / 100);
    let level = "Seviye Belirlenemedi (50 altı)";
    if (score >= 90) level = "A Seviyesi (C2 - Üst Düzey)";
    else if (score >= 80) level = "B Seviyesi (C1 - İleri Düzey)";
    else if (score >= 70) level = "C Seviyesi (B2 - Orta-İleri)";
    else if (score >= 60) level = "D Seviyesi (B1 - Orta)";
    else if (score >= 50) level = "E Seviyesi (A2 - Temel)";

    results = {
      primaryScore: score,
      primaryType: "YDS Puanı",
      level,
      scores: [
        { type: "100 Üzerinden Puan", score: score, net: dogru, color: "#4F46E5" },
      ],
    };
  }

  // Generic fallback
  else {
    let totNet = 0;
    for (const v of Object.values(nets)) totNet += v;
    const genScore = Math.min(500, Math.round((100 + totNet * 3.5) * 100) / 100);
    results = {
      primaryScore: genScore,
      primaryType: "Ham Puan",
      scores: [{ type: "Hesaplanan Puan", score: genScore, net: totNet, color: "#4F46E5" }],
    };
  }

  return results;
}
