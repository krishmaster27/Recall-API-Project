const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = 3000;

const CLARIFAI_API_KEY = "3322dba4bf694fd99b8065d57fba6494";
const MODEL_ID = "food-item-recognition";
const MODEL_VERSION = "1d5fd481e0cf4826aa72ec3ff049e044";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve static files (like script.js, css, images)
app.use(express.static(__dirname));

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// POST endpoint for Clarifai
app.post("/detect-food", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    const base64Image = req.file.buffer.toString("base64");

    const clarifaiResponse = await fetch(
      `https://api.clarifai.com/v2/models/${MODEL_ID}/versions/${MODEL_VERSION}/outputs`,
      {
        method: "POST",
        headers: {
          "Authorization": `Key ${CLARIFAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: [
            { data: { image: { base64: base64Image } } }
          ]
        })
      }
    );

    if (!clarifaiResponse.ok) {
      const text = await clarifaiResponse.text();
      console.error("Clarifai API error:", text);
      return res.status(clarifaiResponse.status).send(text);
    }

    const data = await clarifaiResponse.json();
    const concepts = data.outputs[0].data.concepts;

    res.json({
      top_food: concepts[0].name,
      confidence: concepts[0].value
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
