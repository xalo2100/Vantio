import re

with open('/Users/gonzalo/proyectos/carpeta sin título/Cotizaciones/src/pages/QuoteBuilder.jsx', 'r') as f:
    text = f.read()

ops = re.findall(r'<div\b', text)
cls = re.findall(r'</div', text) # Matches </div and </div >

print(f"Open: {len(ops)}")
print(f"Close: {len(cls)}")

stack = []
for i, line in enumerate(text.splitlines()):
    ln = i + 1
    for m in re.finditer(r'<div\b', line):
        stack.append(ln)
    for m in re.finditer(r'</div', line):
        if stack:
            opener = stack.pop()
        else:
            print(f"L{ln}: EXTRA CLOSING")

print(f"Final stack: {stack}")
