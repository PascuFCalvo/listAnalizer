import multer from "multer";
import fs from "fs";
import { promisify } from "util";
import { PDFDocument } from "pdf-lib";

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
    console.log("Archivo subido en ruta:", filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error("El archivo no existe en la ruta especificada");
    }

    // Cargar el archivo PDF usando pdf-lib
    const dataBuffer = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(dataBuffer);

    // Obtener algunas propiedades del PDF
    const numPages = pdfDoc.getPageCount();
    const title = pdfDoc.getTitle() || "Sin título";
    const author = pdfDoc.getAuthor() || "Desconocido";

    console.log(`PDF cargado: ${title} por ${author}`);
    console.log(`Número de páginas: ${numPages}`);

    // Aquí puedes realizar cualquier manipulación adicional del PDF

    // Ejemplo de manipulación: Añadir una nueva página
    const page = pdfDoc.addPage([600, 400]);
    page.drawText("Esta es una nueva página agregada al PDF", {
      x: 50,
      y: 350,
      size: 25,
    });

    // Guardar los cambios en el archivo PDF
    const pdfBytes = await pdfDoc.save();

    // Establecer encabezados para descargar el PDF
    res.setHeader("Content-Disposition", 'attachment; filename="modified.pdf"');
    res.setHeader("Content-Type", "application/pdf");

    // Enviar el archivo PDF
    res.status(200).send(Buffer.from(pdfBytes));

    // Eliminar el archivo temporal
    await unlinkAsync(filePath);
  } catch (error) {
    console.error("Error al procesar el archivo:", error);
    res
      .status(500)
      .json({ error: `Error al procesar el archivo: ${error.message}` });
  }
}
