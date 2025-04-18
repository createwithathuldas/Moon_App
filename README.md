# 🌙 MOON APP

MOON APP is a bedtime story listening web application tailored for kids under the age of 10. Designed with love and purpose, it helps parents strengthen emotional bonds with their children — even during busy schedules — by allowing them to narrate handpicked bedtime stories in their **own voice** (or a loved one’s voice) using cutting-edge voice cloning technology.

---

## 📌 Features

### 👨‍👩‍👧 For Users (Parents)
- **Login/Register** with Email/Password or **Google OAuth**
- Add child details: **name, age, gender**
- **Record and clone voice samples** using Coqui TTS's YourTTS
- Listen to bedtime stories in your **own cloned voice**
- Manage profile & voice samples
- Browse, search, and play stories tailored to your child’s age
- Simple, soothing UI for bedtime comfort

### 🔐 For Admins
- Login to secure **Admin Dashboard**
- Upload & manage handpicked, child-safe stories
- View advanced **user analytics & story engagement**
- **Visual graphs and statistics** for better decision-making
- Only one authorized admin can add/remove admins (enhanced security)

---

## ⚙️ Tech Stack

| Layer           | Technology               |
|----------------|---------------------------|
| Frontend       | HTML, CSS, JavaScript     |
| Backend (App)  | Node.js                   |
| Backend (API)  | Flask (Python)            |
| TTS Engine     | Coqui TTS - YourTTS       |
| Authentication | Google OAuth + JWT        |
| Voice Cloning  | Coqui TTS pretrained model|
| Database       | MongoDB / MySQL *(Based on usage)* |

---

## 🚀 Getting Started (Local Setup)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/moon-app.git
cd moon-app

cd server-node
npm install
npm start

cd ../server-flask
pip install -r requirements.txt
python app.py

//visit at :  http://localhost:3000

