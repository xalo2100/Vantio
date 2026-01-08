import re
with open('/Users/gonzalo/proyectos/carpeta sin título/Cotizaciones/src/pages/QuoteBuilder.jsx', 'r') as f:
    text = f.read()

stack = []
for i, line in enumerate(text.splitlines()):
    ln = i + 1
    # Handle <div... or <div
    ops = re.findall(r'<div(?![a-zA-Z0-9])', line)
    cls = re.findall(r'</div\s*>', line)
    for _ in ops:
        stack.append(ln)
    for _ in cls:
        if stack:
            opener = stack.pop()
        else:
            print(f"L{ln}: EXTRA closing")

if stack:
    print(f"Unclosed openings: {stack}")
