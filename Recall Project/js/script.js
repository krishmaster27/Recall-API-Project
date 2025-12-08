script.js

document.addEventListener('DOMContentLoaded', () => {
  const checkBtn = document.getElementById('checkBtn');
  const productInput = document.getElementById('productName');
  const resultDiv = document.getElementById('result');
  var foodDetected = [,];

  // javascript for AI model will be here
  // it will return a word
  // foodDetected = whatever is returned by the AI model
  // you would access foodDetected[0]


  checkBtn.addEventListener('click', async () => {
    const query = productInput.value.trim().toLowerCase();

    if (!query) {
      resultDiv.textContent = "Please enter a product name or keyword.";
      return;
    }

    resultDiv.textContent = "Searching for recalls…";

    try {
      // FSIS API requires at least one filter (docs)
      const baseUrl = "https://www.fsis.usda.gov/fsis/api/recall/v/1?";
      
      const params = new URLSearchParams({
        field_closed_year_id: "All",  // Required for broad query
        langcode: "English"           // Optional parameter
      });

      const url = baseUrl + params.toString();

      console.log("Request URL:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`FSIS API request failed: ${response.status}`);
      }

      const data = await response.json();

      // Search across multiple fields for user query
      const matches = data.filter(item => {
        const searchableText = [
          item.field_title,
          item.field_establishment,
          item.field_product_items,
          item.field_summary,
          item.field_labels
        ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

        return searchableText.includes(query);
      });

      // Output
      if (matches.length === 0) {
        resultDiv.innerHTML =
          `<span class="not-recalled">No FSIS recalls found for "<strong>${query}</strong>".</span>`;
      } else {
        resultDiv.innerHTML =
          `<span class="recalled">Found ${matches.length} recall(s) for "<strong>${query}</strong>":</span>`;

        const list = document.createElement("ul");

        matches.forEach(rec => {
          const li = document.createElement("li");
          li.innerHTML = `
            <strong>${rec.field_title}</strong><br>
            <strong>Recall #:</strong> ${rec.field_recall_number || "N/A"}<br>
            <strong>Date:</strong> ${rec.field_recall_date || "N/A"}<br>
            <strong>Reason:</strong> ${rec.field_recall_reason || "N/A"}<br>
            <strong>Products:</strong> ${rec.field_product_items || "N/A"}<br>
            <strong>Classification:</strong> ${rec.field_recall_classification || "N/A"}
          `;
          list.appendChild(li);
        });

        resultDiv.appendChild(list);
      }

    } catch (err) {
      console.error("Error fetching FSIS API:", err);
      resultDiv.textContent = `Error: ${err.message}`;
    }
  });
});
