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
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  ) {
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


/*
 * Highlight ordinary metadata values
 */
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


/*
 * Render Markdown-style content from Obsidian.
 *
 * Supports:
 * # Heading
 * ## Heading
 * ### Heading
 * **Bold text**
 * - Bullet points
 * * Bullet points
 * Paragraph breaks
 */
function renderMarkdown(value, searchTerms) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  let text = escapeHtml(String(value));


  /*
   * Markdown headings
   */
  text = text.replace(
    /^### (.+)$/gm,
    "<h3>$1</h3>"
  );

  text = text.replace(
    /^## (.+)$/gm,
    "<h2>$1</h2>"
  );

  text = text.replace(
    /^# (.+)$/gm,
    "<h1>$1</h1>"
  );


  /*
   * Bold Markdown
   */
  text = text.replace(
    /\*\*(.+?)\*\*/g,
    "<strong>$1</strong>"
  );


  /*
   * Markdown bullet points
   */
  text = text.replace(
    /^\s*[-*] (.+)$/gm,
    "<li>$1</li>"
  );


  /*
   * Group consecutive list items
   */
  text = text.replace(
    /(?:<li>.*?<\/li>\s*)+/gs,
    (match) => `<ul>${match}</ul>`
  );


  /*
   * Separate text into readable blocks
   */
  const blocks = text
    .split(/\n\s*\n/)
    .filter((block) => block.trim() !== "");


  text = blocks
    .map((block) => {
      const trimmedBlock = block.trim();

      if (
        trimmedBlock.startsWith("<h1>") ||
        trimmedBlock.startsWith("<h2>") ||
        trimmedBlock.startsWith("<h3>") ||
        trimmedBlock.startsWith("<ul>")
      ) {
        return trimmedBlock;
      }

      return `
        <p>
          ${trimmedBlock.replace(/\n/g, "<br>")}
        </p>
      `;
    })
    .join("");


  /*
   * Highlight search terms
   */
  const uniqueTerms = [...new Set(searchTerms)]
    .sort((first, second) => second.length - first.length);

  for (const term of uniqueTerms) {
    const escapedTerm = escapeRegExp(term);

    const pattern = new RegExp(
      `(^|[^a-z0-9æøå])(${escapedTerm})(?=[^a-z0-9æøå]|$)`,
      "gi"
    );

    text = text.replace(
      pattern,
      "$1<mark>$2</mark>"
    );
  }


  return text;
}


function getFieldWords(value) {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter(Boolean)
  );
}


function createClickableReferences(references) {
  if (!references) {
    return "No external references available.";
  }

  const referenceList = Array.isArray(references)
    ? references
    : [references];

  const validReferences = referenceList
    .map((reference) => String(reference).trim())
    .filter(
      (reference) =>
        reference &&
        reference !== '""'
    );

  if (validReferences.length === 0) {
    return "No external references available.";
  }

  return validReferences
    .map((reference, index) => {
      const safeUrl = escapeHtml(reference);

      return `
        <a
          href="${safeUrl}"
          target="_blank"
          rel="noopener noreferrer"
        >
          External reference ${index + 1}
        </a>
      `;
    })
    .join("<br>");
}


function findMatches(
  entries,
  searchTerms,
  useExtendedSearch,
  type
) {
  return entries
    .map((entry) => {

      let structuredFields;
      let extendedFields;


      /*
       * PAINT SEARCH FIELDS
       */
      if (type === "paint") {
        structuredFields = {
          "Paint name": entry.paint_name,
          "Paint ID": entry.paint_id,
          "Brand": entry.paint_brand,
          "Pigments": entry.paint_pigments,
          "Color family": entry.paint_color_family,
          "Hue bias": entry.paint_hue_bias,
          "Temperature": entry.paint_temperature,
          "Opacity": entry.paint_opacity,
          "Optical role": entry.paint_optical_role,
          "Subjects": entry.my_paint_subjects,
          "Purpose": entry.my_paint_purpose,
          "Techniques": entry.my_best_techniques,
          "Recommended paper": entry.my_recommended_paper,
          "Aliases": entry.paint_aliases
        };

        extendedFields = {
          "Subject and mood": entry.ai_keywords,
          "Personal notes": entry.my_notes,
          "Best mixes": entry.mix_with,
          "Full content": entry.content,
          "Manufacturer description":
            entry.ext_manufacturer_description
        };
      }


      /*
       * SUBJECT SEARCH FIELDS
       */
      if (type === "subject") {
        structuredFields = {
          "Subject name": entry.subject_name,
          "Subject ID": entry.subject_id,
          "Related subjects": entry.my_paint_subjects,
          "Purpose": entry.my_paint_purpose,
          "Difficulty": entry.subject_difficulty,
          "Recommended brushes":
            entry.my_recommended_brushes,
          "Recommended paper":
            entry.my_recommended_paper
        };

        extendedFields = {
          "Related keywords": entry.ai_keywords,
          "Personal notes": entry.my_notes,
          "Recommended paints and mixes":
            entry.mix_with,
          "Full painting guide": entry.content
        };
      }


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
       * AND SEARCH
       *
       * Every entered word must exist somewhere
       * inside the same record.
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
        entry,
        type,
        matchedFields
      };
    })
    .filter(Boolean);
}


