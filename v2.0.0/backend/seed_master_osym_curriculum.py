"""
Türkiye ÖSYM & Ulusal Sınavlar Master Müfredat ve Kategori Tohumlayıcısı
Tüm sınav türleri (YKS TYT/AYT, ALES, DGS, KPSS Lisans/Alan/Eğitim, TUS, DUS, SMMM, YDS/YÖKDİL, MSÜ, LGS)
için resmi dersler, ana konular ve alt başlıklar.
Hatalı/sahte sorular temizlenir, tertemiz kurumsal yapı kurulur.
"""

import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, delete
from database import AsyncSessionLocal, init_models
import models as M


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# Master Sınav ve Müfredat Veri Yapısı
MASTER_CURRICULUM = [
    # =========================================================================
    # 1. ÜNİVERSİTE & LİSANSÜSTÜ (universite)
    # =========================================================================
    {
        "exam_name": "YKS TYT",
        "exam_type": "TYT",
        "category": "universite",
        "description": "Yükseköğretim Kurumları Sınavı - Temel Yeterlilik Testi (120 Soru / 165 Dk)",
        "subjects": [
            {
                "name": "Temel Matematik (Mat-1)",
                "topics": [
                    "Temel Kavramlar ve Sayı Kümeleri", "Sayı Basamakları ve Çözümleme", "Bölme ve Bölünebilme Kuralları",
                    "EBOB - EKOK ve Periyodik Problemler", "Rasyonel ve Ondalık Sayılar", "Basit Eşitsizlikler ve Aralık Kavramı",
                    "Mutlak Değer ve Özellikleri", "Üslü İfadeler ve Denklemler", "Köklü İfadeler ve Eşlenik",
                    "Çarpanlara Ayırma ve Sadeleştirme", "Oran ve Orantı Çeşitleri", "Birinci Dereceden Denklem Çözme",
                    "Sayı ve Kesir Problemleri", "Yaş Problemleri", "İşçi ve Emek Problemleri", "Yüzde, Kâr ve Zarar Problemleri",
                    "Karışım Problemleri", "Hareket ve Hız Problemleri", "Grafik ve Tablo Okuma Problemleri",
                    "Mantık ve Önermeler", "Kümeler ve Kartezyen Çarpım", "Fonksiyonlar (Tanım, Değer, Ters, Bileşke)",
                    "Polinomlar ve Çarpanlar", "İkinci Dereceden Denklemler", "Sayma, Permütasyon ve Kombinasyon",
                    "Binom Açılımı ve Olasılık", "İstatistik ve Merkezi Eğilim Ölçüleri"
                ]
            },
            {
                "name": "Türkçe",
                "topics": [
                    "Sözcükte Anlam ve Söz Öbekleri", "Cümlede Anlam ve Cümle Yorumu", "Paragrafta Ana Düşünce ve Konu",
                    "Paragrafta Yardımcı Düşünceler", "Paragrafın Yapısı ve Akışı Bozan Cümleler", "Anlatım Teknikleri ve Düşünceyi Geliştirme Yolları",
                    "Ses Bilgisi (Ünlü ve Ünsüz Olayları)", "Yazım Kuralları ve Büyük Harflerin Kullanımı", "Noktalama İşaretleri",
                    "Sözcükte Yapı (Kök, Gövde, Yapım ve Çekim Ekleri)", "İsimler (Adlar) ve İsim Tamlamaları", "Sıfatlar (Ön Adlar) ve Sıfat Tamlamaları",
                    "Zamirler (Adıllar)", "Zarflar (Belirteçler)", "Edat, Bağlaç ve Ünlem", "Fiiller (Eylemler), Kip ve Kişi",
                    "Ek Fiil ve Fiilde Anlam Kayması", "Fiilimsiler (İsim-Fiil, Sıfat-Fiil, Zarf-Fiil)", "Fiilde Çatı (Öznesine ve Nesnesine Göre)",
                    "Cümlenin Ögeleri (Temel ve Yardımcı Ögeler)", "Cümle Türleri (Yapısına, Anlamına, Yüklemine Göre)", "Anlatım Bozuklukları"
                ]
            },
            {
                "name": "Geometri",
                "topics": [
                    "Doğruda ve Üçgende Açılar", "Dik Üçgen ve Pisagor Bağıntısı", "Özel Açılı Dik Üçgenler ve Öklid Bağıntıları",
                    "İkizkenar ve Eşkenar Üçgen", "Açı-Kenar Bağıntıları", "Üçgende Açıortay Bağıntıları", "Üçgende Kenarortay Bağıntıları",
                    "Üçgende Eşlik ve Benzerlik", "Üçgende Alan ve Alan Parçalama", "Çokgenler ve Düzgün Çokgenler",
                    "Dörtgenler ve Genel Özellikleri", "Paralelkenar ve Eşkenar Dörtgen", "Dikdörtgen ve Kare", "Yamuk ve Deltoid",
                    "Çemberde Açılar ve Özellikleri", "Çemberde Uzunluk, Teğet ve Kiriş", "Dairede Çevre ve Alan",
                    "Katı Cisimler (Prizmalar, Silindir)", "Piramit, Koni ve Küre", "Noktanın ve Doğrunun Analitik İncelenmesi"
                ]
            },
            {
                "name": "Fizik",
                "topics": [
                    "Fizik Bilimine Giriş ve Temel Büyüklükler", "Madde ve Özellikleri, Özkütle", "Sıvıların Kaldırma Kuvveti",
                    "Katı, Sıvı ve Gaz Basıncı", "Isı, Sıcaklık ve İç Enerji", "Hal Değişimi ve Isıl Denge", "Genleşme",
                    "Düzgün Doğrusal Hareket", "Kuvvet, Sürtünme Kuvveti ve Newton'un Yasaları", "İş, Güç ve Mekanik Enerji",
                    "Enerjinin Korunumu ve Dönüşümleri", "Elektrostatik ve Elektrik Yükleri", "Elektrik Akımı, Direnç ve Ohm Yasası",
                    "Elektrik Devreleri ve Elektriksel Güç", "Mıknatıslar ve Manyetik Alan", "Aydınlanma ve Gölge Olayları",
                    "Düzlem Ayna ve Küresel Aynalar", "Işığın Kırılması ve Tam Yansıma", "Mercekler ve Renk Olayı",
                    "Dalgaların Temel Özellikleri", "Yay Dalgaları ve Su Dalgaları", "Ses ve Deprem Dalgaları"
                ]
            },
            {
                "name": "Kimya",
                "topics": [
                    "Kimya Disiplinleri ve Güvenlik Kuralları", "Simyadan Kimyaya ve Temel Kimya Kanunları", "Atom Modelleri ve Atomun Yapısı",
                    "Periyodik Sistem ve Periyodik Özellikler", "Kimyasal Türler ve Güçlü Etkileşimler (İyonik, Kovalent, Metalik)",
                    "Zayıf Etkileşimler (Van der Waals ve Hidrojen Bağı)", "Maddenin Fiziksel Halleri (Katı, Sıvı, Gaz, Plazma)",
                    "Maddenin Hal Değişimi ve Gaz Davranışları", "Doğa ve Kimya (Su, Çevre ve Kimyasallar)", "Mol Kavramı ve Kimyasal Hesaplamalar",
                    "Kimyasal Tepkime Türleri", "Karışımlar ve Derişim Birimleri", "Ayırma ve Saflaştırma Teknikleri",
                    "Asitler, Bazlar ve Özellikleri", "Nötralleşme ve Tuzlar", "Kimya Her Yerde (Temizlik, Polimer, Kozmetik, İlaç)"
                ]
            },
            {
                "name": "Biyoloji",
                "topics": [
                    "Canlıların Ortak Özellikleri", "İnorganik Bileşikler (Su, Mineraller, Asit-Baz-Tuz)", "Organik Bileşikler (Karbonhidrat, Yağ, Protein)",
                    "Enzimler, Vitaminler ve Nükleik Asitler (ATP)", "Hücre Teorisi, Prokaryot ve Ökaryot Hücre", "Hücre Organelleri ve Çekirdek",
                    "Hücre Zarından Madde Geçişleri (Difüzyon, Osmoz, Aktif Taşıma, Endositoz, Ekzositoz)", "Canlıların Sınıflandırılması ve Alemler",
                    "Mitoz Bölünme ve Eşeysiz Üreme", "Mayoz Bölünme ve Eşeyli Üreme", "Kalıtımın Temel İlkeleri (Mendel Genetiği, Eş Baskınlık, Kan Grupları)",
                    "Cinsiyete Bağlı Kalıtım ve Soyağaçları", "Ekosistem Ekolojisi ve Madde Döngüleri", "Güncel Çevre Sorunları ve Biyoçeşitlilik"
                ]
            },
            {
                "name": "Tarih",
                "topics": [
                    "Tarih Bilimi ve Zaman", "İnsanlığın İlk Dönemleri ve İlk Uygarlıklar", "İlk ve Orta Çağlarda Türk Dünyası",
                    "İslam Medeniyetinin Doğuşu ve İlk İslam Devletleri", "Türklerin İslamiyet'i Kabulü ve İlk Türk İslam Devletleri",
                    "Türkiye Selçuklu Devleti ve Anadolu Beylikleri", "Beylikten Devlete Osmanlı Siyaseti (Kuruluş)",
                    "Dünya Gücü Osmanlı (Yükselme Dönemi)", "Osmanlı Kültür ve Medeniyeti", "Değişen Dünya Dengeleri Karşısında Osmanlı (Duraklama ve Gerileme)",
                    "Uluslararası İlişkilerde Denge Stratejisi (19. Yüzyıl)", "20. Yüzyıl Başlarında Osmanlı ve 1. Dünya Savaşı",
                    "Millî Mücadele Hazırlık Dönemi (Genelgeler ve Kongreler)", "1. TBMM Dönemi ve Ayaklanmalar",
                    "Millî Mücadele Cepheler Dönemi (Doğu, Güney, Batı)", "Lozan Barış Antlaşması", "Atatürk İnkılapları ve İlkeleri"
                ]
            },
            {
                "name": "Coğrafya",
                "topics": [
                    "Doğa ve İnsan Etkileşimi", "Dünya'nın Şekli ve Hareketleri", "Coğrafi Konum (Matematik ve Özel Konum)",
                    "Harita Bilgisi ve Projeksiyonlar", "Atmosfer, Sıcaklık ve Basınç", "Rüzgarlar, Nem ve Yağış Tipleri",
                    "Büyük İklim Tipleri ve Bitki Örtüsü", "Türkiye'nin İklimi ve Özellikleri", "İç Kuvvetler (Orojenez, Epirojenez, Volkanizma, Seizma)",
                    "Dış Kuvvetler (Akarsular, Rüzgarlar, Buzullar, Karstik Şekiller, Dalgalar)", "Su Kaynakları (Okyanus, Deniz, Göl, Akarsu)",
                    "Toprak Çeşitleri ve Bitki Toplulukları", "Nüfusun Dağılışı ve Nüfus Piramitleri", "Türkiye'de Nüfus, Yerleşme ve Göç",
                    "Ekonomik Faaliyetlerin Sınıflandırılması", "Bölge Kavramı ve Bölge Türleri", "Uluslararası Ulaşım Hatları", "Doğal Afetler ve Çevre"
                ]
            },
            {
                "name": "Felsefe & Din Kültürü",
                "topics": [
                    "Felsefenin Anlamı ve Özellikleri", "Bilgi Felsefesi (Epistemoloji)", "Varlık Felsefesi (Ontoloji)", "Ahlak Felsefesi (Etik)",
                    "Sanat Felsefesi (Estetik)", "Siyaset ve Din Felsefesi", "Bilim Felsefesi", "İslam ve İbadet",
                    "Ahlak ve Değerler", "Kur'an'da Temel Kavramlar", "İslam Düşüncesinde Tasavvufi ve İtikadi Yorumlar"
                ]
            }
        ]
    },
    {
        "exam_name": "YKS AYT",
        "exam_type": "AYT",
        "category": "universite",
        "description": "Yükseköğretim Kurumları Sınavı - Alan Yeterlilik Testi (80 Soru / 180 Dk)",
        "subjects": [
            {
                "name": "İleri Matematik (Mat-2)",
                "topics": [
                    "Fonksiyonlarda Dönüşümler ve Uygulamalar", "İkinci Dereceden Bir Bilinmeyenli Eşitsizlikler ve Sistemler",
                    "Parabol ve Tepe Noktası Analizi", "Polinomlarda Bölme ve Kalan Bulma", "Karmaşık Sayılar",
                    "Permütasyon, Kombinasyon ve Binom Açılımı", "Koşullu Olasılık ve Deneysel Olasılık",
                    "Logaritma Fonksiyonu ve Özellikleri", "Üstel ve Logaritmik Denklemler", "Aritmetik ve Geometrik Diziler",
                    "Trigonometrik Fonksiyonlar ve Birim Çember", "Toplam-Fark ve İki Kat Açı Formülleri", "Trigonometrik Denklemler",
                    "Limit Kavramı ve Sağdan-Soldan Limit", "Belirsizlik Durumları (0/0)", "Süreklilik ve Süreksizlik Türleri",
                    "Türev Tanımı ve Türev Alma Kuralları", "Bileşke ve Zincir Kuralı ile Türev", "Türevin Geometrik Yorumu ve Teğet Denklemi",
                    "Artan - Azalan Fonksiyonlar", "Yerel Ekstremum Noktalar", "Maksimum - Minimum Problemleri",
                    "Belirsiz İntegral ve Değişken Değiştirme", "Belirli İntegral ve Temel Teorem", "Riemann Toplamı ve Yaklaşımlar",
                    "İntegral ile Eğriler Arasında Alan Hesabı"
                ]
            },
            {
                "name": "İleri Geometri (AYT)",
                "topics": [
                    "Doğrunun Analitik İncelenmesi ve Eğimi", "İki Doğrunun Birbirine Göre Durumları", "Noktanın Doğruya Uzaklığı",
                    "Çemberin Analitik İncelenmesi (Standart ve Genel Denklem)", "Dönüşümler Geometrisi (Öteleme, Dönme, Simetri)",
                    "Vektörler ve Skaler Çarpım", "Çemberde Kiriş ve Teğet Özellikleri", "Dairede Alan ve Dilim Alanı",
                    "Uzay Geometri ve Düzlem Kesişimleri", "Katı Cisimlerin Hacim ve Yüzey Alanları"
                ]
            },
            {
                "name": "Türk Dili ve Edebiyatı (AYT)",
                "topics": [
                    "Şiir Bilgisi (Nazım Birimi, Ölçü, Kafiye, Redif, Edebi Sanatlar)", "İslamiyet Öncesi ve Geçiş Dönemi Edebiyatı (Kutadgu Bilig, Dîvânu Lugâti't-Türk)",
                    "Halk Edebiyatı (Anonim, Âşık, Tekke-Tasavvuf)", "Divan Edebiyatı Nazım Şekilleri (Gazel, Kaside, Mesnevi vb.)",
                    "Divan Şairleri ve Divan Nesri", "Tanzimat Edebiyatı 1. ve 2. Dönem (Şiir, Tiyatro, Roman)",
                    "Servet-i Fünun Edebiyatı ve Edebi Özellikleri", "Fecr-i Âti Topluluğu", "Millî Edebiyat Dönemi ve Sanatçıları",
                    "Cumhuriyet Dönemi Saf Şiir ve Toplumcu Gerçekçiler", "Cumhuriyet Dönemi Garipçiler ve İkinci Yeni Şiiri",
                    "Cumhuriyet Dönemi Dini Değerleri ve Mistisizmi Öne Çıkaranlar", "Cumhuriyet Dönemi Roman ve Hikâye (Millî-Dini, Bireyin İç Dünyası, Toplumcu, Postmodern)",
                    "Cumhuriyet Dönemi Tiyatro ve Öğretici Metinler", "Batı Edebiyatı Akımları (Klasisizm, Romantizm, Realizm, Parnasizm, Sembolizm, Sürrealizm vb.)"
                ]
            },
            {
                "name": "İleri Fizik (AYT)",
                "topics": [
                    "Vektörler ve Bağıl Hareket", "Newton'un Hareket Yasaları ve Dinamik", "Bir ve İki Boyutta Sabit İvmeli Hareket (Atışlar)",
                    "İş, Güç ve Mekanik Enerji Dönüşümleri", "İtme ve Çizgisel Momentum Korunumu, Çarpışmalar", "Tork, Denge ve Ağırlık Merkezi",
                    "Basit Makineler ve Verim", "Noktasal Yüklerde Elektriksel Kuvvet ve Alan", "Elektriksel Potansiyel, İş ve Enerji",
                    "Düzgün Elektrik Alan ve Sığaçlar (Kondansatörler)", "Manyetik Alan, Manyetik Kuvvet ve Manyetik Akı",
                    "Elektromanyetik İndüksiyon ve Özindüksiyon", "Alternatif Akım Devreleri ve Rezonans", "Transformatörler",
                    "Düzgün Çembersel Hareket ve Merkezcil Kuvvet", "Dönerek Öteleme ve Açısal Momentum Korunumu", "Kütle Çekim Kuvveti ve Kepler Yasaları",
                    "Basit Harmonik Hareket (Yaylı ve Basit Sarkaç)", "Dalga Mekaniği (Su ve Işıkta Kırınım, Girişim, Doppler)",
                    "Atom Kavramının Gelişimi ve Bohr Atom Modeli", "Büyük Patlama ve Radyoaktivite", "Özel Görelilik Teorisi",
                    "Kuantum Fiziğine Giriş, Siyah Cisim Işıması, Foton", "Fotoelektrik Olay ve Compton Saçılması", "Modern Fiziğin Teknolojideki Uygulamaları"
                ]
            },
            {
                "name": "İleri Kimya (AYT)",
                "topics": [
                    "Modern Atom Teorisi ve Kuantum Sayıları", "Periyodik Sistem ve Bloklar, Yükseltgenme Basamakları",
                    "Gaz Yasaları, İdeal Gaz Denklemi ve Kinetik Teori", "Gaz Karışımları, Kısmi Basınç ve Gerçek Gazlar",
                    "Sıvı Çözeltiler ve Derişim Türleri (Molarite, Molalite, ppm)", "Koligatif Özellikler (Donma Noktası Alçalması, Kaynama Noktası Yükselmesi)",
                    "Tepkimelerde Isı ve Standart Oluşum Entalpisi", "Hess Yasası ve Bağ Enerjileri", "Kimyasal Tepkime Hızları ve Çarpışma Teorisi",
                    "Kimyasal Denge ve Dengeyi Etkileyen Faktörler (Le Chatelier)", "Sulu Çözelti Dengeleri ve Asit-Baz Tanımları",
                    "pH, pOH, Zayıf Asit-Baz Dengeleri, Tampon Çözeltiler", "Tuzların Hidrolizi ve Titrasyon Grafikleri",
                    "Çözünürlük Dengesi (Kçç) ve Ortak İyon Etkisi", "Redoks Tepkimeleri ve İndirgenme-Yükseltgenme",
                    "Galvanik Piller, Standart Elektrot Potansiyelleri (Nernst Denklemi)", "Elektroliz, Faraday Yasaları ve Korozyon",
                    "Karbon Kimyasına Giriş ve Hibritleşme Türleri", "Molekül Geometrisi ve VSEPR Modeli",
                    "Hidrokarbonlar (Alkanlar, Alkenler, Alkinler, Aromatikler)", "Fonksiyonel Gruplar (Alkoller, Eterler, Aldehitler, Ketonlar)",
                    "Karboksilik Asitler ve Esterler"
                ]
            },
            {
                "name": "İleri Biyoloji (AYT)",
                "topics": [
                    "Sinir Sistemi (Nöron, İmpuls İletimi, Merkezi ve Çevresel Sinir Sistemi)", "Endokrin Sistem ve Hormonlar",
                    "Duyu Organları (Göz, Kulak, Burun, Dil, Deri)", "Destek ve Hareket Sistemi (Kemik, Kıkırdak, Kas Mekanizması)",
                    "Sindirim Sistemi ve Enzimlerin Etkisi", "Dolaşım Sistemi (Kalp, Damarlar, Kan Dokusu)",
                    "Bağışıklık Sistemi ve Antikorlar", "Solunum Sistemi ve Gazların Taşınması", "Boşaltım Sistemi (Nefron ve İdrar Oluşumu)",
                    "Üreme Sistemi ve Embriyonik Gelişim", "Komünite Ekolojisi ve Simbiyotik İlişkiler", "Popülasyon Ekolojisi ve Taşıma Kapasitesi",
                    "Nükleik Asitlerin Yapısı (DNA, RNA)", "DNA Replikasyonu, Transkripsiyon ve Translasyon (Protein Sentezi)",
                    "Genetik Mühendisliği ve Biyoteknoloji", "Hücresel Solunum (Glikoliz, Krebs Döngüsü, ETS)",
                    "Fermantasyon (Laktik Asit ve Etil Alkol)", "Fotosentez (Işığa Bağımlı ve Işıktan Bağımsız Evreler)",
                    "Kemosentez", "Bitkilerin Yapısı ve Bitkisel Dokular", "Bitkilerde Madde Taşınması (Ksilem, Floem)",
                    "Bitkilerde Büyüme, Hareket ve Hormonlar", "Bitkilerde Eşeyli Üreme ve Tohum Oluşumu", "Canlılar ve Çevre"
                ]
            },
            {
                "name": "Tarih & Coğrafya (AYT)",
                "topics": [
                    "İlk Devletler ve Kültür Merkezleri", "Büyük Selçuklu ve Osmanlı Teşkilat Yapısı", "Osmanlı Toprak ve Vergi Düzeni",
                    "20. Yüzyıl Başlarında Dünya ve Savaşlar", "Kurtuluş Savaşı Muharebeler Dönemi ve Diplomasi",
                    "Atatürk Dönemi Dış Politika", "2. Dünya Savaşı ve Soğuk Savaş Dönemi", "Yumuşama Dönemi ve Küreselleşen Dünya",
                    "Biyoçeşitlilik ve Ekosistemler", "Türkiye'nin Ekonomi ve Kalkınma Projeleri", "Türkiye'de Madenler ve Enerji Kaynakları",
                    "Türkiye'de Sanayi ve Ulaşım Ağları", "Küresel Ticaret, Ham Madde ve Pazar Alanları", "Uluslararası Örgütler ve Jeopolitik Konum"
                ]
            }
        ]
    },
    {
        "exam_name": "ALES",
        "exam_type": "ALES",
        "category": "universite",
        "description": "Akademik Personel ve Lisansüstü Eğitimi Giriş Sınavı (100 Soru / 150 Dk)",
        "subjects": [
            {
                "name": "Sayısal (Matematik & Mantık)",
                "topics": [
                    "Temel İşlemler ve Sayı Kümeleri", "Bölme, Bölünebilme, Asal Çarpanlar ve EBOB-EKOK",
                    "Rasyonel ve Ondalık Sayılar", "Basit Eşitsizlikler ve Sıralama", "Mutlak Değer",
                    "Üslü ve Köklü İfadeler", "Çarpanlara Ayırma ve Özdeşlikler", "Oran - Orantı",
                    "Sayı ve Kesir Problemleri", "Yaş ve İşçi Problemleri", "Yüzde, Kâr-Zarar ve Karışım Problemleri",
                    "Hız ve Hareket Problemleri", "Kümeler ve Fonksiyonlar", "Permütasyon, Kombinasyon ve Olasılık",
                    "Doğruda ve Üçgende Açılar, Alan", "Dörtgenler ve Çokgenler", "Çember ve Daire",
                    "Katı Cisimler ve Analitik Geometri", "Grafik ve Tablo Yorumlama",
                    "Sayısal Mantık (Şifreler, İşlem Oyunları, Sayı Dizileri, Şekil Yeteneği, Tablo Tamamlama)"
                ]
            },
            {
                "name": "Sözel (Türkçe & Mantık)",
                "topics": [
                    "Sözcükte Anlam ve Kavramlar", "Cümlede Anlam ve İlişkiler", "Paragrafta Ana Düşünce ve Vurgu",
                    "Paragrafta Yardımcı Düşünceler", "Paragrafta Yapı ve Anlam Akışı", "Anlatım Biçimleri ve Paragraf Analizi",
                    "Cümle Oluşturma ve Paragraf Tamamlama", "Akıl Yürütme ve Mantıksal Çıkarım",
                    "Sözel Mantık (Sıralama, Eşleştirme, Tablo Kurma, Doğru/Yanlış Önermeler, Çoklu Koşul Analizi)"
                ]
            }
        ]
    },
    {
        "exam_name": "DGS",
        "exam_type": "DGS",
        "category": "universite",
        "description": "Dikey Geçiş Sınavı (Ön Lisanstan Lisansa Geçiş - 100 Soru / 135 Dk)",
        "subjects": [
            {
                "name": "DGS Sayısal (Matematik & Mantık)",
                "topics": [
                    "Temel Kavramlar ve Sayı Sistemleri", "Ardışık Sayılar ve Basamak Analizi", "Bölme ve Bölünebilme Kuralları",
                    "Asal Çarpanlar ve EBOB-EKOK", "Rasyonel ve Ondalık Sayılar", "Basit Eşitsizlikler ve Mutlak Değer",
                    "Üslü ve Köklü Sayılar", "Çarpanlara Ayırma", "Oran-Orantı ve Denklem Çözme",
                    "Sayı, Kesir, Yaş, İşçi-Havuz Problemleri", "Yüzde, Kâr-Zarar, Karışım ve Hareket Problemleri",
                    "Kümeler, Fonksiyonlar ve İşlem", "Modüler Aritmetik ve Olasılık",
                    "Geometri (Açılar, Üçgenler, Çokgenler, Çember-Daire, Katı Cisimler, Analitik Geometri)",
                    "Tablo ve Grafik Okuma", "Sayısal Mantık ve Akıl Yürütme"
                ]
            },
            {
                "name": "DGS Sözel (Türkçe & Mantık)",
                "topics": [
                    "Sözcükte ve Cümlede Anlam", "Paragrafta Ana ve Yardımcı Fikirler", "Paragrafta Yapı ve Paragraf Tamamlama",
                    "Anlatım Bozuklukları", "Cümle Tamamlama ve Cümle Sıralama",
                    "Sözel Mantık (Grup ve Sıra Belirleme, Tablo Mantığı, Koşullu Önermeler)"
                ]
            }
        ]
    },

    # =========================================================================
    # 2. KAMU PERSONELİ & KARİYER MESLEK SINAVLARI (kpss)
    # =========================================================================
    {
        "exam_name": "KPSS Lisans",
        "exam_type": "KPSS",
        "category": "kpss",
        "description": "Kamu Personel Seçme Sınavı - Genel Yetenek & Genel Kültür (120 Soru / 130 Dk)",
        "subjects": [
            {
                "name": "Türkçe",
                "topics": [
                    "Sözcükte Anlam ve Söz Öbekleri", "Cümlede Anlam ve Anlatım Özellikleri", "Paragrafta Anlam, Yapı ve Ana Fikir",
                    "Ses Olayları ve Yazım Kuralları", "Noktalama İşaretleri", "Sözcükte Yapı ve Ekler",
                    "Sözcük Türleri (İsim, Sıfat, Zamir, Zarf, Edat-Bağlaç)", "Fiiller, Ek Fiil ve Fiilimsiler",
                    "Cümlenin Ögeleri ve Cümle Çeşitleri", "Anlatım Bozuklukları", "Sözel Mantık ve Akıl Yürütme"
                ]
            },
            {
                "name": "Matematik & Geometri",
                "topics": [
                    "Temel Kavramlar ve Sayı Kümeleri", "Basamak Kavramı ve Çözümleme", "Bölme - Bölünebilme ve EBOB-EKOK",
                    "Rasyonel Sayılar ve Ondalık Gösterim", "Basit Eşitsizlikler ve Mutlak Değer", "Üslü ve Köklü Sayılar",
                    "Çarpanlara Ayırma ve Özdeşlikler", "Oran - Orantı ve Denklem Kurma",
                    "Sayı, Kesir, Yaş, İşçi, Yüzde-Kâr-Zarar, Karışım ve Hareket Problemleri",
                    "Kümeler ve Fonksiyonlar", "Permütasyon, Kombinasyon ve Olasılık", "Sayısal Mantık ve Tablo-Grafik Yorumlama",
                    "Geometri (Doğruda ve Üçgende Açılar, Özel Üçgenler, Çokgenler, Çember-Daire, Katı Cisimler, Analitik Geometri)"
                ]
            },
            {
                "name": "Tarih",
                "topics": [
                    "İslamiyet Öncesi Türk Tarihi ve Teşkilatı", "İlk Türk-İslam Devletleri ve Kültür Medeniyeti",
                    "Türkiye Selçuklu Devleti ve Anadolu Beylikleri", "Osmanlı Devleti Kuruluş ve Yükselme Dönemleri",
                    "Osmanlı Kültür ve Medeniyeti (Devlet, Toprak, Ordu, Hukuk, Eğitim, Sanat)",
                    "17. ve 18. Yüzyıl Osmanlı Devleti (Duraklama ve Gerileme)",
                    "19. Yüzyıl Osmanlı Devleti (Dağılma Dönemi ve Islahatlar)",
                    "20. Yüzyıl Başlarında Osmanlı Devleti ve Trablusgarp-Balkan Savaşları",
                    "1. Dünya Savaşı ve Mondros Ateşkes Antlaşması",
                    "Millî Mücadele Hazırlık Dönemi (Genelgeler, Kongreler, Misak-ı Millî)",
                    "1. TBMM Dönemi ve İç İsyanlar", "Kurtuluş Savaşı Muharebeleri (Doğu, Güney, Batı Cepheleri)",
                    "Mudanya ve Lozan Barış Antlaşmaları", "Atatürk İnkılapları (Siyasi, Hukuki, Sosyal, Eğitim, İktisadi)",
                    "Atatürk İlkeleri (Cumhuriyetçilik, Milliyetçilik, Halkçılık, Devletçilik, Laiklik, İnkılapçılık)",
                    "Atatürk Dönemi Türk Dış Politikası (1923-1938)", "Çağdaş Türk ve Dünya Tarihi"
                ]
            },
            {
                "name": "Coğrafya",
                "topics": [
                    "Türkiye'nin Coğrafi Konumu ve Jeopolitik Önemi", "Türkiye'nin Fiziki Özellikleri ve Yer Şekilleri (Dağlar, Ovalar, Platolar)",
                    "Türkiye'nin Su Varlığı (Akarsular, Göller, Yeraltı Suları)", "Türkiye'nin İklimi, Sıcaklık ve Yağış Dağılışı",
                    "Türkiye'de Toprak Çeşitleri, Bitki Örtüsü ve Doğal Afetler", "Türkiye'de Nüfusun Dağılışı, Yapısı ve Göçler",
                    "Türkiye'de Yerleşme Tipleri ve Şehirler", "Türkiye'de Tarım ve Hayvancılık",
                    "Türkiye'de Madenler ve Enerji Kaynakları", "Türkiye'de Sanayi ve Endüstri Kuruluşları",
                    "Türkiye'de Ulaşım, Ticaret ve Turizm", "Türkiye'nin Coğrafi Bölgeleri ve Kalkınma Projeleri"
                ]
            },
            {
                "name": "Vatandaşlık & Anayasa Hukuku",
                "topics": [
                    "Hukukun Temel Kavramları ve Hukuk Kuralları", "Hak Kavramı, Hakların Kazanılması ve Korunması",
                    "Devlet Biçimleri ve Hükümet Sistemleri", "Türk Anayasa Tarihi (1921, 1924, 1961 ve 1982 Anayasaları)",
                    "1982 Anayasası Genel Esasları ve Temel Hak-Ödevler", "Yasama Organı (TBMM, Seçimler, Kanun Yapım Süreci)",
                    "Yürütme Organı (Cumhurbaşkanı, Kararnameler, Olağanüstü Hal)", "Yargı Organı (Anayasa Mahkemesi, Yargıtay, Danıştay, Uyuşmazlık)",
                    "İdare Hukuku (Merkezi İdare, Taşra Teşkilatı, Mahalli İdareler, Memurlar, İdari İşlemler)"
                ]
            },
            {
                "name": "Güncel Bilgiler & Genel Kültür",
                "topics": [
                    "Uluslararası ve Bölgesel Kuruluşlar (BM, NATO, AB, Türk Devletleri Teşkilatı)",
                    "Türkiye ve Dünya Gündemi (Önemli Gelişmeler, Antlaşmalar, Zirveler)",
                    "Önemli Tarihi Şahsiyetler, Bilim İnsanları ve Sanatçılar",
                    "Coğrafi Keşifler, UNESCO Miras Listesi ve Kültür Varlıkları"
                ]
            }
        ]
    },
    {
        "exam_name": "KPSS Alan Bilgisi (A Grubu)",
        "exam_type": "KPSS-A",
        "category": "kpss",
        "description": "KPSS A Grubu Kariyer Meslek Sınavı (Müfettişlik, Uzmanlık, Denetmenlik)",
        "subjects": [
            {
                "name": "İktisat",
                "topics": [
                    "Mikro İktisat (Tüketici Teorisi, Üretici Teorisi, Piyasa Türleri)",
                    "Makro İktisat (Milli Gelir, İstihdam, Enflasyon, IS-LM Modeli)",
                    "Para - Banka ve Kredi Teorisi", "Uluslararası İktisat ve Dış Ticaret",
                    "Büyüme ve Kalkınma İktisadı", "Türkiye Ekonomisi"
                ]
            },
            {
                "name": "Maliye",
                "topics": [
                    "Maliye Teorisi ve Kamu Ekonomisi", "Kamu Harcamaları Teorisi ve Sınıflandırılması",
                    "Kamu Gelirleri Teorisi ve Vergileme İlkeleri", "Devlet Borçları ve Borç Yönetimi",
                    "Devlet Bütçesi (5018 Sayılı Kanun)", "Türk Vergi Sistemi (Gelir, Kurumlar, KDV, VUK)"
                ]
            },
            {
                "name": "Hukuk",
                "topics": [
                    "Anayasa Hukuku", "İdare Hukuku ve İdari Yargı", "Ceza Genel ve Ceza Özel Hukuku",
                    "Medeni Hukuk (Kişiler, Aile, Eşya, Miras)", "Borçlar Hukuku Genel ve Özel Hükümler",
                    "Ticaret Hukuku (Ticari İşletme, Şirketler, Kıymetli Evrak)", "İcra ve İflas Hukuku"
                ]
            },
            {
                "name": "Muhasebe",
                "topics": [
                    "Genel Muhasebe (Finansal Muhasebe İlkeleri ve Yevmiye Kayıtları)",
                    "Finansal Tablolar Analizi (Bilanço, Gelir Tablosu, Oran Analizleri)",
                    "Maliyet Muhasebesi", "Şirketler Muhasebesi", "İhtisas Muhasebesi ve Denetim"
                ]
            },
            {
                "name": "Kamu Yönetimi",
                "topics": [
                    "Siyaset Bilimi ve Siyasi Düşünceler Tarihi", "Yönetim Bilimi ve Örgüt Teorileri",
                    "Türk Siyasal Hayatı", "Kentleşme ve Çevre Sorunları", "Karşılaştırmalı Kamu Yönetimi"
                ]
            }
        ]
    },
    {
        "exam_name": "KPSS Eğitim Bilimleri",
        "exam_type": "KPSS-Egitim",
        "category": "kpss",
        "description": "Öğretmenlik Alanı - Eğitim Bilimleri Sınavı (80 Soru / 100 Dk)",
        "subjects": [
            {
                "name": "Gelişim Psikolojisi",
                "topics": ["Temel Kavramlar ve İlkeler", "Fiziksel ve Bilişsel Gelişim (Piaget)", "Ahlak Gelişimi (Kohlberg)", "Kişilik Gelişimi (Freud, Erikson)", "Dil Gelişimi"]
            },
            {
                "name": "Öğrenme Psikolojisi",
                "topics": ["Klasik Koşullanma (Pavlov)", "Bitişiklik Kuramları (Watson, Guthrie)", "Edimsel Koşullanma (Skinner)", "Sosyal Öğrenme (Bandura)", "Gestalt Kuramı ve Bilgiyi İşleme Modeli"]
            },
            {
                "name": "Öğretim İlke ve Yöntemleri (ÖYT)",
                "topics": ["Öğretim İlkeleri", "Öğretim Modelleri ve Stratejileri (Sunuş, Buluş, Araştırma)", "Öğretim Yöntem ve Teknikleri", "Kavram Öğretimi ve Düşünme Becerileri"]
            },
            {
                "name": "Program Geliştirme ve Sınıf Yönetimi",
                "topics": ["Eğitimin Temel Kavramları", "Program Geliştirmenin Temelleri", "Program Tasarımı ve Değerlendirme", "Sınıf Yönetimi ve İletişim"]
            },
            {
                "name": "Ölçme ve Değerlendirme",
                "topics": ["Ölçmede Temel Kavramlar", "Güvenirlik ve Geçerlik", "Ölçme Araçları ve Test Türleri", "Madde ve Test İstatistikleri (Ortalama, Standart Sapma, Ayırıcılık)"]
            },
            {
                "name": "Rehberlik ve Özel Eğitim",
                "topics": ["Rehberliğin İlkeleri ve Türleri", "Bireyi Tanıma Teknikleri", "Özel Eğitim Hizmetleri ve BEP", "Okul Rehberlik Hizmetleri Örgütlenmesi"]
            }
        ]
    },
    {
        "exam_name": "KPSS Ortaöğretim",
        "exam_type": "KPSS-Lise",
        "category": "kpss",
        "description": "Kamu Personeli Seçme Sınavı - Ortaöğretim (Lise Mezunları İçin) (120 Soru / 130 Dk)",
        "subjects": [
            {
                "name": "Genel Yetenek (Türkçe & Matematik)",
                "topics": ["Sözcükte ve Cümlede Anlam", "Paragraf", "Dil Bilgisi", "Sözel Mantık", "Temel Kavramlar ve Problemler", "Geometri", "Sayısal Mantık"]
            },
            {
                "name": "Genel Kültür (Tarih, Coğrafya, Vat.)",
                "topics": ["Türk Tarihi", "Osmanlı Tarihi", "İnkılap Tarihi", "Türkiye Coğrafyası", "Vatandaşlık", "Güncel Bilgiler"]
            }
        ]
    },
    {
        "exam_name": "KPSS Ön Lisans",
        "exam_type": "KPSS-OnLisans",
        "category": "kpss",
        "description": "Kamu Personeli Seçme Sınavı - Ön Lisans Mezunları İçin (120 Soru / 130 Dk)",
        "subjects": [
            {
                "name": "Genel Yetenek (Türkçe & Matematik)",
                "topics": ["Sözcükte ve Cümlede Anlam", "Paragraf", "Dil Bilgisi", "Sözel Mantık", "Temel Kavramlar ve Problemler", "Geometri", "Sayısal Mantık"]
            },
            {
                "name": "Genel Kültür (Tarih, Coğrafya, Vat.)",
                "topics": ["Türk Tarihi", "Osmanlı Tarihi", "İnkılap Tarihi", "Türkiye Coğrafyası", "Vatandaşlık", "Güncel Bilgiler"]
            }
        ]
    },

    # =========================================================================
    # 3. SAĞLIK & TIP UZMANLIK SINAVLARI (saglik)
    # =========================================================================
    {
        "exam_name": "TUS (Tıpta Uzmanlık Sınavı)",
        "exam_type": "TUS",
        "category": "saglik",
        "description": "ÖSYM Tıpta Uzmanlık Eğitimi Giriş Sınavı (Temel + Klinik Tıp Bilimleri)",
        "subjects": [
            {
                "name": "Temel Tıp Bilimleri (TTBT)",
                "topics": [
                    "İnsan Anatomisi (Hareket Sistemi, Dolaşım, Sinir Sistemi, Organlar)",
                    "Tıbbi Fizyoloji (Hücre, Nörofizyoloji, Kardiyovasküler, Solunum, Renal)",
                    "Histoloji ve Embriyoloji (Temel Dokular, Organ Histolojisi, Gelişim)",
                    "Tıbbi Biyokimya (Aminoasitler, Proteinler, Enzimler, Metabolizma, Hormonlar, Vitaminler)",
                    "Tıbbi Mikrobiyoloji (Bakteriyoloji, Viroloji, Mikoloji, Parazitoloji, İmmünoloji)",
                    "Tıbbi Patoloji (Hücre Hasarı, İltihap, Neoplazi, Sistemik Patoloji)",
                    "Tıbbi Farmakoloji (Farmakokinetik, Otonom, KVS, SSS, Kemoterapötikler, Toksikoloji)"
                ]
            },
            {
                "name": "Klinik Tıp Bilimleri (KTBT)",
                "topics": [
                    "İç Hastalıkları (Dahiliye - Kardiyoloji, Gastroenteroloji, Nefroloji, Hematoloji, Onkoloji, Endokrinoloji)",
                    "Çocuk Sağlığı ve Hastalıkları (Pediatri - Büyüme-Gelişme, Yenidoğan, Enfeksiyon, Genetik)",
                    "Genel Cerrahi (Gastrointestinal Cerrahi, Meme, Tiroid, Travma, Onkolojik Cerrahi)",
                    "Kadın Hastalıkları ve Doğum (Obstetri, Jinekoloji, Jinekolojik Onkoloji, Üreme Endokrinolojisi)",
                    "Küçük Stajlar (Nöroloji, Psikiyatri, Dermatoloji, Göz Hastalıkları, KBB, Ortopedi, Üroloji, Radyoloji, Acil Tıp)"
                ]
            }
        ]
    },
    {
        "exam_name": "DUS (Diş Hekimliğinde Uzmanlık)",
        "exam_type": "DUS",
        "category": "saglik",
        "description": "ÖSYM Diş Hekimliğinde Uzmanlık Eğitimi Giriş Sınavı",
        "subjects": [
            {
                "name": "Temel Diş Hekimliği Bilimleri",
                "topics": ["Anatomi ve Baş-Boyun Anatomisi", "Fizyoloji ve Histoloji", "Tıbbi Biyokimya", "Mikrobiyoloji ve İmmünoloji", "Tıbbi Patoloji ve Farmakoloji"]
            },
            {
                "name": "Klinik Diş Hekimliği Bilimleri",
                "topics": [
                    "Ağız, Diş ve Çene Cerrahisi", "Ağız, Diş ve Çene Radyolojisi", "Çocuk Diş Hekimliği (Pedodonti)",
                    "Endodonti (Kanal Tedavisi)", "Ortodonti", "Periodontoloji (Diş Eti Hastalıkları)",
                    "Protetik Diş Tedavisi", "Restoratif Diş Tedavisi"
                ]
            }
        ]
    },

    # =========================================================================
    # 4. MESLEKİ & MALİ RUHSAT SINAVLARI (mesleki)
    # =========================================================================
    {
        "exam_name": "SMMM Staja Başlama & Yeterlilik",
        "exam_type": "SMMM",
        "category": "mesleki",
        "description": "Serbest Muhasebeci Mali Müşavirlik Sınavları (TÜRMOB & TESMER)",
        "subjects": [
            {
                "name": "Finansal Muhasebe & Standartlar",
                "topics": [
                    "Genel Muhasebe İlkeleri ve Yevmiye Kayıtları", "Dönen ve Duran Varlıklar Muhasebesi",
                    "Yabancı Kaynaklar ve Özkaynaklar Muhasebesi", "Dönem Sonu Envanter ve Kapanış İşlemleri",
                    "Türkiye Muhasebe Standartları (TMS / TFRS) Esasları"
                ]
            },
            {
                "name": "Maliyet & Yönetim Muhasebesi",
                "topics": [
                    "Maliyet Kavramları ve Unsurları (İlk Madde Malzeme, İşçilik, Genel Üretim)",
                    "Sipariş ve Safha Maliyet Sistemleri", "Standart Maliyet ve Sapma Analizleri",
                    "Başabaş Noktası ve Maliyet-Hacim-Kâr Analizleri"
                ]
            },
            {
                "name": "Finansal Tablolar Analizi",
                "topics": [
                    "Bilanço ve Gelir Tablosu Analiz Teknikleri", "Karşılaştırmalı Tablolar ve Dikey Yüzdeler Analizi",
                    "Trend (Eğilim Yüzdeleri) Analizi", "Oran (Rasyo) Analizleri (Likidite, Faaliyet, Mali Yapı, Kârlılık)"
                ]
            },
            {
                "name": "Vergi Hukuku & Türk Vergi Sistemi",
                "topics": [
                    "Vergi Usul Kanunu (VUK) İlkeleri", "Gelir Vergisi Kanunu ve Gelir Unsurları",
                    "Kurumlar Vergisi Kanunu ve Muafiyetler", "Katma Değer Vergisi (KDV) ve ÖTV Mevzuatı",
                    "Vergi İcra ve Ceza Hukuku"
                ]
            },
            {
                "name": "Ticaret, Borçlar & İş Hukuku",
                "topics": [
                    "Türk Ticaret Kanunu (Ticari İşletme, Şirketler, Kıymetli Evrak)",
                    "Borçlar Hukuku Genel İlkeleri ve Sözleşmeler",
                    "İş Hukuku (4857 Sayılı Kanun, Kıdem, İhbar, İşe İade)",
                    "Sosyal Güvenlik Hukuku (5510 Sayılı Kanun)"
                ]
            },
            {
                "name": "Muhasebe Denetimi & Meslek Hukuku",
                "topics": [
                    "Denetim Standartları ve Denetim Raporu Türleri", "İç Kontrol Sistemi ve Risk Değerlendirmesi",
                    "3568 Sayılı Meslek Yasası ve TÜRMOB Mevzuatı", "Mesleki Etik Kuralları ve Disiplin Hükümleri"
                ]
            }
        ]
    },
    {
        "exam_name": "Adli & İdari Yargı Hakimlik",
        "exam_type": "Hakimlik",
        "category": "mesleki",
        "description": "Adalet Bakanlığı & ÖSYM Adli ve İdari Yargı Hakim / Savcı Yardımcılığı Sınavı",
        "subjects": [
            {
                "name": "Genel Yetenek & Genel Kültür (Hakimlik)",
                "topics": ["Türkçe", "Matematik", "Türk Kültür ve Medeniyetleri", "Atatürk İlkeleri ve İnkılap Tarihi", "Temel Yurttaşlık"]
            },
            {
                "name": "Ortak Alan Hukuku",
                "topics": [
                    "Anayasa Hukuku", "İdare Hukuku ve İdari Yargılama Usulü Hukuku (İYUK)",
                    "Medeni Hukuk (Başlangıç, Kişiler, Aile, Eşya, Miras)",
                    "Borçlar Hukuku Genel Hükümler", "Ceza Hukuku Genel Hükümler",
                    "Hukuk Muhakemeleri Kanunu (HMK - Medeni Usul)", "Ceza Muhakemesi Kanunu (CMK)"
                ]
            },
            {
                "name": "Adli Yargı Alan Hukuku",
                "topics": [
                    "Ticaret Hukuku (Ticari İşletme, Şirketler, Kıymetli Evrak)",
                    "İcra ve İflas Hukuku", "İş Hukuku", "Borçlar Hukuku Özel Hükümler", "Ceza Hukuku Özel Hükümler"
                ]
            },
            {
                "name": "İdari Yargı Alan Hukuku",
                "topics": [
                    "İdare Hukuku Özel Konuları ve Türk İdare Teşkilatı",
                    "Vergi Hukuku ve Vergi Usul Hukuku", "Türk Vergi Sistemi",
                    "Maliye ve Ekonomi Esasları", "Kamu Maliyesi ve Bütçe"
                ]
            }
        ]
    },

    # =========================================================================
    # 5. YABANCI DİL SINAVLARI (dil)
    # =========================================================================
    {
        "exam_name": "YDS (İngilizce)",
        "exam_type": "YDS",
        "category": "dil",
        "description": "Yabancı Dil Bilgisi Seviye Tespit Sınavı (80 Soru / 180 Dk)",
        "subjects": [
            {
                "name": "Vocabulary & Grammar",
                "topics": [
                    "Academic Vocabulary (Nouns, Verbs, Adjectives, Adverbs)", "Phrasal Verbs and Prepositions",
                    "Tenses, Passive Voice and Modals", "Relative Clauses and Noun Clauses",
                    "Conditionals and Wish Clauses", "Conjunctions and Transitions", "Gerunds, Infinitives and Participles"
                ]
            },
            {
                "name": "Reading & Sentence Completion",
                "topics": [
                    "Sentence Completion (Cümle Tamamlama)", "English to Turkish Translation (Çeviri)",
                    "Turkish to English Translation (Çeviri)", "Reading Passages & Comprehension (Okuma Parçaları)",
                    "Dialogue Completion (Diyalog Tamamlama)", "Restatement (Eş Anlamlı Cümleyi Bulma)",
                    "Paragraph Completion (Paragraf Tamamlama)", "Irrelevant Sentence (Anlam Bütünlüğünü Bozan Cümle)"
                ]
            }
        ]
    },
    {
        "exam_name": "YÖKDİL (Sağlık / Fen / Sosyal)",
        "exam_type": "YOKDIL",
        "category": "dil",
        "description": "Yükseköğretim Kurumları Yabancı Dil Sınavı",
        "subjects": [
            {
                "name": "YÖKDİL Alan Bilgisi & Okuma",
                "topics": [
                    "Sağlık Bilimleri Terimleri ve Metinleri", "Fen Bilimleri Terimleri ve Metinleri",
                    "Sosyal Bilimler Terimleri ve Metinleri", "Gramer ve Cloze Test", "Cümle Tamamlama ve Çeviri",
                    "Paragraf Soruları ve Anlam Bütünlüğü"
                ]
            }
        ]
    },

    # =========================================================================
    # 6. ASKERİ & GÜVENLİK SINAVLARI (askeri)
    # =========================================================================
    {
        "exam_name": "MSÜ (Milli Savunma Üniversitesi)",
        "exam_type": "MSU",
        "category": "askeri",
        "description": "Milli Savunma Üniversitesi Askeri Öğrenci Belirleme Sınavı (120 Soru / 165 Dk)",
        "subjects": [
            {
                "name": "Türkçe (MSÜ)",
                "topics": ["Sözcük ve Cümlede Anlam", "Paragrafta Anlam ve Yapı", "Ses Bilgisi, Yazım ve Noktalama", "Dil Bilgisi"]
            },
            {
                "name": "Temel Matematik (MSÜ)",
                "topics": ["Temel Kavramlar", "Rasyonel Sayılar, Üslü-Köklü Sayılar", "Denklemler ve Eşitsizlikler", "Problemler", "Geometri"]
            },
            {
                "name": "Sosyal Bilimler (MSÜ)",
                "topics": ["Tarih (İlk Türk Devletleri, Osmanlı, Millî Mücadele, Atatürk İlkeleri)", "Coğrafya (İklim, Yer Şekilleri, Türkiye Coğrafyası)", "Felsefe ve Din Kültürü"]
            },
            {
                "name": "Fen Bilimleri (MSÜ)",
                "topics": ["Fizik (Madde, Kuvvet, Hareket, Enerji, Optik)", "Kimya (Atom, Periyodik Sistem, Karışımlar)", "Biyoloji (Hücre, Canlılar, Kalıtım, Ekoloji)"]
            }
        ]
    },

    # =========================================================================
    # 7. ORTAOKUL & LİSELERE GEÇİŞ (ortaokul)
    # =========================================================================
    {
        "exam_name": "LGS (Liselere Geçiş Sistemi)",
        "exam_type": "LGS",
        "category": "ortaokul",
        "description": "Milli Eğitim Bakanlığı Liselere Geçiş Sistemi Sınavı (90 Soru / 155 Dk)",
        "subjects": [
            {
                "name": "Türkçe (LGS)",
                "topics": [
                    "Fiilimsiler (İsim-Fiil, Sıfat-Fiil, Zarf-Fiil)", "Sözcükte ve Cümlede Anlam", "Deyimler ve Atasözleri",
                    "Cümlenin Ögeleri", "Metin Türleri ve Söz Sanatları", "Yazım Kuralları ve Noktalama İşaretleri",
                    "Cümle Türleri ve Fiilde Çatı", "Anlatım Bozuklukları",
                    "Görsel Okuma, Grafik ve Tablo Yorumlama", "Sözel Mantık ve Muhakeme Becerileri"
                ]
            },
            {
                "name": "Matematik (LGS)",
                "topics": [
                    "Çarpanlar ve Katlar (EBOB-EKOK)", "Üslü İfadeler ve Bilimsel Gösterim", "Kareköklü İfadeler ve Gerçek Sayılar",
                    "Veri Analizi (Çizgi, Sütun, Daire Grafiği)", "Basit Olayların Olma Olasılığı",
                    "Cebirsel İfadeler ve Özdeşlikler", "Doğrusal Denklemler ve Eğim", "Eşitsizlikler ve Grafikle Gösterim",
                    "Üçgenler (Açıortay, Kenarortay, Yükseklik, Eşitsizlik)", "Pisagor Bağıntısı", "Eşlik ve Benzerlik",
                    "Dönüşüm Geometrisi (Öteleme, Yansıma)", "Geometrik Cisimler (Prizma, Silindir, Koni, Piramit)"
                ]
            },
            {
                "name": "Fen Bilimleri (LGS)",
                "topics": [
                    "Mevsimlerin Oluşumu ve İklim-Hava Hareketleri", "DNA ve Genetik Kod (Nükleotid, Gen, Kromozom)",
                    "Kalıtım, Çaprazlamalar ve Akraba Evliliği", "Mutasyon, Modifikasyon, Adaptasyon ve Biyoteknoloji",
                    "Katı, Sıvı ve Gaz Basıncı", "Periyodik Sistem ve Elementlerin Sınıflandırılması",
                    "Fiziksel ve Kimyasal Değişimler, Kimyasal Tepkimeler", "Asitler ve Bazlar, Asit Yağmurları",
                    "Maddenin Isı ile Etkileşimi ve Hal Değişimi", "Basit Makineler (Kaldıraç, Makaralar, Eğik Düzlem, Çıkrık)",
                    "Besin Zinciri, Enerji Akışı ve Fotosentez-Solunum", "Madde Döngüleri ve Küresel İklim Değişikliği",
                    "Elektrik Yükleri ve Elektrik Enerjisinin Dönüşümü"
                ]
            },
            {
                "name": "T.C. İnkılap Tarihi ve Atatürkçülük (LGS)",
                "topics": [
                    "Bir Kahraman Doğuyor (Mustafa Kemal'in Çocukluğu ve Öğrenim Hayatı)",
                    "Millî Uyanış: Bağımsızlık Yolunda Atılan Adımlar (1. Dünya Savaşı, Cemiyetler, Kongreler)",
                    "Millî Bir Destan: Ya İstiklal Ya Ölüm! (Doğu, Güney, Batı Cepheleri, Mudanya, Lozan)",
                    "Atatürkçülük ve Çağdaşlaşan Türkiye (Siyasi, Hukuki, Sosyal, Eğitim, Ekonomi Alanında İnkılaplar)",
                    "Demokratikleşme Çabaları ve Çok Partili Hayat",
                    "Atatürk Dönemi Türk Dış Politikası (Hatay, Boğazlar, Musul)",
                    "Atatürk'ün Ölümü ve 2. Dünya Savaşı Sonrası Türkiye"
                ]
            },
            {
                "name": "Din Kültürü ve Ahlak Bilgisi (LGS)",
                "topics": [
                    "Kader ve Kaza İnancı, İnsanın İradesi ve Kader", "Zekât ve Sadaka İbadeti",
                    "Din ve Hayat (Dinin Temel Gayesi, Canın, Aklın, Neslin, Malın ve Dinin Korunması)",
                    "Hz. Muhammed'in Doğruluğu, Güvenilirliği ve Örnekliği",
                    "Kur'an-ı Kerim ve Özellikleri, İslam'ın Ana Kaynakları"
                ]
            },
            {
                "name": "İngilizce (LGS)",
                "topics": [
                    "Unit 1: Friendship", "Unit 2: Teen Life", "Unit 3: In The Kitchen",
                    "Unit 4: On The Phone", "Unit 5: The Internet", "Unit 6: Adventures",
                    "Unit 7: Tourism", "Unit 8: Chores", "Unit 9: Science", "Unit 10: Natural Forces"
                ]
            }
        ]
    }
]


