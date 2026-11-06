"""Servidor local y API para el Sistema Avanzado de Figuras 3D."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from datetime import datetime
import json
from math import isfinite
from pathlib import Path
from threading import RLock
from urllib.parse import parse_qs, urlparse

from figuras import Cilindro, Cubo, Esfera, Figura3D


BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
FIGURAS: list[Figura3D] = [Cubo(3), Esfera(2), Cilindro(1.5, 4)]
FIGURAS_LOCK = RLock()
HISTORIAL: list[dict[str, object]] = []
TIPOS_FIGURA = {"Cubo": Cubo, "Esfera": Esfera, "Cilindro": Cilindro}


def validar_factor(factor_escala: object) -> float:
    if isinstance(factor_escala, bool):
        raise ValueError("El factor de escala debe ser un número igual o mayor que cero.")
    try:
        factor = float(factor_escala)
    except (TypeError, ValueError, OverflowError) as error:
        raise ValueError("El factor de escala debe ser un número igual o mayor que cero.") from error
    if not isfinite(factor) or factor < 0:
        raise ValueError("El factor de escala debe ser un número igual o mayor que cero.")
    return factor


def _crear_resultado(figura: Figura3D, factor_escala: float) -> dict[str, object]:
    dimensiones = figura.dimensiones
    area_original = figura.calcular_area_superficial()
    volumen_original = figura.calcular_volumen()
    area_escalada = figura.calcular_area_superficial(factor_escala)
    volumen_escalado = figura.calcular_volumen(factor_escala)
    valores = (area_original, volumen_original, area_escalada, volumen_escalado)
    if not all(isfinite(valor) for valor in valores):
        raise ValueError("El factor es demasiado grande para calcular un resultado válido.")
    return {
        "nombre": figura.nombre,
        "tipo": figura.tipo,
        "dibujar": figura.dibujar(),
        "dimensiones": dimensiones,
        "dimensiones_escaladas": {
            nombre: valor * factor_escala for nombre, valor in dimensiones.items()
        },
        "factor": factor_escala,
        "area_original": area_original,
        "volumen_original": volumen_original,
        "area_escalada": area_escalada,
        "volumen_escalado": volumen_escalado,
    }


def obtener_resultados(factor_escala: float) -> list[dict[str, object]]:
    """Calcula las figuras sin consultar su tipo, usando la interfaz común."""
    factor = validar_factor(factor_escala)
    with FIGURAS_LOCK:
        return [_crear_resultado(figura, factor) for figura in FIGURAS]


def calcular_figura(indice: int, factor_escala: object) -> dict[str, object]:
    factor = validar_factor(factor_escala)
    with FIGURAS_LOCK:
        if indice < 0 or indice >= len(FIGURAS):
            raise ValueError("Selecciona una figura válida para calcular.")
        resultado = _crear_resultado(FIGURAS[indice], factor)
        HISTORIAL.insert(
            0,
            {
                "tipo": resultado["tipo"],
                "dimensiones": resultado["dimensiones"],
                "area_superficial": resultado["area_escalada"],
                "volumen": resultado["volumen_escalado"],
                "factor": factor,
                "fecha": datetime.now().astimezone().isoformat(timespec="seconds"),
            },
        )
        del HISTORIAL[200:]
        return {"indice": indice, **resultado}


class Figura3DHandler(BaseHTTPRequestHandler):
    server_version = "Figuras3D/1.0"

    def _enviar_json(self, estado: int, contenido: object) -> None:
        cuerpo = json.dumps(contenido, ensure_ascii=False).encode("utf-8")
        self.send_response(estado)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(cuerpo)

    def _leer_json(self) -> dict[str, object]:
        longitud = int(self.headers.get("Content-Length", "0"))
        if longitud > 16_384:
            raise ValueError("La solicitud es demasiado grande.")
        datos = json.loads(self.rfile.read(longitud).decode("utf-8"))
        if not isinstance(datos, dict):
            raise ValueError("Los datos enviados no tienen un formato válido.")
        return datos

    def do_GET(self) -> None:
        ruta = urlparse(self.path)
        if ruta.path == "/api/figuras":
            with FIGURAS_LOCK:
                figuras = [
                    {
                        "nombre": figura.nombre,
                        "tipo": figura.tipo,
                        "dibujar": figura.dibujar(),
                        "dimensiones": figura.dimensiones,
                    }
                    for figura in FIGURAS
                ]
            self._enviar_json(200, {"figuras": figuras})
            return

        if ruta.path == "/api/historial":
            with FIGURAS_LOCK:
                historial = list(HISTORIAL)
            self._enviar_json(200, {"historial": historial})
            return

        if ruta.path == "/api/resultados":
            try:
                valores = parse_qs(ruta.query).get("factor", ["1"])
                factor = float(valores[0])
                resultados = obtener_resultados(factor)
            except (ValueError, OverflowError) as error:
                self._enviar_json(400, {"error": str(error) or "Factor de escala inválido."})
                return
            self._enviar_json(200, {"resultados": resultados})
            return

        if ruta.path == "/" or ruta.path == "/index.html":
            self._enviar_archivo("index.html")
            return
        if ruta.path in ("/styles.css", "/app.js", "/three-stage.js"):
            self._enviar_archivo(ruta.path.lstrip("/"))
            return
        self._enviar_json(404, {"error": "No se encontró el recurso solicitado."})

    def _enviar_archivo(self, nombre: str) -> None:
        archivo = STATIC_DIR / nombre
        if not archivo.is_file():
            self._enviar_json(404, {"error": "No se encontró el recurso solicitado."})
            return
        contenido = archivo.read_bytes()
        tipo = "text/javascript" if nombre.endswith(".js") else None
        if tipo is None:
            tipo = "text/html" if nombre.endswith(".html") else "text/css"
        self.send_response(200)
        self.send_header("Content-Type", f"{tipo}; charset=utf-8")
        self.send_header("Content-Length", str(len(contenido)))
        self.end_headers()
        self.wfile.write(contenido)

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/figuras":
            ruta = urlparse(self.path).path
            if ruta == "/api/calcular":
                try:
                    datos = self._leer_json()
                    indice = datos.get("indice")
                    if isinstance(indice, bool) or not isinstance(indice, int):
                        raise ValueError("Selecciona una figura válida para calcular.")
                    resultado = calcular_figura(indice, datos.get("factor", 1))
                    self._enviar_json(200, {"resultado": resultado})
                except (ValueError, TypeError, OverflowError, json.JSONDecodeError, UnicodeDecodeError) as error:
                    mensaje = str(error) or "Revisa los datos del cálculo."
                    self._enviar_json(400, {"error": mensaje})
                return
            self._enviar_json(404, {"error": "No se encontró el recurso solicitado."})
            return
        try:
            datos = self._leer_json()
            tipo = datos.get("tipo")
            dimensiones = datos.get("dimensiones")
            if not isinstance(tipo, str) or tipo not in TIPOS_FIGURA:
                raise ValueError("Selecciona una figura válida.")
            if not isinstance(dimensiones, dict):
                raise ValueError("Completa todas las dimensiones de la figura.")
            clase = TIPOS_FIGURA[tipo]
            figura = clase(**dimensiones)
            with FIGURAS_LOCK:
                FIGURAS.append(figura)
                indice = len(FIGURAS) - 1
            self._enviar_json(
                201,
                {
                    "indice": indice,
                    "nombre": figura.nombre,
                    "tipo": figura.tipo,
                    "dibujar": figura.dibujar(),
                    "dimensiones": figura.dimensiones,
                },
            )
        except (ValueError, TypeError, json.JSONDecodeError, UnicodeDecodeError) as error:
            mensaje = str(error) or "Revisa los datos ingresados."
            self._enviar_json(400, {"error": mensaje})

    def do_DELETE(self) -> None:
        ruta = urlparse(self.path).path
        if ruta == "/api/historial":
            with FIGURAS_LOCK:
                HISTORIAL.clear()
            self._enviar_json(200, {"historial": []})
            return
        if ruta != "/api/figuras":
            self._enviar_json(404, {"error": "No se encontró el recurso solicitado."})
            return
        with FIGURAS_LOCK:
            FIGURAS.clear()
        self._enviar_json(200, {"figuras": []})

    def log_message(self, formato: str, *argumentos: object) -> None:
        print(f"[{self.log_date_time_string()}] {formato % argumentos}")


def main() -> None:
    direccion = ("127.0.0.1", 8765)
    servidor = ThreadingHTTPServer(direccion, Figura3DHandler)
    print(f"Sistema Avanzado de Figuras 3D disponible en http://{direccion[0]}:{direccion[1]}")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    finally:
        servidor.server_close()


if __name__ == "__main__":
    main()