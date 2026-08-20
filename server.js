import express from "express";
import multer from "multer";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;
const defaultModel = "gpt-5-mini";
const configuredModel = process.env.OPENAI_MODEL?.trim();
const model = configuredModel && !["OPENAI_MODEL", "gpt-5.4-mini"].includes(configuredModel) ? configuredModel : defaultModel;
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
    const identifyWithModel = selectedModel => client.responses.create({
      model: selectedModel,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "Read the front label carefully before identifying the wine. First transcribe the producer, cuvee/wine name, vintage or NV, classification/style, and place exactly as printed. Use those words together to identify the bottle; do not identify objects or bottles in the background. For this task, NV means non-vintage and is valid label evidence. Never invent an exact vintage, score, price or review count. Use null or an honest range for details that are not visible or reliably known." },
          { type: "input_image", image_url: image, detail: "high" }
        ]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "wine_identification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: { type: ["string", "null"] }, producer: { type: ["string", "null"] },
              vintage: { type: ["string", "null"] }, wine_type: { type: ["string", "null"] },
              country: { type: ["string", "null"] }, region: { type: ["string", "null"] },
              grapes: { type: "array", items: { type: "string" } }, alcohol: { type: ["string", "null"] },
              style: { type: ["string", "null"] }, tasting_notes: { type: "array", items: { type: "string" } },
              food_pairings: { type: "array", items: { type: "string" } }, serving_temperature: { type: ["string", "null"] },
              drinking_window: { type: ["string", "null"] }, typical_price_gbp: { type: ["string", "null"] },
              critic_rating_summary: { type: ["string", "null"] }, confidence: { type: "string", enum: ["high", "medium", "low"] },
              caveat: { type: ["string", "null"] }
            },
            required: ["name", "producer", "vintage", "wine_type", "country", "region", "grapes", "alcohol", "style", "tasting_notes", "food_pairings", "serving_temperature", "drinking_window", "typical_price_gbp", "critic_rating_summary", "confidence", "caveat"],
            additionalProperties: false
          }
        }
      },
      max_output_tokens: 3000
    });
    let response;
    try {
      response = await identifyWithModel(model);
    } catch (error) {
      const modelUnavailable = error?.status === 404 || error?.code === "model_not_found";
      if (!modelUnavailable || model === "gpt-5-mini") throw error;
      console.warn(`Model ${model} is unavailable; retrying with gpt-5-mini.`);
      response = await identifyWithModel("gpt-5-mini");
    }
    if (!response.output_text) throw new Error("OpenAI returned no wine identification text.");
    const result = JSON.parse(response.output_text);

    try {
      const wineQuery = [result.producer, result.name, result.vintage, result.region, result.country].filter(Boolean).join(" ");
      const research = await client.chat.completions.create({
        model: "gpt-5-search-api",
        web_search_options: { search_context_size: "medium" },
        messages: [{ role: "user", content: `Research this exact wine: ${wineQuery}. Find current, verifiable information from the producer, reputable wine merchants, professional critics and established wine communities. Do not transfer a rating from a different cuvee or vintage. For an NV wine, NV ratings are acceptable. Include only ratings and reviews that have a direct source URL. Summarise rather than quote reviews. Use null or empty arrays when a fact cannot be verified. Prices should be typical current UK bottle prices, not case prices. Return only the requested JSON.` }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "wine_research",
            strict: true,
            schema: {
              type: "object",
              properties: {
                grapes: { type: "array", items: { type: "string" } },
                alcohol: { type: ["string", "null"] },
                tasting_notes: { type: "array", items: { type: "string" } },
                food_pairings: { type: "array", items: { type: "string" } },
                serving_temperature: { type: ["string", "null"] },
                drinking_window: { type: ["string", "null"] },
                typical_price_gbp: { type: ["string", "null"] },
                rating_summary: { type: ["string", "null"] },
                ratings: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { source: { type: "string" }, rating: { type: "string" }, url: { type: "string" } },
                    required: ["source", "rating", "url"], additionalProperties: false
                  }
                },
                reviews: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { source: { type: "string" }, summary: { type: "string" }, url: { type: "string" } },
                    required: ["source", "summary", "url"], additionalProperties: false
                  }
                },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { title: { type: "string" }, url: { type: "string" } },
                    required: ["title", "url"], additionalProperties: false
                  }
                }
              },
              required: ["grapes", "alcohol", "tasting_notes", "food_pairings", "serving_temperature", "drinking_window", "typical_price_gbp", "rating_summary", "ratings", "reviews", "sources"],
              additionalProperties: false
            }
          }
        },
        max_completion_tokens: 3500
      }, { timeout: 45000 });
      const researchText = research.choices?.[0]?.message?.content;
      if (researchText) {
        const verified = JSON.parse(researchText);
        for (const key of ["grapes", "tasting_notes", "food_pairings"]) {
          if (verified[key]?.length) result[key] = verified[key];
        }
        for (const key of ["alcohol", "serving_temperature", "drinking_window", "typical_price_gbp"]) {
          if (verified[key]) result[key] = verified[key];
        }
        result.critic_rating_summary = verified.rating_summary;
        result.ratings = verified.ratings;
        result.reviews = verified.reviews;
        result.sources = verified.sources;
      }
    } catch (researchError) {
      console.error("Wine research failed", { status: researchError?.status, code: researchError?.code, message: researchError?.message });
      result.ratings = [];
      result.reviews = [];
      result.sources = [];
      result.research_caveat = "Live reviews and ratings were temporarily unavailable.";
    }
    res.json(result);
  } catch (error) {
    console.error("Wine identification failed", { model, status: error?.status, code: error?.code, message: error?.message });
    const configurationError = error?.status === 401 || error?.status === 403 || error?.status === 404 || error?.code === "model_not_found";
    res.status(502).json({ error: configurationError ? "WineSnap's AI connection needs checking. Please try again shortly." : "I couldn't identify that bottle. Try a closer, brighter label photo." });
  }
});

app.use((err, _req, res, _next) => {
  if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "That image is larger than 8 MB." });
  res.status(400).json({ error: err?.message || "The image could not be processed." });
});

app.listen(port, () => console.log(`WineSnap listening on ${port}`));