function renderPaintResult(
  paint,
  matchedFields,
  searchTerms
) {
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

  const content = renderMarkdown(
    paint.content ||
      "No full note content available.",
    searchTerms
  );

  const aiKeywords = highlightText(
    paint.ai_keywords ||
      "No AI keywords available.",
    searchTerms
  );

  const mixes = highlightText(
    paint.mix_with ||
      "No mixes registered.",
    searchTerms
  );

  const matchedFieldList = matchedFields
    .map(
      (field) =>
        `<li>${escapeHtml(field)}</li>`
    )
    .join("");


  return `
    <article class="paint-result">

      <p class="result-type">
        PAINT
      </p>

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
        <summary>
          Show all information
        </summary>

        <div class="entry-details">

          <h3>
            Personal notes
          </h3>

          <div class="note-content">
            ${content}
          </div>

          <h3>
            Related keywords and emotional characteristics
          </h3>

          <p>
            ${aiKeywords}
          </p>

          <h3>
            Best mixes for this color
          </h3>

          <p>
            ${mixes}
          </p>

        </div>
      </details>

    </article>
  `;
}


function renderSubjectResult(
  subject,
  matchedFields,
  searchTerms
) {
  const name = highlightText(
    subject.subject_name ||
      subject.subject_id ||
      "Unnamed subject",
    searchTerms
  );

  const difficulty = highlightText(
    subject.subject_difficulty,
    searchTerms
  );

  const brushes = highlightText(
    subject.my_recommended_brushes,
    searchTerms
  );

  const paper = highlightText(
    subject.my_recommended_paper,
    searchTerms
  );

  const notes = highlightText(
    subject.my_notes ||
      "No personal notes available.",
    searchTerms
  );

  const mixes = highlightText(
    subject.mix_with ||
      "No paints registered.",
    searchTerms
  );

  const keywords = highlightText(
    subject.ai_keywords ||
      "No related keywords available.",
    searchTerms
  );

  const content = renderMarkdown(
    subject.content ||
      "No painting guide available.",
    searchTerms
  );

  const references =
    createClickableReferences(
      subject.ext_references
    );

  const matchedFieldList = matchedFields
    .map(
      (field) =>
        `<li>${escapeHtml(field)}</li>`
    )
    .join("");


  return `
    <article class="subject-result">

      <p class="result-type">
        PAINTING SUBJECT
      </p>

      <h2>
        ${name}
      </h2>

      <p>
        <strong>Difficulty:</strong>
        ${difficulty}
      </p>

      <p>
        <strong>Recommended brushes:</strong>
        ${brushes}
      </p>

      <p>
        <strong>Recommended paper:</strong>
        ${paper}
      </p>

      <p>
        <strong>Personal observations:</strong>
        ${notes}
      </p>

      <div class="match-evidence">

        <strong>
          Why this matches your search:
        </strong>

        <ul>
          ${matchedFieldList}
        </ul>

      </div>

      <details>

        <summary>
          Show painting guide and all information
        </summary>

        <div class="entry-details">

          <h3>
            How to paint this subject
          </h3>

          <div class="note-content">
            ${content}
          </div>

          <h3>
            Recommended paints and mixes
          </h3>

          <p>
            ${mixes}
          </p>

          <h3>
            Related keywords
          </h3>

          <p>
            ${keywords}
          </p>

          <h3>
            External references
          </h3>

          <p>
            ${references}
          </p>

        </div>

      </details>

    </article>
  `;
}


