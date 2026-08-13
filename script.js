function valueToText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.flat(Infinity).join(" ");
  }

  return String(value);
}

function normalizeText(value) {
  return valueToText(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/[^a-z0-9æøå]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }

  const text = Array.isArray(value)
    ? value.flat(Infinity).join(", ")
    : String(value);

  return text
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function highlightText(value, searchTerms) {
  let highlightedText = escapeHtml(formatValue(value));

  const uniqueTerms = [...new Set(searchTerms)]
    .sort((first, second) => second.length - first.length);

  for (const term of uniqueTerms) {
    const escapedTerm = escapeRegExp(term);

    const pattern = new RegExp(
      `(^|[^a-z0-9æøå])(${escapedTerm})(?=[^a-z0-9æøå]|$)`,
      "gi"
    );

    highlightedText = highlightedText.replace(
      pattern,
      "$1<mark>$2</mark>"
    );
  }

  return highlightedText;
}

function getFieldWords(value) {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter(Boolean)
  );
}

async function analyzeInput() {
  const resultElement = document.getElementById("result");
  const inputElement = document.getElementById("userInput");
  const extendedSearchElement =
    document.getElementById("extendedSearch");

  const normalizedSearch = normalizeText(inputElement.value);

  if (!normalizedSearch) {
    resultElement.textContent = "Please enter a search term.";
    return;
  }

  const searchTerms = normalizedSearch
    .split(" ")
    .filter(Boolean);

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
    const useExtendedSearch = extendedSearchElement.checked;

    const matches = paints
      .map((paint) => {
        /*
         * These fields are always included.
         * They describe the paint itself.
         */
        const structuredFields = {
          "Paint name": paint.paint_name,
          "Paint ID": paint.paint_id,
          "Brand": paint.paint_brand,
          "Pigments": paint.paint_pigments,
          "Color family": paint.paint_color_family,
          "Hue bias": paint.paint_hue_bias,
          "Temperature": paint.paint_temperature,
          "Opacity": paint.paint_opacity,
          "Optical role": paint.paint_optical_role,
          "Subjects": paint.my_paint_subjects,
          "Purpose": paint.my_paint_purpose,
          "Techniques": paint.my_best_techniques,
          "Recommended paper": paint.my_recommended_paper,
          "Aliases": paint.paint_aliases
        };

        /*
         * These fields are only included when the checkbox is selected.
         * They contain broader associations, relations and free text.
         */
        const extendedFields = {
          "Subject and mood": paint.ai_keywords,
          "personal notes": paint.my_notes,
          "best mixes": paint.mix_with,
          "personal notes": paint.content,
          "manufacturer description":
            paint.ext_manufacturer_description
        };

        const searchFields = useExtendedSearch
          ? { ...structuredFields, ...extendedFields }
          : structuredFields;

        const preparedFields = Object.entries(searchFields)
          .map(([label, value]) => ({
            label,
            value,
            words: getFieldWords(value)
          }));

        /*
         * AND search:
         * Every entered word must appear somewhere in the same paint entry.
         * The words do not have to occur in the same metadata field.
         */
        const isMatch = searchTerms.every((term) =>
          preparedFields.some((field) =>
            field.words.has(term)
          )
        );

        if (!isMatch) {
          return null;
        }

        const matchedFields = preparedFields
          .filter((field) =>
            searchTerms.some((term) =>
              field.words.has(term)
            )
          )
          .map((field) => field.label);

        return {
          paint,
          matchedFields
        };
      })
      .filter(Boolean);

    if (matches.length === 0) {
      resultElement.textContent = "No matching paints found.";
      return;
    }

    resultElement.innerHTML = matches
      .map(({ paint, matchedFields }) => {
        const name = highlightText(
          paint.paint_name || "Unnamed paint",
          searchTerms
        );

        const brand = highlightText(
          paint.paint_brand || "Unknown",
          searchTerms
        );

        const pigments = highlightText(
          paint.paint_pigments || "Unknown",
          searchTerms
        );

        const notes = highlightText(
          paint.my_notes || "No notes available.",
          searchTerms
        );

        const content = highlightText(
          paint.content || "No full note content available.",
          searchTerms
        );

        const aiKeywords = highlightText(
          paint.ai_keywords || "No AI keywords available.",
          searchTerms
        );

        const mixes = highlightText(
          paint.mix_with || "No mixes registered.",
          searchTerms
        );

        const matchedFieldList = matchedFields
          .map((field) => `<li>${escapeHtml(field)}</li>`)
          .join("");

        return `
          <article class="paint-result">
            <h2>${name}</h2>

            <p>
              <strong>Brand:</strong>
              ${brand}
            </p>

            <p>
              <strong>Pigment:</strong>
              ${pigments}
            </p>

            <p>
              <strong>Personal observations:</strong>
              ${notes}
            </p>

            <div class="match-evidence">
              <strong>Why this matches your search:</strong>
              <ul>
                ${matchedFieldList}
              </ul>
            </div>

            <details>
              <summary>Show all information</summary>

              <div class="entry-details">
                <h3>Personal notes</h3>
                <p class="note-content">${content}</p>

                <h3>Related keywords and emotional characteristics</h3>
                <p>${aiKeywords}</p>

                <h3>Best mixes for this color</h3>
                <p>${mixes}</p>
              </div>
            </details>
          </article>
        `;
      })
      .join("");

  } catch (error) {
    console.error("Search error:", error);

    resultElement.textContent =
      "Could not load data. Check the browser console.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const analyzeButton =
    document.getElementById("analyzeButton");

  const inputElement =
    document.getElementById("userInput");

  analyzeButton.addEventListener("click", analyzeInput);

  inputElement.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      analyzeInput();
    }
  });
});
