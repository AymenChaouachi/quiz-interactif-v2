let allQuestions = [];

async function loadQuestions() {
  try {
    const response = await fetch('api/get_questions.php');
    const data = await response.json();
    
    if (data.success) {
      allQuestions = data.questions.map(q => ({
        id: q.id,
        flag: q.flag_image,
        type: q.type,
        country: q.country,
        difficulty: q.difficulty,
        answer: q.answer,
        options: q.options || []
      }));
      
      const quiz = new Quiz({ 
        questions: allQuestions, 
        timePerQuestion: 15 
      });
    } else {
      alert('Erreur lors du chargement des questions');
    }
  } catch (error) {
    console.error('Erreur de chargement:', error);
    alert('Impossible de charger les questions. Vérifiez que le serveur PHP est démarré.');
  }
}


class Quiz {
  constructor(options) {
    this.originalQuestions = options.questions;
    this.timePerQuestion = options.timePerQuestion || 15;
    this.current = 0;
    this.score = 0;
    this.bonusScore = 0;
    this.selected = null;
    this.timer = null;
    this.remaining = 0;

    this.questions = this.selectQuestions();

    this.qEl = document.getElementById("question");
    this.flagContainer = document.getElementById("flag-container");
    this.optionsEl = document.getElementById("options");
    this.confirmBtn = document.getElementById("confirmBtn");
    this.skipBtn = document.getElementById("skipBtn");
    this.feedbackEl = document.getElementById("feedback");
    this.progressEl = document.querySelector(".progress");
    this.timerEl = document.getElementById("timer");
    this.resultSection = document.getElementById("result");
    this.quizSection = document.getElementById("quiz");
    this.scoreText = document.getElementById("scoreText");
    this.finalPercent = document.getElementById("finalPercent");
    this.bestList = document.getElementById("bestList");
    this.restartBtn = document.getElementById("restartBtn");
    this.clearBestBtn = document.getElementById("clearBestBtn");

    this.confirmBtn.addEventListener("click", () => this.confirm());
    this.skipBtn.addEventListener("click", () => this.skip());
    this.restartBtn.addEventListener("click", () => this.restart());
    this.clearBestBtn.addEventListener("click", () => {
      localStorage.removeItem("flag_quiz_best");
      this.renderBest();
    });

    this.renderBest();
    this.show();
  }

  selectQuestions() {
    const qcm = this.originalQuestions.filter(q => !q.type || q.type !== "tf");
    const tf = this.originalQuestions.filter(q => q.type === "tf");

    const total = 20;
    const tfCount = Math.floor(total * 0.25); 
    const qcmCount = total - tfCount;

    const selectedQCM = this.shuffle(qcm).slice(0, qcmCount);
    const selectedTF = this.shuffle(tf).slice(0, tfCount);

    return this.shuffle([...selectedQCM, ...selectedTF]);
  }

  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  static getPoints(diff) {
    if (diff === "facile") return 1;
    if (diff === "moyen") return 2;
    return 3;
  }

