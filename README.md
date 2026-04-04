# Ingelstadgymnasiet – Prova-på-bokningssystem
## Driftsättningsguide för Windows

---

## Vad du behöver skapa konton på (alla gratis)

| Tjänst | Länk | Vad det är |
|--------|------|------------|
| Supabase | https://supabase.com | Databas + lagring |
| Resend | https://resend.com | E-postutskick |
| Vercel | https://vercel.com | Hosting |
| GitHub | https://github.com | Koddepå (krävs för Vercel) |

---

## STEG 1 – Installera verktyg på datorn

Öppna **PowerShell** (sök efter det i Start-menyn).

### 1a. Installera Node.js
Gå till https://nodejs.org och ladda ned **LTS-versionen** (t.ex. 20.x).
Kör installationsfilen. Välj alla standardalternativ.

Verifiera att det fungerar:
```powershell
node --version
npm --version
```
Bägge ska skriva ut ett versionsnummer.

### 1b. Installera Git
Gå till https://git-scm.com/download/win och ladda ned Git för Windows.
Kör installationsfilen. Välj alla standardalternativ.

```powershell
git --version
```

---

## STEG 2 – Skapa Supabase-projekt

1. Gå till https://supabase.com och skapa ett konto
2. Klicka **New project**
3. Välj: Organisation → New organization (eller din befintliga)
4. Namn: `ingelstad-bokning`
5. Database password: Välj ett starkt lösenord och **spara det**
6. Region: `eu-north-1` (Stockholm) eller `eu-central-1` (Frankfurt)
7. Klicka **Create new project** – vänta ca 1 minut

### Kör databasschemat

1. Klicka på **SQL Editor** i vänstermenyn
2. Klicka **New query**
3. Öppna filen `supabase-schema.sql` från projektet
4. Kopiera allt innehåll och klistra in i SQL Editor
5. Klicka **Run** (grön knapp)
6. Du ska se "Success" för varje tabell

7. Gör samma sak med `supabase-functions.sql`

### Hämta API-nycklar

1. Gå till **Settings → API** i Supabase
2. Kopiera och spara:
   - **Project URL** (t.ex. `https://abcdef.supabase.co`)
   - **anon public** (under "Project API keys")
   - **service_role** (under "Project API keys" – klicka Reveal)

---

## STEG 3 – E-postinställningar

E-post skickas via er vanliga mailserver (SMTP) — inga extra tjänster eller konton behövs.

Du konfigurerar detta direkt i admin-panelen när systemet är uppe:
1. Logga in som admin
2. Gå till **Admin → E-post**
3. Fyll i:
   - **SMTP-server** — fråga IT-avdelningen (Microsoft 365: `smtp.office365.com`, Google: `smtp.gmail.com`)
   - **Port** — vanligtvis `587`
   - **Användarnamn** — e-postadressen som ska skicka (t.ex. `noreply@ingelstad.nu`)
   - **Lösenord** — lösenordet till den adressen

> **Tips för Microsoft 365:** IT-avdelningen kan behöva aktivera SMTP-autentisering för kontot. Det görs i Microsoft 365 Admin Center under användarkontots inställningar.

---

## STEG 4 – Förbered projektet på din dator

Öppna PowerShell och navigera dit du vill ha projektet:
```powershell
cd C:\Users\DittNamn\Documents
```

Unzippa projektet och gå in i mappen:
```powershell
cd ingelstad-v1
```

Installera beroenden:
```powershell
npm install
```
(Tar 1-2 minuter)

### Skapa miljövariabelfilen

```powershell
copy .env.local.example .env.local
```

Öppna `.env.local` i Anteckningar eller VS Code och fyll i:
```
NEXT_PUBLIC_SUPABASE_URL=https://DITT-PROJEKT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=din-anon-nyckel
SUPABASE_SERVICE_ROLE_KEY=din-service-role-nyckel
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> E-postinställningarna (SMTP) läggs in i admin-panelen — inte här.

### Testa lokalt

```powershell
npm run dev
```

Öppna webbläsaren på http://localhost:3000

---

## STEG 5 – Lägg till prototypen i projektet

Kopiera prototypfilen till public-mappen:
```powershell
copy "C:\sökväg\till\ingelstad-bokning.html" public\prototype.html
```

Starta om dev-servern:
```powershell
# Tryck Ctrl+C för att stoppa, sedan:
npm run dev
```

---

## STEG 6 – Skapa admin-användare i databasen

Gå tillbaka till Supabase SQL Editor och kör (byt ut lösenordet!):

```sql
INSERT INTO staff (username, name, email, role, password_hash)
VALUES (
  'admin',
  'Administratör',
  'din@epost.se',
  'admin',
  encode(digest('DITTLÖSENORD' || 'ingelstad-salt', 'sha256'), 'hex')
);
```

> OBS: Byt ut `DITTLÖSENORD` mot ett riktigt lösenord innan du kör.

---

## STEG 7 – Driftsätt på Vercel

### 7a. Skapa GitHub-repo

1. Gå till https://github.com och skapa ett konto om du inte har
2. Klicka **New repository**
3. Namn: `ingelstad-bokning`, sätt till **Private**
4. Klicka **Create repository**

Ladda upp koden:
```powershell
git init
git add .
git commit -m "Initial version"
git branch -M main
git remote add origin https://github.com/DITT-ANVÄNDARNAMN/ingelstad-bokning.git
git push -u origin main
```

### 7b. Driftsätt på Vercel

1. Gå till https://vercel.com och skapa konto (välj "Continue with GitHub")
2. Klicka **Add New → Project**
3. Välj ditt `ingelstad-bokning`-repo
4. Klicka **Deploy** – vänta ca 2 minuter

### 7c. Lägg till miljövariabler i Vercel

1. Gå till ditt projekt i Vercel → **Settings → Environment Variables**
2. Lägg till alla variabler från din `.env.local` (en i taget)
3. **Viktigt:** Ändra `NEXT_PUBLIC_APP_URL` till din Vercel-URL (t.ex. `https://ingelstad-bokning.vercel.app`)
4. Gå till **Deployments** och klicka **Redeploy** för att aktivera variablerna

---

## STEG 8 – Koppla egen domän (när IT är redo)

1. I Vercel: **Settings → Domains → Add**
2. Ange `boka.ingelstad.nu`
3. Vercel visar en DNS-post (CNAME) att lägga till
4. Ge DNS-posten till IT-avdelningen
5. Vercel aktiverar automatiskt HTTPS via Let's Encrypt

---

## Snabbreferens – vanliga kommandon

```powershell
# Starta lokalt
npm run dev

# Bygga för produktion (testar att allt kompilerar)
npm run build

# Uppdatera Vercel efter kodändring
git add .
git commit -m "Beskrivning av ändringen"
git push
# Vercel driftsätter automatiskt!
```

---

## Felsökning

| Problem | Lösning |
|---------|---------|
| `npm: command not found` | Installera om Node.js och starta om PowerShell |
| `Cannot find module` | Kör `npm install` igen |
| Supabase-fel i konsolen | Kontrollera att alla 3 Supabase-nycklar är rätt i `.env.local` |
| E-post skickas inte | Kontrollera Resend API-nyckeln och att domänen är verifierad |
| Vercel-deploy misslyckas | Kontrollera att alla miljövariabler är tillagda i Vercel |

---

## Support

Om något krånglar – exportera felmeddelandet och ta upp det i chatten där prototypen byggdes.
