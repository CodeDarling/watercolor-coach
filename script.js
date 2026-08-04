function normalizeText(value) {
  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function analyzeInput() {
  const resultElement = document.getElementById("result");
  const inputElement = document.getElementById("userInput");

  const normalizedSearch = normalizeText(inputElement.value);

  if (!normalizedSearch) {
    resultElement.textContent = "Please enter a search term.";
    return;
  }

  const searchTerms = normalizedSearch.split(" ").filter(Boolean);

  try {
    resultElement.textContent = "Searching...";

    const response = await fetch("./data/paint.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `Could not load JSON. HTTP status: ${response.status}`
      );
    }

    const paints = await response.json();

    const matches = paints.filter((paint) => {
      const searchableValues = [
        paint.paint_name,
        paint.paint_id,
        paint.paint_brand,
        paint.paint_pigments,
        paint.paint_color_family,
        paint.paint_hue_bias,
        paint.paint_temperature,
        paint.paint_opacity,
        paint.paint_optical_role,
        paint.my_paint_subjects,
        paint.my_paint_purpose,
        paint.mix_with,
        paint.my_best_techniques,
        paint.my_recommended_paper,
        paint.paint_aliases,
        paint.ai_keywords,
        paint.my_notes,
        paint.content
      ];

      const normalizedData = normalizeText(
        searchableValues
          .flat(Infinity)
          .filter((value) => value !== null && value !== undefined)
          .join(" ")
      );

      const dataTerms = new Set(
        normalizedData.split(" ").filter(Boolean)
      );

      return searchTerms.every((term) => dataTerms.has(term));
    });

    if (matches.length === 0) {
      resultElement.textContent = "No matching paints found.";
      return;
    }

    resultElement.innerHTML = matches
      .map((paint) => {
        const name = Array.isArray(paint.paint_name)
          ? paint.paint_name.join(", ")
          : paint.paint_name;

        const brand = Array.isArray(paint.paint_brand)
          ? paint.paint_brand.join(", ")
          : paint.paint_brand;

        const pigments = Array.isArray(paint.paint_pigments)
          ? paint.paint_pigments.join(", ")
          : paint.paint_pigments;

        return `
          <article>
            <h3>${name || "Unnamed paint"}</h3>
            <p><strong>Brand:</strong> ${brand || "Unknown"}</p>
            <p><strong>Pigment:</strong> ${pigments || "Unknown"}</p>
            <p><strong>Notes:</strong> ${
              paint.my_notes || "No notes available."
            }</p>
          </article>
        `;
      })
      .join("");

  } catch (error) {
    console.error("Search error:", error);
    resultElement.textContent =
      "Could not load paint data. Check the browser console.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const analyzeButton = document.getElementById("analyzeButton");

  if (analyzeButton) {
    analyzeButton.addEventListener("click", analyzeInput);
  }
});
