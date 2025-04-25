import time
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess

GRAPHQL_DIR = Path(__file__).resolve().parent / "graphql"
UNIFIED_FILE = GRAPHQL_DIR / "unified.graphqls"

class GraphQLChangeHandler(FileSystemEventHandler):
    def on_any_event(self, event):
        path = Path(event.src_path)

        # Solo reaccionamos a archivos .graphqls que NO sean el archivo unificado ni estén en .history
        if (
            path.suffix == ".graphqls"
            and path != UNIFIED_FILE
            and ".history" not in path.parts
        ):
            print(f"📡 Cambio detectado: {event.event_type.upper()} → {path}")
            regenerate()

def regenerate():
    print("🔄 Ejecutando merge-schemas.py...")
    result = subprocess.run(["python", "merge-schemas.py"], capture_output=True, text=True)
    if result.returncode == 0:
        print(result.stdout.strip())
    else:
        print("❌ Error al regenerar schema:")
        print(result.stderr.strip())

if __name__ == "__main__":
    event_handler = GraphQLChangeHandler()
    observer = Observer()
    observer.schedule(event_handler, str(GRAPHQL_DIR), recursive=True)
    print(f"👀 Vigilando cambios en: {GRAPHQL_DIR}")
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("🛑 Vigilancia detenida.")
        observer.stop()

    observer.join()
