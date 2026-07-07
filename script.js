
async function analyzeInput() {

    const response =
        await fetch("data/troubleshooting/problems.json");

    const problems =
        await response.json();

    console.log(problems);

}
