# AI CRM met mail-, Drive- en Todoist-assistent

Een persoonlijk CRM dat zelfstandig (2x per dag, in de cloud — jouw PC hoeft niet aan) je mail en Drive-notities leest, per klant/lead bijhoudt waar je staat, voorgestelde pipeline-verschuivingen klaarzet, Gmail-drafts aanmaakt (verschijnen direct in Superhuman) en follow-up taken in Todoist zet.

## Voorgestelde pipeline

Je vroeg om advies. Toegespitst op trainingen (pdfcursus.nl): demo, offerte, datum plannen, uitvoeren, vervolg.

```text
1. Nieuwe lead         aanvraag binnen, nog geen contact
2. Contact gelegd      gereageerd, wacht op hun antwoord
3. Demo gepland        demo/intake staat in de agenda
4. Demo gehad          behoefte en groepsgrootte bekend
5. Offerte uit         voorstel verstuurd, in beslissing
6. Datum plannen       akkoord, trainingsdatum wordt vastgezet
7. Ingeplande training  datum staat, voorbereiding loopt
8. Gegeven / klant     training uitgevoerd
9. Herhaalklant        kandidaat voor vervolgtraining of extra groep
10. Koud / verloren    geen reactie of afgewezen (met reden)
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

## Kosten en tokengebruik

Uitgangspunt: 150 contacten, +50 per jaar. De AI draait **nooit** over je hele bestand — alleen over contacten met nieuwe activiteit sinds de vorige run. Realistisch is dat 10-30 contacten per dag, samen ongeveer 600-900 analyses per maand.

Per analyse gaat er ~2.000-4.000 tokens in (nieuwe mailtekst, ingekort, plus een compacte contactsamenvatting) en ~400-600 tokens uit. Dat is circa 2-3 miljoen input- en 0,4 miljoen output-tokens per maand.

Ruwe maandkosten, afhankelijk van het model:

```text
Gemini Flash Lite / Flash   ca. €1 - €5 per maand
GPT-mini-klasse             ca. €5 - €12 per maand
Frontier-model (GPT-5.x)    ca. €25 - €60 per maand
```

In Lovable-credits (als je niet je eigen Gemini-key gebruikt), zelfde volume per maand:

```text
Gemini Flash Lite / Flash   enkele credits, grotendeels gedekt door
                            de gratis AI-toelage van 4 credits/maand
Mini-klasse model           ca. 10 - 25 credits per maand
Frontier-model (GPT-5.x)    ca. 50 - 150 credits per maand
```

Dit is alleen de runtime-AI, los van de credits voor het bouwen. De app krijgt een tokenteller en een maandplafond zodat dit nooit ongemerkt oploopt.
```

Voorstel: standaard een goedkoop, snel model (Gemini Flash Lite-klasse) voor de dagelijkse triage, en alleen voor het schrijven van een concept-mail eventueel een sterker model. Dan blijf je in de praktijk rond €2-6 per maand.

### Waarom niet je Claude- of Gemini-abonnement

- **Claude-abonnement** en **Gemini in Google Workspace** zijn eindgebruikersabonnementen zonder API-toegang. Een server die zonder jouw PC draait kan er niet bij. Claude Code/Desktop zou betekenen dat je machine aan moet staan — precies wat je niet wil.
- **Superhuman AI** heeft geen publieke API; het werkt alleen in hun eigen client.

### Wel goedkoper: je eigen Gemini API-key

Je kunt in Google AI Studio (los van je Workspace-abonnement) een eigen Gemini API-key aanmaken. Die zetten we als secret in de app, en de CRM gebruikt die in plaats van Lovable-credits. Gemini Flash Lite heeft een gratis dagquotum dat voor dit volume ruim genoeg is, en daarboven kost het centen. Dan zijn je runtime-AI-kosten praktisch nul en gaat wat er wel is naar Google, niet naar Lovable-credits.

Ik bouw de AI-laag daarom achter één schakelaar: **eigen Gemini-key** (standaard, goedkoopst) of **Lovable AI** (geen setup). Wisselen kan later zonder de app te verbouwen.

### Tokens besparen door slim ontwerp

- Regels vóór AI: "geen reactie in 14 dagen", "mail bevat een afspraakbevestiging", "notitiebestand toegevoegd" worden zonder AI afgehandeld. Alleen echt onduidelijke gevallen gaan naar het model.
- Alleen nieuwe tekst mee, niet de hele thread; quotes, signatures en disclaimers worden eruit gestript.
- Per contact één samengevoegde analyse per run in plaats van één per mail.
- Nieuwsbrieven, no-reply-adressen en automatische antwoorden worden weggefilterd voordat er een token wordt gebruikt.
- Per contact een korte, doorlopende samenvatting die als context meegaat, in plaats van de volledige historie.
- Concept-mails worden alleen gegenereerd als je een voorstel goedkeurt, niet preventief voor iedereen.
- Een maandplafond in de instellingen: bij overschrijding stopt de AI-laag en blijven de regel-gebaseerde signalen gewoon werken.

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
- AI-analyse in server-side functies achter één provider-schakelaar: eigen Gemini API-key (standaard) of Lovable AI Gateway. Per contact een compacte bundel nieuwe events in, gestructureerd voorstel eruit. Alle prompts en keys blijven server-side.
- Idempotentie: elk Gmail-bericht-ID en Drive-bestand+revisie wordt één keer verwerkt; elk voorstel is aan een bron gekoppeld zodat je altijd kunt zien waarom iets voorgesteld werd.
- Tokenboekhouding per run in de database, zodat je in de app ziet wat de AI-laag deze maand gekost heeft en het plafond kan afdwingen.

## Nu starten

Ik begin met fase 1 en 2 zodat je snel een werkend overzicht hebt, daarna de AI-laag. De Gmail- en Drive-koppeling vraag ik in fase 2 via een connect-kaart in de chat; het Todoist-token in fase 4.
