
let recognition;

// Available Chart Types
const chartTypes = ["bar", "pie", "line"];

// Analyze Text Endpoint
function analyzeText() {
    const text = document.getElementById("textInput").value;

    fetch("/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            document.getElementById("output").innerHTML = `<p class="text-red-500">${data.error}</p>`;
            changeBackgroundColor("error");
            return;
        }

        // Handle word categorization safely
        const nonOffensive = data.words?.positive?.join(", ") || "None";
        const offensive = data.words?.negative?.join(", ") || "None";
        const neutral = data.words?.neutral?.join(", ") || "None";

        // Display categorized words correctly
        document.getElementById("output").innerHTML = `
            <p><strong>NON-OFFENSIVE:</strong> ${nonOffensive}</p>
            <p><strong>OFFENSIVE:</strong> ${offensive}</p>
            <p><strong>Neutral:</strong> ${neutral}</p>
        `;

        // Randomize Tweet Selection
        const tweetCategory = offensive !== "None" ? "offensive" :
                              nonOffensive !== "None" ? "non-offensive" :
                              "neutral";
        const randomTweet = data.random_tweet || getRandomTweet(tweetCategory);
        document.getElementById("randomTweet").innerText = `Suggested Tweet: "${randomTweet}"`;

        const sentimentData = [
            data.words?.positive?.length || 0,  
            data.words?.neutral?.length || 0,   
            data.words?.negative?.length || 0   
        ];

        // Change background color based on sentiment
        changeBackgroundColor(sentimentData);

        // Render the random chart
        renderChart(sentimentData);
    })
    .catch(error => {
        document.getElementById("output").innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
        changeBackgroundColor("error");
    });
}

// Generate Random Tweet When API Fails to Provide One
function getRandomTweet(category) {
    const RANDOM_TWEETS = {
        "offensive": [
            "Consider revisiting your words!",
            "Your communication could improve.",
            "Let's keep the conversation positive!"
        ],
        "non-offensive": [
            "Great tweet, keep it up!",
            "Your words convey a good message.",
            "Thumbs up for your communication!"
        ],
        "neutral": [
            "Balanced and neutral, good work!",
            "Your message is clear and neutral.",
            "Nothing offensive or outstanding—good job!"
        ]
    };

    return RANDOM_TWEETS[category][Math.floor(Math.random() * RANDOM_TWEETS[category].length)];
}

// Render Chart (Random Selection)
function renderChart(sentimentData) {
    const ctx = document.getElementById("sentimentChart").getContext("2d");
    const randomType = chartTypes[Math.floor(Math.random() * chartTypes.length)]; // Random chart type

    if (window.currentChart) {
        window.currentChart.destroy();
    }

    window.currentChart = new Chart(ctx, {
        type: randomType, 
        data: {
            labels: ["NON-OFFENSIVE", "Neutral", "OFFENSIVE"],
            datasets: [{
                label: "Sentiment Analysis",
                data: sentimentData,
                backgroundColor: ["#4CAF50", "#FFC107", "#F44336"], 
                borderWidth: 1
            }]
        },
        options: { responsive: true }
    });

    console.log(`Chart type: ${randomType} rendered successfully!`);
}

// Fix Background Color Change & Smooth Transition
function changeBackgroundColor(sentimentData) {
    const body = document.body;
    body.style.transition = "background-color 0.5s ease-in-out"; 

    if (sentimentData[2] > sentimentData[0] && sentimentData[2] > sentimentData[1]) {
        body.style.backgroundColor = "#F44336";  // Red for OFFENSIVE
    } else if (sentimentData[0] > sentimentData[2] && sentimentData[0] > sentimentData[1]) {
        body.style.backgroundColor = "#4CAF50";  // Green for NON-OFFENSIVE
    } else {
        body.style.backgroundColor = "#FFC107";  // Yellow for Neutral
    }
}

// Ensure JavaScript Loads Correctly
console.log("script.js loaded successfully!");

// Start Recording Speech
function startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Your browser does not support Speech Recognition!");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = document.getElementById("languageSelect").value || "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join("");
        document.getElementById("textInput").value = transcript;
    };

    recognition.start();
    console.log("Speech recognition started.");
}

// Stop Recording Speech
function stopRecording() {
    if (recognition) {
        recognition.stop();
        console.log("Speech recognition stopped.");
    }
}
