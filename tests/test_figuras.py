import math
import unittest

from figuras import Cilindro, Cubo, Esfera, Figura3D


class Figura3DTests(unittest.TestCase):
    def test_figuras_implementan_la_interfaz_abstracta(self) -> None:
        figuras: list[Figura3D] = [Cubo(2), Esfera(1), Cilindro(1, 3)]
        self.assertEqual([figura.nombre for figura in figuras], ["Cubo", "Esfera", "Cilindro"])
        self.assertTrue(all(figura.dibujar() for figura in figuras))
        self.assertTrue(all(figura.calcular_area_superficial() > 0 for figura in figuras))
        self.assertTrue(all(figura.calcular_volumen() > 0 for figura in figuras))

    def test_calculos_originales(self) -> None:
        self.assertEqual(Cubo(2).calcular_area_superficial(), 24)
        self.assertEqual(Cubo(2).calcular_volumen(), 8)
        self.assertAlmostEqual(Esfera(2).calcular_area_superficial(), 16 * math.pi)
        self.assertAlmostEqual(Esfera(2).calcular_volumen(), 32 * math.pi / 3)
        self.assertAlmostEqual(Cilindro(2, 3).calcular_area_superficial(), 20 * math.pi)
        self.assertAlmostEqual(Cilindro(2, 3).calcular_volumen(), 12 * math.pi)

    def test_escalado_cuadratico_y_cubico_sin_mutar_dimensiones(self) -> None:
        figura = Cubo(4)
        area_original = figura.calcular_area_superficial()
        volumen_original = figura.calcular_volumen()

        self.assertEqual(figura.calcular_area_superficial(0.5), area_original * 0.25)
        self.assertEqual(figura.calcular_volumen(0.5), volumen_original * 0.125)
        self.assertEqual(figura.calcular_area_superficial(2), area_original * 4)
        self.assertEqual(figura.calcular_volumen(2), volumen_original * 8)
        self.assertEqual(figura.lado, 4)

    def test_rechaza_dimensiones_y_factores_invalidos(self) -> None:
        for valor in (0, -1, float("inf"), 10**1000, "", True):
            with self.subTest(valor=valor):
                with self.assertRaises(ValueError):
                    Cubo(valor)

        for factor in (-0.1, float("inf"), 10**1000, "inválido", True):
            with self.subTest(factor=factor):
                with self.assertRaises(ValueError):
                    Esfera(2).calcular_volumen(factor)

    def test_factor_cero_es_valido(self) -> None:
        figura = Cilindro(2, 3)
        self.assertEqual(figura.calcular_area_superficial(0), 0)
        self.assertEqual(figura.calcular_volumen(0), 0)


if __name__ == "__main__":
    unittest.main()