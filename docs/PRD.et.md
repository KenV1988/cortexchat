# cortexchat — Tootenõuete dokument (PRD)

| | |
|---|---|
| **Versioon** | 1.0 |
| **Kuupäev** | 19.07.2026 |
| **Staatus** | 1. verstapost valmis; teekaart kinnitatud |
| **Repositoorium** | https://github.com/KenV1988/cortexchat |
| **Litsents** | MIT (täielikult avatud lähtekoodiga) |

---

## 1. Kokkuvõte

cortexchat on avatud lähtekoodiga, ise majutatav tehisintellekti
vestlusrakendus, mis tundub igapäevakasutuses võrreldav ChatGPT või
Claude'iga, kuid mille kasutamine maksab **0 €**. Selle tuumaks on tark
mudelivalija (ruuter): iga sõnum liigitatakse mikrosekunditega (ilma ühegi
mudelipäringuta) ja saadetakse väikseimale tasuta mudelile, mis suudab
sellele hästi vastata — tervituse jaoks pisike kohalik mudel, koodi ja
kirjutamise jaoks keskmine kohalik mudel ning ainult tõeliselt raskete
ülesannete jaoks võimsaimad tasuta avatud lähtekoodiga pilvemudelid.
Kasutaja ei pea kunagi mudelit valima; süsteemi valik ja selle põhjendus
on alati nähtavad.

## 2. Probleem ja võimalus

Levinud tehisintellekti vestlustooted suunavad iga sõnumi — ka "tere" —
läbi tipptasemel mudelite, mis on kallid, energianäljased ja pilve külge
lukustatud. Kasutajad maksavad kuutasu, loovutavad oma vestlusandmed ja
kaotavad ligipääsu täielikult, kui internetti pole. Samal ajal vastavad
tavalisel sülearvutil töötavad avatud lähtekoodiga mudelid suurele osale
igapäevastest küsimustest sama hästi.

Võimalus: vestlustoode, mille *vaikimisi* režiim on tasuta, privaatne ja
kohalik ning mis kasutab suuremaid (endiselt tasuta, endiselt avatud
lähtekoodiga) mudeleid ainult siis, kui päring seda tõesti nõuab —
maksimaalne intelligentsus vati ja euro kohta.

## 3. Eesmärgid ja edukriteeriumid

1. **Igapäevakasutuses võrreldav ChatGPT/Claude'iga**: voogedastusega
   vastused, markdown ja koodi esiletõstmine, vestluste ajalugu, kasutaja
   mäletamine sessioonide üleselt.
2. **Vaikimisi 0 € maksumus.** Iga mudel komplektis olevas registris on
   tasuta — seda tagab automaattest, mis kukub läbi, kui registrisse
   lisatakse tasuline mudel.
3. **Tark marsruutimine.** ≥90% tervitustest/väikevestlusest/lihtsatest
   küsimustest käsitleb kohalik mudel, kui Ollama on saadaval;
   eskaleerimine ainult liigitatud vajaduse või madala kindluse korral;
   marsruutimisotsus on kasutajaliideses alati selgitatav.
4. **Töötab võrguühenduseta.** Kohalike mudelitega töötab põhivestlus
   täiesti ilma internetita, halvenedes läbipaistvalt (mitte kunagi
   vaikselt).
5. **Töötab kõikjal ühest koodibaasist.** Veebis natiivselt; töölaual,
   Androidis ja iOS-is PWA paigaldusena.
6. **Ei mingit teenusepakkuja lukustust.** Iga alamsüsteem (LLM-pakkuja,
   vektoresitused, andmebaas, mälu) asub liidese taga; teostuse vahetus
   nõuab seadistust, mitte koodimuudatusi.

## 4. Mitte-eesmärgid (praegune verstapost)

- Natiivsed binaarfailid (.exe/.dmg/.apk/.ipa) — plaanis Tauri/Expo kaudu
  (§12).
- Mitme kasutaja kontod ja autentimine — ühe kasutaja jaoks, ise
  majutatav.
- Piltide mõistmine, OCR, heli — ruuter liigitab need, kuid neid ei saa
  veel marsruutida; päringud lõpevad selge tüübitud veaga, mitte vale
  käsitlemisega.
- Veebiotsing / RAG dokumentide üle / tööriistade kasutus /
  mitmeagendiline täitmine — teekaardi punktid, teadlikult mitte
  poolikult tehtud.
