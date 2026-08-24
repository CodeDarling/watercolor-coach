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


/*
 * Capitalize first letter only.
 * Used for ordinary metadata values.
 */
function capitalizeFirst(value) {
  const text = String(value).trim();

  if (!text) {
    return text;
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}


/*
 * Capitalize every word.
 * Primarily used for paint brands.
 */
function titleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/\b([a-zæøå])/gi, (letter) =>
      letter.toUpperCase()
    );
}


/*
 * Format ordinary metadata.
 *
 * - underscores become spaces
 * - arrays use |
 * - booleans become Yes / No
 * - first item starts with uppercase
 */
function formatValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return "Not specified";
  }


  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }


  if (Array.isArray(value)) {
    return value
      .flat(Infinity)
      .map((item) => {
        if (typeof item === "boolean") {
          return item ? "Yes" : "No";
        }

        const formattedItem = String(item)
          .replaceAll("_", " ")
          .replace(/\s+/g, " ")
          .trim();

        return capitalizeFirst(formattedItem);
      })
      .join(" | ");
  }


  const formattedText = String(value)
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();


  return capitalizeFirst(formattedText);
}


/*
 * Format brand names so every word begins
 * with a capital letter.
 */
function formatBrand(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Unknown";
  }

  const formattedText = Array.isArray(value)
    ? value.flat(Infinity).join(" | ")
    : String(value);

  return titleCase(
    formattedText
      .replaceAll("_", " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}


/*
 * Highlight already formatted text.
 */
function highlightFormattedText(
  formattedValue,
  searchTerms
) {
  let highlightedText =
    escapeHtml(formattedValue);

  const uniqueTerms = [...new Set(searchTerms)]
    .sort(
      (first, second) =>
        second.length - first.length
    );


  for (const term of uniqueTerms) {
    const escapedTerm = escapeRegExp(term);

    const pattern = new RegExp(
      `(^|[^a-z0-9æøå])(${escapedTerm})(?=[^a-z0-9æøå]|$)`,
      "gi"
    );

    highlightedText =
      highlightedText.replace(
        pattern,
        "$1<mark>$2</mark>"
      );
  }


  return highlightedText;
}


/*
 * Highlight ordinary metadata values.
 */
function highlightText(value, searchTerms) {
  return highlightFormattedText(
    formatValue(value),
    searchTerms
  );
}


/*
 * Highlight brand names.
 */
function highlightBrand(value, searchTerms) {
  return highlightFormattedText(
    formatBrand(value),
    searchTerms
  );
}


/*
 * Render Markdown-style content from Obsidian.
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

  text = text.replace(
    /\*\*(.+?)\*\*/g,
    "<strong>$1</strong>"
  );

  text = text.replace(
    /^\s*[-*] (.+)$/gm,
    "<li>$1</li>"
  );

  text = text.replace(
    /(?:<li>.*?<\/li>\s*)+/gs,
    (match) => `<ul>${match}</ul>`
  );


  const blocks = text
    .split(/\n\s*\n/)
    .filter(
      (block) =>
        block.trim() !== ""
    );


  text = blocks
    .map((block) => {
      const trimmedBlock =
        block.trim();

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


  const uniqueTerms = [...new Set(searchTerms)]
    .sort(
      (first, second) =>
        second.length - first.length
    );


  for (const term of uniqueTerms) {
    const escapedTerm =
      escapeRegExp(term);

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


function createClickableReferences(
  references
) {
  if (!references) {
    return "No external references available.";
  }


  const referenceList =
    Array.isArray(references)
      ? references
      : [references];


  const validReferences =
    referenceList
      .map(
        (reference) =>
          String(reference).trim()
      )
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
      const safeUrl =
        escapeHtml(reference);

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
       *
       * ai_keywords is intentionally NOT included.
       * It is reserved for a future LLM layer.
       */
      if (type === "paint") {
        structuredFields = {
          "Paint name": entry.paint_name,
          "Paint ID": entry.paint_id,
          "Brand": entry.paint_brand,
          "Pigments": entry.paint_pigments,
          "Color family":
            entry.paint_color_family,
          "Hue bias":
            entry.paint_hue_bias,
          "Temperature":
            entry.paint_temperature,
          "Opacity":
            entry.paint_opacity,
          "Granulation":
            entry.paint_granulation,
          "Staining":
            entry.paint_staining,
          "Luminosity":
            entry.paint_luminosity,
          "Optical role":
            entry.paint_optical_role,
          "Job title":
            entry.paint_job_title,
          "Subjects":
            entry.my_paint_subjects,
          "Purpose":
            entry.my_paint_purpose,
          "Techniques":
            entry.my_best_techniques,
          "Recommended paper":
            entry.my_recommended_paper,
          "Aliases":
            entry.paint_aliases
        };


        extendedFields = {
          "Personal observations":
            entry.my_notes,
          "Best mixes":
            entry.mix_with,
          "Full content":
            entry.content,
          "Manufacturer description":
            entry.ext_manufacturer_description
        };
      }


      /*
       * SUBJECT SEARCH FIELDS
       */
      if (type === "subject") {
        structuredFields = {
          "Subject name":
            entry.subject_name,
          "Subject ID":
            entry.subject_id,
          "Related subjects":
            entry.my_paint_subjects,
          "Purpose":
            entry.my_paint_purpose,
          "Difficulty":
            entry.subject_difficulty,
          "Recommended brushes":
            entry.my_recommended_brushes,
          "Recommended paper":
            entry.my_recommended_paper
        };


        extendedFields = {
          "Related keywords":
            entry.ai_keywords,
          "Personal notes":
            entry.my_notes,
          "Recommended paints and mixes":
            entry.mix_with,
          "Full painting guide":
            entry.content
        };
      }


      /*
       * PAPER SEARCH FIELDS
       */
      if (type === "paper") {
        structuredFields = {
          "Paper name":
            entry.paper_name,
          "Paper ID":
            entry.paper_id,
          "Brand":
            entry.paper_brand,
          "Weight":
            entry.paper_gsm_weight,
          "Color":
            entry.paper_color,
          "Material":
            entry.paper_material,
          "Cotton content":
            entry.paper_cotton_content,
          "Surface":
            entry.paper_surface,
          "Sizing":
            entry.paper_sizing,
          "Lifting abilities":
            entry.paper_lifting_abilities,
          "Pilling":
            entry.paper_pilling,
          "Granulation":
            entry.paper_granulation,
          "Burnisher suited":
            entry.paper_burnisher_suited,
          "Paint edges":
            entry.paper_clear_paintedges,
          "Color shift":
            entry.paper_colorshift,
          "Scrub tolerance":
            entry.paper_scrub_tolerance,
          "Layer tolerance":
            entry.paper_layer_tolerance,
          "Brush recommendations":
            entry.paper_brush_recommendations,
          "Luminosity":
            entry.paint_luminosity,
          "Glow":
            entry.paint_glow,
          "Techniques":
            entry.my_best_techniques,
          "Subjects":
            entry.my_paint_subjects,
          "Purpose":
            entry.my_paint_purpose,
          "Rating":
            entry.my_rating_1_10
        };


        extendedFields = {
          "Related keywords":
            entry.ai_keywords,
          "Personal notes":
            entry.my_notes,
          "Full content":
            entry.content
        };
      }


      const searchFields =
        useExtendedSearch
          ? {
              ...structuredFields,
              ...extendedFields
            }
          : structuredFields;


      const preparedFields =
        Object.entries(searchFields)
          .map(([label, value]) => ({
            label,
            value,
            words: getFieldWords(value)
          }));


      const isMatch =
        searchTerms.every((term) =>
          preparedFields.some((field) =>
            field.words.has(term)
          )
        );


      if (!isMatch) {
        return null;
      }


      const matchedFields =
        preparedFields
          .filter((field) =>
            searchTerms.some((term) =>
              field.words.has(term)
            )
          )
          .map(
            (field) =>
              field.label
          );


      return {
        entry,
        type,
        matchedFields
      };
    })
    .filter(Boolean);
}


/*
 * PAINT RESULT
 */
function renderPaintResult(
  paint,
  matchedFields,
  searchTerms
) {
  const name = highlightText(
    paint.paint_name ||
      "Unnamed paint",
    searchTerms
  );


  const brand = highlightBrand(
    paint.paint_brand ||
      "Unknown",
    searchTerms
  );


  const notes = highlightText(
    paint.my_notes ||
      "No notes available.",
    searchTerms
  );


  const pigments = highlightText(
    paint.paint_pigments ||
      "Unknown",
    searchTerms
  );


  const temperature = highlightText(
    paint.paint_temperature,
    searchTerms
  );


  const opacity = highlightText(
    paint.paint_opacity,
    searchTerms
  );


  const granulation = highlightText(
    paint.paint_granulation,
    searchTerms
  );


  const staining = highlightText(
    paint.paint_staining,
    searchTerms
  );


  const luminosity = highlightText(
    paint.paint_luminosity,
    searchTerms
  );


  const opticalRole = highlightText(
    paint.paint_optical_role,
    searchTerms
  );


  const jobTitle = highlightText(
    paint.paint_job_title,
    searchTerms
  );


  const purpose = highlightText(
    paint.my_paint_purpose,
    searchTerms
  );


  const mixes = highlightText(
    paint.mix_with ||
      "No mixes registered.",
    searchTerms
  );


  const content = renderMarkdown(
    paint.content ||
      "No full note content available.",
    searchTerms
  );


  const manufacturerDescription =
    highlightText(
      paint.ext_manufacturer_description ||
        "No manufacturer description available.",
      searchTerms
    );


  const matchedFieldList =
    matchedFields
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

      <h2>
        ${name}
      </h2>

      <p>
        <strong>Brand:</strong>
        ${brand}
      </p>

      <p>
        <strong>Personal observations:</strong>
        ${notes}
      </p>

      <p>
        <strong>Pigment:</strong>
        ${pigments}
      </p>

      <p>
        <strong>Temperature:</strong>
        ${temperature}
      </p>

      <p>
        <strong>Opacity:</strong>
        ${opacity}
      </p>

      <p>
        <strong>Granulation:</strong>
        ${granulation}
      </p>

      <p>
        <strong>Staining:</strong>
        ${staining}
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
          Show additional information
        </summary>

        <div class="entry-details">

          <p>
            <strong>Luminosity:</strong>
            ${luminosity}
          </p>

          <p>
            <strong>Optical role:</strong>
            ${opticalRole}
          </p>

          <p>
            <strong>Job title / function:</strong>
            ${jobTitle}
          </p>

          <p>
            <strong>Subjects:</strong>
            ${purpose}
          </p>

          <p>
            <strong>Mixes:</strong>
            ${mixes}
          </p>


          <h3>
            Personal experiences
          </h3>

          <div class="note-content">
            ${content}
          </div>


          <h3>
            Manufacturer's description
          </h3>

          <p>
            ${manufacturerDescription}
          </p>

        </div>

      </details>

    </article>
  `;
}


/*
 * SUBJECT RESULT
 */
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


  const matchedFieldList =
    matchedFields
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
 * PAPER RESULT
 */
function renderPaperResult(
  paper,
  matchedFields,
  searchTerms
) {
  const name = highlightText(
    paper.paper_name ||
      paper.paper_id ||
      "Unnamed paper",
    searchTerms
  );


  const brand = highlightText(
    paper.paper_brand ||
      "Unknown",
    searchTerms
  );


  const weight = highlightText(
    paper.paper_gsm_weight,
    searchTerms
  );


  const surface = highlightText(
    paper.paper_surface,
    searchTerms
  );


  const material = highlightText(
    paper.paper_material,
    searchTerms
  );


  const cotton = highlightText(
    paper.paper_cotton_content,
    searchTerms
  );


  const color = highlightText(
    paper.paper_color,
    searchTerms
  );


  const sizing = highlightText(
    paper.paper_sizing,
    searchTerms
  );


  const lifting = highlightText(
    paper.paper_lifting_abilities,
    searchTerms
  );


  const pilling = highlightText(
    paper.paper_pilling,
    searchTerms
  );


  const granulation = highlightText(
    paper.paper_granulation,
    searchTerms
  );


  const burnisher = highlightText(
    paper.paper_burnisher_suited,
    searchTerms
  );


  const edges = highlightText(
    paper.paper_clear_paintedges,
    searchTerms
  );


  const colorShift = highlightText(
    paper.paper_colorshift,
    searchTerms
  );


  const scrubTolerance = highlightText(
    paper.paper_scrub_tolerance,
    searchTerms
  );


  const layerTolerance = highlightText(
    paper.paper_layer_tolerance,
    searchTerms
  );


  const brushes = highlightText(
    paper.paper_brush_recommendations,
    searchTerms
  );


  const luminosity = highlightText(
    paper.paint_luminosity,
    searchTerms
  );


  const glow = highlightText(
    paper.paint_glow,
    searchTerms
  );


  const techniques = highlightText(
    paper.my_best_techniques,
    searchTerms
  );


  const subjects = highlightText(
    paper.my_paint_subjects,
    searchTerms
  );


  const purpose = highlightText(
    paper.my_paint_purpose,
    searchTerms
  );


  const rating = highlightText(
    paper.my_rating_1_10,
    searchTerms
  );


  const notes = highlightText(
    paper.my_notes ||
      "No personal notes available.",
    searchTerms
  );


  const content = renderMarkdown(
    paper.content ||
      "No full paper note available.",
    searchTerms
  );


  const references =
    createClickableReferences(
      paper.ext_references
    );


  const source =
    createClickableReferences(
      paper.ext_source
    );


  const matchedFieldList =
    matchedFields
      .map(
        (field) =>
          `<li>${escapeHtml(field)}</li>`
      )
      .join("");


  return `
    <article class="paper-result">

      <p class="result-type">
        PAPER
      </p>

      <h2>
        ${name}
      </h2>

      <p>
        <strong>Brand:</strong>
        ${brand}
      </p>

      <p>
        <strong>Weight:</strong>
        ${weight} gsm
      </p>

      <p>
        <strong>Surface:</strong>
        ${surface}
      </p>

      <p>
        <strong>Material:</strong>
        ${material}
      </p>

      <p>
        <strong>Cotton content:</strong>
        ${cotton}%
      </p>

      <p>
        <strong>Color:</strong>
        ${color}
      </p>

      <p>
        <strong>Best techniques:</strong>
        ${techniques}
      </p>

      <p>
        <strong>Subjects:</strong>
        ${subjects}
      </p>

      <p>
        <strong>Best used for:</strong>
        ${purpose}
      </p>

      <p>
        <strong>My rating:</strong>
        ${rating}/10
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
          Show paper details and full notes
        </summary>

        <div class="entry-details">

          <h3>
            Paper properties
          </h3>

          <p>
            <strong>Sizing:</strong>
            ${sizing}
          </p>

          <p>
            <strong>Lifting abilities:</strong>
            ${lifting}
          </p>

          <p>
            <strong>Pilling:</strong>
            ${pilling}
          </p>

          <p>
            <strong>Granulation suited:</strong>
            ${granulation}
          </p>

          <p>
            <strong>Burnisher suited:</strong>
            ${burnisher}
          </p>

          <p>
            <strong>Paint edges:</strong>
            ${edges}
          </p>

          <p>
            <strong>Color shift:</strong>
            ${colorShift}
          </p>

          <p>
            <strong>Scrub tolerance:</strong>
            ${scrubTolerance}
          </p>

          <p>
            <strong>Layer tolerance:</strong>
            ${layerTolerance}
          </p>

          <p>
            <strong>Recommended brush hair:</strong>
            ${brushes}
          </p>

          <p>
            <strong>Paint luminosity:</strong>
            ${luminosity}
          </p>

          <p>
            <strong>Paint glow:</strong>
            ${glow}
          </p>


          <h3>
            Personal experience and paper description
          </h3>

          <div class="note-content">
            ${content}
          </div>


          <h3>
            External references
          </h3>

          <p>
            ${references}
          </p>


          <h3>
            External source
          </h3>

          <p>
            ${source}
          </p>

        </div>

      </details>

    </article>
  `;
}


/*
 * Create clickable result-category navigation
 */
function createResultNavigation(
  subjectCount,
  paintCount,
  paperCount
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


  if (paperCount > 0) {
    links.push(`
      <a
        class="result-category-link"
        href="#paper-results"
      >
        Papers
        <span class="result-category-count">
          ${paperCount}
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
    normalizeText(
      inputElement.value
    );


  if (!normalizedSearch) {
    resultElement.textContent =
      "Please enter a search term.";

    return;
  }


  const searchTerms =
    normalizedSearch
      .split(" ")
      .filter(Boolean);


  try {
    resultElement.textContent =
      "Searching...";


    /*
     * Load all three databases
     */
    const [
      paintResponse,
      subjectResponse,
      paperResponse
    ] = await Promise.all([

      fetch("./data/paint.json", {
        cache: "no-store"
      }),

      fetch("./data/subjects.json", {
        cache: "no-store"
      }),

      fetch("./data/papers.json", {
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


    if (!paperResponse.ok) {
      throw new Error(
        `Could not load papers.json. HTTP status: ${paperResponse.status}`
      );
    }


    const paints =
      await paintResponse.json();


    const subjects =
      await subjectResponse.json();


    const papers =
      await paperResponse.json();


    const useExtendedSearch =
      extendedSearchElement.checked;


    const paintMatches =
      findMatches(
        paints,
        searchTerms,
        useExtendedSearch,
        "paint"
      );


    const subjectMatches =
      findMatches(
        subjects,
        searchTerms,
        useExtendedSearch,
        "subject"
      );


    const paperMatches =
      findMatches(
        papers,
        searchTerms,
        useExtendedSearch,
        "paper"
      );


    if (
      paintMatches.length === 0 &&
      subjectMatches.length === 0 &&
      paperMatches.length === 0
    ) {
      resultElement.textContent =
        "No matching paints, painting subjects or papers found.";

      return;
    }


    let resultHtml = "";


    /*
     * CATEGORY NAVIGATION
     */
    resultHtml +=
      createResultNavigation(
        subjectMatches.length,
        paintMatches.length,
        paperMatches.length
      );


    /*
     * SUBJECT RESULTS
     */
    if (
      subjectMatches.length > 0
    ) {
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
            .map(
              ({
                entry,
                matchedFields
              }) =>
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
    if (
      paintMatches.length > 0
    ) {
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
            .map(
              ({
                entry,
                matchedFields
              }) =>
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


    /*
     * PAPER RESULTS
     */
    if (
      paperMatches.length > 0
    ) {
      resultHtml += `
        <section
          class="paper-results"
          id="paper-results"
        >

          <h2 class="result-section-title">
            Papers
            (${paperMatches.length})
          </h2>

          ${paperMatches
            .map(
              ({
                entry,
                matchedFields
              }) =>
                renderPaperResult(
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

        if (
          event.key === "Enter"
        ) {
          analyzeInput();
        }

      }
    );

  }
);
