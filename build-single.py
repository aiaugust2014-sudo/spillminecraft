#!/usr/bin/env python3
"""Lager blokk-royale.html: hele spillet (inkl. Three.js) i én fil."""
import re
from pathlib import Path

root = Path(__file__).parent
html = (root / 'index.html').read_text()
css = (root / 'style.css').read_text()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')


def inline(m):
    src = m.group(1)
    js = (root / src).read_text()
    assert '</script' not in js, src
    return '<script>\n// ===== ' + src + ' =====\n' + js + '\n</script>'


html = re.sub(r'<script src="((?:js|vendor)/[^"]+)"></script>', inline, html)
assert 'src="js/' not in html and 'src="vendor/' not in html and 'style.css' not in html
(root / 'blokk-royale.html').write_text(html)
print('blokk-royale.html:', len(html) // 1024, 'KB')
