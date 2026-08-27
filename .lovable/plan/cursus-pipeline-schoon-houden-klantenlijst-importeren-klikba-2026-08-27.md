# Cursus-pipeline schoon houden, klantenlijst importeren, klikbare overzichten

## 1. Spoor per contact (geen tweede pipeline)

Elk contact krijgt een **spoor**:

- **Cursus** — hoort in de PDFcursus-pipeline (de huidige 10 fases)
- **Calculatie** — calculatiewerk, staat NIET in de pipeline
- **Overig** — partner, leverancier, intern

Alleen `Cursus` verschijnt in de pipeline, in "Vandaag" en in de assistent-analyse. Calculatie- en overige contacten blijven bewaard en zijn terug te vinden in een aparte lijst, maar vervuilen je cursustraject niet.

- Pipeline-pagina krijgt bovenaan een filter **Cursus | Calculatie | Overig | Alles**; standaard staat die op Cursus.
- In het contactformulier kies je het spoor (standaard Cursus).
- Op het contactdossier zit een snelknop **"Haal uit cursus-pipeline"** → zet het spoor op Calculatie of Overig.
- Alle bestaande contacten worden op Cursus gezet, behalve de interne adressen hieronder en wat de importlijst als calculatie/partner/leverancier markeert.
- De assistent stelt geen fases meer voor bij niet-cursus-contacten; als de mail duidelijk over calculatiewerk gaat mag hij voorstellen het contact naar Calculatie te verplaatsen (jij keurt goed).

## 2. Eigen en administratieve adressen negeren

- LMcalculatie (jouw eigen bedrijf) en `ausgaben@accountable…` zijn geen leads → gemarkeerd als **intern**, uit pipeline, Vandaag en analyse.
- In Instellingen komt een veld **"Negeer deze adressen/domeinen"** (één per regel), voorgevuld met je eigen domeinen en het accountable-adres. De mailscan maakt van die afzenders/ontvangers geen contact meer.
- De 4 bestaande contacten met een LMcalculatie/accountable-adres worden opgeruimd.

## 3. Eenmalige import van de Excel-lijst

De 136 rijen komen eenmalig in de CRM: bedrijf, contactpersoon, plaats, e-mail, telefoon, laatste contact en de notitie/volgende actie. Klantnummer en btw-nummer laten we weg. Geen importfunctie in de app — daarna houdt de CRM het zelf bij.

| Excel-stage | Spoor | Fase |
| --- | --- | --- |
| Klant | Cursus | Klant |
| Dormant | Cursus | Klant (stil, reactivatiekandidaat) |
| Bijna klant / Onderhandeling | Cursus | Offerte uit |
| Warm / Lauw | Cursus | Contact gelegd |
| Koud / Afgekoeld | Cursus | Koud / verloren |
| Calculatie-klant | Calculatie | — |
| Partner / Leverancier | Overig | — |

Bestaande contacten worden op e-mailadres gematcht en aangevuld in plaats van gedubbeld. Rijen zonder e-mail komen er ook in (op bedrijfsnaam), zodat je niets kwijt bent.

## 4. Vandaag-tellers klikbaar

De vier kaarten worden knoppen naar een nieuwe pagina **Overzicht** met tabbladen:

- **Open voorstellen** — alle wachtende voorstellen, met goedkeuren/afwijzen
- **Actieve leads & klanten** — filterbaar op fase
- **Te lang stil** — volledige lijst, niet alleen de eerste 8
- **Open taken** — volledige takenlijst

Elke rij linkt door naar het contactdossier.

## Technische details

- Migratie: enum `contact_track` (`cursus`, `calculatie`, `overig`); kolommen `contacts.track` (default `cursus`), `contacts.is_internal`; `crm_settings.ignore_patterns text[]` met defaults. Bestaande RLS-policy dekt de nieuwe kolommen.
- Data (via run_sql, geen migratie): import van de Excel-rijen als INSERT/UPDATE op e-mail, plus het op intern zetten van de LMcalculatie/accountable-contacten.
- `useContacts` filtert standaard op `track = 'cursus'` en `is_internal = false`; een tweede hook levert de overige lijsten.
- `src/lib/gmail.server.ts` / `assistant-run.server.ts`: negeerlijst uit settings toepassen bij contactherkenning; analyse slaat niet-cursus-contacten over.
- Nieuwe route `src/routes/overzicht.tsx` (tabs via query param); `pipeline.tsx` krijgt het spoorfilter; `ContactFormDialog` en het contactdossier krijgen de spoorkeuze; `index.tsx` stat-kaarten worden links.
