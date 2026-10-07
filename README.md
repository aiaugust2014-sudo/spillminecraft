# 🟩 BLOKK ROYALE

**Minecraft × Fortnite × Brawl Stars** – i ett sykt nettleserspill!

Grav som i Minecraft, bygg som i Fortnite og slåss som i Brawl Stars. Ti brawlere hopper ut av Kampbussen over en blokkøy – sistemann igjen vinner **#1 VICTORY ROYALE**.

## Slik starter du

Ingen installasjon trengs. Åpne `blokk-royale.html` (hele spillet i én fil) eller `index.html` i nettleseren (Chrome, Edge, Firefox eller Safari).
Spillet virker både på PC og mobil/nettbrett.

> Tips: Slår du på **GitHub Pages** for repoet (Settings → Pages → «Deploy from a branch»), kan du spille på `https://<brukernavn>.github.io/spillminecraft/` – også på mobilen.

## Hva er hentet fra hvert spill?

| Fra **Minecraft** ⛏️ | Fra **Fortnite** 🚌 | Fra **Brawl Stars** ⭐ |
|---|---|---|
| Blokkverden med trær, stein, jern og diamanter | Kampbussen – velg selv hvor du hopper ut | Brawlere med eget angrep, SUPER og passiv evne |
| Grav med hakka og samle materialer | Stormen som krymper | 3 ammo-ladninger som lades opp |
| Crafting (bandasjer, TNT, skjolddrikk, tårn) | Bygg vegger av tre, stein og metall | Kraftkuber gjør deg sterkere |
| Hotbar med 8 plasser, sprekker når blokker knuses | Kister og loot med sjeldenhetsfarger | Busker du kan gjemme deg i |
| Pikselgrafikk | Victory Royale | Trofeer for hver runde |

## Brawlere

| Brawler | Rolle | Angrep | SUPER | Passiv |
|---|---|---|---|---|
| **Kubekriger** | Allrounder | 3 raske skudd | TNT-kast som sprenger blokker | Graver 50 % raskere |
| **Skarpskytter Siri** | Snikskytter | Armbrøst med lang rekkevidde | Diamantlaser gjennom alt | Ser fiender i busker lenger unna |
| **Tanks-Tor** | Tank | Hagle på kort hold | Golem-stormløp som knuser vegger | Tåler stormen bedre |
| **Heksa Hedda** | Kaster | Trylledrikk som kastes over vegger | Giftsky | Bandasjer helbreder dobbelt |
| **Bygg-Bjørn** | Bygger | 3 spiker i vifte | Metallvegg + vakttårn | Bygger til halv pris |

## Kontroller

**PC**

| Tast | Handling |
|---|---|
| WASD / piltaster | Gå |
| Mus | Sikt |
| Venstreklikk | Skyt / bygg / bruk det du har valgt i hotbaren |
| Høyreklikk eller F | Grav med hakka (slår også fiender) |
| 1–8 eller musehjulet | Velg plass i hotbaren |
| Q | Rask vegg (3 blokker) foran deg |
| E eller mellomrom | SUPER (og hopp ut av bussen) |
| C | Crafting |
| Esc | Pause |

**Mobil:** Venstre tommel styrer. Med høyre tommel sikter du, og når du slipper, skyter du (trykker du bare, sikter spillet automatisk). Egne knapper for SUPER, GRAV, VEGG og crafting.

## Crafting-oppskrifter

| Ting | Koster | Effekt |
|---|---|---|
| Bandasje | 20 tre | Helbreder 40 % |
| Skjolddrikk | 10 jern + 1 diamant | Skjold på 50 % av livet |
| TNT | 15 stein + 5 jern | Kastbar sprengladning |
| Vakttårn | 25 jern + 20 stein | Skyter fiender automatisk |
| Kraftkube | 3 diamanter | +10 % liv og skade for alltid |

## Teknisk

Ren HTML5 Canvas og JavaScript uten avhengigheter eller byggesteg. All grafikk og lyd lages i koden.

```
index.html      – sider og menyer
style.css       – utseende på menyer og knapper
js/config.js    – spilldata (brawlere, blokker, oppskrifter)
js/world.js     – generering av øya
js/combat.js    – kamp, bygging, graving, loot
js/ai.js        – bot-ene
js/storm.js     – stormen og Kampbussen
js/render.js    – tegning av verden
js/hud.js       – HUD og menyer
js/input.js     – tastatur, mus og berøring
js/textures.js  – pikselteksturer
js/audio.js     – lydeffekter
js/main.js      – hovedløkka
```
