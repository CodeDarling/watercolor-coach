async function analyzeInput() {

    const response = await fetch("data/troubleshooting/problems.json");
    const problems = await response.json();

    const text = document
        .getElementById("userInput")
        .value
        .toLowerCase();

   for (const problem of problems) {

    for (const keyword of problem.keywords) {

        if (text.includes(keyword)) {

            document.getElementById("result").innerHTML =
                problem.advice;

            return;
        }
    }
 }

    document.getElementById("result").innerHTML =
        "I don't know that problem yet.";

}
