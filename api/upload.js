import multer from "multer";
import fs from "fs";
import { promisify } from "util";
import pdfParse from "pdf-parse";

const unlinkAsync = promisify(fs.unlink);

const upload = multer({
  dest: "/tmp",
  limits: { fileSize: 50 * 1024 * 1024 }, // Limitar a 50MB
});

export const config = {
  api: {
    bodyParser: false, // Deshabilitar el parser de body por defecto
  },
};

export default async function handler(req, res) {
  try {
    // Habilitar CORS para permitir acceso desde cualquier dominio
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Manejar solicitudes de preflight OPTIONS
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

    // Procesar la subida del archivo
    await new Promise((resolve, reject) => {
      upload.single("file")(req, {}, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: "No se ha subido ningún archivo" });
    }

    const filePath = req.file.path;
    console.log("Archivo subido en ruta:", filePath);

    // Leer el archivo PDF desde el sistema de archivos
    const dataBuffer = fs.readFileSync(filePath);

    // Utilizar pdf-parse para extraer el texto
    const data = await pdfParse(dataBuffer);

    // Extraer el texto
    const extractedText = data.text;
    console.log("Texto extraído:", extractedText);

    // Aquí puedes procesar el texto extraído para encontrar unidades rotas y duras
    const unidades_rotas_encontradas = [];
    const unidades_duras_encontradas = [];
    let puntuacion = 0;

    const unidades_rotas = [
      "hexwraiths",
      "morghasts",
      "nagash",
      "varanguard",
      "rockgut",
      "gluttons",
      "glutons",
      "dawnriders",
      "pink horrors",
      "flamers",
      "kairos",
      "palladors",
      "raptors",
    ];

    const unidades_duras = [
      "aggradon lancers",
      "bladeheists",
      "kroxigor",
      "mortek",
      "harrow",
    ];

    const agregarOActualizarUnidad = (arr, nombreUnidad, tier) => {
      const unidadExistente = arr.find((u) => u.unidad === nombreUnidad);
      if (unidadExistente) {
        unidadExistente.cantidad += 1;
      } else {
        arr.push({ tier: tier, unidad: nombreUnidad, cantidad: 1 });
      }
    };

    // Procesar el texto línea por línea
    const lines = extractedText
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "");

    lines.forEach((line) => {
      unidades_rotas.forEach((unidad) => {
        const regex = new RegExp(unidad, "gi");
        if (line.match(regex)) {
          puntuacion += 3;
          agregarOActualizarUnidad(unidades_rotas_encontradas, unidad, "S");
        }
      });

      unidades_duras.forEach((unidad) => {
        const regex = new RegExp(unidad, "gi");
        if (line.match(regex)) {
          puntuacion += 1;
          agregarOActualizarUnidad(unidades_duras_encontradas, unidad, "A");
        }
      });
    });

    const resultados = {
      unidades_rotas_encontradas,
      unidades_duras_encontradas,
      puntuacion,
      equipo_peligroso:
        unidades_rotas_encontradas.length >= 4
          ? "Equipo peligroso - muchas unidades rotas"
          : "Equipo seguro",
    };

    console.log("Resultados finales:", resultados);

    // Eliminar el archivo temporal
    await unlinkAsync(filePath);

    // Enviar los resultados como respuesta JSON
    res.status(200).json(resultados);
  } catch (error) {
    console.error("Error al procesar el archivo:", error);
    res
      .status(500)
      .json({ error: `Error al procesar el archivo: ${error.message}` });
  }
}
