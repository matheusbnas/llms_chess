async function initializeArenaPage(arena, arenaPgnViewer) {
  if (!arena || !arena.api) {
    console.error("Arena or API not initialized on Arena Page!");
    return;
  }
  if (!arenaPgnViewer) {
    console.error("PGN viewer not initialized for Arena Page!");
    return;
  }

  console.log("Initializing arena page...");

  const matchupSelector = document.getElementById("arena-matchup-selector");
  const gameSelector = document.getElementById("arena-game-selector");

  // Load matchups
  try {
    const matchups = await arena.api.listMatchups();
    matchupSelector.innerHTML =
      "<option value=''>Selecione um confronto</option>";
    matchups.forEach((matchup) => {
      const option = new Option(matchup, matchup);
      matchupSelector.add(option);
    });
  } catch (error) {
    console.error("Failed to load matchups for arena", error);
    matchupSelector.innerHTML = "<option value=''>Erro ao carregar</option>";
  }

  // Event listener for matchup changes
  matchupSelector.addEventListener("change", async (e) => {
    const matchup = e.target.value;
    gameSelector.innerHTML = "<option value=''>Carregando...</option>";
    if (!matchup) {
      gameSelector.innerHTML =
        "<option value=''>Selecione uma partida</option>";
      return;
    }

    try {
      const games = await arena.api.listGamesInMatchup(matchup);
      gameSelector.innerHTML =
        "<option value=''>Selecione uma partida</option>";
      games.forEach((game) => {
        const option = new Option(game, game);
        gameSelector.add(option);
      });
    } catch (error) {
      console.error("Failed to load games for matchup", matchup, error);
      gameSelector.innerHTML = "<option value=''>Erro ao carregar</option>";
    }
  });

  // Event listener for game changes
  gameSelector.addEventListener("change", async (e) => {
    const matchup = matchupSelector.value;
    const gameFile = e.target.value;

    if (!matchup || !gameFile) {
      arenaPgnViewer.clear();
      return;
    }

    try {
      const pgnData = await arena.api.getPgnData(matchup, gameFile);
      if (pgnData && pgnData.pgn) {
        arenaPgnViewer.loadPgn(pgnData.pgn);
      } else {
        throw new Error("Invalid PGN data received for arena");
      }
    } catch (error) {
      console.error("Failed to load PGN data for arena", error);
      alert("Erro ao carregar os dados do PGN para a arena.");
    }
  });

  // PGN controls
  document
    .getElementById("arena-pgn-start")
    ?.addEventListener("click", () => arenaPgnViewer.goToMove(0));
  document
    .getElementById("arena-pgn-back")
    ?.addEventListener("click", () => arenaPgnViewer.previousMove());
  document
    .getElementById("arena-pgn-next")
    ?.addEventListener("click", () => arenaPgnViewer.nextMove());
  document
    .getElementById("arena-pgn-end")
    ?.addEventListener("click", () =>
      arenaPgnViewer.goToMove(arenaPgnViewer.moves.length - 1)
    );
  document
    .getElementById("arena-pgn-flip")
    ?.addEventListener("click", () => arenaPgnViewer.flipBoard());
}
