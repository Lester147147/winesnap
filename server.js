import express from "express";
import multer from "multer";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype))
});

app.use(express.static("public", { extensions: ["html"] }));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/identify", upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Please choose a clear JPG, PNG or WebP bottle photo." });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "WineSnap is not connected to its AI service yet." });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "Identify this wine from the visible label. Return only valid JSON. Never invent an exact vintage, score, price or review count if it is not visible or reliably inferable. Use null or an honest range. Include: name, producer, vintage, wine_type, country, region, grapes (array), alcohol, style, tasting_notes (array), food_pairings (array), serving_temperature, drinking_window, typical_price_gbp, critic_rating_summary, confidence (high/medium/low), caveat." },
          { type: "input_image", image_url: image, detail: "high" }
        ]
      }],
      text: { format: { type: "json_object" } }
    });
    const result = JSON.parse(response.output_text);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "I couldn't identify that bottle. Try a closer, brighter label photo." });
  }
});

app.use((err, _req, res, _next) => {
  if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "That image is larger than 8 MB." });
  res.status(400).json({ error: err?.message || "The image could not be processed." });
});

app.listen(port, () => console.log(`WineSnap listening on ${port}`));
