# Sistema Avanzado de Figuras 3D

Aplicación local en Python para crear cubos, esferas y cilindros, visualizar sus formas y comparar área superficial y volumen bajo distintos factores de escala. No requiere instalar paquetes externos.

## Ejecutar en Visual Studio Code

1. Abre la carpeta del proyecto en VS Code.
2. En la terminal integrada, ejecuta el intérprete del entorno virtual:

   ```powershell
   .\.venv\Scripts\python.exe app.py
   ```

   También puedes ejecutar `python app.py` si el comando `python` de tu sistema apunta a una instalación funcional.
3. Abre [http://127.0.0.1:8765](http://127.0.0.1:8765) en el navegador.
4. Detén el servidor con `Ctrl+C`.

La colección inicia con un cubo, una esfera y un cilindro de ejemplo. Puedes agregar figuras, cambiar la escala, calcular y limpiar la colección. El selector personalizado acepta cualquier factor finito igual o mayor que cero.

## Organización

- `figuras.py`: clase abstracta, validaciones y clases concretas con cálculos polimórficos.
- `app.py`: servidor HTTP local, API y colección de objetos.
- `static/`: interfaz responsive, estilos y representaciones Canvas.
- `tests/test_figuras.py`: pruebas de fórmulas, polimorfismo, validación y escalado.

Python no ofrece sobrecarga tradicional de métodos por firma. Por eso, los métodos de área y volumen reciben un parámetro opcional `factor_escala`: el valor predeterminado `1` calcula el original, mientras que los factores aplican $s^2$ al área y $s^3$ al volumen sin modificar el objeto.

## Pruebas

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```