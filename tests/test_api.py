import json
import unittest
from http.server import ThreadingHTTPServer
from threading import Thread
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import app
from figuras import Cubo


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), app.Figura3DHandler)
        cls.thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def setUp(self) -> None:
        with app.FIGURAS_LOCK:
            app.FIGURAS[:] = [Cubo(2)]
            app.HISTORIAL.clear()

    def solicitar(self, ruta: str, metodo: str = "GET", datos: dict[str, object] | None = None):
        cuerpo = json.dumps(datos).encode("utf-8") if datos is not None else None
        request = Request(
            f"{self.base_url}{ruta}",
            data=cuerpo,
            method=metodo,
            headers={"Content-Type": "application/json"} if cuerpo else {},
        )
        try:
            with urlopen(request, timeout=3) as response:
                return response.status, json.loads(response.read())
        except HTTPError as error:
            return error.code, json.loads(error.read())

    def test_calcular_registra_resultado_y_fecha_en_historial(self) -> None:
        estado, respuesta = self.solicitar(
            "/api/calcular", "POST", {"indice": 0, "factor": 1.5}
        )

        self.assertEqual(estado, 200)
        resultado = respuesta["resultado"]
        self.assertEqual(resultado["dimensiones_escaladas"], {"lado": 3})
        self.assertEqual(resultado["area_escalada"], 54)
        self.assertEqual(resultado["volumen_escalado"], 27)

        estado, respuesta = self.solicitar("/api/historial")
        self.assertEqual(estado, 200)
        registro = respuesta["historial"][0]
        self.assertEqual(registro["tipo"], "Cubo")
        self.assertEqual(registro["factor"], 1.5)
        self.assertEqual(registro["area_superficial"], 54)
        self.assertEqual(registro["volumen"], 27)
        self.assertTrue(registro["fecha"])

    def test_calculo_rechaza_factor_negativo(self) -> None:
        for factor in (-1, True):
            with self.subTest(factor=factor):
                estado, respuesta = self.solicitar(
                    "/api/calcular", "POST", {"indice": 0, "factor": factor}
                )
                self.assertEqual(estado, 400)
                self.assertIn("factor", respuesta["error"].lower())

    def test_historial_se_puede_limpiar(self) -> None:
        self.solicitar("/api/calcular", "POST", {"indice": 0, "factor": 1})
        estado, respuesta = self.solicitar("/api/historial", "DELETE")
        self.assertEqual(estado, 200)
        self.assertEqual(respuesta["historial"], [])


if __name__ == "__main__":
    unittest.main()