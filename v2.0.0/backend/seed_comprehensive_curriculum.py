"""
Tüm Ulusal Sınavlar İçin Ayrıntılı Müfredat, Ana ve Alt Konu Kataloğu Tohumlayıcı
(YKS TYT Mat-1 / AYT Mat-2, Türkçe, Fen, Sosyal, LGS, KPSS, ALES, DGS, MSÜ)
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
import models as M


def _id():
    return str(uuid.uuid4())


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# TÜM SINAVLARIN DERS, ANA KONU VE ALT KONU MÜFREDATI
CURRICULUM_CATALOG = {
    # ==================== YKS (TYT & AYT) ====================
    "YKS": [
        {
            "name": "Temel Matematik (Mat-1)",
            "slug": "matematik",
            "topics": [
                {"name": "Temel Kavramlar & Sayı Kümeleri", "subtopics": ["Doğal Sayılar ve Tam Sayılar", "Tek ve Çift Sayılar", "Pozitif ve Negatif Sayılar", "Asal Sayılar ve Aralarında Asallık", "Faktöriyel Kavramı"]},
                {"name": "Sayı Basamakları & Çözümleme", "subtopics": ["Basamak Değeri", "Taban Aritmetiği Mantığı", "Basamak Çözümleme"]},
                {"name": "Bölme & Bölünebilme Kuralları", "subtopics": ["2, 3, 4, 5, 8, 9, 10, 11 ile Bölünebilme", "Kalan Bulma", "Bölünebilme Problemleri"]},
                {"name": "EBOB - EKOK & Periyodik Problemler", "subtopics": ["Asal Çarpanlara Ayırma", "EBOB ve EKOK Özellikleri", "Nöbet ve Periyodik Tekrar Eden Problemler"]},
                {"name": "Rasyonel ve Ondalık Sayılar", "subtopics": ["Dört İşlem", "Sıralama", "Devirli Ondalık Sayılar", "Sonsuz Kesirler"]},
                {"name": "Basit Eşitsizlikler & Aralık Kavramı", "subtopics": ["Eşitsizlik Özellikleri", "Aralık Kavramı", "Eşitsizlik Sistemleri"]},
                {"name": "Mutlak Değer", "subtopics": ["Mutlak Değer Özellikleri", "Mutlak Değerli Denklemler", "Mutlak Değerli Eşitsizlikler"]},
                {"name": "Üslü Sayılar ve İfadeler", "subtopics": ["Üs Alma Kuralları", "Üslü Denklemler", "Üslü Eşitsizlikler"]},
                {"name": "Köklü Sayılar ve İfadeler", "subtopics": ["Kök Dereceleri ve Sadeleştirme", "Köklü Sayılarda Dört İşlem", "İç İçe Kökler", "Eşlenik Kavramı"]},
                {"name": "Çarpanlara Ayırma ve Özdeşlikler", "subtopics": ["Ortak Çarpan Parantezi", "İki Kare Farkı", "Tam Kare İfadeler", "Küp Açılımları"]},
                {"name": "Oran - Orantı", "subtopics": ["Doğru ve Ters Orantı", "Bileşik Orantı", "Aritmetik ve Geometrik Ortalama"]},
                {"name": "Problemler (Tüm Türler)", "subtopics": ["Sayı ve Kesir Problemleri", "Yaş Problemleri", "İşçi ve Emek Problemleri", "Hız ve Hareket Problemleri", "Yüzde, Kâr ve Zarar Problemleri", "Karışım Problemleri", "Grafik ve Tablo Okuma Problemleri"]},
                {"name": "Kümeler ve Kartezyen Çarpım", "subtopics": ["Kümelerde Birleşim, Kesişim, Fark", "Evrensel Küme ve Tümleme", "Küme Problemleri", "Kartezyen Çarpım ve Bağıntı"]},
                {"name": "Mantık", "subtopics": ["Önermeler ve Doğruluk Değerleri", "Bileşik Önermeler (ve, veya, ise, ancak ve ancak)", "Açık Önermeler ve Niceleyiciler"]},
                {"name": "Fonksiyonlar (Temel Düzey)", "subtopics": ["Tanım, Değer ve Görüntü Kümesi", "Fonksiyon Türleri (Birebir, Örten, Sabit, Birim)", "Fonksiyonlarda Dört İşlem", "Fonksiyon Grafikleri"]},
                {"name": "Polinomlar (Giriş)", "subtopics": ["Polinom Tanımı ve Derece", "Polinomlarda Dört İşlem", "Katsayılar Toplamı ve Sabit Terim"]},
                {"name": "Sayma, Permütasyon, Kombinasyon & Olasılık", "subtopics": ["Toplama ve Çarpma Yoluyla Sayma", "Faktöriyel ve Permütasyon", "Kombinasyon (Seçme)", "Binom Açılımı", "Basit ve Koşullu Olasılık"]},
                {"name": "İstatistik ve Veri Analizi", "subtopics": ["Mod, Medyan, Aritmetik Ortalama", "Standart Sapma ve Açıklık", "Kutu ve Histogram Grafikleri"]},
            ],
        },
        {
            "name": "İleri Matematik (Mat-2 - AYT)",
            "slug": "matematik",
            "topics": [
                {"name": "Fonksiyonlar (AYT İleri Düzey)", "subtopics": ["Bileşke Fonksiyon", "Ters Fonksiyon", "Fonksiyonlarda Dönüşümler (Öteleme, Simetri)", "Parçalı ve Mutlak Değer Fonksiyonları"]},
                {"name": "Polinomlar ve Polinom Bölmesi", "subtopics": ["Polinomda Kalan Bulma Teoremleri", "Polinom Grafikleri", "Kök-Katsayı İlişkileri"]},
                {"name": "İkinci Dereceden Denklemler & Karmaşık Sayılar", "subtopics": ["Diskriminant (Delta) İncelemesi", "Kökler Toplamı ve Çarpımı", "Karmaşık Sayılarda Dört İşlem ve Eşlenik"]},
                {"name": "Parabol (İkinci Dereceden Fonksiyonlar)", "subtopics": ["Tepe Noktası (r, k)", "Parabol Grafiği Çizimi", "Doğru ile Parabolün Durumu", "Maksimum ve Minimum Problemleri"]},
                {"name": "İkinci Dereceden Eşitsizlikler ve Sistemleri", "subtopics": ["İşaret Tablosu Oluşturma", "Çift Katlı ve Tek Katlı Kökler", "Eşitsizlik Sistemleri ve Çözüm Kümesi"]},
                {"name": "Trigonometri (Tüm Yönleriyle)", "subtopics": ["Yönlü Açılar ve Birim Çember", "Trigonometrik Fonksiyonlar ve Değerleri", "İndirgeme Formülleri", "Sinüs ve Kosinüs Teoremleri", "Toplam ve Fark Formülleri", "Yarım Açı ve İki Kat Açı Formülleri", "Trigonometrik Denklemler", "Ters Trigonometrik Fonksiyonlar (Arcsin, Arccos)"]},
                {"name": "Logaritma ve Üstel Fonksiyonlar", "subtopics": ["Üstel Fonksiyon Tanımı", "Logaritma Özellikleri ve Taban Değiştirme", "Doğal Logaritma (ln)", "Logaritmik Denklemler ve Eşitsizlikler", "Logaritma Uygulamaları ve Grafikler"]},
                {"name": "Diziler ve Seriler", "subtopics": ["Dizi Tanımı ve Genel Terim", "Aritmetik Dizi ve Toplam Formülü", "Geometrik Dizi ve Toplam Formülü", "Fibonacci Dizisi"]},
                {"name": "Limit ve Süreklilik", "subtopics": ["Sağdan ve Soldan Limit", "0/0 Belirsizliği ve Çarpanlara Ayırma", "Trigonometrik Limitler", "Noktada ve Aralıkta Süreklilik"]},
                {"name": "Türev Alma Kuralları & Geometrik Yorum", "subtopics": ["Türev Tanımı ve Anlık Değişim Oranı", "Türev Alma Kuralları (Çarpım, Bölüm, Zincir Kuralı)", "Teğet ve Normal Denklemleri", "Türevin Geometrik Yorumu"]},
                {"name": "Türevin Uygulamaları & Maks-Min", "subtopics": ["Artan ve Azalan Fonksiyonlar", "Yerel Ekstremum Noktaları (Maksimum, Minimum)", "İkinci Türev ve Büküm Noktası", "Maksimum ve Minimum Problemleri", "Polinom Fonksiyon Grafikleri"]},
                {"name": "Belirsiz İntegral & Değişken Değiştirme", "subtopics": ["İntegral Tanımı ve Sabiti", "Temel İntegral Alma Kuralları", "Değişken Değiştirme (u dönüşümü) Yöntemi"]},
                {"name": "Belirli İntegral & Alan Hesabı", "subtopics": ["Belirli İntegral Teoremi ve Özellikleri", "Eğri Altında Kalan Alan Hesabı", "İki Eğri Arasındaki Alan", "Simetrik Aralıkta İntegral"]},
            ],
        },
        {
            "name": "Geometri (TYT & AYT)",
            "slug": "matematik",
            "topics": [
                {"name": "Doğruda ve Üçgende Açılar", "subtopics": ["Paralel Doğrularda Açılar", "Üçgenin İç ve Dış Açıları", "Açı Bağıntıları"]},
                {"name": "Özel Üçgenler (Dik, İkizkenar, Eşkenar)", "subtopics": ["Pisagor ve Öklid Bağıntıları", "30-60-90 ve 45-45-90 Üçgenleri", "İkizkenar ve Eşkenar Üçgen Özellikleri"]},
                {"name": "Üçgende Yardımcı Elemanlar", "subtopics": ["Açıortay Teoremleri", "Kenarortay ve Ağırlık Merkezi", "Kenar Orta Dikme ve Yükseklik"]},
                {"name": "Üçgende Benzerlik ve Alan", "subtopics": ["Açı-Açı ve Kenar-Açı-Kenar Benzerliği", "Temel Orantı Teoremi (Thales)", "Üçgende Alan Formülleri", "Benzerlik-Alan İlişkisi"]},
                {"name": "Çokgenler ve Özel Dörtgenler", "subtopics": ["Düzgün Çokgenler (Beşgen, Altıgen)", "Paralelkenar ve Eşkenar Dörtgen", "Dikdörtgen ve Kare", "Yamuk ve Deltoid"]},
                {"name": "Çember ve Daire", "subtopics": ["Çemberde Açılar (Merkez, Çevre, Teğet-Kiriş)", "Çemberde Uzunluk ve Kiriş Özellikleri", "Dairede Çevre ve Alan Hesabı"]},
                {"name": "Katı Cisimler (Uzay Geometri)", "subtopics": ["Prizmalar (Küp, Dikdörtgenler Prizması)", "Piramitler", "Silindir, Koni ve Küre"]},
                {"name": "Analitik Geometri", "subtopics": ["Noktanın ve Doğrunun Analitiği", "Eğim ve Doğru Denklemleri", "İki Doğrunun Birbirine Göre Durumu", "Noktanın Doğruya Uzaklığı", "Çemberin Analitik İncelenmesi", "Dönüşümlerle Geometri (Öteleme, Dönme, Yansıma)"]},
            ],
        },
        {
            "name": "Türkçe (TYT)",
            "slug": "turkce",
            "topics": [
                {"name": "Sözcükte ve Söz Öbeklerinde Anlam", "subtopics": ["Gerçek, Yan ve Mecaz Anlam", "Deyimler ve Atasözleri", "İkilemeler ve Söz Sanatları"]},
                {"name": "Cümlede Anlam ve Kavramlar", "subtopics": ["Öznel ve Nesnel Yargılar", "Neden-Sonuç, Amaç-Sonuç, Koşul Cümleleri", "Örtülü Anlam ve Cümle Yorumu"]},
                {"name": "Paragrafta Anlam ve Ana Düşünce", "subtopics": ["Paragrafın Konusu ve Başlığı", "Ana Düşünce (Ana Fikir)", "Yardımcı Düşünceler", "Paragrafta Boşluk Doldurma ve Akışı Bozan Cümle"]},
                {"name": "Paragrafta Yapı ve Anlatım Biçimleri", "subtopics": ["Öyküleme, Betimleme, Açıklama, Tartışma", "Düşünceyi Geliştirme Yolları (Tanık Gösterme, Örnekleme)", "Paragrafı İkiye Bölme"]},
                {"name": "Ses Bilgisi (Ses Olayları)", "subtopics": ["Ünsüz Benzeşmesi ve Yumuşaması", "Ünlü Düşmesi ve Türemesi", "Ünsüz Düşmesi ve Türemesi", "Büyük ve Küçük Ünlü Uyumu", "Ulama ve Kaynaştırma"]},
                {"name": "Yazım (İmla) Kuralları", "subtopics": ["Büyük Harflerin Kullanıldığı Yerler", "Sayıların ve Tarihlerin Yazımı", "'de', 'ki', 'mi'nin Yazımı", "Birleşik Sözcüklerin Yazımı", "Kısaltmaların Yazımı"]},
                {"name": "Noktalama İşaretleri", "subtopics": ["Nokta, Virgül, Noktalı Virgül", "İki Nokta ve Üç Nokta", "Soru ve Ünlem İşaretleri", "Kesme İşareti, Tırnak ve Yay Ayraç"]},
                {"name": "Sözcükte Yapı ve Ekler", "subtopics": ["Kökler (İsim ve Fiil Kökleri)", "Yapım Ekleri ve Çekim Ekleri", "Basit, Türemiş ve Birleşik Sözcükler"]},
                {"name": "Sözcük Türleri (İsim, Sıfat, Zamir, Zarf)", "subtopics": ["İsimler ve İsim Tamlamaları", "Sıfatlar (Ön Adlar) ve Sıfat Tamlamaları", "Zamirler (Adıllar)", "Zarflar (Belirteçler)", "Edat, Bağlaç, Ünlem"]},
                {"name": "Fiiller, Ek Fiil ve Fiilimsiler", "subtopics": ["Fiil Çekimi (Kip ve Kişi)", "Ek Fiil ve Görevleri", "Fiilimsiler (İsim-Fiil, Sıfat-Fiil, Zarf-Fiil)", "Fiilde Çatı (Öznesine ve Nesnesine Göre)"]},
                {"name": "Cümlenin Ögeleri ve Cümle Türleri", "subtopics": ["Temel ve Yardımcı Ögeler", "Cümle Dışı Unsurlar", "Yapısına Göre Cümleler (Basit, Birleşik, Sıralı, Bağlı)", "Anlatım Bozuklukları"]},
            ],
        },
        {
            "name": "Türk Dili ve Edebiyatı (AYT)",
            "slug": "turkce",
            "topics": [
                {"name": "Şiir Bilgisi & Edebi Sanatlar", "subtopics": ["Nazım Birimi, Ölçü (Hece, Aruz, Serbest), Kafiye ve Redif", "Edebi Sanatlar (Teşbih, İstiare, Mecaz-ı Mürsel, Tezat, Teşhis, Hüsn-i Talil)"]},
                {"name": "İslamiyet Öncesi ve Geçiş Dönemi Türk Edebiyatı", "subtopics": ["Sözlü ve Yazılı Dönem (Koşuk, Sagu, Sav, Destanlar, Orhun Abideleri)", "Geçiş Dönemi Eserleri (Kutadgu Bilig, Divanü Lugati't-Türk, Atabetü'l-Hakayık, DLT)"]},
                {"name": "Halk Edebiyatı", "subtopics": ["Anonim Halk Edebiyatı (Mani, Türkü, Ağıt)", "Aşık Tarzı Halk Edebiyatı (Koşma, Semai, Varsağı)", "Dini-Tasavvufi Halk Edebiyatı (İlahi, Nefes, Nutuk)", "Önemli Temsilciler (Yunus Emre, Karacaoğlan, Dadaloğlu, Pir Sultan)"]},
                {"name": "Divan Edebiyatı", "subtopics": ["Divan Şiiri Nazım Şekilleri (Gazel, Kaside, Mesnevi, Rubai, Şarkı, Tuyuğ)", "Divan Nesri (Tezkire, Seyahatname, Siyasetname)", "Divan Edebiyatı Şairleri (Fuzuli, Baki, Nedim, Şeyh Galip, Nabi, Nef'i)"]},
                {"name": "Tanzimat Edebiyatı (1. ve 2. Dönem)", "subtopics": ["Tanzimat 1. Dönem Sanatçıları ve Eserleri (Şinasi, Namık Kemal, Ziya Paşa)", "Tanzimat 2. Dönem Sanatçıları ve Eserleri (Recaizade Mahmut Ekrem, Abdülhak Hamit, Samipaşazade Sezai)"]},
                {"name": "Servet-i Fünun ve Fecr-i Âti Edebiyatı", "subtopics": ["Servet-i Fünun Şiiri ve Romanı (Tevfik Fikret, Cenap Şahabettin, Halit Ziya, Mehmet Rauf)", "Fecr-i Âti Topluluğu ve Ahmet Haşim"]},
                {"name": "Milli Edebiyat Dönemi", "subtopics": ["Genç Kalemler ve Yeni Lisan Hareketi", "Milli Edebiyat Sanatçıları (Ömer Seyfettin, Ziya Gökalp, Yakup Kadri, Halide Edip, Reşat Nuri, Refik Halit)"]},
                {"name": "Cumhuriyet Dönemi Türk Edebiyatı", "subtopics": ["Cumhuriyet Dönemi Şiir Toplulukları (Yedi Meşaleciler, Garipçiler, İkinci Yeniciler, Toplumcu Gerçekçiler, Hisarcılar)", "Milli Edebiyat Zevk ve Anlayışını Sürdürenler", "Bireyin İç Dünyasını Esas Alan Roman ve Hikaye", "Cumhuriyet Tiyatrosu ve Denemesi"]},
                {"name": "Batı Edebiyatı ve Edebi Akımlar", "subtopics": ["Klasisizm, Romantizm, Realizm, Natüralizm, Parnasizm, Sembolizm, Sürrealizm, Egzistansiyalizm"]},
            ],
        },
        {
            "name": "Fizik (TYT & AYT)",
            "slug": "fen",
            "topics": [
                {"name": "Fizik Bilimine Giriş & Madde ve Özellikleri", "subtopics": ["Fiziksel Büyüklükler (Temel ve Türetilmiş)", "Özkütle ve Hacim", "Dayanıklılık, Adezyon ve Kohezyon"]},
                {"name": "Sıvıların Kaldırma Kuvveti & Basınç", "subtopics": ["Arşimet Prensibi", "Katı, Sıvı ve Gaz Basıncı", "Manometreler ve Barometreler"]},
                {"name": "Isı, Sıcaklık ve Genleşme", "subtopics": ["Termometreler ve Sıcaklık Ölçekleri", "Özgül Isı ve Isı Sığası", "Hal Değişimi ve Isıl Denge", "Katı, Sıvı ve Gazlarda Genleşme"]},
                {"name": "Kuvvet, Hareket ve Dinamik (TYT)", "subtopics": ["Doğrusal Hareket ve Grafikler", "Newton'ın Hareket Yasaları", "Sürtünme Kuvveti", "İş, Güç ve Mekanik Enerji"]},
                {"name": "Elektrostatik & Elektrik Akımı (TYT)", "subtopics": ["Elektrik Yükleri ve Coulomb Yasası", "Elektroskop", "Ohm Yasası ve Dirençlerin Bağlanması", "Elektriksel Güç ve Enerji", "Mıknatıslar ve Manyetik Alan"]},
                {"name": "Optik (TYT)", "subtopics": ["Aydınlanma ve Gölge", "Düzlem ve Küresel Aynalar", "Işığın Kırılması ve Tam Yansıma", "Mercekler ve Renk Olayları"]},
                {"name": "Dalgalar (TYT)", "subtopics": ["Dalgaların Temel Değişkenleri", "Yay Dalgaları", "Su Dalgaları ve Kırılma", "Ses ve Deprem Dalgaları"]},
                {"name": "Vektörler & Bağıl Hareket (AYT)", "subtopics": ["Vektörlerin Bileşkesi ve Bileşenlerine Ayırma", "Bağıl Hız ve Nehir Problemleri"]},
                {"name": "İki Boyutta Hareket & Atışlar (AYT)", "subtopics": ["Serbest Düşme ve Düşey Atış", "Yatay ve Eğik Atış Hareketleri", "Limit Hız"]},
                {"name": "İtme ve Çizgisel Momentum (AYT)", "subtopics": ["İtme ve Momentum Değişimi", "Momentumun Korunumu", "Esnek ve Esnek Olmayan Çarpışmalar"]},
                {"name": "Tork, Denge ve Kütle Merkezi (AYT)", "subtopics": ["Tork Kavramı ve Sağ El Kuralı", "Statik Denge Şartları", "Kütle ve Ağırlık Merkezi Bulma", "Basit Makineler"]},
                {"name": "Düzgün Çembersel Hareket & Dönme (AYT)", "subtopics": ["Çizgisel ve Açısal Hız", "Merkezcil İvme ve Merkezcil Kuvvet", "Dönerek Öteleme ve Eylemsizlik Momenti", "Açısal Momentum ve Korunumu", "Kütle Çekim Kuvveti ve Kepler Yasaları"]},
                {"name": "Basit Harmonik Hareket (AYT)", "subtopics": ["Uzanım, Genlik, Periyot ve Frekans", "Yaylı ve Basit Sarkaç", "Konum, Hız ve İvme Denklemleri"]},
                {"name": "Dalga Mekaniği & Modern Fizik (AYT)", "subtopics": ["Işıkta Kırınım ve Çift Yarıkta Girişim (Young Deneyi)", "Doppler Olayı", "Fotoelektrik Olay ve Compton Saçılması", "Özel Görelilik Kuramı", "Büyük Patlama ve Radyoaktivite"]},
            ],
        },
        {
            "name": "Kimya (TYT & AYT)",
            "slug": "fen",
            "topics": [
                {"name": "Kimya Bilimi & Periyodik Sistem (TYT)", "subtopics": ["Simyadan Kimyaya", "Kimya Disiplinleri ve Güvenlik Uyarı İşaretleri", "Atom Modelleri ve Atomun Yapısı", "Periyodik Sistem ve Periyodik Özelliklerin Değişimi"]},
                {"name": "Kimyasal Türler Arası Etkileşimler (TYT)", "subtopics": ["Güçlü Etkileşimler (İyonik, Kovalent, Metalik Bağ)", "Zayıf Etkileşimler (Van der Waals, Hidrojen Bağı)", "Fiziksel ve Kimyasal Değişimler"]},
                {"name": "Kimyanın Temel Kanunları & Mol Kavramı (TYT)", "subtopics": ["Kütlenin Korunumu ve Sabit Oranlar Kanunu", "Mol Kavramı ve Avogadro Sayısı", "Kimyasal Tepkime Türleri ve Denkleştirme", "Kimyasal Hesaplamalar"]},
                {"name": "Maddenin Halleri & Karışımlar (TYT)", "subtopics": ["Gazlar, Sıvılar (Viskozite, Buhar Basıncı)", "Katı Türleri", "Homojen ve Heterojen Karışımlar", "Kütlece ve Hacimce Yüzde Derişim", "Ayırma ve Saflaştırma Teknikleri"]},
                {"name": "Asitler, Bazlar, Tuzlar & Kimya Her Yerde (TYT)", "subtopics": ["Asit ve Baz Tanımı, pH Kavramı", "Asit-Baz Tepkimeleri", "Tuzlar ve Özellikleri", "Temizlik Maddeleri, Polimerler, Kozmetikler ve İlaçlar"]},
                {"name": "Modern Atom Teorisi (AYT)", "subtopics": ["Kuantum Sayıları ve Orbital Türleri", "Elektron Dizilimleri ve Hund Kuralı", "Yükseltgenme Basamakları"]},
                {"name": "Gazlar (AYT)", "subtopics": ["İdeal Gaz Yasası (PV=nRT)", "Gazlarda Kinetik Teori ve Graham Difüzyon Yasası", "Gaz Karışımları ve Kısmi Basınç", "Gerçek Gazlar ve Joule-Thomson Olayı"]},
                {"name": "Sıvı Çözeltiler ve Çözünürlük (AYT)", "subtopics": ["Molarite, Molalite ve Derişim Birimleri", "Koligatif Özellikler (Kaynama Noktası Yükselmesi, Donma Noktası Alçalması, Ozmoz)", "Çözünürlüğe Etki Eden Faktörler"]},
                {"name": "Kimyasal Tepkimelerde Enerji & Hız (AYT)", "subtopics": ["Tepkime Isısı ve Entalpi (Oluşum, Bağ Enerjileri, Hess Yasası)", "Tepkime Hızı ve Hız Bağıntısı", "Aktivasyon Enerjisi ve Katalizör"]},
                {"name": "Kimyasal Denge & Sulu Çözelti Dengeleri (AYT)", "subtopics": ["Denge Bağıntısı (Kc, Kp)", "Le Chatelier İlkesi", "Asit-Baz Dengesi (Ka, Kb, Tampon Çözeltiler, Hidroliz)", "Çözünürlük Dengesi (KÇÇ) ve Ortak İyon Etkisi"]},
                {"name": "Kimya ve Elektrik (AYT)", "subtopics": ["Redoks Tepkimeleri ve Denkleştirme", "Elektrot Potansiyelleri ve Standart Pil Potansiyeli", "Galvanik Hücreler ve Nernst Eşitliği", "Derişim Pilleri", "Elektroliz ve Faraday Yasaları", "Korozyon"]},
                {"name": "Organik Kimya (AYT)", "subtopics": ["Hibritleşme ve Molekül Geometrisi (VSEPR)", "Alkanlar, Alkenler, Alkinler (Adlandırma ve Tepkimeler)", "Aromatik Bileşikler (Benzen)", "Alkoller ve Eterler", "Aldehitler ve Ketonlar", "Karboksilik Asitler ve Esterler"]},
            ],
        },
        {
            "name": "Biyoloji (TYT & AYT)",
            "slug": "fen",
            "topics": [
                {"name": "Yaşam Bilimi Biyoloji & Hücre (TYT)", "subtopics": ["Canlıların Temel Bileşikleri (Karbonhidrat, Yağ, Protein, Enzim, Vitamin)", "Hücre Teorisi ve Organeller", "Hücre Zarından Madde Geçişleri (Difüzyon, Osmoz, Aktif Taşıma, Endositoz)"]},
                {"name": "Canlılar Dünyası ve Sınıflandırma (TYT)", "subtopics": ["Sınıflandırma İlkeleri ve İkili Adlandırma", "Bakteriler, Arkeler, Protistler, Mantarlar, Bitkiler, Hayvanlar", "Virüsler"]},
                {"name": "Hücre Bölünmeleri & Kalıtım (TYT)", "subtopics": ["Mitoz Bölünme ve Eşeysiz Üreme", "Mayoz Bölünme ve Eşeyli Üreme", "Mendel Genetiği ve Çaprazlamalar", "Eş Baskınlık, Kan Grupları ve Cinsiyete Bağlı Kalıtım", "Soyağaçları"]},
                {"name": "Ekosistem Ekolojisi (TYT)", "subtopics": ["Besin Zinciri ve Enerji Piramidi", "Madde Döngüleri (Karbon, Azot, Su)", "Güncel Çevre Sorunları ve Biyoçeşitlilik"]},
                {"name": "İnsan Fizyolojisi & Denetleyici Sistemler (AYT)", "subtopics": ["Sinir Sistemi (İmpuls Oluşumu ve İletimi, Beyin, Omurilik)", "Endokrin Sistem (Hormonlar ve Görevleri)", "Duyu Organları (Göz, Kulak, Deri, Burun, Dil)"]},
                {"name": "Destek, Hareket & Sindirim Sistemi (AYT)", "subtopics": ["Kemik, Kıkırdak ve Eklemler", "Kas Sistemi ve Kayan İplikler Modeli", "Sindirim Organları, Enzimler ve Emilim"]},
                {"name": "Dolaşım, Solunum & Boşaltım Sistemi (AYT)", "subtopics": ["Kalbin Çalışması, Damarlar, Kan Dokusu", "Bağışıklık Sistemi (Özgül ve Özgül Olmayan Bağışıklık)", "Solunum Sistemi ve Gazların Taşınması (Hemoglobin)", "Böbreğin Yapısı, Nefronlar ve İdrar Oluşumu"]},
                {"name": "Genden Proteine (AYT)", "subtopics": ["Nükleik Asitlerin Yapısı (DNA ve RNA)", "DNA Replikasyonu ve Replikasyon Enzimleri", "Genetik Şifre ve Protein Sentezi (Transkripsiyon, Translasyon)", "Biyoteknoloji ve Gen Mühendisliği"]},
                {"name": "Canlılarda Enerji Dönüşümleri (AYT)", "subtopics": ["ATP'nin Yapısı ve Fosforilasyon Türleri", "Fotosentez (Işığa Bağımlı ve Bağımsız Tepkimeler)", "Kemosentez", "Hücresel Solunum (Glikoliz, Krebs Döngüsü, ETS)", "Fermantasyon (Laktik Asit ve Etil Alkol)"]},
                {"name": "Bitki Biyolojisi (AYT)", "subtopics": ["Bitkisel Dokular (Meristem, Temel, İletim, Örtü Doku)", "Bitkisel Organlar (Kök, Gövde, Yaprak)", "Bitkilerde Madde Taşınması (Ksilem, Floem, Stomalar)", "Bitkilerde Büyüme, Hareket ve Hormonlar", "Çiçekli Bitkilerde Eşeyli Üreme ve Tohum"]},
            ],
        },
        {
            "name": "Tarih (TYT & AYT)",
            "slug": "sosyal",
            "topics": [
                {"name": "Tarih ve Zaman & İlk Türk Devletleri", "subtopics": ["Tarih Yazıcılığı ve Zaman Kavramı", "Orta Asya İlk Türk Devletleri (Hunlar, Göktürkler, Uygurlar)", "Kavimler Göçü ve Sonuçları"]},
                {"name": "İslam Medeniyeti ve İlk Türk-İslam Devletleri", "subtopics": ["İslamiyet'in Doğuşu ve Dört Halife Dönemi", "Emeviler ve Abbasiler", "Karahanlılar, Gazneliler, Büyük Selçuklu Devleti", "Malazgirt Savaşı ve Anadolu'nun Türkleşmesi"]},
                {"name": "Türkiye Tarihi & Beylikten Devlete Osmanlı", "subtopics": ["Anadolu Selçuklu Devleti ve Beylikler Dönemi", "Osmanlı Devleti'nin Kuruluşu ve Balkan Fetihleri", "İstimalet ve İskan Politikaları"]},
                {"name": "Dünya Gücü Osmanlı (Klasik Dönem)", "subtopics": ["İstanbul'un Fethi ve II. Mehmed (Fatih) Dönemi", "Yavuz Sultan Selim ve Mısır Seferi", "Kanuni Sultan Süleyman Dönemi", "Osmanlı Kültür, Medeniyet ve Divan Teşkilatı"]},
                {"name": "Değişim Çağında Osmanlı & En Uzun Yüzyıl", "subtopics": ["Lale Devri ve Islahatlar", "Fransız İhtilali ve Sanayi Devrimi'nin Osmanlı'ya Etkisi", "Tanzimat ve Islahat Fermanları", "I. ve II. Meşrutiyet Dönemleri"]},
                {"name": "20. Yüzyıl Başlarında Osmanlı & I. Dünya Savaşı", "subtopics": ["Trablusgarp ve Balkan Savaşları", "I. Dünya Savaşı ve Cepheler (Çanakkale, Kafkas, Kanal)", "Mondros Ateşkes Antlaşması ve İşgaller"]},
                {"name": "Milli Mücadele Dönemi (Hazırlık ve Muharebeler)", "subtopics": ["Genelgeler ve Kongreler (Havza, Amasya, Erzurum, Sivas)", "Misak-ı Milli ve BMM'nin Açılması", "Doğu, Güney ve Batı Cepheleri (İnönü, Sakarya, Büyük Taarruz)", "Mudanya Ateşkes ve Lozan Barış Antlaşması"]},
                {"name": "Atatürkçülük, İnkılaplar ve Türk Dış Politikası", "subtopics": ["Siyasi, Hukuki, Eğitim ve Sosyal Alandaki İnkılaplar", "Atatürk İlkeleri (Cumhuriyetçilik, Milliyetçilik, Halkçılık, Devletçilik, Laiklik, İnkılapçılık)", "Montrö Boğazlar Sözleşmesi ve Hatay'ın Anavatana Katılması"]},
            ],
        },
        {
            "name": "Coğrafya (TYT & AYT)",
            "slug": "sosyal",
            "topics": [
                {"name": "Doğa, İnsan & Dünya'nın Şekli ve Hareketleri", "subtopics": ["Coğrafyanın Bölümleri", "Dünya'nın Şeklinin Sonuçları", "Günlük ve Yıllık Hareketler, Eksen Eğikliği ve Mevsimler"]},
                {"name": "Coğrafi Konum & Harita Bilgisi", "subtopics": ["Paralel, Meridyen, Enlem ve Boylam", "Yerel Saat Hesaplamaları", "Ölçek, Projeksiyon Yöntemleri ve İzohips Eğrileri"]},
                {"name": "İklim Bilgisi (Atmosfer, Sıcaklık, Basınç, Rüzgarlar)", "subtopics": ["Atmosferin Katmanları", "Sıcaklığı Etkileyen Faktörler", "Basınç Merkezleri ve Rüzgâr Türleri", "Nem ve Yağış Tipleri", "Dünya ve Türkiye'nin İklim Tipleri"]},
                {"name": "Yerin Şekillenmesi (İç ve Dış Kuvvetler)", "subtopics": ["Levha Tektoniği ve Jeolojik Zamanlar", "İç Kuvvetler (Orojenez, Epirojenez, Volkanizma, Depremler)", "Dış Kuvvetler (Akarsular, Rüzgarlar, Buzullar, Karstik Şekiller)", "Türkiye'nin Yer Şekilleri"]},
                {"name": "Nüfus, Yerleşme & Göçler", "subtopics": ["Nüfusun Dağılışı ve Nüfus Piramitleri", "Türkiye'de Nüfusun Gelişimi ve Politikaları", "Yerleşme Tipleri ve Göç Türleri"]},
                {"name": "Ekonomik Faaliyetler, Bölgeler & Doğal Afetler", "subtopics": ["Birincil, İkincil, Üçüncül Ekonomik Faaliyetler", "Bölge Türleri ve Sınırları", "Deprem, Heyelan, Erozyon, Çığ ve Kuraklık Afetleri"]},
            ],
        },
    ],

    # ==================== LGS ====================
    "LGS": [
        {
            "name": "LGS Matematik",
            "slug": "matematik",
            "topics": [
                {"name": "Çarpanlar ve Katlar", "subtopics": ["Pozitif Tam Sayıların Çarpanları", "EBOB ve EKOK", "Aralarında Asal Sayılar"]},
                {"name": "Üslü İfadeler", "subtopics": ["Tam Sayıların Tam Sayı Kuvvetleri", "Üslü İfadelerde Dört İşlem", "Ondalık Gösterimlerin Çözümlenmesi", "Çok Büyük ve Çok Küçük Sayılar", "Bilimsel Gösterim"]},
                {"name": "Kareköklü İfadeler", "subtopics": ["Tam Kare Sayılar ve Karekökleri", "Kareköklü İfadeyi a√b Şeklinde Yazma", "Kareköklü İfadelerde Dört İşlem", "Ondalık İfadelerin Karekökleri", "Gerçek Sayılar"]},
                {"name": "Veri Analizi", "subtopics": ["Çizgi ve Sütun Grafiği", "Daire Grafiği ve Grafikler Arası Dönüşüm"]},
                {"name": "Basit Olayların Olma Olasılığı", "subtopics": ["Olası Durumlar ve Çıktılar", "Eşit, Daha Fazla, Daha Az Olasılık", "Basit Olayların Olasılığı Formülü"]},
                {"name": "Cebirsel İfadeler ve Özdeşlikler", "subtopics": ["Cebirsel İfadelerde Çarpma", "Önemli Özdeşlikler (İki Kare Farkı, Tam Kare)", "Cebirsel İfadeleri Çarpanlara Ayırma"]},
                {"name": "Doğrusal Denklemler ve Eğim", "subtopics": ["Birinci Dereceden Bir Bilinmeyenli Denklemler", "Koordinat Sistemi", "Doğrusal İlişkiler ve Grafik Çizimi", "Doğrunun Eğimi"]},
                {"name": "Eşitsizlikler", "subtopics": ["Birinci Dereceden Bir Bilinmeyenli Eşitsizlikler", "Eşitsizliklerin Sayı Doğrusunda Gösterimi"]},
                {"name": "Üçgenler", "subtopics": ["Üçgende Kenarortay, Açıortay ve Yükseklik", "Üçgen Eşitsizliği", "Kenar Uzunlukları ile Açılar Arasındaki İlişki", "Pisagor Bağıntısı"]},
                {"name": "Eşlik ve Benzerlik", "subtopics": ["Eş ve Benzer Çokgenler", "Benzerlik Oranı ve Alan İlişkisi"]},
                {"name": "Dönüşüm Geometrisi & Geometrik Cisimler", "subtopics": ["Öteleme ve Yansıma", "Dik Prizmalar ve Dik Dairesel Silindir", "Dik Piramit ve Dik Koni"]},
            ],
        },
        {
            "name": "LGS Türkçe",
            "slug": "turkce",
            "topics": [
                {"name": "Fiilimsiler (Eylemsiler)", "subtopics": ["İsim-Fiil", "Sıfat-Fiil (Ortaç)", "Zarf-Fiil (Ulaç)"]},
                {"name": "Cümlenin Ögeleri", "subtopics": ["Özne ve Yüklem", "Nesne, Yer Tamlayıcısı, Zarf Tamlayıcısı", "Cümlede Vurgu"]},
                {"name": "Fiilde Çatı", "subtopics": ["Öznesine Göre Fiiller (Etken, Edilgen)", "Nesnesine Göre Fiiller (Geçişli, Geçişsiz)"]},
                {"name": "Cümle Türleri", "subtopics": ["Yüklemin Türüne ve Yerine Göre", "Anlamına Göre", "Yapısına Göre (Fiilimsili, Tek Yüklemli, Birden Çok Yüklemli)"]},
                {"name": "Yazım Kuralları ve Noktalama", "subtopics": ["Büyük Harfler, Kısaltmalar, Sayılar", "Virgül, Noktalı Virgül, İki Nokta, Tırnak İşareti"]},
                {"name": "Söz Sanatları ve Metin Türleri", "subtopics": ["Abartma, Benzetme, Kişileştirme, Tezat", "Deneme, Makale, Fıkra, Hikaye, Anı, Biyografi"]},
                {"name": "Paragrafta Anlam & Sözel Mantık", "subtopics": ["Ana Fikir ve Yardımcı Fikirler", "Paragrafta Yapı ve Akış", "Görsel ve Grafik Okuma", "Sözel Mantık ve Muhakeme"]},
            ],
        },
        {
            "name": "LGS Fen Bilimleri",
            "slug": "fen",
            "topics": [
                {"name": "Mevsimler ve İklim", "subtopics": ["Mevsimlerin Oluşumu ve Eksen Eğikliği", "İklim ve Hava Hareketleri", "Küresel İklim Değişikliği"]},
                {"name": "DNA ve Genetik Kod", "subtopics": ["DNA'nın Yapısı ve Kendini Eşlemesi", "Kalıtım ve Çaprazlamalar", "Mutasyon, Modifikasyon, Adaptasyon", "Biyoteknoloji ve Genetik Mühendisliği"]},
                {"name": "Basınç", "subtopics": ["Katı Basıncı", "Sıvı Basıncı ve Pascal Prensibi", "Gaz (Açık Hava) Basıncı"]},
                {"name": "Madde ve Endüstri", "subtopics": ["Periyodik Sistem", "Fiziksel ve Kimyasal Değişimler", "Kimyasal Tepkimeler ve Kütlenin Korunumu", "Asitler ve Bazlar", "Maddenin Isı ile Etkileşimi (Öz Isı, Hal Değişim Isısı)"]},
                {"name": "Basit Makineler", "subtopics": ["Kaldıraçlar, Makaralar, Palangalar", "Eğik Düzlem, Çıkrık, Dişli Çarklar ve Kasnaklar"]},
                {"name": "Enerji Dönüşümleri & Elektrik", "subtopics": ["Besin Zinciri ve Enerji Akışı", "Fotosentez ve Solunum", "Elektrik Yükleri ve Elektriklenme"]},
            ],
        },
    ],

    # ==================== KPSS LİSANS ====================
    "KPSS Lisans": [
        {
            "name": "Genel Yetenek - Matematik (Mat-1)",
            "slug": "matematik",
            "topics": [
                {"name": "Temel Matematik & Sayılar", "subtopics": ["Sayı Kümeleri, Bölünebilme, EBOB-EKOK", "Rasyonel ve Ondalık Sayılar", "Basit Eşitsizlikler ve Mutlak Değer", "Üslü ve Köklü Sayılar"]},
                {"name": "Çarpanlara Ayırma & Denklem Çözme", "subtopics": ["Özdeşlikler ve Sadeleştirme", "Birinci Dereceden Denklemler ve Oran-Orantı"]},
                {"name": "Problemler (KPSS Odaklı)", "subtopics": ["Sayı, Kesir, Yaş Problemleri", "İşçi, Havuz, Hız Problemleri", "Yüzde, Kâr-Zarar, Faiz Problemleri", "Karışım Problemleri", "Tablo ve Grafik Yorumlama"]},
                {"name": "Kümeler, Fonksiyon & Sayısal Mantık", "subtopics": ["Küme İşlemleri ve Problemleri", "Fonksiyonlar ve İşlem", "Modüler Aritmetik", "Permütasyon, Kombinasyon, Olasılık", "Sayısal Mantık ve Şekil Yeteneği"]},
                {"name": "Temel Geometri", "subtopics": ["Doğruda ve Üçgende Açılar", "Özel Üçgenler ve Alan", "Dörtgenler ve Çokgenler", "Çember ve Daire", "Analitik Geometri ve Katı Cisimler"]},
            ],
        },
        {
            "name": "Genel Yetenek - Türkçe",
            "slug": "turkce",
            "topics": [
                {"name": "Sözcük ve Cümle Anlamı", "subtopics": ["Sözcüğün Anlam Özellikleri ve Söz Öbekleri", "Cümlede Kavramlar ve Cümle Yorumu"]},
                {"name": "Paragraf Bilgisi & Sözel Mantık", "subtopics": ["Paragrafta Ana Düşünce ve Yardımcı Düşünceler", "Paragrafta Yapı ve Anlatım Teknikleri", "Tablo Oluşturma ve Sözel Mantık Soruları"]},
                {"name": "Dil Bilgisi ve Ses Olayları", "subtopics": ["Ses Bilgisi", "Sözcükte Yapı ve Ekler", "Sözcük Türleri (İsim, Sıfat, Zamir, Zarf, Fiil)", "Cümlenin Ögeleri ve Cümle Çeşitleri"]},
                {"name": "Yazım, Noktalama ve Anlatım Bozuklukları", "subtopics": ["Yazım Kuralları", "Noktalama İşaretleri", "Anlama Dayalı ve Dil Bilgisine Dayalı Anlatım Bozuklukları"]},
            ],
        },
        {
            "name": "Genel Kültür - Tarih",
            "slug": "sosyal",
            "topics": [
                {"name": "İslamiyet Öncesi ve Türk-İslam Tarihi", "subtopics": ["İlk Türk Devletleri ve Kültür Medeniyeti", "İlk Türk-İslam Devletleri (Karahanlı, Gazneli, Selçuklu)", "Anadolu Selçuklu Devleti ve Beylikler"]},
                {"name": "Osmanlı Devleti Tarihi (Kuruluş, Yükselme, Islahatlar)", "subtopics": ["Kuruluş ve Yükselme Dönemleri", "Osmanlı Kültür ve Medeniyeti (Divan, Toprak, Ordu)", "Duraklama, Gerileme ve Dağılma Dönemleri Islahatları"]},
                {"name": "Milli Mücadele Dönemi", "subtopics": ["20. Yüzyıl Başlarında Osmanlı ve I. Dünya Savaşı", "Milli Mücadele Hazırlık Dönemi (Kongreler)", "I. TBMM Dönemi ve Cepheler", "Lozan Barış Antlaşması"]},
                {"name": "Atatürk Dönemi İnkılapları ve İlkeleri", "subtopics": ["Siyasal, Hukuksal, Eğitim ve Toplumsal İnkılaplar", "Atatürk İlkeleri", "Atatürk Dönemi Türk Dış Politikası"]},
                {"name": "Çağdaş Türk ve Dünya Tarihi", "subtopics": ["İki Savaş Arası Dönem", "II. Dünya Savaşı ve Sonuçları", "Soğuk Savaş Dönemi ve Yumuşama", "Küreselleşen Dünya ve Türk Dünyası"]},
            ],
        },
        {
            "name": "Genel Kültür - Coğrafya",
            "slug": "sosyal",
            "topics": [
                {"name": "Türkiye'nin Fiziki Coğrafyası", "subtopics": ["Türkiye'nin Coğrafi Konumu ve Sonuçları", "Türkiye'nin Yer Şekilleri (Dağlar, Platolar, Ovalar)", "Türkiye'nin Akarsuları, Gölleri ve Kıyıları", "Türkiye'de İklim, Bitki Örtüsü ve Toprak Tipleri"]},
                {"name": "Türkiye'nin Beşeri ve Ekonomik Coğrafyası", "subtopics": ["Türkiye'de Nüfus ve Yerleşme", "Türkiye'de Tarım ve Hayvancılık", "Türkiye'de Madenler ve Enerji Kaynakları", "Türkiye'de Sanayi, Ulaşım, Ticaret ve Turizm", "Türkiye'nin Coğrafi Bölgeleri ve Bölgesel Kalkınma Projeleri"]},
            ],
        },
        {
            "name": "Genel Kültür - Vatandaşlık & Güncel",
            "slug": "sosyal",
            "topics": [
                {"name": "Temel Hukuk Bilgisi", "subtopics": ["Hukukun Tanımı, Dalları ve Kaynakları", "Hak Kavramı, Ehliyetler ve Kişilik", "Devlet Biçimleri ve Hükümet Sistemleri"]},
                {"name": "Anayasa Hukuku (1982 Anayasası)", "subtopics": ["Devletin Temel Nitelikleri ve İlkeleri", "Temel Hak ve Hürriyetler", "Yasama (TBMM Görev ve Yetkileri)", "Yürütme (Cumhurbaşkanlığı Teşkilatı)", "Yargı Organları (Anayasa Mahkemesi, Danıştay, Yargıtay)", "İdare Hukuku ve Türkiye'nin İdari Yapısı"]},
                {"name": "Güncel Bilgiler ve Uluslararası Kuruluşlar", "subtopics": ["BM, NATO, AB, Türk Devletleri Teşkilatı", "Yılın Önemli Kültür, Sanat ve Spor Olayları"]},
            ],
        },
    ],

    # ==================== ALES ====================
    "ALES": [
        {
            "name": "ALES Sayısal (Mat-1 & Geometri)",
            "slug": "matematik",
            "topics": [
                {"name": "Temel Matematiksel İşlemler & Sayılar", "subtopics": ["Temel Kavramlar ve Bölünebilme", "Rasyonel Sayılar, Üslü-Köklü İfadeler", "Basit Eşitsizlikler ve Mutlak Değer", "Çarpanlara Ayırma"]},
                {"name": "Problemler ve Sayısal Mantık", "subtopics": ["Sayı ve Kesir Problemleri", "Hız, Yaş, Yüzde Problemleri", "Kümeler ve Fonksiyonlar", "Sayı Dizileri ve Örüntüler", "Şekil Yeteneği, Tablo ve Grafik Yorumlama", "Sayısal Mantık ve Muhakeme Soruları"]},
                {"name": "Geometri", "subtopics": ["Doğruda ve Üçgende Açılar", "Özel Üçgenler ve Alan", "Çokgenler ve Dörtgenler", "Çember ve Daire", "Analitik Geometri ve Katı Cisimler"]},
            ],
        },
        {
            "name": "ALES Sözel (Türkçe)",
            "slug": "turkce",
            "topics": [
                {"name": "Sözcük ve Cümle Anlamı", "subtopics": ["Sözcükte Anlam, Deyim ve Atasözleri", "Cümlede Anlam ve Kesin Yargı Çıkarma"]},
                {"name": "Paragraf Çözümleme & Akıl Yürütme", "subtopics": ["Ana Fikir ve Paragraf Yorumu", "Paragrafta Akışı Bozan Cümle ve Yer Değiştirme", "Çoklu Paragraf Soruları (Tek metne bağlı 2-3 soru)"]},
                {"name": "Sözel Mantık ve Muhakeme", "subtopics": ["Sıralama ve Derecelendirme Soruları", "Tablo Oluşturma ve Eşleştirme", "Koşullu Önerme Çıkarımları"]},
            ],
        },
    ],

    # ==================== DGS ====================
    "DGS": [
        {
            "name": "DGS Sayısal (Mat-1)",
            "slug": "matematik",
            "topics": [
                {"name": "Temel Matematik & Cebir", "subtopics": ["Sayı Kümeleri ve Bölünebilme", "Rasyonel, Üslü, Köklü Sayılar", "Çarpanlara Ayırma ve Eşitsizlikler"]},
                {"name": "Problemler ve Sayısal Mantık", "subtopics": ["Sayı, Kesir, Yaş, Hız, Yüzde Problemleri", "Küme ve Fonksiyon", "Permütasyon, Kombinasyon, Olasılık", "Sayısal Mantık Soruları"]},
                {"name": "Geometri", "subtopics": ["Üçgenler, Dörtgenler, Çember, Analitik Geometri"]},
            ],
        },
        {
            "name": "DGS Sözel (Türkçe)",
            "slug": "turkce",
            "topics": [
                {"name": "Sözcük ve Cümle Yorumu", "subtopics": ["Sözcükte Anlam", "Cümle Tamamlama ve Kesin Yargı"]},
                {"name": "Paragraf ve Sözel Mantık", "subtopics": ["Paragraf Ana Fikir ve Yapı", "Sözel Mantık Tablo Kurma"]},
            ],
        },
    ],
}


async def seed_comprehensive_curriculum(session: AsyncSession):
    """Populates complete subjects, topics, and subtopics across all exams."""
    # Check existing exams
    exams_res = await session.execute(select(M.Exam))
    exams = {e.name: e for e in exams_res.scalars().all()}

    # If YKS or TYT or AYT exams exist, let's map them
    for exam_key, subject_list in CURRICULUM_CATALOG.items():
        exam_obj = exams.get(exam_key)
        if not exam_obj:
            # Try finding by partial match
            matched = [e for e in exams.values() if exam_key in e.name]
            if matched:
                exam_obj = matched[0]
            else:
                exam_obj = M.Exam(
                    id=_id(),
                    name=exam_key,
                    description=f"{exam_key} Sınavı",
                    exam_type="general",
                    category="universite" if "YKS" in exam_key or "ALES" in exam_key or "DGS" in exam_key else "kpss" if "KPSS" in exam_key else "ortaokul",
                    status="active",
                    order=0,
                    created_at=now_iso(),
                )
                session.add(exam_obj)
                await session.flush()
                exams[exam_key] = exam_obj

        # Loop through subjects
        for s_idx, s_data in enumerate(subject_list):
            s_res = await session.execute(
                select(M.Subject).where(M.Subject.exam_id == exam_obj.id, M.Subject.name == s_data["name"])
            )
            subj_obj = s_res.scalars().first()
            if not subj_obj:
                subj_obj = M.Subject(
                    id=_id(),
                    exam_id=exam_obj.id,
                    name=s_data["name"],
                    slug=s_data.get("slug", "general"),
                    order=s_idx,
                    status="active",
                    created_at=now_iso(),
                )
                session.add(subj_obj)
                await session.flush()

            # Loop through topics
            for t_idx, t_data in enumerate(s_data.get("topics", [])):
                t_res = await session.execute(
                    select(M.Topic).where(
                        M.Topic.exam_id == exam_obj.id,
                        M.Topic.subject_id == subj_obj.id,
                        M.Topic.name == t_data["name"],
                    )
                )
                topic_obj = t_res.scalars().first()
                if not topic_obj:
                    topic_obj = M.Topic(
                        id=_id(),
                        exam_id=exam_obj.id,
                        subject_id=subj_obj.id,
                        name=t_data["name"],
                        order=t_idx,
                        status="active",
                        created_at=now_iso(),
                    )
                    session.add(topic_obj)
                    await session.flush()

                # Loop through subtopics
                for sub_idx, sub_name in enumerate(t_data.get("subtopics", [])):
                    sub_res = await session.execute(
                        select(M.Subtopic).where(
                            M.Subtopic.topic_id == topic_obj.id,
                            M.Subtopic.name == sub_name,
                        )
                    )
                    if not sub_res.scalars().first():
                        sub_obj = M.Subtopic(
                            id=_id(),
                            topic_id=topic_obj.id,
                            name=sub_name,
                            order=sub_idx,
                            created_at=now_iso(),
                        )
                        session.add(sub_obj)

    await session.commit()
