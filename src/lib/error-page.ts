export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="fr-FR">
  <head>
    <meta charset="utf-8" />
    <title>Impossible de charger cette page</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #000; color: #f2f2f2; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #9a9a9a; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #f2f2f2; color: #000; }
      .secondary { background: #000; color: #f2f2f2; border-color: rgba(242,242,242,.35); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Impossible de charger cette page</h1>
      <p>Une erreur est survenue. Réessayez ou revenez à l’accueil.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Réessayer</button>
        <a class="secondary" href="/">Retour à l’accueil</a>
      </div>
    </div>
  </body>
</html>`;
}
