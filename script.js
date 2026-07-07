async function analyzeInput() {
  const response = await fetch("./data/troubleshooting/problems.json");

  if (!response.ok) {
    document.getElementById("result").textContent = "Could not load data.";
    return;
  }

  const problems = await response.json();
  const text = document.getElementById("userInput").value.toLowerCase();

  for (const problem of problems) {
    for (const keyword of problem.keywords) {
      if (text.includes(keyword)) {
        document.getElementById("result").textContent = problem.advice;
        return;
      }
    }
  }

  document.getElementById("result").textContent = "I don't know that problem yet.";
}
