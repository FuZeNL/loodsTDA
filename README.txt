LOODS TRACKER
=============

Bestanden
  server.js          de server (zonder extra pakketten)
  public/index.html  de pagina
  public/style.css   de vormgeving
  public/app.js      de werking van de pagina
  data/db.json       de database (hier staan alle registraties in)

Starten op je eigen computer
  1. Installeer Node.js (versie 16 of nieuwer): https://nodejs.org
  2. Open een terminal in deze map en typ:   node server.js
  3. Ga naar http://localhost:3000 in je browser.

Wachtwoorden (VERANDER HET BEHEERDERSWACHTWOORD!)
  Leden:       LoodsMrtTC
  Beheerder:   Verander-Dit-Admin   (alleen jij, om regels te verwijderen)
  Aanpassen kan met omgevingsvariabelen:
     LOODS_PASSWORD=...  ADMIN_PASSWORD=...  node server.js
  of door de regels bovenaan server.js te wijzigen.

Online zetten zodat anderen erbij kunnen
  De pagina heeft een server nodig (voor de database). Gratis of goedkope opties:
  Render.com, Railway.app, Fly.io of een eigen VPS. Kies "Node" als type,
  startcommando: node server.js. Zorg dat de map data/ bewaard blijft
  (een "persistent disk"/volume), anders verdwijnen de gegevens bij een herstart.

Beheerder zijn
  Klik bovenaan op "Beheerder" en vul het beheerderswachtwoord in.
  Dan verschijnt bij het logboek een kruisje om regels te verwijderen.

Reset de gegevens
  Stop de server en zet in data/db.json:   { "entries": [] }
