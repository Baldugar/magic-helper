import os
from pathlib import Path
import sys

# Forzar UTF-8 para evitar errores en Windows
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent / "graphql"
OUTPUT_FILE = BASE_DIR / "unified.graphqls"

# Filtra todos los .graphqls, excepto .history y el propio unified.graphqls
graphql_files = [
    f for f in BASE_DIR.rglob("*.graphqls")
    if ".history" not in f.parts and f.name != "unified.graphqls"
]

merged = []

for file in graphql_files:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
        merged.append(f"# --- {file.relative_to(BASE_DIR)} ---\n{content.strip()}")

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write("\n\n".join(merged))

print(f"[OK] Archivo regenerado con {len(graphql_files)} archivos.")
