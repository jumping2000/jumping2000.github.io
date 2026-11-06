# jumping2000 — GitHub Pages portfolio

Portfolio statico in HTML, CSS e JavaScript, con estetica Matrix e dashboard GitHub dinamica. Non richiede Node.js, build, framework o backend.

## Pubblicazione

Per ottenere `https://jumping2000.github.io/`:

1. Crea un repository pubblico chiamato **`jumping2000.github.io`**.
2. Carica il contenuto di questa cartella nella root del branch `main` (non la cartella contenitore).
3. Apri **Settings → Pages**.
4. In **Build and deployment**, scegli **Deploy from a branch**, branch `main`, cartella `/(root)`.
5. Salva e attendi che GitHub Pages completi il deploy.

## Funzionalità

- Portfolio selezionato con filtri per AI/Developer Tools, Quant & Data e Smart Home.
- Statistiche account: repository pubblici, follower e stelle totali sui repository originali (esclusi i fork).
- Feed degli ultimi commit pubblici attribuiti a `jumping2000`.
- Elenco dei repository personali aggiornati più di recente.
- Distribuzione dei linguaggi per numero di repository (non per byte di codice).
- Stelle, linguaggio principale e ultimo push aggiornati sulle schede progetto.
- Matrix rain leggero, layout responsive e supporto `prefers-reduced-motion`.

## Dati e limiti delle API

Il sito interroga direttamente le API REST pubbliche di GitHub, senza token o backend:

- `GET /users/jumping2000`
- `GET /users/jumping2000/repos?per_page=100&sort=pushed&type=owner`
- `GET /search/commits?q=author:jumping2000&sort=committer-date&order=desc&per_page=8`

Il feed commit riflette la ricerca GitHub: riguarda commit pubblici indicizzati sul branch predefinito e può non includere commit appena inviati, branch secondari o repository privati. L'API può essere soggetta a rate limit; in caso di errore, il sito mostra uno stato esplicito e un link alla ricerca GitHub, senza inventare dati.

Le API sono richieste dal browser di ogni visitatore: non viene salvato alcun dato personale sul sito. Il browser e GitHub possono applicare la propria cache.

## Personalizzazione

- `index.html`: testi, progetti, collegamenti e contenuti.
- `assets/site.css`: tema Matrix, componenti, layout e responsive design.
- `assets/site.js`: filtri, API GitHub, feed attività e animazione Matrix.
- `assets/favicon.svg`: favicon.
