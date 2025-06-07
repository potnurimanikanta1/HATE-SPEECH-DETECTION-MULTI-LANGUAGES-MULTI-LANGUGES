
# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, jsonify
import os
import vosk
import json
import wave
import nltk
import subprocess
from nltk.sentiment import SentimentIntensityAnalyzer
import random
import sys

# Force Python to use UTF-8 for output
sys.stdout.reconfigure(encoding='utf-8')

# Initialize Flask App
app = Flask(__name__, template_folder="templates", static_folder="static")

# Load Vosk Models
MODEL_PATHS = {
    "en": "backend/vosk-model-small-en-us-0.15",
    "hi": "backend/vosk-model-small-hi-0.22",
    "te": "backend/vosk-model-small-te-0.42",
}

models = {}
for lang, path in MODEL_PATHS.items():
    if os.path.exists(path):
        models[lang] = vosk.Model(path)
    else:
        print(f"Warning: Model for {lang} not found at {path}")  # ⚠ Removed Unicode character

# Load Sentiment Analyzer
nltk.download("vader_lexicon", quiet=True)
nltk.download("punkt", quiet=True)
sia = SentimentIntensityAnalyzer()

# Sentence-Level Sentiment Classification
def classify_text(text):
    sentiment = sia.polarity_scores(text)
    if sentiment["compound"] >= 0.05:
        return "Positive 😊", "✅"
    elif sentiment["compound"] <= -0.05:
        return "Negative 🚨", "❌"
    else:
        return "Neutral 😐", "⚪"

# Word-Level Sentiment Analysis
def classify_words(text):
    words = nltk.word_tokenize(text)
    results = {"positive": [], "negative": [], "neutral": []}

    for word in words:
        sentiment = sia.polarity_scores(word)
        if sentiment["compound"] >= 0.05:
            results["positive"].append(word)
        elif sentiment["compound"] <= -0.05:
            results["negative"].append(word)
        else:
            results["neutral"].append(word)

    return results

# Random Tweet Lists
RANDOM_TWEETS = {
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
}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze_text():
    data = request.get_json()
    text = data.get("text", "")

    if not text:
        return jsonify({"error": "No text provided!"}), 400

    word_results = classify_words(text)

    # Generate feedback and random tweet
    if word_results["positive"]:
        feedback_message = "Your tweet communicates effectively!"
        random_tweet = random.choice(RANDOM_TWEETS["non-offensive"])
    elif word_results["negative"]:
        feedback_message = "Consider improving your communication!"
        random_tweet = random.choice(RANDOM_TWEETS["offensive"])
    else:
        feedback_message = "Your words are balanced and neutral!"
        random_tweet = random.choice(RANDOM_TWEETS["neutral"])

    return jsonify({
        "words": word_results,
        "feedback": feedback_message,
        "random_tweet": random_tweet
    })

@app.route("/speech", methods=["POST"])
def recognize_speech():
    try:
        if "audio" not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files["audio"]
        lang = request.form.get("language", "en")

        if lang not in models:
            return jsonify({"error": "Invalid language selected"}), 400

        audio_path = "temp.webm"
        audio_wav_path = "temp.wav"
        audio_file.save(audio_path)

        subprocess.run(["ffmpeg", "-y", "-i", audio_path, "-ar", "16000", "-ac", "1", "-f", "wav", audio_wav_path], check=True)

        wf = wave.open(audio_wav_path, "rb")
        rec = vosk.KaldiRecognizer(models[lang], wf.getframerate())
        result_text = ""

        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            if rec.AcceptWaveform(data):
                result = json.loads(rec.Result())
                result_text += result.get("text", "")

        wf.close()
        os.remove(audio_path)
        os.remove(audio_wav_path)

        if not result_text.strip():
            return jsonify({"error": "No speech detected!"}), 400

        word_results = classify_words(result_text)
        return jsonify({"text": result_text, **word_results})
    except Exception as e:
        return jsonify({"error": f"Speech recognition failed: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)

