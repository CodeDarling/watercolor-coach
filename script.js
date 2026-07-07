
for (let rule of problems) {

    if (text.includes(rule.keyword)) {

        // Vis rule.advice

    }

}

async function analyzeInput() {

    const response =
        await fetch("data/troubleshooting/problems.json");

    const problems =
        await response.json();

    console.log(problems);

}
