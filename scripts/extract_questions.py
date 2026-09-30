"""Extract every question, option, official answer and image from the NSW DKT
question PDF.

The official (correct) answer is taken from the source typography: in the
supplied PDF the correct option is set in Arial-Black while distractors are
ArialMT. Nothing is inferred from position or guessed.

Usage: python3 scripts/extract_questions.py
Outputs: data/questions.raw.json, public/img/q/<CODE>.png, data/extraction-report.json
"""
import json, re, os, sys
import pymupdf
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, "driver-knowledge-test-questions-car.pdf")
IMG_DIR = os.path.join(ROOT, "public", "img", "q")
OUT = os.path.join(ROOT, "data", "questions.raw.json")

HEADER_RE = re.compile(r"^([A-Z]{2,4})\s*(\d{1,3})\s*[-–−]+\s*(.+?)\s*$")
FOOTER_Y = 780          # page numbers / footer rule sit below this
TOP_Y = 60


def norm(s):
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = s.replace("–", "-").replace("−", "-").replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip()


def page_lines(page):
    """Return merged text lines: dict(y0,y1,x0,x1,text,bold,size)."""
    lines = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            spans = [s for s in l["spans"] if s["text"].strip()]
            if not spans:
                continue
            x0 = min(s["bbox"][0] for s in spans); x1 = max(s["bbox"][2] for s in spans)
            y0 = min(s["bbox"][1] for s in spans); y1 = max(s["bbox"][3] for s in spans)
            text = "".join(s["text"] for s in l["spans"])
            bold_chars = sum(len(s["text"].strip()) for s in spans if "Black" in s["font"] or "Bold" in s["font"])
            all_chars = sum(len(s["text"].strip()) for s in spans)
            lines.append(dict(x0=x0, x1=x1, y0=y0, y1=y1, text=text,
                              bold=bold_chars > all_chars / 2,
                              black_header=any("Black" in s["font"] and s["size"] >= 9.5 for s in spans),
                              size=max(s["size"] for s in spans)))
    lines.sort(key=lambda L: (round(L["y0"]), L["x0"]))
    # merge fragments that sit on the same baseline
    merged = []
    for L in lines:
        if merged and abs(merged[-1]["y0"] - L["y0"]) < 2.5 and L["x0"] >= merged[-1]["x1"] - 1:
            M = merged[-1]
            M["text"] += L["text"]; M["x1"] = L["x1"]; M["y1"] = max(M["y1"], L["y1"])
            M["bold"] = M["bold"] or L["bold"]; M["black_header"] |= L["black_header"]
        else:
            merged.append(dict(L))
    return merged


def visual_rects(page):
    rects = [pymupdf.Rect(i["bbox"]) for i in page.get_image_info()]
    for d in page.get_drawings():
        r = d["rect"]
        if r.y0 > FOOTER_Y - 10:
            continue            # footer rule
        if r.width < 2 and r.height < 2:
            continue
        rects.append(pymupdf.Rect(r))
    return rects


