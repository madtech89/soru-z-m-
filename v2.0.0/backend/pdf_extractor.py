"""
PDF Soru Kitapçığı Ayrıştırıcı & Yapay Zekâ Destekli Branş/Konu Sınıflandırıcı
(ÖSYM, MEB, YKS, LGS, KPSS, ALES, DGS formatlarında sıfır kayıpla soru çıkarma)
"""

import io
import re
import json
import logging
from typing import List, Dict, Any, Optional
import pypdf
from ai import call_resilient_ai, key_manager

logger = logging.getLogger("sinav.pdf")

SYSTEM_PDF_EXTRACTOR = (
    "Sen Türkiye sınav kitapçıklarını (ÖSYM, MEB, YKS TYT/AYT, LGS, KPSS, ALES) sıfır veri kaybıyla "
    "analiz eden profesyonel bir Soru Dizgi ve Sınıflandırma Yapay Zekâ Motorusun. "
    "Sana verilen kitapçık metnindeki tüm soruları tek tek tespit edip şıklarına ayıracak, "
    "sorunun içeriğine göre HANGİ DERS (Örn: 'Temel Matematik (Mat-1)', 'İleri Matematik (Mat-2 - AYT)', 'Türkçe', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya') "
    "ve HANGİ KONU olduğunu (Örn: 'Türev', 'Problemler', 'Paragrafta Anlam', 'EBOB-EKOK') otomatik belirleyeceksin. "
    "Cevabını YALNIZCA geçerli JSON formatında, soru listesi dizisi olarak döndür:\n"
    "[\n"
    "  {\n"
    '    "question_text": "f(x) = x^3 - 3x fonksiyonunun yerel minimum noktası nedir?",\n'
    '    "option_a": "(1, -2)",\n'
    '    "option_b": "(-1, 2)",\n'
    '    "option_c": "(0, 0)",\n'
    '    "option_d": "(2, 2)",\n'
    '    "option_e": "(-2, -2)",\n'
    '    "correct_answer": "A",\n'
    '    "explanation": "f\'(x) = 3x^2 - 3 = 0 => x = 1 için f(1) = -2 yerel minimumdur.",\n'
    '    "subject_name": "İleri Matematik (Mat-2 - AYT)",\n'
    '    "topic_name": "Türev",\n'
    '    "difficulty": "orta",\n'
    '    "year": 2024,\n'
    '    "source": "PDF Kitapçık"\n'
    "  }\n"
    "]"
)


