# Sistema Avanzado de Figuras 3D

Aplicación web local para crear cubos, esferas y cilindros, calcular sus medidas, escalar objetos y visualizar modelos interactivos en 3D. Python mantiene la lógica matemática y JavaScript gestiona la interfaz y Three.js.

## Ejecutar en Visual Studio Code

```powershell
.\.venv\Scripts\python.exe app.py
```

Abre [http://127.0.0.1:8765](http://127.0.0.1:8765) en el navegador. Detén el servidor con `Ctrl+C`. Three.js y OrbitControls se cargan desde jsDelivr, por lo que la visualización 3D necesita acceso a Internet; los cálculos los realiza el servidor local.

## Módulos

- **Inicio**: resumen de figuras y actividad reciente.
- **Figuras 3D**: formularios de cubo, esfera y cilindro, colección polimórfica y escena 3D.
- **Calculadora**: cálculo individual de un objeto guardado.
- **Escalado dinámico**: control deslizante, factores rápidos y comparación de dimensiones, área y volumen.
- **Historial**: cálculos con dimensiones, factor y fecha; se conserva en memoria mientras el servidor está activo.
- **Acerca del proyecto**: fórmulas y conceptos de POO.

## Organización

- `figuras.py`: clase abstracta `Figura3D`, validaciones y clases concretas.
- `app.py`: servidor HTTP, API, cálculos polimórficos e historial de sesión.
- `static/index.html`: vistas de la SPA y estructura de la interfaz.
- `static/styles.css`: estilos responsive.
- `static/app.js`: navegación, solicitudes API y controles de interfaz.
- `static/three-stage.js`: geometrías 3D y controles de cámara con OrbitControls.
- `tests/`: pruebas del modelo y de la API HTTP.

Python no ofrece sobrecarga tradicional de métodos por firma. Los métodos reciben un parámetro opcional `factor_escala`: por defecto vale `1`; al escalar, el área se multiplica por $s^2$ y el volumen por $s^3$, sin modificar las dimensiones del objeto ni crear instancias adicionales.

## Pruebas

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```