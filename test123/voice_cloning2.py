from flask import Flask, request, jsonify, send_file, url_for, render_template, make_response
from flask_cors import CORS
from TTS.api import TTS
import os
import librosa
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "outputs"
ALLOWED_AUDIO_EXTENSIONS = {'wav'}
ALLOWED_TEXT_EXTENSIONS = {'txt'}
MAX_TEXT_LENGTH = 5000  # characters
MAX_AUDIO_DURATION = 600  # seconds (10 minutes)
MAX_AUDIO_SIZE = 50 * 1024 * 1024  # 50MB
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def allowed_audio_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_AUDIO_EXTENSIONS

def allowed_text_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_TEXT_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

def validate_audio_file(filepath):
    try:
        # Check file size first
        file_size = os.path.getsize(filepath)
        if file_size > MAX_AUDIO_SIZE:
            return False, f"Audio file too large (max {MAX_AUDIO_SIZE//(1024*1024)}MB)"
            
        # Check duration and sample rate
        y, sr = librosa.load(filepath, sr=None, duration=MAX_AUDIO_DURATION+10)
        duration = librosa.get_duration(y=y, sr=sr)
        
        if duration > MAX_AUDIO_DURATION:
            return False, f"Audio too long (max {MAX_AUDIO_DURATION}s)"
            
        if sr > 48000:
            return False, "Sample rate too high (max 48kHz)"
            
        return True, "OK"
    except Exception as e:
        return False, f"Invalid audio file: {str(e)}"

@app.route('/upload', methods=['POST'])
def upload():
    # Check if files were actually uploaded
    if 'wavfile' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    if 'txtfile' not in request.files:
        return jsonify({"error": "No text file provided"}), 400

    wavfile = request.files['wavfile']
    txtfile = request.files['txtfile']

    # Check for empty filenames
    if wavfile.filename == '':
        return jsonify({"error": "No selected audio file"}), 400
    if txtfile.filename == '':
        return jsonify({"error": "No selected text file"}), 400

    # Validate file extensions
    if not allowed_audio_file(wavfile.filename):
        return jsonify({"error": "Invalid audio file type. Only WAV files are allowed"}), 400
    if not allowed_text_file(txtfile.filename):
        return jsonify({"error": "Invalid text file type. Only TXT files are allowed"}), 400

    # Secure filenames
    audio_filename = secure_filename(wavfile.filename)
    text_filename = secure_filename(txtfile.filename)

    # Create upload paths
    wav_path = os.path.join(UPLOAD_FOLDER, audio_filename)
    txt_path = os.path.join(UPLOAD_FOLDER, text_filename)
    output_path = os.path.join(OUTPUT_FOLDER, "output.wav")

    try:
        # Save files
        wavfile.save(wav_path)
        txtfile.save(txt_path)

        # Validate audio file
        is_valid, msg = validate_audio_file(wav_path)
        if not is_valid:
            # Clean up saved files if validation fails
            if os.path.exists(wav_path):
                os.remove(wav_path)
            if os.path.exists(txt_path):
                os.remove(txt_path)
            return jsonify({"error": msg}), 400

        # Validate text length
        with open(txt_path, 'r') as f:
            text = f.read()
        
        if len(text) > MAX_TEXT_LENGTH:
            return jsonify({"error": f"Text too long (max {MAX_TEXT_LENGTH} characters)"}), 400
        if len(text.strip()) == 0:
            return jsonify({"error": "Text file is empty"}), 400

        # Load TTS model
        tts = TTS(
            model_name="tts_models/multilingual/multi-dataset/your_tts",
            progress_bar=False,
            gpu=False
        )

        # Generate TTS with error handling
        try:
            tts.tts_to_file(
                text=text,
                speaker_wav=wav_path,
                language="en",
                file_path=output_path,
                speed=0.9,  # Slower speed for storytelling
                split_sentences=True
            )
        except Exception as e:
            return jsonify({"error": f"Failed to generate speech: {str(e)}"}), 500

        # Verify output was created
        if not os.path.exists(output_path):
            return jsonify({"error": "Failed to create output file"}), 500

        audio_url = url_for('get_audio', _external=True)
        return jsonify({
            "message": "Audio generated successfully",
            "audio_url": audio_url
        }), 200

    except Exception as e:
        # Clean up in case of any error
        if os.path.exists(wav_path):
            os.remove(wav_path)
        if os.path.exists(txt_path):
            os.remove(txt_path)
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/get_audio', methods=['GET'])
def get_audio():
    output_path = os.path.join(OUTPUT_FOLDER, "output.wav")
    if os.path.exists(output_path):
        response = make_response(send_file(output_path, mimetype="audio/wav"))
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
    else:
        return jsonify({"error": "Audio not found"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
