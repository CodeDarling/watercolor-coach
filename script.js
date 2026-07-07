async function analyzeInput() {

    const response = await fetch("data/troubleshooting/problems.json");
    const problems = await response.json();

    const text = document
        .getElementById("userInput")
        .value
        .toLowerCase();

    for (const problem of problems) {

        if (text.includes(problem.keyword)) {

            document.getElementById("result").innerHTML =
                problem.advice;

            return;
        }
    }

    document.getElementById("result").innerHTML =
        "I don't know that problem yet.";

}
