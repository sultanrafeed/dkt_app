"""Structure the NSW Road User Handbook into parts/sections/blocks with page
references, and render every page to an image for the "view original page"
feature (diagrams and signs in the handbook are vector art).

Usage: python3 scripts/extract_handbook.py
Outputs: data/handbook.json, public/img/hb/p<NNN>.webp
"""
import json, os, re
import pymupdf
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, "Road-User-Handbook-English.pdf")
OUT = os.path.join(ROOT, "data", "handbook.json")
IMG_DIR = os.path.join(ROOT, "public", "img", "hb")
PAGE_OFFSET = 2          # printed page number = PDF page - 2


def clean(s):
    s = s.replace("\x07", "").replace("\x08", "").replace("\t", " ").replace(" ", " ")
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", s).strip()


def classify(span, y, page_h):
    f, z = span["font"], round(span["size"])
    if "PublicSansNSW" not in f:
        return "fig"
    if z >= 30:
        return "h1"
    if z == 18 and "Regular" in f:
        return "h2"
    if z == 14 and "Medium" in f:
        return "h3"
    if (z == 12 and ("SemiBold" in f or "Regular" in f)) or (z == 11 and "SemiBold" in f):
        return "h4"
    if z == 7 and "SemiBold" in f and y < 40:
        return "running"
    if z == 8 and y > page_h - 40:
        return "footer"
    if z in (10, 9) and ("Regular" in f or "Bold" in f or "Light" in f):
        return "body"
    if z == 8 and "Regular" in f:
        return "note"
    return "fig"


def main():
    doc = pymupdf.open(PDF)
    os.makedirs(IMG_DIR, exist_ok=True)
    pages = []
    part = section = sub = None
    for pno, page in enumerate(doc):
        H = page.rect.height
        blocks = []
        cur = None
        last_y = None
        # Part titles (35pt) are often emitted after the body text in the PDF's
        # object order, so read them first.
        h1 = [clean("".join(sp["text"] for sp in l["spans"]))
              for b in page.get_text("dict")["blocks"] for l in b.get("lines", [])
              if l["spans"] and round(l["spans"][0]["size"]) >= 30 and "PublicSans" in l["spans"][0]["font"]]
        h1 = " ".join(t for t in h1 if t)
        if h1 and pno >= 7:
            part, section, sub = h1, None, None
        if h1:
            blocks.append(dict(type="h1", text=h1))
        for b in page.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                spans = [s for s in l["spans"] if clean(s["text"])]
                if not spans:
                    continue
                y = l["bbox"][1]
                kinds = [classify(s, y, H) for s in spans]
                kind = max(set(kinds), key=kinds.count)
                if kind in ("fig", "running", "footer"):
                    continue
                text = ""
                for s, k in zip(l["spans"], [classify(s, y, H) for s in l["spans"]]):
                    t = s["text"]
                    if "Bold" in s["font"] and kind == "body" and clean(t):
                        t = f"**{t.strip()}** " if not t.startswith(" ") else f" **{t.strip()}** "
                    text += t
                text = clean(text).replace("** **", " ")
                if kind == "h1":
                    continue
                if kind in ("h2", "h3", "h4"):
                    if kind == "h2":
                        section, sub = text, None
                    elif kind == "h3":
                        sub = text
                    if cur and cur["type"] == kind and last_y is not None and y - last_y < 30:
                        cur["text"] += " " + text      # heading wrapped onto 2 lines
                    else:
                        cur = dict(type=kind, text=text); blocks.append(cur)
                    last_y = y
                    continue
                m = re.match(r"^(•|–|-|\d+\.)\s+(.*)$", text)
                if m:
                    cur = dict(type="li" if m.group(1) in "•–-" else "ol", text=m.group(2),
                               n=m.group(1).rstrip(".") if m.group(1)[0].isdigit() else None)
                    if kind == "note":
                        cur["small"] = True
                    blocks.append(cur)
                elif cur and cur["type"] in ("p", "li", "ol", "note") and last_y is not None \
                        and 0 < y - last_y < 16 and (cur["type"] != "note") == (kind != "note"):
                    cur["text"] += " " + text
                else:
                    cur = dict(type="p" if kind == "body" else "note", text=text); blocks.append(cur)
                last_y = y
        printed = pno + 1 - PAGE_OFFSET
        pages.append(dict(pdfPage=pno + 1, page=printed if printed >= 1 else None,
                          part=part, section=section, subsection=sub, blocks=blocks,
                          image=f"img/hb/p{pno + 1:03d}.webp"))
        pix = page.get_pixmap(dpi=110)
        Image.frombytes("RGB", (pix.width, pix.height), pix.samples).save(
            os.path.join(IMG_DIR, f"p{pno + 1:03d}.webp"), "WEBP", quality=70, method=6)
    # Table of contents: one entry per section heading, with its page range
    toc = []
    for p in pages:
        if p["pdfPage"] < 8 or (p["page"] or 0) > 200:   # skip cover/contents/index
            continue
        for bl in p["blocks"]:
            if bl["type"] == "h2":
                if toc:
                    toc[-1]["endPdfPage"] = max(toc[-1]["startPdfPage"], p["pdfPage"] - (0 if p["blocks"].index(bl) > 2 else 1))
                toc.append(dict(part=p["part"], section=bl["text"], startPdfPage=p["pdfPage"], endPdfPage=p["pdfPage"]))
        if toc:
            toc[-1]["endPdfPage"] = p["pdfPage"]
    json.dump(dict(source="Road User Handbook, Transport for NSW (PDF created 2026-02-19)",
                   pageOffset=PAGE_OFFSET, pages=pages, toc=toc), open(OUT, "w"), indent=1, ensure_ascii=False)
    print(len(pages), "pages;", len(toc), "sections")


if __name__ == "__main__":
    main()
