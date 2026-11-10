"""Modelo orientado a objetos para calcular figuras tridimensionales."""

from abc import ABC, abstractmethod
from math import isfinite, pi


def _validar_dimension(nombre: str, valor: float) -> float:
    if isinstance(valor, bool):
        raise ValueError(f"La dimensión {nombre} debe ser un número mayor que cero.")
    try:
        dimension = float(valor)
    except (TypeError, ValueError, OverflowError) as error:
        raise ValueError(f"La dimensión {nombre} debe ser un número mayor que cero.") from error
    if not isfinite(dimension) or dimension <= 0:
        raise ValueError(f"La dimensión {nombre} debe ser un número mayor que cero.")
    return dimension


def _validar_factor(factor_escala: float) -> float:
    if isinstance(factor_escala, bool):
        raise ValueError("El factor de escala debe ser un número igual o mayor que cero.")
    try:
        factor = float(factor_escala)
    except (TypeError, ValueError, OverflowError) as error:
        raise ValueError("El factor de escala debe ser un número igual o mayor que cero.") from error
    if not isfinite(factor) or factor < 0:
        raise ValueError("El factor de escala debe ser un número igual o mayor que cero.")
    return factor


class Figura3D(ABC):
    nombre = "Figura 3D"
    tipo = ""

    @property
    @abstractmethod
    def dimensiones(self) -> dict[str, float]:
        """Devuelve las dimensiones originales de la figura."""

    def dibujar(self) -> str:
        detalle = ", ".join(
            f"{nombre}: {valor:g}" for nombre, valor in self.dimensiones.items()
        )
        return f"{self.nombre} ({detalle})"

    @abstractmethod
    def calcular_area_superficial(self, factor_escala: float = 1.0) -> float:
        # El argumento opcional ofrece la sobrecarga que Python no implementa de forma tradicional.
        raise NotImplementedError

    @abstractmethod
    def calcular_volumen(self, factor_escala: float = 1.0) -> float:
        raise NotImplementedError

# Clase encargada de representar un cubo y calcular su area y volumen

class Cubo(Figura3D):
    nombre = "Cubo"
    tipo = "Cubo"

    def __init__(self, lado: float) -> None:
        self.lado = _validar_dimension("lado", lado)

    @property
    def dimensiones(self) -> dict[str, float]:
        return {"lado": self.lado}

    def calcular_area_superficial(self, factor_escala: float = 1.0) -> float:
        factor = _validar_factor(factor_escala)
        return 6 * self.lado**2 * factor**2

    def calcular_volumen(self, factor_escala: float = 1.0) -> float:
        factor = _validar_factor(factor_escala)
        return self.lado**3 * factor**3


class Esfera(Figura3D):
    nombre = "Esfera"
    tipo = "Esfera"

    def __init__(self, radio: float) -> None:
        self.radio = _validar_dimension("radio", radio)

    @property
    def dimensiones(self) -> dict[str, float]:
        return {"radio": self.radio}

    def calcular_area_superficial(self, factor_escala: float = 1.0) -> float:
        factor = _validar_factor(factor_escala)
        return 4 * pi * self.radio**2 * factor**2

    def calcular_volumen(self, factor_escala: float = 1.0) -> float:
        factor = _validar_factor(factor_escala)
        return (4 / 3) * pi * self.radio**3 * factor**3


class Cilindro(Figura3D):
    nombre = "Cilindro"
    tipo = "Cilindro"

    def __init__(self, radio: float, altura: float) -> None:
        self.radio = _validar_dimension("radio", radio)
        self.altura = _validar_dimension("altura", altura)

    @property
    def dimensiones(self) -> dict[str, float]:
        return {"radio": self.radio, "altura": self.altura}

    def calcular_area_superficial(self, factor_escala: float = 1.0) -> float:
        factor = _validar_factor(factor_escala)
        return 2 * pi * self.radio * (self.radio + self.altura) * factor**2

    def calcular_volumen(self, factor_escala: float = 1.0) -> float:
        factor = _validar_factor(factor_escala)
        return pi * self.radio**2 * self.altura * factor**3