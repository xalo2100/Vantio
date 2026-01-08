import re
with open('/Users/gonzalo/proyectos/carpeta sin título/Cotizaciones/src/pages/QuoteBuilder.jsx', 'r') as f:
    text = f.read()

# Match standard and non-standard div tags
openings = [m.start() for m in re.finditer(r'<div', text)]
closings = [m.start() for m in re.finditer(r'</div', text)]

print(f"Total Openings: {len(openings)}")
print(f"Total Closings: {len(closings)}")

stack = []
for i, line in enumerate(text.splitlines()):
    ln = i + 1
    # Very permissive search
    ops = re.findall(r'<div', line)
    cls = re.findall(r'</div', line)
    for _ in ops:
        stack.append(ln)
    for _ in cls:
        if stack:
            opener = stack.pop()
        else:
            print(f"L{ln}: EXTRA closing div")

if stack:
    print(f"Unclosed openings (ln): {stack}")

# Check P tags
p_openings = re.findall(r'<p', text)
p_closings = re.findall(r'</p', text)
print(f"P Openings: {len(p_openings)}")
print(f"P Closings: {len(p_closings)}")