def extract_raw_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extracts all text from PDF using pypdf."""
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    pages_text = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages_text.append(f"--- SAYFA {i+1} ---\n{text}")
    return "\n\n".join(pages_text)


async def extract_questions_from_pdf(
    pdf_bytes: bytes,
    exam_name: str = "YKS",
    available_subjects: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """
    Extracts questions from PDF, accurately categorizes subject and topic,
    and returns a structured list for admin verification.
    """
    raw_text = extract_raw_text_from_pdf(pdf_bytes)
    if not raw_text.strip():
        return []

    # Subjects list for AI context
    subj_names = [s["name"] for s in (available_subjects or [])]
    subj_context = f"Sistemdeki Mevcut Dersler: {', '.join(subj_names)}" if subj_names else ""

    # Split text into chunks (approx 2500 chars / ~3-5 questions per chunk for high reliability)
    chunks = _chunk_text(raw_text, chunk_size=3000)
    all_extracted_questions = []

    for chunk in chunks:
        user_prompt = (
            f"Hedef Sınav: {exam_name}\n"
            f"{subj_context}\n\n"
            f"Aşağıdaki PDF sayfa metninden soruları eksiksiz ayıkla ve JSON listesi olarak ver:\n\n"
            f"{chunk}"
        )

        ai_res = await _call_ai_for_extraction(user_prompt)
        if ai_res:
            all_extracted_questions.extend(ai_res)
        else:
            # Fallback regex extraction for this chunk
            regex_questions = _fallback_regex_extract(chunk, exam_name)
            all_extracted_questions.extend(regex_questions)

    # Post-process: clean and standardize
    cleaned = []
    for q in all_extracted_questions:
        if q.get("question_text") and (q.get("option_a") or q.get("option_b")):
            cleaned.append({
                "question_text": q.get("question_text", "").strip(),
                "option_a": q.get("option_a", "").strip(),
                "option_b": q.get("option_b", "").strip(),
                "option_c": q.get("option_c", "").strip(),
                "option_d": q.get("option_d", "").strip(),
                "option_e": q.get("option_e", "").strip(),
                "correct_answer": (q.get("correct_answer") or "A").upper().strip()[:1],
                "explanation": q.get("explanation", "").strip(),
                "subject_name": q.get("subject_name") or _guess_subject(q.get("question_text", "")),
                "topic_name": q.get("topic_name") or "Genel Konu",
                "difficulty": q.get("difficulty") or "orta",
                "year": q.get("year") or 2024,
                "source": q.get("source") or "PDF Kitapçık",
            })

    return cleaned


async def _call_ai_for_extraction(user_prompt: str) -> Optional[List[Dict[str, Any]]]:
    """Tries all available AI keys to parse PDF questions into JSON."""
    raw_ai = await call_resilient_ai(SYSTEM_PDF_EXTRACTOR, user_prompt)
    if not raw_ai:
        return None

    try:
        clean = raw_ai.strip()
        if "```json" in clean:
            clean = clean.split("```json")[1].split("```")[0].strip()
        elif "```" in clean:
            clean = clean.split("```")[1].split("```")[0].strip()

        parsed = json.loads(clean)
        if isinstance(parsed, list):
            return parsed
        elif isinstance(parsed, dict) and "questions" in parsed:
            return parsed["questions"]
    except Exception as e:
        logger.warning(f"AI PDF parsing JSON decode failed: {e}")

    return None


def _chunk_text(text: str, chunk_size: int = 3000) -> List[str]:
    """Splits text by pages or paragraphs cleanly."""
    pages = text.split("--- SAYFA ")
    chunks = []
    current = ""
    for p in pages:
        if not p.strip():
            continue
        full_page = f"--- SAYFA {p}"
        if len(current) + len(full_page) > chunk_size:
            if current:
                chunks.append(current)
            current = full_page
        else:
            current += "\n\n" + full_page
    if current.strip():
        chunks.append(current)
    return chunks or [text]


def _fallback_regex_extract(text: str, exam_name: str) -> List[Dict[str, Any]]:
    """
    Deterministic rule-based Turkish question parser when AI is unavailable.
    Splits by standard numbering (1., 2., 3., etc.) and extracts A), B), C), D), E) options.
    """
    questions = []
    # Pattern to find questions: e.g. "1.", "Soru 1:", "1-)"
    q_blocks = re.split(r'\n(?=(?:Soru\s*)?\d+[\.\)\-]\s+)', text)

    for block in q_blocks:
        block = block.strip()
        if len(block) < 30:
            continue

        # Extract Options A-E
        opt_pattern = r'([A-Ea-e])[\.\)]\s*([^\n]+(?:\n(?![A-Ea-e][\.\)]|\d+[\.\)]).*)*)'
        opts_found = re.findall(opt_pattern, block)

        if len(opts_found) >= 3:
            # Extract question text before first option
            first_opt_match = re.search(r'[A-Ea-e][\.\)]\s*', block)
            if first_opt_match:
                q_text = block[:first_opt_match.start()].strip()
                # Remove question number from start
                q_text = re.sub(r'^(?:Soru\s*)?\d+[\.\)\-]\s*', '', q_text).strip()

                opts_dict = {}
                for letter, val in opts_found:
                    opts_dict[f"option_{letter.lower()}"] = val.strip()

                questions.append({
                    "question_text": q_text,
                    "option_a": opts_dict.get("option_a", ""),
                    "option_b": opts_dict.get("option_b", ""),
                    "option_c": opts_dict.get("option_c", ""),
                    "option_d": opts_dict.get("option_d", ""),
                    "option_e": opts_dict.get("option_e", ""),
                    "correct_answer": "A",
                    "explanation": "",
                    "subject_name": _guess_subject(q_text),
                    "topic_name": "Genel Konu",
                    "difficulty": "orta",
                    "year": 2024,
                    "source": f"{exam_name} PDF",
                })

    return questions


def _guess_subject(text: str) -> str:
    """Heuristic subject categorization based on keywords."""
    lower = text.lower()
    if any(k in lower for k in ["türev", "integral", "trigonometri", "logaritma", "parabol", "polinom", "limit"]):
        return "İleri Matematik (Mat-2 - AYT)"
    elif any(k in lower for k in ["ebob", "ekok", "rasyonel", "üslü", "köklü", "problem", "yaş", "işçi", "kâr", "kesir", "mutlak değer"]):
        return "Temel Matematik (Mat-1)"
    elif any(k in lower for k in ["üçgen", "dörtgen", "çember", "daire", "pisagor", "analitik", "dikdörtgen", "açı"]):
        return "Geometri (TYT & AYT)"
    elif any(k in lower for k in ["paragraf", "anlatım", "yazım", "noktalama", "ses bilgisi", "ses olayı", "ses", "cümle", "sözcük", "metin", "zarf", "sıfat", "yüklem", "fiil"]):
        return "Türkçe (TYT)"

    elif any(k in lower for k in ["gazel", "kaside", "divan", "tanzimat", "şiir", "hece", "aruz", "roman", "edebiyat"]):
        return "Türk Dili ve Edebiyatı (AYT)"
    elif any(k in lower for k in ["vektör", "newton", "kuvvet", "dinamik", "momentum", "optik", "dalga", "elektrik", "direnç", "akım"]):
        return "Fizik (TYT & AYT)"
    elif any(k in lower for k in ["periyodik", "mol", "asit", "baz", "kimyasal", "entalpi", "organik", "bağ", "tepkime", "çözelti"]):
        return "Kimya (TYT & AYT)"
    elif any(k in lower for k in ["hücre", "mitoz", "mayoz", "kalıtım", "dna", "fotosentez", "solunum", "enzim", "sindirim", "dolaşım"]):
        return "Biyoloji (TYT & AYT)"
    elif any(k in lower for k in ["osmanlı", "selçuklu", "atatürk", "mondros", "lozan", "kongre", "savaş", "tarih", "antlaşma"]):
        return "Tarih (TYT & AYT)"
    elif any(k in lower for k in ["iklim", "nüfus", "harita", "dağ", "ova", "akarsu", "erozyon", "deprem", "enlem", "boylam"]):
        return "Coğrafya (TYT & AYT)"
    return "Temel Matematik (Mat-1)"
