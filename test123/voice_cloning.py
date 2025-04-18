from flask import Flask, request, jsonify, send_file, url_for, render_template, make_response
from flask_cors import CORS  # Import CORS
from TTS.api import TTS
import os

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Define paths for input and output files
UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "outputs"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Route to serve the index.html file
@app.route('/')
def index():
    return render_template('index.html')

# Route to handle file upload and TTS generation
@app.route('/upload', methods=['POST'])
def upload():
    if 'wavfile' not in request.files or 'txtfile' not in request.files:
        return jsonify({"error": "No file part"}), 400

    wavfile = request.files['wavfile']
    txtfile = request.files['txtfile']

    # Save uploaded files
    wav_path = os.path.join(UPLOAD_FOLDER, "input.wav")
    txt_path = os.path.join(UPLOAD_FOLDER, "input.txt")
    output_path = os.path.join(OUTPUT_FOLDER, "output.wav")

    wavfile.save(wav_path)
    txtfile.save(txt_path)

    # Load YourTTS model
    tts = TTS(model_name="tts_models/multilingual/multi-dataset/your_tts", progress_bar=False, gpu=False)

    # Generate TTS
    with open(txt_path, 'r') as f:
        text = f.read()
    tts.tts_to_file(text=text, speaker_wav=wav_path, language="en", file_path=output_path)

    # Return the URL of the generated audio file
    audio_url = url_for('get_audio', _external=True)
    return jsonify({"message": "Audio generated successfully", "audio_url": audio_url}), 200

# Route to serve the generated audio file
@app.route('/get_audio', methods=['GET'])
def get_audio():
    output_path = os.path.join(OUTPUT_FOLDER, "output.wav")
    if os.path.exists(output_path):
        response = make_response(send_file(output_path, mimetype="audio/wav"))
        response.headers['Access-Control-Allow-Origin'] = '*'  # Allow all origins
        return response
    else:
        return jsonify({"error": "Audio not found"}), 404

# Run the Flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
