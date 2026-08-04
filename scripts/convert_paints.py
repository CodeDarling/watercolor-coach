from pathlib import Path
import json
import yaml


SOURCE_FOLDER = Path("source/paint")
OUTPUT_FILE = Path("data/paint.json")


def read_obsidian_note(file_path: Path) -> dict:
    """Read YAML frontmatter and Markdown body from an Obsidian note."""

    content = file_path.read_text(encoding="utf-8")

    if not content.startswith("---"):
        raise ValueError(
            f"{file_path.name} does not begin with YAML frontmatter."
        )

    parts = content.split("---", 2)

    if len(parts) < 3:
        raise ValueError(
            f"{file_path.name} does not contain valid YAML frontmatter."
        )

    yaml_text = parts[1]
    markdown_body = parts[2].strip()

    metadata = yaml.safe_load(yaml_text)

    if not isinstance(metadata, dict):
        raise ValueError(
            f"{file_path.name} does not contain valid YAML metadata."
        )

    metadata["source_file"] = file_path.name
    metadata["content"] = markdown_body

    return metadata


def convert_paints() -> None:
    """Convert all paint Markdown notes into one JSON file."""

    if not SOURCE_FOLDER.exists():
        raise FileNotFoundError(
            f"Source folder not found: {SOURCE_FOLDER}"
        )

    paint_records = []

    for file_path in sorted(SOURCE_FOLDER.glob("*.md")):
        print(f"Reading {file_path}")
        paint_records.append(read_obsidian_note(file_path))

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    OUTPUT_FILE.write_text(
        json.dumps(
            paint_records,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    print(
        f"Created {OUTPUT_FILE} with "
        f"{len(paint_records)} paint record(s)."
    )


if __name__ == "__main__":
    convert_paints()