  show() {
    const q = this.questions[this.current];
    const isTF = q.type === "tf";

    if (isTF) {
      this.qEl.innerHTML = `Ce drapeau est-il celui de <strong class="highlight-country">${q.country}</strong> ? (${q.difficulty})`;
    } else {
      this.qEl.textContent = `Quel est ce drapeau ? (${q.difficulty})`;
    }

    this.flagContainer.innerHTML = `<img src="images/${q.flag}" alt="Drapeau">`;

    if (isTF) {
      this.optionsEl.innerHTML = ["Vrai", "Faux"]
        .map(o => `<button class="flag-option-btn">${o}</button>`)
        .join("");
    } else {
      this.optionsEl.innerHTML = q.options
        .map(opt => `<button class="flag-option-btn">${opt}</button>`)
        .join("");
    }

    this.selected = null;
    this.feedbackEl.classList.add("hidden");
    this.confirmBtn.disabled = false;
    this.startTimer();

    document.querySelectorAll(".flag-option-btn").forEach(btn => {
      btn.disabled = false;
      btn.classList.remove("selected", "correct", "wrong");
      btn.addEventListener("click", () => {
        document.querySelectorAll(".flag-option-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        this.selected = btn.textContent;
      });
    });

    const pct = (this.current / this.questions.length) * 100;
    this.progressEl.style.width = `${pct}%`;

    this.quizSection.classList.remove("fade-in");
    void this.quizSection.offsetWidth;
    this.quizSection.classList.add("fade-in");
  }

  startTimer() {
    clearInterval(this.timer);
    this.remaining = this.timePerQuestion;
    this.updateTimerUI();
    this.timer = setInterval(() => {
      this.remaining--;
      this.updateTimerUI();
      if (this.remaining <= 0) {
        clearInterval(this.timer);
        this.autoTimeout();
      }
    }, 1000);
  }

  updateTimerUI() {
    const min = Math.floor(this.remaining / 60).toString().padStart(2, "0");
    const sec = (this.remaining % 60).toString().padStart(2, "0");
    this.timerEl.textContent = `${min}:${sec}`;
  }

  autoTimeout() {
    if (!this.selected) {
      const q = this.questions[this.current];
      const correct = q.answer;
      this.feedbackEl.textContent = `⏱️ Temps écoulé ! La réponse était : ${correct}.`;
      this.feedbackEl.style.color = "var(--muted)";
      this.feedbackEl.classList.remove("hidden");
    }
    this.revealAnswers();
    this.moveNextAfterDelay();
  }

  async confirm() {
    if (!this.selected) {
      alert("Veuillez sélectionner une réponse !");
      return;
    }
    
    clearInterval(this.timer);
    const q = this.questions[this.current];
    
    this.confirmBtn.disabled = true;
    
    try {
      const response = await fetch('api/verify_answer.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: q.id,
          user_answer: this.selected
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('Erreur de vérification');
        alert('Erreur lors de la vérification de la réponse');
        return;
      }
      
      const isCorrect = result.correct;
      const base = result.base_points;
      const timeRatio = this.remaining / this.timePerQuestion;

      let awarded = 0;
      let bonus = 0;

      if (isCorrect) {
        awarded = base;
        this.score += base;

        const bonusThreshold = 0.8;
        if (timeRatio > bonusThreshold) {
          bonus = Math.round(base * (timeRatio - bonusThreshold) / (1 - bonusThreshold));
          awarded += bonus;
          this.bonusScore += bonus;
        }
      }

      document.querySelectorAll(".flag-option-btn").forEach(btn => {
        const text = btn.textContent;
        if (text === result.correct_answer) btn.classList.add("correct");
        if (text === this.selected && !isCorrect) btn.classList.add("wrong");
        btn.disabled = true;
      });

      if (isCorrect) {
        const bonusText = bonus > 0 ? ` <span class="bonus-text">(+${bonus} bonus)</span>` : "";
        this.feedbackEl.innerHTML = `✅ Bonne réponse ! +${base} pt${base > 1 ? "s" : ""}${bonusText}`;
        this.feedbackEl.style.color = "var(--success)";
      } else {
        this.feedbackEl.textContent = `❌ Mauvaise réponse ! C'était : ${result.correct_answer}.`;
        this.feedbackEl.style.color = "var(--error)";
      }

      this.feedbackEl.classList.remove("hidden");
      this.moveNextAfterDelay();
      
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion au serveur');
      this.confirmBtn.disabled = false;
    }
  }

  revealAnswers() {
    const q = this.questions[this.current];
    document.querySelectorAll(".flag-option-btn").forEach(btn => {
      if (btn.textContent === q.answer) btn.classList.add("correct");
      btn.disabled = true;
    });
  }

  skip() {
    clearInterval(this.timer);
    const q = this.questions[this.current];
    const correct = q.answer;
    this.feedbackEl.textContent = `➡️ Passée. Réponse : ${correct}.`;
    this.feedbackEl.style.color = "var(--muted)";
    this.feedbackEl.classList.remove("hidden");
    this.revealAnswers();
    this.moveNextAfterDelay();
  }

  moveNextAfterDelay(delay = 1400) {
    setTimeout(() => {
      this.current++;
      if (this.current < this.questions.length) this.show();
      else this.finish();
    }, delay);
  }

  async finish() {
    clearInterval(this.timer);
    this.quizSection.classList.add("hidden");
    this.resultSection.classList.remove("hidden");

    const baseMax = this.questions.reduce((s, q) => s + Quiz.getPoints(q.difficulty), 0);
    const percent = Math.min(100, Math.round((this.score / baseMax) * 100));

    this.scoreText.innerHTML = `
      Score final : <strong>${this.score} / ${baseMax}</strong> points
      <div style="margin-top:8px; font-size:0.95em; color:var(--primary);">
        ${this.bonusScore > 0 
          ? `<span style="color:#f39c12; font-weight:700;">+${this.bonusScore} points bonus vitesse</span>` 
          : "Aucun bonus vitesse"}
      </div>
    `;

    this.finalPercent.style.width = "0%";
    this.finalPercent.textContent = "0%";

    setTimeout(() => {
      this.finalPercent.style.width = percent + "%";
      let cur = 0;
      const intv = setInterval(() => {
        cur += Math.max(1, Math.round(percent / 20));
        if (cur >= percent) { cur = percent; clearInterval(intv); }
        this.finalPercent.textContent = `${cur}%`;
      }, 25);
    }, 120);

    this.saveBest({ 
      score: this.score, 
      max: baseMax, 
      bonus: this.bonusScore,
      date: new Date().toLocaleString(), 
      percent 
    });

    try {
      const response = await fetch('api/save_score.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: this.score,
          max_score: baseMax,
          bonus_score: this.bonusScore,
          percentage: percent
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('Score sauvegardé dans la base de données');
      }
    } catch (error) {
      console.log('Score non sauvegardé (utilisateur non connecté ou erreur serveur)');
    }

    this.renderBest();
  }

  restart() {
    this.current = 0;
    this.score = 0;
    this.bonusScore = 0;
    this.selected = null;
    this.questions = this.selectQuestions();
    this.resultSection.classList.add("hidden");
    this.quizSection.classList.remove("hidden");
    this.show();
  }

  saveBest(entry) {
    let arr = JSON.parse(localStorage.getItem("flag_quiz_best") || "[]");
    arr.push(entry);
    arr = arr.sort((a, b) => b.percent - a.percent).slice(0, 5);
    localStorage.setItem("flag_quiz_best", JSON.stringify(arr));
  }

  renderBest() {
    const arr = JSON.parse(localStorage.getItem("flag_quiz_best") || "[]");
    this.bestList.innerHTML = arr.length 
      ? arr.map(e => `
        <li>
          ${e.percent}% — ${e.score}/${e.max} 
          ${e.bonus > 0 ? `<span style="color:#f39c12; font-weight:600;">(+${e.bonus} bonus)</span>` : ""}
          — ${e.date}
        </li>
      `).join("")
      : "<li>Aucun score enregistré</li>";
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadQuestions();
});
