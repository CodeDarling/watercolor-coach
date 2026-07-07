

function analyzeInput() {
    let text = document.GetElementById("userInput").value;

    document.GetElementById("result").innerHTML =
        "You wrote: " + text;
}
