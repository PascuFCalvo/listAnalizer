import express from "express";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import pdfParse from "pdf-parse";
import cors from "cors";
import serverless from "serverless-http";
import { __dirname } from "./paths.js";

// Configura dotenv para manejar variables de entorno
dotenv.config();

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

// Crear la carpeta "uploads" si no existe
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

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

// Configurar Multer para manejar la subida de archivos
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 50 * 1024 * 1024 }, // Limitar a 50MB
});

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, "public")));

// Ruta para subir y procesar archivos PDF
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No se ha subido ningún archivo");
    }

    // Leer el archivo PDF
    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    // Fragmentar el texto en líneas y eliminar líneas vacías
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

    let unidades_rotas_encontradas = [];
    let unidades_duras_encontradas = [];

    // Función para agregar o actualizar unidades en el array
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

    // Recorrer cada línea en busca de unidades
    lines.forEach((line, index) => {
      // Verificar unidades rotas
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
              puntuacion += 5; // Unidad rota reforzada
              break;
            }
          }

          if (!isReinforced) {
            puntuacion += 3; // Unidad rota no reforzada
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

      // Verificar unidades duras
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
              puntuacion += 2; // Unidad dura reforzada
              break;
            }
          }

          if (!isReinforced) {
            puntuacion += 1; // Unidad dura no reforzada
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

    // Crear un objeto que contenga todos los resultados
    const resultados = {
      unidades_rotas_encontradas,
      unidades_duras_encontradas,
      puntuacion,
      equipo_peligroso:
        unidades_rotas_encontradas.length >= 4
          ? "Equipo peligroso - muchas unidades rotas"
          : "Equipo seguro",
    };

    // Loguear el objeto completo
    console.log(resultados);

    // Resetear puntuación para futuras llamadas
    puntuacion = 0;

    // Enviar el objeto como respuesta
    res.json(resultados);
  } catch (error) {
    console.error("Error al procesar el archivo:", error);
    res.status(500).send("Error al subir el archivo");
  }
});

// Exportar la aplicación para ser usada por Netlify Functions
export const handler = serverless(app);
