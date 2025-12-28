import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

/* ------------ CLARIFAI CONFIG ------------ */
const CLARIFAI_API_KEY = "3322dba4bf694fd99b8065d57fba6494"; // 
const USER_ID = "clarifai";
const APP_ID = "main";
const MODEL_ID = "food-item-recognition";
const MODEL_VERSION = "1d5fd481e0cf4826aa72ec3ff049e044";
/* ---------------------------------------- */

const upload = multer({ storage: multer.memoryStorage() });

// Serve static files
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* ---------- CLARIFAI FOOD DETECTION ---------- */
app.post("/detect-food", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const base64Image = req.file.buffer.toString("base64");

    const response = await fetch(
      `https://api.clarifai.com/v2/models/${MODEL_ID}/versions/${MODEL_VERSION}/outputs`,
      {
        method: "POST",
        headers: {
          "Authorization": `Key ${CLARIFAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_app_id: {
            user_id: USER_ID,
            app_id: APP_ID
          },
          inputs: [
            {
              data: {
                image: { base64: base64Image }
              }
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Clarifai error:", text);
      return res.status(500).json({ error: "Clarifai request failed" });
    }

    const data = await response.json();
    const concepts = data.outputs?.[0]?.data?.concepts;

    if (!concepts || concepts.length === 0) {
      return res.status(400).json({ error: "No food detected" });
    }

    res.json({
      food: concepts[0].name,
      confidence: concepts[0].value
    });

  } catch (err) {
    console.error("Detect food error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------- USDA RECALL CHECK (SAFE) ---------- */
app.get("/check-recalls", async (req, res) => {
  const food = req.query.food;
  if (!food) {
    return res.status(400).json({ error: "Missing food query" });
  }

  const USDA_URL =
    "https://www.fsis.usda.gov/fsis/api/recall/v/1?field_closed_year_id=All&langcode=English";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(USDA_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`USDA HTTP ${response.status}`);
    }

    const data = await response.json();
    const recalls = data.recall || [];

    const matches = recalls.filter(item => {
      const text = [
        item.field_title,
        item.field_product_items,
        item.field_summary
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(food.toLowerCase());
    });

    res.json({ recalls: matches });

  } catch (err) {
    clearTimeout(timeout);
    console.error("USDA fetch failed:", err.message);

    // Graceful fallback
    res.json({
      warning: true,
      message:
        "USDA recall database is temporarily unavailable. Please try again later.",
      recalls: []
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
