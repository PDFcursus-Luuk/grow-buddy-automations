# Twee pijplijnen, klantenimport en klikbare overzichten

## 1. Twee pijplijnen: Cursus en Calculatie

Elk contact krijgt een **spoor**: `Cursus` (PDFcursus-traject, de huidige 10 fases), `Calculatie` (calculatiewerk) of `Geen pijplijn` (partner, leverancier, intern).

Eenvoudige calculatie-pijplijn (6 fases):

```text
Aanvraag  ->  Offerte uit  ->  Werk loopt  ->  Opgeleverd  ->  Terugkerend
                                                  \-> Koud / verloren
```

- Pipeline-pagina krijgt bovenaan een schakelaar **Cursus | Calculatie | Geen pijplijn**; per spoor zie je alleen de bijbehorende fases.
- In het contactformulier kies je eerst het spoor, daarna de fase (de lijst met fases past zich aan).
- Contacten zonder spoor blijven waar ze zijn: alle bestaande contacten worden op `Cursus` gezet, behalve wat hieronder als intern wordt gemarkeerd.
- De assistent stelt alleen fase-verschuivingen voor binnen het spoor van dat contact, en mag zelf voorstellen om een nieuw contact op Calculatie te zetten als de mail duidelijk over calculatiewerk gaat (jij keurt goed).

## 2. Eigen en administratieve adressen negeren

- LMcalculatie (jouw eigen bedrijf) en `ausgaben@accountable...` zijn geen leads. Deze worden gemarkeerd als **intern** en verdwijnen uit pipeline, Vandaag en de assistent-analyse.
- In Instellingen komt een veldje **"Negeer deze adressen/domeinen"** (regel per regel), voorgevuld met je eigen domeinen en het accountable-adres, zodat je later zelf vervuiling kunt toevoegen. De mailscan slaat die afzenders/ontvangers over en maakt er geen contact meer van.
- De 4 bestaande contacten met een LMcalculatie/accountable-adres worden opgeruimd (op intern gezet, uit de pipeline).

## 3. Excel-lijst importeren

De aangeleverde lijst (136 rijen) wordt in de CRM gezet, met bedrijf, plaats, e-mail, telefoon, klantnummer, btw-nummer, laatste contact en de notitie/volgende actie. Mapping van jouw kolommen:

| Excel-stage | Spoor | Fase in CRM |
| --- | --- | --- |
| Klant | Cursus | Klant |
| Dormant | Cursus | Herhaalklant-kandidaat (klant, stil) |
| Bijna klant / Onderhandeling | Cursus | Offerte uit |
| Warm / Lauw | Cursus | Contact gelegd |
| Koud / Afgekoeld | Cursus | Koud / verloren |
| Calculatie-klant | Calculatie | Opgeleverd |
| Partner / Leverancier | Geen pijplijn | — |

Bestaande contacten worden op e-mail gematcht en aangevuld in plaats van gedubbeld. Rijen zonder e-mail komen er wel in (op bedrijfsnaam), zodat je niets kwijt bent.

Voor volgende lijsten komt er in Instellingen een **importvenster**: je plakt de rijen (of upload een CSV), kiest het spoor, en ziet een voorbeeld voor je bevestigt.

## 4. Vandaag-tellers klikbaar

De vier kaarten worden knoppen naar een nieuwe pagina **Overzicht** met tabbladen:

- **Open voorstellen** — alle wachtende voorstellen, met goedkeuren/afwijzen
- **Actieve leads & klanten** — filterbaar op spoor en fase
- **Te lang stil** — volledige lijst, niet alleen de eerste 8
- **Open taken** — volledige takenlijst

Elke rij linkt door naar het contactdossier.

## Technische details

- Migratie: nieuwe enums `contact_track` (`cursus`, `calculatie`, `none`) en `calc_stage`; kolommen `contacts.track`, `contacts.calc_stage`, `contacts.is_internal`; `crm_settings.ignore_patterns text[]` met defaults. GRANTs + bestaande RLS-policy dekt de nieuwe kolommen.
- Data: import van de Excel-rijen als literal INSERT/UPDATE-statements in dezelfde migratie; opruimactie voor de 4 interne contacten.
- `src/lib/crm.ts`: `CALC_STAGES` + `CALC_STAGE_META`, helper `stagesForTrack(track)`.
- `src/lib/gmail.server.ts` / `assistant-run.server.ts`: negeerlijst uit settings toepassen bij contactherkenning; prompt krijgt het spoor mee en beperkt fase-voorstellen tot dat spoor.
- Nieuwe route `src/routes/overzicht.tsx` (tabs via query param), `pipeline.tsx` krijgt spoor-schakelaar, `ContactFormDialog` krijgt spoorkeuze, `index.tsx` stat-kaarten worden links.
