async function loadGameAnalysis(gameId) {
  const analysis = await api.analyzeGame(gameId);
  renderGameAnalysis(analysis);
}

async function compareModels(model1, model2) {
  const comparison = await api.compareModels(model1, model2);
  renderComparison(comparison);
}

async function importLichessGames(username, maxGames) {
  const result = await api.importLichessGames(username, maxGames);
  showSuccess(`${result.count} jogos importados!`);
}