async def seed_master_curriculum():
    print("🚀 Master Müfredat ve Tüm Ulusal Sınavlar Tohumlayıcısı Başlatılıyor...")
    await init_models()
    async with AsyncSessionLocal() as session:
        # 1. Hatalı ve sahte soruları, cevapları ve testleri temizle
        print("🧹 Hatalı/sahte sorular ve testler temizleniyor...")
        await session.execute(delete(M.UserAnswer))
        await session.execute(delete(M.UserTestResult))
        await session.execute(delete(M.Question))
        await session.execute(delete(M.Test))
        await session.execute(delete(M.Subtopic))
        await session.execute(delete(M.Topic))
        await session.execute(delete(M.Subject))
        await session.execute(delete(M.Exam))
        await session.commit()
        print("✅ Tüm eski hatalı kayıtlar temizlendi.")

        total_exams = 0
        total_subjects = 0
        total_topics = 0

        EXAM_DATES_MAP = {
            "YKS TYT": "2027-06-19T10:15:00",
            "YKS AYT": "2027-06-20T10:15:00",
            "ALES": "2026-11-22T10:15:00",
            "DGS": "2027-07-11T10:15:00",
            "KPSS Lisans": "2027-07-18T10:15:00",
            "KPSS Alan Bilgisi (A Grubu)": "2027-07-24T10:15:00",
            "KPSS Eğitim Bilimleri": "2027-07-18T14:45:00",
            "KPSS Ortaöğretim": "2026-10-25T10:15:00",
            "KPSS Ön Lisans": "2026-10-04T10:15:00",
            "TUS (Tıpta Uzmanlık Sınavı)": "2026-09-13T10:15:00",
            "DUS (Diş Hekimliğinde Uzmanlık)": "2026-10-11T10:15:00",
            "SMMM Staja Başlama & Yeterlilik": "2026-11-07T10:00:00",
            "Adli & İdari Yargı Hakimlik": "2026-12-26T10:15:00",
            "YDS (İngilizce)": "2026-10-25T10:15:00",
            "YÖKDİL (Sağlık / Fen / Sosyal)": "2026-11-08T10:15:00",
            "MSÜ (Milli Savunma Üniversitesi)": "2027-03-07T10:15:00",
            "LGS (Liselere Geçiş Sistemi)": "2027-06-06T09:30:00"
        }

        # 2. Tüm Sınavları, Dersleri ve Konuları Tohumla
        for e_idx, e_data in enumerate(MASTER_CURRICULUM):
            exam_id = str(uuid.uuid4())
            exam_obj = M.Exam(
                id=exam_id,
                name=e_data["exam_name"],
                description=e_data["description"],
                exam_type=e_data["exam_type"],
                category=e_data["category"],
                status="active",
                order=e_idx + 1,
                exam_date=EXAM_DATES_MAP.get(e_data["exam_name"]),
                created_at=now_iso(),
            )
            session.add(exam_obj)
            total_exams += 1

            for s_idx, s_data in enumerate(e_data["subjects"]):
                subj_id = str(uuid.uuid4())
                subj_obj = M.Subject(
                    id=subj_id,
                    exam_id=exam_id,
                    name=s_data["name"],
                    slug="general",
                    order=s_idx + 1,
                    status="active",
                    created_at=now_iso(),
                )
                session.add(subj_obj)
                total_subjects += 1

                for t_idx, topic_name in enumerate(s_data["topics"]):
                    topic_id = str(uuid.uuid4())
                    topic_obj = M.Topic(
                        id=topic_id,
                        exam_id=exam_id,
                        subject_id=subj_id,
                        name=topic_name,
                        order=t_idx + 1,
                        status="active",
                        created_at=now_iso(),
                    )
                    session.add(topic_obj)
                    total_topics += 1


        await session.commit()
        print(f"🎉 BAŞARILI! Toplam {total_exams} Sınav Türü, {total_subjects} Branş/Ders ve {total_topics} Müfredat Konusu sisteme kaydedildi.")


if __name__ == "__main__":
    asyncio.run(seed_master_curriculum())
