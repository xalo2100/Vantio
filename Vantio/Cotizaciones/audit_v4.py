import re

path = '/Users/gonzalo/proyectos/carpeta sin título/Cotizaciones/src/pages/QuoteBuilder.jsx'
with open(path, 'r') as f:
    lines = f.readlines()

stack = [] # list of (line_number, type, indent_level)
div_pattern = re.compile(r'<div\b')
div_close_pattern = re.compile(r'</div\s*>')

print(f"{'Line':<6} {'Action':<15} {'Stack Depth':<12} {'Source Line Text'}")
print("-" * 100)

for i, line in enumerate(lines):
    ln = i + 1
    # Check for div openings
    for m in div_pattern.finditer(line):
        stack.append(ln)
        if ln in [764, 871, 873, 1387]: # Highlights
            print(f"{ln:<6} {'OPEN ' + str(ln):<15} {len(stack):<12} {line.strip()[:60]}")
    
    # Check for div closings
    for m in div_close_pattern.finditer(line):
        if stack:
            op = stack.pop()
            if op in [764, 871, 873, 1387] or ln > 1730:
                print(f"{ln:<6} {'CLOSE ' + str(op):<15} {len(stack):<12} {line.strip()[:60]}")
        else:
            print(f"{ln:<6} {'EXTRA CLOSE':<15} {len(stack):<12} {line.strip()[:60]}")

print("-" * 100)
if stack:
    print(f"UNCLOSED TAGS: {stack}")
else:
    print("BALANCE PERFECT")
