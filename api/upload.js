import multer from "multer";
import fs from "fs";
import { promisify } from "util";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

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
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

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

    if (!fs.existsSync(filePath)) {
      throw new Error("El archivo no existe en la ruta especificada");
    }

    // Leer el archivo PDF usando pdf-lib y pdfjs-dist
    const dataBuffer = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(dataBuffer);

    // Extraer texto usando pdfjs-dist
    const loadingTask = pdfjsLib.getDocument({ data: dataBuffer });
    const pdf = await loadingTask.promise;

    let extractedText = "";
    for (let i = 0; i < pdf.numPages; i++) {
      const page = await pdf.getPage(i + 1);
      const content = await page.getTextContent();
      const textItems = content.items.map((item) => item.str).join(" ");
      extractedText += textItems + "\n";
    }

    console.log("Texto extraído:", extractedText);

    // Aquí puedes procesar el texto extraído y analizar las unidades
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
