async function analyzeInput() {
  const resultElement = document.getElementById("result");
  const text = document
    .getElementById("userInput")
    .value
    .trim()
    .toLowerCase();

  if (!text) {
    resultElement.textContent = "Please enter a search term.";
    return;
  }

  try {
    const response = await fetch("./data/paint.json");

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
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
        paint.my_notes
      ];

      const searchableText = searchableValues
        .flat()
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(text);
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
            <h3>${name}</h3>
            <p><strong>Brand:</strong> ${brand}</p>
            <p><strong>Pigment:</strong> ${pigments}</p>
            <p><strong>Notes:</strong> ${paint.my_notes ?? "No notes available."}</p>
          </article>
        `;
      })
      .join("");
  } catch (error) {
    console.error(error);
    resultElement.textContent = "Could not load paint data.";
  }
}

document
  .getElementById("analyzeButton")
  .addEventListener("click", analyzeInput);
