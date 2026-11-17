#!/usr/bin/env python3
"""把 src/ 內的檔案組成單一 HTML（含 jsPDF，離線可用）。用法：python3 build.py"""
import pathlib
root = pathlib.Path(__file__).parent
src = root / "src"
rd = lambda p: p.read_text(encoding="utf8")
js = "\n".join(rd(src / f) for f in ["core.js", "maze.js", "runner.js", "editor.js", "pdf.js", "slides.js", "app.js"])
jspdf = rd(root / "vendor" / "jspdf.umd.min.js")
for name, s in (("jspdf", jspdf), ("app js", js)):
    assert "</script" not in s.lower(), f"{name} 內含 </script"
html = rd(src / "index.template.html")
html = html.replace("/*__CSS__*/", rd(src / "style.css"))
html = html.replace("/*__JSPDF__*/", jspdf)
html = html.replace("/*__JS__*/", js)
out = root / "流程圖學習網頁.html"
out.write_text(html, encoding="utf8")
(root / "index.html").write_text(html, encoding="utf8")   # GitHub Pages 需要 index.html
print("OK", out.name, f"{out.stat().st_size/1024:.0f} KB")