- Igasugune monetiseerimine. Projekt on MIT-litsentsiga ja tasuta.

## 5. Sihtkasutajad

- **Privaatsusteadlikud inimesed**, kes tahavad AI-vestlust ilma iga
  klahvivajutust USA pilveteenusele saatmata.
- **Kulutundlikud kasutajad** (tudengid, hobikasutajad), kes tahavad
  ChatGPT-taset ilma kuutasuta.
- **Isemajutajad ja nokitsejad**, kellel on koduserver ja kes tahavad
  moodulaarset, kohandatavat AI-lahendust.
- **Arendajad**, kes vajavad puhast näidisarhitektuuri
  pakkujasõltumatuks LLM-marsruutimiseks.

## 6. Tootepõhimõtted

1. **Tasuta ennekõike.** Vaikimisi kogemus ei tohi kunagi raha maksta.
2. **Kohalik ennekõike.** Eelista kasutaja enda riistvara; pilv on
   eskalatsioon, mitte sõltuvus.
3. **Läbipaistev, mitte maagiline.** Iga marsruutimisotsus näitab, milline
   mudel vastas ja miks. Halvendatud režiimid on nähtavad, mitte kunagi
   vaikivad.
4. **Päris või puudu.** Funktsioonid ilmuvad töötavana ja testituna või
   on dokumenteeritud kui veel-ehitamata. Ei mingeid tühje
   näidislahendusi, mis töötamist ainult teesklevad.
5. **Kõik on asendatav.** Liidesed teostuste asemel; YAML koodimuudatuste
   asemel.

## 7. Funktsionaalsed nõuded

### 7.1 Teostatud (1. verstapost)

| ID | Nõue | Staatus |
|----|------|---------|
| F1 | Voogedastusega vestlus markdowni ja koodi esiletõstmisega | ✅ |
| F2 | Reeglipõhine päringu liigitus 16 kategooriasse, null mudelipäringut | ✅ |
| F3 | Astmeline marsruutimine (pisike kohalik → keskmine kohalik → avatud pilv → lipulaev → MoE), võidab odavaim võimekas mudel, kindlusepõhine eskaleerimine | ✅ |
| F4 | Pakkujaadapterid: Ollama, OpenRouter, OpenAI, Anthropic ühe liidese taga | ✅ |
| F5 | Seadistuspõhine mudeliregister (YAML) — mudeleid saab lisada/eemaldada/ümber järjestada ilma koodita | ✅ |
| F6 | Vestluste püsisalvestus: ajalugu, ümbernimetamine, kinnitamine, kaustad, kustutamine | ✅ |
| F7 | Pikaajaline mälu: semantiline (vektoresitusega) otsing märksõna-varuvariandiga, olulisuse hindamine, ajapõhine unustamine | ✅ |
| F8 | Töömälu aken koos aknast välja jäänud konteksti automaatse kokkuvõtmisega odavaima mudeli abil | ✅ |
| F9 | Mälu haldusliides: vaata, lisa, kustuta, ekspordi kõik meelde jäetu | ✅ |
| F10 | Marsruutimise läbipaistvusmärgis iga vastuse juures (mudel, aste, kategooria, põhjendus) | ✅ |
| F11 | Tume/hele teema, mobiilisõbralik paigutus, PWA paigaldus 4 platvormil | ✅ |
| F12 | Pakkujate/mudelite olekuleht | ✅ |

### 7.2 Plaanis (teekaardi järjekorras)

| ID | Nõue | Faas |
|----|------|------|
| P1 | Piltide üleslaadimine + nägemisvõimekusega tasuta mudelid; OCR; heli transkriptsioon | 2 |
| P2 | Failide sisselugemine (PDF/Word/Excel/CSV/repod) mällu koos viidatud vastustega (RAG) | 3 |
| P3 | Tööriistade kasutus: MCP-klient, funktsioonide väljakutsed, liivakastis terminal/failisüsteem lubade küsimisega | 4 |
| P4 | Mitmeagendiline täitmine (planeerija/programmeerija/uurija/ülevaataja), aktiveerub ainult mitmeosaliste ülesannete puhul | 5 |
| P5 | Natiivsed töölaua- (Tauri) ja mobiilikestad (Expo), mis jagavad olemasolevaid pakette | 6 |
| P6 | Ise-optimeeruv ruuter: salvestatud marsruutimisandmete põhjal liigitaja lävendite häälestamine | 7 |
| P7 | Valikuline autentimine + mitme kasutaja režiim; pluginate SDK | 8 |

