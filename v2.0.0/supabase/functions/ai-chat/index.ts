import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM = `Sen Türkiye sınav hazırlık ve tercih rehberliği platformu 'HedefMatik'in yapay zekâ çalışma koçusun. Öğrencinin sorularına adım adım, anlaşılır bir şekilde Türkçe cevap verirsin. Matematik, fen, Türkçe, tarih ve diğer sınav konularında yardım edersin. Kısa, net ve öğretici ol. Gerektiğinde örnek çözümler ver.`;

function generateReply(message, history) {
  const lower = message.toLowerCase();

  if (lower.includes("merhaba") || lower.includes("selam") || lower.includes("naber")) {
    return "Merhaba! Ben senin AI çalışma koçunum. Sınav hazırlığıyla ilgili her türlü soruyu sorabilirsin — matematik problemleri, dilbilgisi kuralları, fen konuları ve daha fazlası. Hangi konuda yardım istersin?";
  }

  if (lower.includes("matematik") || lower.includes("problem") || lower.includes("fonksiyon") || lower.includes("türev")) {
    return "Matematik konusunda sana yardımcı olurum! Örneğin:\n\n1. Bir problemi çözemiyorsan, problemi yaz, adım adım çözelim.\n2. Bir konuyu anlamadıysan (örn. fonksiyonlar, türev), açıklayayım.\n3. Formül sormak istersen, ilgili formülü ve kullanımını göstereyim.\n\nHangi konuda yardım istiyorsun? Sorunu yaz, birlikte çözelim.";
  }

  if (lower.includes("türkçe") || lower.includes("paragraf") || lower.includes("anlam") || lower.includes("dilbilgisi")) {
    return "Türkçe konusunda yardımcı olurum! Paragraf sorularında ana düşünceyi bulma, dilbilgisi kuralları, sözcükte anlam ve anlatım bozuklukları gibi konularda sorularını cevaplayabilirim. Özellikle takıldığın bir soru türü var mı?";
  }

  if (lower.includes("fizik") || lower.includes("kimya") || lower.includes("biyoloji") || lower.includes("fen")) {
    return "Fen bilimleri konusunda buradayım! Fizikte kuvvet, hareket, elektrik; kimyada atom yapısı, periyodik sistem; biyolojide hücre, genetik gibi konularda yardımcı olurum. Hangi konuda sorun yaşıyorsun?";
  }

  if (lower.includes("tarih") || lower.includes("inkılap") || lower.includes("osmanlı")) {
    return "Tarih konusunda yardımcı olurum! İnkılap tarihi, Osmanlı tarihi, Kurtuluş Savaşı gibi konularda sorularını cevaplayabilirim. Özellikle öğrenmek istediğin bir konu var mı?";
  }

  if (lower.includes("çalışma planı") || lower.includes("program") || lower.includes("nasıl çalış")) {
    return "Sana özel bir çalışma planı önerebilirim! Bunun için şu bilgileri ver:\n\n1. Hangi sınava hazırlanıyorsun?\n2. Zayıf olduğun konular neler?\n3. Günlük kaç saat çalışabilirsin?\n\nBu bilgilerle sana haftalık bir program hazırlayayım.";
  }

  if (lower.includes("sor") || lower.includes("soru çöz") || lower.includes("pratik")) {
    return "Tabii ki pratik sorularla çalışabilirsin! Soru Bankası sayfasına gidip ders ve konu seçerek soru çözebilirsin. Ayrıca Denemeler sayfasından süreli deneme sınavları çözebilirsin. Zayıf konularını Eksiklerim sayfasından takip edebilirsin.";
  }

  if (lower.includes("eksik") || lower.includes("zayıf") || lower.includes("yetersiz")) {
    return "Eksik konularını belirlemek için deneme sınavı çözmen önemli. Çözdüğün her soru sistem tarafından kaydedilir ve konu bazlı yeterlilik skorun hesaplanır. Eksiklerim sayfasından hangi konularda zayıf olduğunu görebilir, o konuların ders notlarına çalışabilirsin.";
  }

  if (lower.includes("motivasyon") || lower.includes("sıkıldım") || lower.includes("yorgun") || lower.includes("bıktım")) {
    return "Sınav hazırlığı gerçekten zor bir süreç, ama emin ol ki çaban boşa gitmiyor! Her çözdüğün soru, her çalıştığın konu hedefine bir adım daha yaklaştırıyor. Kendine küçük hedefler koy ve her başarıyı kutla. Disiplin, yeteneğin her gün tekrar edilen halidir. Başarı adım adım gelir!";
  }

  if (history.length > 0) {
    return `Sorduğun "${message}" konusu hakkında yardımcı olmak isterim. Daha detaylı yardımcı olabilmem için hangi sınav için çalıştığını veya takıldığın özel bir nokta varsa onu paylaşabilir misin?`;
  }

  return `Sorunu anladım: "${message}". Bu konuda sana yardımcı olmak isterim! Daha spesifik bir soru sorarsan (örneğin bir matematik problemi, bir dilbilgisi kuralı veya bir tarih olayı), daha detaylı yanıt verebilirim. Hangi konuda çalışıyorsun?`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { message, history = [] } = await req.json();
    const reply = generateReply(message, history);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
