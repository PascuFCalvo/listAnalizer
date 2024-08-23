import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import pdfParse from "pdf-parse";
import cors from "cors";
import serverless from "serverless-http";

dotenv.config();

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

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

let puntuacion = 0;

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No se ha subido ningún archivo");
    }

    const data = await pdfParse(req.file.buffer);
    const text = data.text;
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

    let unidades_rotas_encontradas = [];
    let unidades_duras_encontradas = [];

    const agregarOActualizarUnidad = (arr, nombreUnidad, tier) => {
      const unidadExistente = arr.find((u) => u.unidad === nombreUnidad);
      if (unidadExistente) {
        unidadExistente.cantidad += 1;
      } else {
        arr.push({
          tier: tier,
          unidad: nombreUnidad,
          cantidad: 1,
        });
      }
    };

    lines.forEach((line, index) => {
      unidades_rotas.forEach((unidad) => {
        const regex = new RegExp(unidad, "gi");
        if (line.match(regex)) {
          const maxLinesToCheck = 1;
          let isReinforced = false;

          for (let i = 1; i <= maxLinesToCheck; i++) {
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

          if (isReinforced) {
            agregarOActualizarUnidad(
              unidades_rotas_encontradas,
              `${unidad} - reforzada`,
              "S"
            );
          } else {
            agregarOActualizarUnidad(unidades_rotas_encontradas, unidad, "S");
          }
        }
      });

      unidades_duras.forEach((unidad) => {
        const regex = new RegExp(unidad, "gi");
        if (line.match(regex)) {
          const maxLinesToCheck = 1;
          let isReinforced = false;

          for (let i = 1; i <= maxLinesToCheck; i++) {
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

          if (isReinforced) {
            agregarOActualizarUnidad(
              unidades_duras_encontradas,
              `${unidad} - reforzada`,
              "A"
            );
          } else {
            agregarOActualizarUnidad(unidades_duras_encontradas, unidad, "A");
          }
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

    console.log(resultados);

    puntuacion = 0;

    res.json(resultados);
  } catch (error) {
    console.error("Error al procesar el archivo:", error);
    res.status(500).send("Error al subir el archivo");
  }
});

export const handler = serverless(app);