## 8. Mittefunktsionaalsed nõuded

- **Maksumus:** vaikimisi register 100% tasuta (testiga tagatud). Tasuta
  pilveaste nõuab OpenRouteri kontot, kuid mitte maksevahendit.
- **Privaatsus:** vestlused ja mälu ainult kohalikus SQLite-failis; miski
  ei lahku masinast, kui päring just pilvemudelile ei marsruudu.
  API-võtmed elavad `.env`-failis, mitte kunagi andmebaasis ega
  brauseris.
- **Jõudlus:** liigitus lisab <1 ms; esimene märk kohalikest pisimudelitest
  tavaliselt <1 s kaasaegsel sülearvutil.
- **Võrguühenduseta töö:** täisfunktsionaalsus kohalikult kaetud
  kategooriates ilma võrguta; muul juhul nähtav halvenemine.
- **Kvaliteet:** range TypeScript kõikjal; 70+ automaattesti igas
  paketis; CI käivitab tüübikontrolli, testid, veebi- ja Dockeri ehituse.
- **Kaasaskantavus:** Node 20+, mistahes OS; Dockeri tõmmis kaasas;
  SQLite tähendab nulli välist taristut.

## 9. Platvormid ja levitamine

Üks koodibaas. Server töötab kasutaja arvutis/koduserveris/pilvemasinas;
kliendid ühenduvad mistahes seadmest.

| Platvorm | Teostus | Paigaldustee |
|----------|---------|--------------|
| Veeb | Next.js rakendus | ava mistahes brauseris |
| Töölaud (Win/macOS/Linux) | PWA | Chrome/Edge aadressiriba paigaldusnupp |
| Android | PWA | Chrome → Lisa avakuvale |
| iOS/iPadOS | PWA | Safari → Jaga → Lisa avakuvale |

Tänane levitus on lähtekood (git clone / väljalaskearhiiv) + Docker.
Rakenduspoodides levitamine jääb faasi P5.

## 10. Arhitektuuri ülevaade

Monorepo viie tööruumiga: `packages/core` (tüübid, liigitaja, ruuter —
null sõltuvust), `packages/providers` (LLM-adapterid), `packages/db`
(SQLite/Drizzle), `packages/memory` (töö- ja semantiline mälu),
`apps/web` (Next.js kasutajaliides + API). Täpsem kirjeldus failis
[ARCHITECTURE.md](ARCHITECTURE.md) ja kolmes ADR-dokumendis.

## 11. Edumõõdikud

- Päringute osakaal astmete lõikes (siht: enamik kohalikult, kui Ollama
  on olemas) — marsruutimisandmed salvestatakse juba iga sõnumi juures.
- Null eurot arveid tavakasutuses (struktuurselt tagatud).
- Aeg esimese märgini astmete lõikes.
- Testikomplekt roheline iga commit'iga.

## 12. Riskid ja maandamised

| Risk | Maandamine |
|------|------------|
| OpenRouter eemaldab/piirab tasuta mudeleid | Register on YAML-is sekunditega muudetav; kohalikud astmed pole mõjutatud; testid püüavad võimekuslüngad kinni |
| Vale liigitus saadab raske küsimuse nõrgale mudelile | Kindlusepõhine eskaleerimine; nähtav marsruutimismärgis; faas P6 häälestab päris andmete pealt |
| PWA piirangud võrreldes natiivrakendustega (push-teated, iOS-i eripärad) | 1. verstaposti jaoks vastuvõetav; natiivkestad plaanis (P5) |
| Ollama pole paigaldatud → kohalik lugu halveneb | Rakendus töötab tasuta pilveastme kaudu edasi; selge olekuleht + dokumentatsioon |
| Ühe kasutaja eeldus kestab liiga kaua | Autentimine/mitu kasutajat on selgelt teekaardil (P7) enne igasugust avaliku majutuse lugu |

## 13. Verstapostid

- **V1 (valmis):** kõik §7.1 punktid — töötav, testitud, dokumenteeritud.
- **V2–V8:** üks teekaardi faas korraga (§7.2), igaüks valmib täielikult
  töötava ja testituna enne järgmise alustamist.