def main():
    doc = pymupdf.open(PDF)
    os.makedirs(IMG_DIR, exist_ok=True)
    # 1. Build one stream of lines across all pages so questions that run over a
    #    page break are kept together.
    stream, visuals, section = [], {}, None
    for pno, page in enumerate(doc):
        vis = visual_rects(page)
        visuals[pno] = vis
        def in_visual(L):
            c = pymupdf.Point((L["x0"] + L["x1"]) / 2, (L["y0"] + L["y1"]) / 2)
            return any(pymupdf.Rect(r.x0 - 2, r.y0 - 2, r.x1 + 2, r.y1 + 2).contains(c) for r in vis)
        for L in page_lines(page):
            if not (TOP_Y < L["y0"] < FOOTER_Y):
                continue
            t = norm(L["text"])
            L["page"] = pno
            L["t"] = t
            if L["size"] >= 14 and "SECTION" in t:
                section = t.replace("SECTION", "").strip().title()
                continue
            L["section"] = section
            m = HEADER_RE.match(re.sub(r"\s*RUH$", "", t))
            L["header"] = bool(m and L["black_header"] and L["x0"] < 200)
            L["label"] = (not L["header"]) and in_visual(L) and not t.startswith("-")
            stream.append(L)

    # Render crops from a copy of the PDF with question/answer text removed, so
    # a crop never contains stray words; labels drawn on pictures are kept.
    rdoc = pymupdf.open(PDF)
    for pno in range(len(rdoc)):
        pg = rdoc[pno]
        for L in page_lines(pg):
            c = pymupdf.Point((L["x0"] + L["x1"]) / 2, (L["y0"] + L["y1"]) / 2)
            if not any(pymupdf.Rect(r.x0 - 2, r.y0 - 2, r.x1 + 2, r.y1 + 2).contains(c) for r in visuals[pno]) \
                    or norm(L["text"]).startswith("-"):
                pg.add_redact_annot(pymupdf.Rect(L["x0"], L["y0"], L["x1"], L["y1"]))
        pg.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE,
                            graphics=pymupdf.PDF_REDACT_LINE_ART_NONE)

    headers = [i for i, L in enumerate(stream) if L["header"]]
    questions = []
    for hi, i in enumerate(headers):
        end = headers[hi + 1] if hi + 1 < len(headers) else len(stream)
        L = stream[i]
        m = HEADER_RE.match(re.sub(r"\s*RUH$", "", L["t"]))
        prefix, num, cat = m.group(1), m.group(2), m.group(3)
        code = f"{prefix}{int(num):03d}" if prefix != "ICAC" else f"ICAC{int(num)}"
        qtext, options, cur, labels = [], [], None, []
        pages = sorted({B["page"] for B in stream[i:end]})
        for B in stream[i + 1:end]:
            bt = B["t"]
            if bt == "RUH":
                continue
            if B["label"]:
                labels.append(bt); continue
            if bt.startswith("-") and not bt.startswith("--"):
                cur = dict(text=bt.lstrip("-").strip(), bold=B["bold"])
                options.append(cur)
            elif cur is not None:
                cur["text"] = (cur["text"] + " " + bt).strip()
                cur["bold"] = cur["bold"] or B["bold"]
            else:
                qtext.append(bt)
        # 2. Image: every picture/drawing between this header and the next one.
        crops = []
        for pno in pages:
            page = doc[pno]
            y_top = L["y0"] - 4 if pno == L["page"] else TOP_Y
            nxt = stream[end] if end < len(stream) and stream[end]["page"] == pno else None
            y_bot = nxt["y0"] - 2 if nxt else FOOTER_Y
            band = [r for r in visuals[pno] if r.y0 >= y_top and r.y1 <= y_bot + 4 and not r.is_empty]
            if band:
                u = pymupdf.Rect(band[0])
                for r in band[1:]:
                    u |= r
                crops.append((pno, pymupdf.Rect(u.x0 - 3, u.y0 - 3, u.x1 + 3, u.y1 + 3) & page.rect, len(band)))
        image = None
        if crops:
            pno, u, n = crops[0]
            pix = rdoc[pno].get_pixmap(clip=u, dpi=180)
            fn = f"{code}.webp"
            Image.frombytes("RGB", (pix.width, pix.height), pix.samples).save(
                os.path.join(IMG_DIR, fn), "WEBP", quality=82, method=6)
            image = dict(file=f"img/q/{fn}", width=pix.width, height=pix.height,
                         page=pno + 1, bbox=[round(v, 1) for v in u], parts=n)
        correct = [k for k, o in enumerate(options) if o["bold"]]
        questions.append(dict(
            code=code, sourceCode=f"{prefix}{num}", prefix=prefix,
            category=re.sub(r"\s+", " ", cat.replace("TrafficSigns", "Traffic Signs")),
            section=L["section"] or "Introduction", question=" ".join(qtext),
            options=[o["text"] for o in options],
            correctIndex=correct[0] if len(correct) == 1 else None,
            boldOptionCount=len(correct), sourcePage=L["page"] + 1,
            sourcePages=[p + 1 for p in pages], image=image, extraImageCrops=len(crops) - 1,
            imageLabels=labels))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(questions, open(OUT, "w"), indent=1, ensure_ascii=False)
    print(len(questions), "questions;", sum(1 for q in questions if q["image"]), "with images")


if __name__ == "__main__":
    main()
