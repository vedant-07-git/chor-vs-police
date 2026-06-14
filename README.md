# chor-vs-police
A simple Chor vs Police game built with HTML, CSS, and JavaScript.
# 🚓 Chor vs Police — Catch the Thief!

A fun, cartoon-style browser chase game built with pure HTML, CSS, and JavaScript. Control a police car 🚓 and catch the running thief 🏃 before the timer runs out!

---

## 🎮 Live Demo

> Open `index.html` in any browser — no installation needed!
> Or pull the Docker image and run it instantly (see below).

---

## 🕹️ How to Play

| Control | Action |
|--------|--------|
| `W` / `↑ Arrow` | Accelerate police car |
| `S` / `↓ Arrow` | Slow down |
| `Spacebar` | 🚀 Nitro Boost (limited cooldown) |
| On-screen buttons | Works on mobile too! |

- The **thief runs automatically** and gets faster every level
- **Close the gap** between your police car and the thief to catch him
- Collect **🪙 coins** for bonus points
- Avoid **🚧 obstacles** — they slow you down
- Catch the thief before the **⏰ timer runs out**!

---

## ✨ Features

- 🎨 Cartoon-style UI with comic-book aesthetics
- 🌄 Parallax scrolling road with moving scenery
- 🏆 6 levels with increasing difficulty
- 💰 Coin collection & obstacle collision system
- ⚡ Nitro boost with cooldown mechanic
- 📊 Score counter, level tracker & timer HUD
- 🔊 Synthesized sound effects (siren, catch, coin, crash)
- 💾 High score saved in localStorage
- ⏸ Pause / Resume / Restart support
- 📱 Fully responsive — works on desktop & mobile
- 🗂️ Clean, modular, well-commented code

---

## 📁 Project Structure

```
chor-vs-police/
├── index.html       # Game structure & layout
├── style.css        # All styling & animations
├── game.js          # Game logic, physics & loop
├── dockerfile       # Docker setup for containerized deployment
└── README.md        # You're reading it!
```

---

## 🚀 Getting Started

### ▶️ Option 1 — Run Directly in Browser
```bash
git clone https://github.com/vedant-07-git/chor-vs-police.git
cd chor-vs-police
# Just open index.html in your browser
```

### 🐳 Option 2 — Run with Docker
```bash
# Pull the latest image from Docker Hub
docker pull vedantsatpute07/chor-vs-police:latest

# Run the container
docker run -d -P --name chor-vs-police vedantsatpute07/chor-vs-police:latest

# Check the assigned port
docker ps
# Open http://localhost:<port> in your browser
```

### 🏗️ Option 3 — Build Docker Image Locally
```bash
git clone https://github.com/vedant-07-git/chor-vs-police.git
cd chor-vs-police
docker build -t vedantsatpute07/chor-vs-police:latest .
docker run -d -P --name chor-vs-police vedantsatpute07/chor-vs-police:latest
```

---

## 🐳 Docker Hub

| Detail | Info |
|--------|------|
| Image | `vedantsatpute07/chor-vs-police` |
| Tags | `latest`, `v1`, `v2` |
| Registry | [hub.docker.com](https://hub.docker.com/r/vedantsatpute07/chor-vs-police) |

```bash
docker pull vedantsatpute07/chor-vs-police:v2
```

---

## 🏗️ Deployment Setup

This project was deployed using:

- **AWS EC2** — Ubuntu instance used to clone the repo, build the Docker image, and run the container
- **Docker** — containerized the game using Nginx to serve static files
- **Docker Hub** — image pushed and versioned (`v1`, `v2`, `latest`)
- **GitHub** — source code version controlled and kept in sync with EC2

```
Laptop (code changes)
    ↓  scp / git push
EC2 Instance
    ↓  docker build
Docker Image
    ↓  docker push
Docker Hub (vedantsatpute07/chor-vs-police)
    ↓  docker run
Live Game 🎮
```

---

## 🎯 Game Mechanics

| Element | Description |
|---------|-------------|
| 🚓 Police Car | Player-controlled, speed adjusted with keys |
| 🏃 Thief | Auto-runs rightward, speeds up each level |
| 🪙 Coin | +15 bonus points when collected |
| 🚧 Obstacle | Slows police car on collision |
| ⚡ Nitro Boost | Temporary speed burst, 4-second cooldown |
| 🎯 Gap Meter | Shows distance between police and thief |
| ⏰ Timer | Decreases each level (30s → 16s minimum) |

---

## 📈 Scoring

| Action | Points |
|--------|--------|
| Catching the thief | 50 + (level × 10) |
| Collecting a coin | +15 |
| Best score | Saved in localStorage |

---

## 🛠️ Tech Stack

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![AWS EC2](https://img.shields.io/badge/AWS_EC2-FF9900?style=flat&logo=amazonaws&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)

- **Frontend:** Vanilla HTML, CSS, JavaScript (no frameworks)
- **Fonts:** Google Fonts — Bangers + Nunito
- **Audio:** Web Audio API (no external files)
- **Containerization:** Docker + Nginx
- **Cloud:** AWS EC2 (Ubuntu)
- **Version Control:** Git + GitHub

---

## 👨‍💻 Author

**Vedant Satpute**
- GitHub: [@vedant-07-git](https://github.com/vedant-07-git)
- Docker Hub: [vedantsatpute07](https://hub.docker.com/u/vedantsatpute07)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

> Made with ❤️ and a lot of police sirens 🚨