/*
 * Create clickable result-category navigation
 *
 * Only categories that actually contain matches
 * are shown.
 */
function createResultNavigation(
  subjectCount,
  paintCount
) {
  const links = [];


  if (subjectCount > 0) {
    links.push(`
      <a
        class="result-category-link"
        href="#subject-results"
      >
        Painting subjects
        <span class="result-category-count">
          ${subjectCount}
        </span>
      </a>
    `);
  }


  if (paintCount > 0) {
    links.push(`
      <a
        class="result-category-link"
        href="#paint-results"
      >
        Paints
        <span class="result-category-count">
          ${paintCount}
        </span>
      </a>
    `);
  }


  if (links.length === 0) {
    return "";
  }


  return `
    <nav
      class="result-category-nav"
      aria-label="Search result categories"
    >
      ${links.join("")}
    </nav>
  `;
}


async function analyzeInput() {
  const resultElement =
    document.getElementById("result");

  const inputElement =
    document.getElementById("userInput");

  const extendedSearchElement =
    document.getElementById(
      "extendedSearch"
    );


  const normalizedSearch =
    normalizeText(inputElement.value);


  if (!normalizedSearch) {
    resultElement.textContent =
      "Please enter a search term.";

    return;
  }


  const searchTerms = normalizedSearch
    .split(" ")
    .filter(Boolean);


  try {
    resultElement.textContent =
      "Searching...";


    /*
     * Load both databases at the same time
     */
    const [
      paintResponse,
      subjectResponse
    ] = await Promise.all([

      fetch("./data/paint.json", {
        cache: "no-store"
      }),

      fetch("./data/subjects.json", {
        cache: "no-store"
      })

    ]);


    if (!paintResponse.ok) {
      throw new Error(
        `Could not load paint.json. HTTP status: ${paintResponse.status}`
      );
    }


    if (!subjectResponse.ok) {
      throw new Error(
        `Could not load subjects.json. HTTP status: ${subjectResponse.status}`
      );
    }


    const paints =
      await paintResponse.json();

    const subjects =
      await subjectResponse.json();


    const useExtendedSearch =
      extendedSearchElement.checked;


    const paintMatches = findMatches(
      paints,
      searchTerms,
      useExtendedSearch,
      "paint"
    );


    const subjectMatches = findMatches(
      subjects,
      searchTerms,
      useExtendedSearch,
      "subject"
    );


    if (
      paintMatches.length === 0 &&
      subjectMatches.length === 0
    ) {
      resultElement.textContent =
        "No matching paints or painting subjects found.";

      return;
    }


    let resultHtml = "";


    /*
     * CATEGORY NAVIGATION
     */
    resultHtml += createResultNavigation(
      subjectMatches.length,
      paintMatches.length
    );


    /*
     * SUBJECT RESULTS
     */
    if (subjectMatches.length > 0) {
      resultHtml += `
        <section
          class="subject-results"
          id="subject-results"
        >

          <h2 class="result-section-title">
            Painting subjects
            (${subjectMatches.length})
          </h2>

          ${subjectMatches
            .map(({ entry, matchedFields }) =>
              renderSubjectResult(
                entry,
                matchedFields,
                searchTerms
              )
            )
            .join("")}

        </section>
      `;
    }


    /*
     * PAINT RESULTS
     */
    if (paintMatches.length > 0) {
      resultHtml += `
        <section
          class="paint-results"
          id="paint-results"
        >

          <h2 class="result-section-title">
            Paints
            (${paintMatches.length})
          </h2>

          ${paintMatches
            .map(({ entry, matchedFields }) =>
              renderPaintResult(
                entry,
                matchedFields,
                searchTerms
              )
            )
            .join("")}

        </section>
      `;
    }


    resultElement.innerHTML =
      resultHtml;


  } catch (error) {

    console.error(
      "Search error:",
      error
    );

    resultElement.textContent =
      "Could not load data. Check the browser console.";
  }
}


document.addEventListener(
  "DOMContentLoaded",
  () => {

    const analyzeButton =
      document.getElementById(
        "analyzeButton"
      );

    const inputElement =
      document.getElementById(
        "userInput"
      );


    analyzeButton.addEventListener(
      "click",
      analyzeInput
    );


    inputElement.addEventListener(
      "keydown",
      (event) => {

        if (event.key === "Enter") {
          analyzeInput();
        }

      }
    );

  }
);
