// ♟️ LLM Chess Arena - Utility Functions

const Utils = {
  // Date and Time Utilities
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return (
          "Hoje, " +
          date.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } else if (diffDays === 1) {
        return (
          "Ontem, " +
          date.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } else if (diffDays < 7) {
        return `${diffDays} dias atrás`;
      } else {
        return date.toLocaleDateString("pt-BR");
      }
    } catch (error) {
      return dateString;
    }
  },

  formatDuration(seconds) {
    seconds = Math.floor(seconds);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    let str = "";
    if (h > 0) str += `${h}h `;
    if (m > 0) str += `${m}m `;
    str += `${s}s`;
    return str.trim();
  },

  getCurrentTimestamp() {
    return new Date().toISOString();
  },

  // Storage Utilities
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Storage set error:", error);
      return false;
    }
  },

  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error("Storage get error:", error);
      return defaultValue;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("Storage remove error:", error);
      return false;
    }
  },

  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("Storage clear error:", error);
      return false;
    }
  },

  sessionSet(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Session storage set error:", error);
      return false;
    }
  },

  sessionGet(key, defaultValue = null) {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error("Session storage get error:", error);
      return defaultValue;
    }
  },

  // String Utilities
  capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  truncate(str, length = 50, suffix = "...") {
    if (!str || str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  },

  slugify(str) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9 -]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-"); // Replace multiple hyphens with single
  },

  generateId(prefix = "", length = 8) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = prefix;
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  formatNumber(num, decimals = 0) {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  },

  // DOM Utilities
  createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "className") {
        element.className = value;
      } else if (key === "innerHTML") {
        element.innerHTML = value;
      } else if (key === "textContent") {
        element.textContent = value;
      } else {
        element.setAttribute(key, value);
      }
    });

    // Add children
    children.forEach((child) => {
      if (typeof child === "string") {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Element) {
        element.appendChild(child);
      }
    });

    return element;
  },

  getElement(selector) {
    return document.querySelector(selector);
  },

  getElements(selector) {
    return [...document.querySelectorAll(selector)];
  },

  isVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  },

  scrollIntoView(element, options = { behavior: "smooth", block: "center" }) {
    if (element && element.scrollIntoView) {
      element.scrollIntoView(options);
    }
  },

  ensureChessboardRendered() {
    const chessboards = document.querySelectorAll(".chessboard");
    if (chessboards.length > 0) {
      chessboards.forEach((board) => {
        if (board.offsetWidth === 0 || board.children.length === 0) {
          // Force reflow
          board.style.display = "none";
          setTimeout(() => {
            board.style.display = "grid";
          }, 50);
        }
      });
    }
  },

  debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(this, args);
    };
  },

  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Validation Utilities
  isEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
  },

  isNumeric(value) {
    return !isNaN(value) && !isNaN(parseFloat(value));
  },

  isValidMove(move) {
    // Basic chess move validation
    const movePattern =
      /^[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?$|^O-O(?:-O)?$/;
    return movePattern.test(move);
  },

  isValidFEN(fen) {
    // Basic FEN validation
    const fenPattern =
      /^([rnbqkpRNBQKP1-8]+\/){7}([rnbqkpRNBQKP1-8]+)\s[bw]\s(-|[KQkq]{1,4})\s(-|[a-h][36])\s\d+\s\d+$/;
    return fenPattern.test(fen);
  },

  // Math Utilities
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  lerp(start, end, factor) {
    return start + (end - start) * factor;
  },

  randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  },

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  roundTo(value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  },

  calculateWinRate(wins, losses, draws = 0) {
    const total = wins + losses + draws;
    if (total === 0) return 0;
    return this.roundTo((wins / total) * 100, 1);
  },

  calculateEloChange(playerRating, opponentRating, result, kFactor = 32) {
    const expectedScore =
      1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    return Math.round(kFactor * (result - expectedScore));
  },

  // Color Utilities
  getModelColor(modelName) {
    const colorMap = {
      "GPT-4o": "#759900",
      "GPT-4-Turbo": "#f39c12",
      "Gemini-1.5-Pro": "#3893e8",
      "Gemini-Pro": "#3893e8",
      "Claude-3.5-Sonnet": "#8b4513",
      "Deepseek-R1": "#9b59b6",
      "Llama-3.1-70B": "#e74c3c",
    };
    return colorMap[modelName] || "#6c757d";
  },

  getResultColor(result) {
    if (result === "1-0" || result === "0-1") return "#759900";
    if (result === "1/2-1/2") return "#6c757d";
    return "#3893e8";
  },

  hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  // Chess Utilities
  parseMove(move) {
    // Parse algebraic notation
    const movePattern =
      /^([NBRQK]?)([a-h]?)([1-8]?)(x?)([a-h])([1-8])(?:=([NBRQ]))?([+#]?)$/;
    const castlePattern = /^(O-O(?:-O)?)$/;

    if (castlePattern.test(move)) {
      return {
        type: "castle",
        notation: move,
        kingside: move === "O-O",
        queenside: move === "O-O-O",
      };
    }

    const match = move.match(movePattern);
    if (!match) return null;

    return {
      type: "normal",
      piece: match[1] || "P",
      fromFile: match[2],
      fromRank: match[3],
      capture: match[4] === "x",
      toFile: match[5],
      toRank: match[6],
      promotion: match[7],
      check: match[8] === "+",
      checkmate: match[8] === "#",
      notation: move,
    };
  },

  squareToCoords(square) {
    const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
    const rank = parseInt(square[1]) - 1; // 1=0, 2=1, etc.
    return { file, rank };
  },

  coordsToSquare(file, rank) {
    const fileChar = String.fromCharCode(97 + file);
    return `${fileChar}${rank + 1}`;
  },

  isValidSquare(square) {
    if (square.length !== 2) return false;
    const file = square[0];
    const rank = square[1];
    return file >= "a" && file <= "h" && rank >= "1" && rank <= "8";
  },

  getOppositeColor(color) {
    return color === "white" ? "black" : "white";
  },

  getResultText(result) {
    if (result === "1-0") return "Brancas vencem";
    if (result === "0-1") return "Pretas vencem";
    if (result === "1/2-1/2") return "Empate";
    return result;
  },

  // File Utilities
  downloadText(content, filename, mimeType = "text/plain") {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  downloadJSON(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    this.downloadText(jsonString, filename, "application/json");
  },

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  },

  parseCSV(csvText, hasHeader = true) {
    const lines = csvText.split("\n").filter((line) => line.trim());
    const result = [];

    for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
      const values = lines[i]
        .split(",")
        .map((value) => value.trim().replace(/^"|"$/g, ""));
      result.push(values);
    }

    return result;
  },

  // URL and Hash Utilities
  getQueryParam(param, defaultValue = null) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param) || defaultValue;
  },

  setQueryParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.replaceState(null, "", url);
  },

  getHash() {
    return window.location.hash.substring(1);
  },

  setHash(hash) {
    window.location.hash = hash;
  },

  buildQueryString(params) {
    return new URLSearchParams(params).toString();
  },

  // UI Utilities
  showLoading(message) {
    const loadingScreen = this.getElement("#loading-screen");
    if (loadingScreen) {
      const loadingText = loadingScreen.querySelector(".loading-text");
      if (loadingText && message) {
        loadingText.textContent = message;
      }
      loadingScreen.style.display = "flex";
    }
  },

  hideLoading() {
    const loadingScreen = this.getElement("#loading-screen");
    if (loadingScreen) {
      loadingScreen.style.display = "none";
    }
  },

  handleError(error, context = "General Error") {
    console.error(`[${context}]`, error.message, error.stack || "");
  },
};

// Export for global use
window.Utils = Utils;
