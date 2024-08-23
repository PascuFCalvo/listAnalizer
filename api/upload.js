import multer from "multer";
import fs from "fs";
import pdfParse from "pdf-parse";
import { promisify } from "util";

const unlinkAsync = promisify(fs.unlink);

const upload = multer({
  dest: "/tmp",
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const config = {
  api: {
    bodyParser: false,
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

    if (!fs.existsSync(filePath)) {
      throw new Error("Archivo temporal no encontrado en /tmp");
    }

    console.log("Archivo subido:", req.file);

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    console.log("Texto extraído:", text);

    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

    let unidades_rotas_encontradas = [];
    let unidades_duras_encontradas = [];
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

    lines.forEach((line, index) => {
      unidades_rotas.forEach((unidad) => {
        const regex = new RegExp(unidad, "gi");
        if (line.match(regex)) {
          let isReinforced = false;

          for (let i = 1; i <= 1; i++) {
            const nextLine = lines[index + i]
              ? lines[index + i].toLowerCase()
              : "";
            if (
              nextLine.includes("reinforced") ||
              nextLine.includes("reforzada")
            ) {
              isReinforced = true;
              puntuacion += 5;
              break;
            }
          }

          if (!isReinforced) {
            puntuacion += 3;
          }

          agregarOActualizarUnidad(
            unidades_rotas_encontradas,
            isReinforced ? `${unidad} - reforzada` : unidad,
            "S"
          );
        }
      });

      unidades_duras.forEach((unidad) => {
        const regex = new RegExp(unidad, "gi");
        if (line.match(regex)) {
          let isReinforced = false;

          for (let i = 1; i <= 1; i++) {
            const nextLine = lines[index + i]
              ? lines[index + i].toLowerCase()
              : "";
            if (
              nextLine.includes("reinforced") ||
              nextLine.includes("reforzada")
            ) {
              isReinforced = true;
              puntuacion += 2;
              break;
            }
          }

          if (!isReinforced) {
            puntuacion += 1;
          }

          agregarOActualizarUnidad(
            unidades_duras_encontradas,
            isReinforced ? `${unidad} - reforzada` : unidad,
            "A"
          );
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

    await unlinkAsync(filePath);

    res.status(200).json(resultados);
  } catch (error) {
    console.error("Error al procesar el archivo:", error);
    res
      .status(500)
      .json({ error: `Error al procesar el archivo: ${error.message}` });
  }
}
