import multer from "multer";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import { promisify } from "util";
import cors from "cors";

const unlinkAsync = promisify(fs.unlink);

// Configurar Multer para manejar la subida de archivos
const upload = multer({
  dest: "/tmp", // Vercel recomienda usar /tmp para almacenamiento temporal
  limits: { fileSize: 50 * 1024 * 1024 }, // Limitar a 50MB
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
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
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    // Fragmentar el texto en líneas y eliminar líneas vacías
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

    let unidades_rotas_encontradas = [];
    let unidades_duras_encontradas = [];
    let puntuacion = 0;

    // Definir las unidades
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

    // Eliminar el archivo temporal
    await unlinkAsync(filePath);

    // Enviar el objeto como respuesta
    res.status(200).json(resultados);
  } catch (error) {
    console.error("Error al procesar el archivo:", error);
    res.status(500).json({ error: "Error al procesar el archivo" });
  }
}
