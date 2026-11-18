// Startup selection policy kept independent of the UI for repeatable tests.
export function chooseStartupModel(installed, remembered, models = ['persian-base', 'turbo-q8', 'turbo-fp16', 'large']) {
  if (!installed || typeof installed !== 'object') return null;
  if (remembered && installed[remembered] && models.includes(remembered)) return remembered;
  return models.find(id => installed[id]) || null;
}
