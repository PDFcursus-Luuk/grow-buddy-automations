# AI CRM met mail-, Drive- en Todoist-assistent

Een persoonlijk CRM dat zelfstandig (2x per dag, in de cloud — jouw PC hoeft niet aan) je mail en Drive-notities leest, per klant/lead bijhoudt waar je staat, voorgestelde pipeline-verschuivingen klaarzet, Gmail-drafts aanmaakt (verschijnen direct in Superhuman) en follow-up taken in Todoist zet.

## Voorgestelde pipeline

Je vroeg om advies. Voorstel — zeven fases, geschikt voor dienstverlening met herhaalklanten:

```text
1. Nieuwe lead        binnengekomen, nog geen contact
2. Contact gelegd     eerste mail/gesprek gestuurd, wacht op reactie
3. Gesprek gehad      call/Meet geweest, behoefte bekend
4. Voorstel uit       aanbod/quote verstuurd, in beslissing
5. Klant              lopende opdracht
6. Herhaalklant       opdracht afgerond, kandidaat voor vervolg
7. Koud / verloren    geen reactie of afgewezen (met reden)
```

Extra signalen naast de fase: eigenaar van de volgende stap (jij of zij), datum laatste contact, en een automatische "wordt stil"-vlag na X dagen zonder reactie. Dat laatste is precies waar je nu leads verliest — de dagelijkse run zet zulke contacten bovenaan.

## Wat de dagelijkse run doet

Twee keer per dag (bijv. 07:30 en 16:30):

1. Nieuwe Gmail-berichten ophalen van bekende contacten + nieuwe afzenders.
2. Nieuwe/gewijzigde bestanden uit een aangewezen Google Drive-map lezen: Meet-notities (Google Docs) en `.txt` notities.
3. Per contact laat de AI de nieuwe correspondentie langs de pipeline lopen en produceert:
   - een korte samenvatting van wat er gebeurd is
   - een **voorgestelde** fase-verschuiving met reden en bron (jij keurt goed)
   - een voorgestelde vervolgactie + datum
   - waar zinvol een concept-mail
4. Alles komt in een dagelijkse **Actielijst**. Per item: Goedkeuren, Aanpassen of Afwijzen.
5. Bij goedkeuren: fase wordt bijgewerkt, Gmail-draft aangemaakt (zichtbaar in Superhuman), en/of Todoist-taak aangemaakt met deadline.

Niets wordt zonder jouw akkoord verstuurd. Drafts worden nooit automatisch verzonden.

## Schermen

- **Dagoverzicht** — de actielijst van vandaag, plus "stille" leads en achterstallige follow-ups.
- **Pipeline (kanban)** — kolommen per fase, kaarten slepen kan ook handmatig.
- **Contactdetail** — tijdlijn van mails, notities, fase-wijzigingen (met reden en bron), drafts en taken.
- **Campagnes** — reeksen van 3-5 mails (bijv. "warm houden", "herhaalopdracht", "nieuwe lead opvolgen"). De AI personaliseert per contact; elke stap komt als draft in je actielijst.
- **Instellingen** — Drive-map kiezen, run-tijden, stiltedrempel, tone-of-voice voor drafts, Todoist-project.

## Aanpak in fases

**Fase 1 — CRM-kern**: database (contacten, bedrijven, pipeline-fases, tijdlijn-events, voorstellen, drafts, taken), inlog, kanban + contactdetail + dagoverzicht. Handmatig al bruikbaar.

**Fase 2 — Gmail + Drive**: connectors koppelen, synchronisatie van mails en Drive-notities naar de tijdlijn, ontdubbeling per bericht/bestand.

**Fase 3 — AI-analyse**: per contact de nieuwe correspondentie beoordelen; voorstellen genereren met reden, bron en zekerheid. Goedkeur-flow in de UI.

**Fase 4 — Drafts, Todoist, campagnes**: Gmail-drafts aanmaken op goedkeuring, Todoist-taken, campagnereeksen met stap-tracking.

**Fase 5 — Automatisch draaien**: geplande run 2x per dag in de cloud, met runlog en foutmeldingen zichtbaar in de app.

## Technisch

- Lovable Cloud voor database, inlog en geplande taken (pg_cron die een `/api/public/*` route met bearer-auth aanroept). Draait server-side, onafhankelijk van je PC.
- Gmail-connector (gateway) voor `users.messages.list/get`, `users.drafts.create` (incl. `threadId` zodat de draft in de juiste thread staat) en labels. Superhuman leest Gmail, dus drafts verschijnen daar automatisch — geen Superhuman-API nodig.
- Google Drive-connector voor `files.list` op een gekozen map met `modifiedTime`-filter; Google Docs via export naar tekst, `.txt` via download.
- Todoist REST v2 direct met jouw persoonlijke API-token, opgeslagen als secret. Ik vraag het token pas op als fase 4 aan de beurt is.
- AI-analyse via Lovable AI Gateway met server-side functies; per contact een compacte bundel nieuwe events in, gestructureerd voorstel eruit. Alle prompts en keys blijven server-side.
- Idempotentie: elk Gmail-bericht-ID en Drive-bestand+revisie wordt één keer verwerkt; elk voorstel is aan een bron gekoppeld zodat je altijd kunt zien waarom iets voorgesteld werd.
- Gemini uit je Workspace-abonnement is niet als API bruikbaar in de app; de AI-analyse loopt daarom via Lovable AI (credits van je Lovable-workspace).

## Nu starten

Ik begin met fase 1 en 2 zodat je snel een werkend overzicht hebt, daarna de AI-laag. De Gmail- en Drive-koppeling vraag ik in fase 2 via een connect-kaart in de chat; het Todoist-token in fase 4.
