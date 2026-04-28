# Commercialisation — Plan 1: Legal & GDPR Compliance

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AGB (Terms of Service), update Impressum and Datenschutz, add terms acceptance and version tracking to signup, implement GDPR account deletion, and add terms re-acceptance on login when terms change.

**Architecture:** All changes are within the existing Next.js app. Two schema fields are added to `User` (termsAcceptedAt, termsVersion). Account deletion handles the non-cascaded `Expense.paidBy` relation manually before deleting the user. A terms re-acceptance middleware check is added to the NextAuth JWT callback.

**Tech Stack:** Next.js App Router, Prisma, next-intl (DE/EN), NextAuth.js, TypeScript

**Reference spec:** `docs/superpowers/specs/2026-03-25-commercialisation-design.md`

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Modify | `prisma/schema.prisma` | Add termsAcceptedAt, termsVersion to User |
| Modify | `src/app/[locale]/impressum/page.tsx` | Add phone number |
| Modify | `src/app/[locale]/datenschutz/page.tsx` | Add Resend DPA, push tokens, TTDSG session cookie, data rights sections |
| Create | `src/app/[locale]/agb/page.tsx` | New Terms of Service page (locale-aware) |
| Modify | `src/app/[locale]/layout.tsx` | Add AGB link to footer |
| Modify | `src/app/[locale]/(auth)/signup/page.tsx` | Add terms acceptance checkbox |
| Modify | `src/app/api/signup/route.ts` | Accept and persist termsAcceptedAt + termsVersion |
| Create | `src/app/api/user/delete/route.ts` | Account deletion endpoint |
| Modify | `src/app/[locale]/settings/page.tsx` | Add Delete Account section |
| Modify | `src/lib/auth.ts` | Add termsVersion check to JWT callback for re-acceptance |
| Create | `src/app/[locale]/terms-update/page.tsx` | Terms re-acceptance page |
| Create | `src/app/api/user/accept-terms/route.ts` | Record updated terms acceptance |
| Modify | `messages/en.json` | New translation keys |
| Modify | `messages/de.json` | New translation keys |

---

## Task 1: Schema migration — add terms fields to User

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields to User model**

In `prisma/schema.prisma`, add two fields to the `User` model after the `updatedAt` field:

```prisma
termsAcceptedAt DateTime?
termsVersion    String?
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_terms_fields_to_user
```

Expected: migration file created and applied, no errors.

- [ ] **Step 3: Verify**

```bash
npx prisma studio
```

Open the User table and confirm `termsAcceptedAt` and `termsVersion` columns exist.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add termsAcceptedAt and termsVersion fields to User"
```

---

## Task 2: Update Impressum — add phone number

**Files:**
- Modify: `src/app/[locale]/impressum/page.tsx`

- [ ] **Step 1: Add phone number to the Kontakt section**

In `src/app/[locale]/impressum/page.tsx`, find the Kontakt section (around line 32) and update it:

```tsx
<section>
  <h2 className="text-lg font-bold text-white mb-2">Kontakt</h2>
  <p>
    E-Mail: <a href="mailto:tobias_busch@ymail.com" className="text-teal-400 hover:underline">tobias_busch@ymail.com</a><br />
    Tel: +49 [YOUR_PHONE_NUMBER]
  </p>
</section>
```

Replace `[YOUR_PHONE_NUMBER]` with your actual phone number before deploying.

- [ ] **Step 2: Manual verify**

Run `npm run dev`, navigate to `/en/impressum`. Confirm phone number appears.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/impressum/page.tsx
git commit -m "feat: add phone number to Impressum"
```

---

## Task 3: Update Datenschutz — add required GDPR sections

**Files:**
- Modify: `src/app/[locale]/datenschutz/page.tsx`

The existing page has generic eRecht24 content. Append sections covering: Resend as data processor, push tokens, TTDSG session cookie exemption, and data rights (export + deletion).

- [ ] **Step 1: Append new sections to the HTML content string**

In `src/app/[locale]/datenschutz/page.tsx`, insert the following HTML before the closing `<p style="margin-top: 2rem...">` attribution line:

```html
<h2>5. Auftragsverarbeitung — E-Mail-Versand</h2>
<p>Für den Versand transaktionaler E-Mails (E-Mail-Verifizierung, Passwort-Zurücksetzen) nutzen wir den Dienst <strong>Resend</strong> (Resend Inc., 2261 Market Street #5275, San Francisco, CA 94114, USA). Resend verarbeitet dabei Ihre E-Mail-Adresse und Ihren Namen. Es besteht ein Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO mit Resend. Die Übermittlung in die USA erfolgt auf Grundlage der Standardvertragsklauseln der EU-Kommission.</p>

<h2>6. Push-Benachrichtigungen</h2>
<p>Wenn Sie Push-Benachrichtigungen aktivieren, speichern wir ein technisches Abonnement-Token (Push-Subscription-Endpoint und Schlüsselmaterial) in unserer Datenbank. Dieses Token ist notwendig, um Benachrichtigungen an Ihr Gerät zu senden. Rechtsgrundlage ist Ihre ausdrückliche Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Sie können Push-Benachrichtigungen jederzeit in den App-Einstellungen deaktivieren, wodurch das Token gelöscht wird.</p>

<h2>7. Cookies und Sitzungsdaten</h2>
<p>Diese Website verwendet ausschließlich technisch notwendige Session-Cookies zur Authentifizierung (<code>next-auth.session-token</code>). Diese Cookies sind für die Nutzung des eingeloggten Bereichs unbedingt erforderlich und fallen unter die Ausnahme von der Einwilligungspflicht gemäß § 25 Abs. 2 Nr. 2 TTDSG. Eine Einwilligung ist daher nicht erforderlich. Es werden keine Analyse-, Tracking- oder Werbe-Cookies eingesetzt.</p>

<h2>8. Ihre Rechte — Datenabruf und Löschung</h2>
<p>Sie können jederzeit eine Kopie aller Ihrer gespeicherten personenbezogenen Daten als JSON-Datei herunterladen. Diese Funktion finden Sie in den <a href="/settings" style="color: #2dd4bf;">Einstellungen</a> unter „Meine Daten herunterladen".</p>
<p>Sie haben außerdem das Recht, Ihr Konto und alle zugehörigen Daten dauerhaft zu löschen. Diese Funktion finden Sie in den <a href="/settings" style="color: #2dd4bf;">Einstellungen</a> unter „Konto löschen". <strong>Bitte beachten Sie:</strong> Wenn Sie Reisen besitzen, werden diese Reisen und alle darin enthaltenen Daten (einschließlich Beiträge anderer Mitglieder) ebenfalls gelöscht.</p>
```

- [ ] **Step 2: Manual verify**

Run `npm run dev`, navigate to `/en/datenschutz`. Confirm the 4 new sections appear at the bottom with correct styling.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/datenschutz/page.tsx
git commit -m "feat: add Resend DPA, push tokens, TTDSG, data rights to Datenschutz"
```

---

## Task 4: Create AGB (Terms of Service) page

**Files:**
- Create: `src/app/[locale]/agb/page.tsx`

The page must be locale-aware: render German content for `/de/agb` and English for `/en/agb`. Use `getLocale()` from `next-intl/server` to determine which to render.

- [ ] **Step 1: Add translation keys**

In `messages/en.json`, add to the `"legal"` section:
```json
"agb": "Terms of Service",
"agbTitle": "Terms of Service"
```

In `messages/de.json`, add to the `"legal"` section:
```json
"agb": "AGB",
"agbTitle": "Allgemeine Geschäftsbedingungen"
```

- [ ] **Step 2: Create the AGB page**

Create `src/app/[locale]/agb/page.tsx`:

```tsx
import { getTranslations, getLocale } from "next-intl/server";
import { LocaleLink as Link } from "@/components/LocaleLink";

const contentDE = `
<h2>§ 1 Geltungsbereich</h2>
<p>Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Webanwendung Trippla (trippla.de), betrieben von Tobias Busch, Friedrich-Ebert-Straße 146, 47179 Duisburg.</p>

<h2>§ 2 Leistungsbeschreibung</h2>
<p>Trippla ist eine kollaborative Reiseplanungsplattform, die es Gruppen ermöglicht, gemeinsam Reisen zu planen, Ausgaben zu verwalten, Packlisten zu koordinieren und Abstimmungen durchzuführen.</p>

<h2>§ 3 Nutzungsbedingungen</h2>
<p>Die Nutzung von Trippla ist ausschließlich für legale Zwecke gestattet. Folgende Handlungen sind untersagt:</p>
<ul>
<li>Verbreitung rechtswidriger, beleidigender oder schädigender Inhalte</li>
<li>Manipulation oder Schädigung anderer Nutzer</li>
<li>Automatisierter Zugriff ohne ausdrückliche Genehmigung</li>
<li>Missbrauch der Plattform für Spam oder kommerzielle Werbung</li>
</ul>

<h2>§ 4 Registrierung und Konto</h2>
<p>Für die Nutzung von Trippla ist eine Registrierung mit einer gültigen E-Mail-Adresse erforderlich. Sie sind für die Geheimhaltung Ihrer Zugangsdaten verantwortlich.</p>

<h2>§ 5 Haftungsausschluss</h2>
<p>Trippla wird im Rahmen der technischen und betrieblichen Möglichkeiten bereitgestellt. Es wird keine Garantie für eine ununterbrochene Verfügbarkeit übernommen. Die Haftung für mittelbare Schäden ist ausgeschlossen, soweit gesetzlich zulässig.</p>

<h2>§ 6 Kündigung</h2>
<p>Sie können Ihr Konto jederzeit in den Einstellungen löschen. Wir behalten uns das Recht vor, Konten bei Verstößen gegen diese AGB zu sperren oder zu löschen.</p>

<h2>§ 7 Anwendbares Recht</h2>
<p>Es gilt deutsches Recht. Gerichtsstand ist Duisburg.</p>

<h2>§ 8 Änderungen der AGB</h2>
<p>Wir behalten uns das Recht vor, diese AGB zu ändern. Registrierte Nutzer werden bei der nächsten Anmeldung über wesentliche Änderungen informiert und müssen diesen erneut zustimmen.</p>
`;

const contentEN = `
<h2>1. Scope</h2>
<p>These Terms of Service govern the use of the Trippla web application (trippla.de), operated by Tobias Busch, Friedrich-Ebert-Straße 146, 47179 Duisburg, Germany.</p>

<h2>2. Service Description</h2>
<p>Trippla is a collaborative trip planning platform that enables groups to plan trips together, manage expenses, coordinate packing lists, and run polls.</p>

<h2>3. Acceptable Use</h2>
<p>You may only use Trippla for lawful purposes. The following are prohibited:</p>
<ul>
<li>Posting illegal, offensive, or harmful content</li>
<li>Manipulating or harming other users</li>
<li>Automated access without explicit permission</li>
<li>Using the platform for spam or commercial advertising</li>
</ul>

<h2>4. Registration and Account</h2>
<p>A valid email address is required to use Trippla. You are responsible for keeping your login credentials confidential.</p>

<h2>5. Disclaimer of Liability</h2>
<p>Trippla is provided on a best-effort basis. No guarantee of uninterrupted availability is made. Liability for indirect or consequential damages is excluded to the extent permitted by law.</p>

<h2>6. Termination</h2>
<p>You may delete your account at any time in Settings. We reserve the right to suspend or delete accounts that violate these Terms.</p>

<h2>7. Governing Law</h2>
<p>These Terms are governed by German law. Jurisdiction is Duisburg, Germany.</p>

<h2>8. Changes to Terms</h2>
<p>We reserve the right to modify these Terms. Registered users will be notified of material changes on next login and must re-accept.</p>
`;

const proseClasses = `prose prose-invert prose-sm max-w-none text-gray-300
  [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4
  [&_p]:mb-4 [&_p]:leading-relaxed
  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1`;

export default async function AGBPage() {
  const t = await getTranslations("legal");
  const locale = await getLocale();
  const content = locale === "de" ? contentDE : contentEN;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10 px-4 md:px-8 py-4 md:py-6">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500 rounded-sm rotate-45" />
            <span className="text-xl font-bold tracking-tight">TRIPPLA</span>
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12 md:py-20">
        <h1 className="text-4xl md:text-5xl font-black mb-10 tracking-tighter">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
            {t("agbTitle")}
          </span>
        </h1>
        <div className={proseClasses} dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Manual verify**

Run `npm run dev`:
- Navigate to `/de/agb` — confirm German content renders
- Navigate to `/en/agb` — confirm English content renders

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/agb/page.tsx messages/en.json messages/de.json
git commit -m "feat: add locale-aware AGB (Terms of Service) page"
```

---

## Task 5: Update footer — add AGB link

**Files:**
- Modify: `src/app/[locale]/layout.tsx:31-39`

- [ ] **Step 1: Add AGB link to footer**

In `src/app/[locale]/layout.tsx`, update the footer:

```tsx
<footer className="border-t border-white/10 bg-[#0a0a0a] px-4 md:px-8 py-6 text-center text-gray-600 text-xs">
  <div className="flex justify-center gap-6">
    <Link href="/impressum" className="hover:text-gray-400 transition-colors">
      {t("impressum")}
    </Link>
    <Link href="/datenschutz" className="hover:text-gray-400 transition-colors">
      {t("datenschutz")}
    </Link>
    <Link href="/agb" className="hover:text-gray-400 transition-colors">
      {t("agb")}
    </Link>
  </div>
</footer>
```

- [ ] **Step 2: Manual verify**

Navigate to any page. Confirm footer shows three links.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/layout.tsx
git commit -m "feat: add AGB link to global footer"
```

---

## Task 6: Signup — add terms acceptance checkbox

**Files:**
- Modify: `src/app/[locale]/(auth)/signup/page.tsx`
- Modify: `src/app/api/signup/route.ts`

Note: The signup page uses `const t = useTranslations()` (no namespace), so all translation keys are accessed with their full dotted path, e.g. `t("auth.agreeToTerms")`.

### 6a: Frontend

- [ ] **Step 1: Add translation keys**

In `messages/en.json`, add to `"auth"`:
```json
"agreeToTerms": "I agree to the <termsLink>Terms of Service</termsLink> and <privacyLink>Privacy Policy</privacyLink>",
"mustAgreeToTerms": "You must agree to the Terms of Service and Privacy Policy to register"
```

In `messages/de.json`, add to `"auth"`:
```json
"agreeToTerms": "Ich stimme den <termsLink>AGB</termsLink> und der <privacyLink>Datenschutzerklärung</privacyLink> zu",
"mustAgreeToTerms": "Sie müssen den AGB und der Datenschutzerklärung zustimmen, um sich zu registrieren"
```

- [ ] **Step 2: Add state and validation to signup page**

In `src/app/[locale]/(auth)/signup/page.tsx`:

Add state variable alongside existing state:
```tsx
const [termsAccepted, setTermsAccepted] = useState(false);
```

In `onSubmit`, add validation after the password match check:
```tsx
if (!termsAccepted) {
  setError(t("auth.mustAgreeToTerms"));
  setIsLoading(false);
  return;
}
```

Update the fetch body to include `termsAccepted`:
```tsx
body: JSON.stringify({ name, email, password, termsAccepted: true }),
```

Add checkbox before the `<Button>` submit button inside the form:
```tsx
<div className="flex items-start gap-3">
  <input
    id="termsAccepted"
    type="checkbox"
    checked={termsAccepted}
    onChange={(e) => setTermsAccepted(e.target.checked)}
    disabled={isLoading}
    className="mt-1 w-4 h-4 accent-teal-400 cursor-pointer flex-shrink-0"
  />
  <label htmlFor="termsAccepted" className="text-sm text-gray-400 cursor-pointer leading-relaxed">
    {t.rich("auth.agreeToTerms", {
      termsLink: (chunks) => (
        <Link href="/agb" target="_blank" className="text-teal-400 hover:underline font-bold">
          {chunks}
        </Link>
      ),
      privacyLink: (chunks) => (
        <Link href="/datenschutz" target="_blank" className="text-teal-400 hover:underline font-bold">
          {chunks}
        </Link>
      ),
    })}
  </label>
</div>
```

### 6b: API

- [ ] **Step 3: Update signup API to persist terms acceptance**

In `src/app/api/signup/route.ts`, add `termsAccepted` to the Zod schema:
```ts
const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
});
```

Update `prisma.user.create` to include terms fields:
```ts
const user = await prisma.user.create({
  data: {
    name: validatedData.name,
    email: validatedData.email,
    password: hashedPassword,
    termsAcceptedAt: new Date(),
    termsVersion: "2026-03-25",
  },
});
```

- [ ] **Step 4: Manual verify**

1. Navigate to `/en/signup`
2. Try submitting without the checkbox — confirm error appears
3. Check it and submit — confirm registration succeeds
4. Check the database (Prisma Studio) — confirm `termsAcceptedAt` and `termsVersion` are populated

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/(auth)/signup/page.tsx src/app/api/signup/route.ts messages/en.json messages/de.json
git commit -m "feat: add terms acceptance checkbox to signup with version tracking"
```

---

## Task 7: Account deletion API

**Files:**
- Create: `src/app/api/user/delete/route.ts`

**Important limitation:** The `Expense.paidBy` relation in the schema has no `onDelete` directive, so PostgreSQL will block deletion if the user has paid expenses in trips they don't own. These must be explicitly deleted first. Additionally, many author fields (`createdById`, `userId`) are non-nullable in the schema, making true anonymisation (null-out) impossible without schema changes. The chosen approach: explicitly delete the user's expenses in non-owned trips, then cascade-delete the rest. The UI clearly warns about this behaviour.

- [ ] **Step 1: Create the delete route**

Create `src/app/api/user/delete/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const deleteSchema = z.object({
  email: z.string().email(),
});

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { email } = deleteSchema.parse(body);

    if (email.toLowerCase() !== session.user.email?.toLowerCase()) {
      return NextResponse.json({ error: "Email does not match your account" }, { status: 400 });
    }

    const userId = session.user.id;

    await prisma.$transaction(async (tx) => {
      // Get IDs of trips this user owns (these cascade-delete via Trip relation)
      const ownedTripIds = await tx.trip
        .findMany({ where: { ownerId: userId }, select: { id: true } })
        .then((trips) => trips.map((t) => t.id));

      // Expense.paidBy has no onDelete — must delete manually for non-owned trips
      const externalExpenses = await tx.expense.findMany({
        where: { paidById: userId, tripId: { notIn: ownedTripIds } },
        select: { id: true },
      });

      if (externalExpenses.length > 0) {
        const ids = externalExpenses.map((e) => e.id);
        await tx.expenseSplit.deleteMany({ where: { expenseId: { in: ids } } });
        await tx.expense.deleteMany({ where: { id: { in: ids } } });
      }

      // Delete user — cascades handle: ownedTrips, tripMembers, itineraryItems,
      // packingLists, packingItems (claimed), polls, pollVotes, comments, activities,
      // stages, transports, pushSubscriptions, notificationPreferences, tripMutes
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify route is registered**

```bash
npm run dev
curl -X DELETE http://localhost:3000/api/user/delete \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Expected: `{"error":"Unauthorized"}` — confirms the route exists.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/user/delete/route.ts
git commit -m "feat: add account deletion API with GDPR cascade handling"
```

---

## Task 8: Settings — add Delete Account section

**Files:**
- Modify: `src/app/[locale]/settings/page.tsx`

- [ ] **Step 1: Add translation keys**

In `messages/en.json`, add to `"settings"`:
```json
"deleteAccount": "Delete Account",
"deleteAccountWarning": "This will permanently delete your account and all trips you own, including all data from other members in those trips. This action cannot be undone.",
"deleteAccountConfirmPlaceholder": "Type your email to confirm",
"deleteAccountButton": "Permanently Delete My Account",
"deleteAccountDeleting": "Deleting..."
```

In `messages/de.json`, add to `"settings"`:
```json
"deleteAccount": "Konto löschen",
"deleteAccountWarning": "Dies löscht dauerhaft Ihr Konto und alle Reisen, die Sie besitzen, einschließlich aller Daten anderer Mitglieder in diesen Reisen. Diese Aktion kann nicht rückgängig gemacht werden.",
"deleteAccountConfirmPlaceholder": "Geben Sie Ihre E-Mail-Adresse zur Bestätigung ein",
"deleteAccountButton": "Mein Konto dauerhaft löschen",
"deleteAccountDeleting": "Wird gelöscht..."
```

- [ ] **Step 2: Add state and handler**

In `src/app/[locale]/settings/page.tsx`, add alongside existing state:
```tsx
const [deleteEmail, setDeleteEmail] = useState("");
const [isDeleting, setIsDeleting] = useState(false);
const [deleteError, setDeleteError] = useState("");
```

Add handler alongside existing handlers:
```tsx
async function handleDeleteAccount(e: React.FormEvent) {
  e.preventDefault();
  setDeleteError("");
  setIsDeleting(true);
  try {
    const res = await fetch("/api/user/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: deleteEmail }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    window.location.href = `/${locale}`;
  } catch (err) {
    setDeleteError(err instanceof Error ? err.message : "Something went wrong");
    setIsDeleting(false);
  }
}
```

- [ ] **Step 3: Add Delete Account card at the bottom of the settings page**

Add after the Notifications card, at the end of the `<div className="max-w-2xl mx-auto">` container:

```tsx
{/* Delete Account */}
<Card className="p-6 mt-6 border-red-500/30">
  <h2 className="text-2xl font-black tracking-tight mb-4 text-red-400">{t("settings.deleteAccount")}</h2>
  <p className="text-sm text-gray-400 mb-4">{t("settings.deleteAccountWarning")}</p>
  <form onSubmit={handleDeleteAccount} className="space-y-4">
    {deleteError && (
      <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">
        {deleteError}
      </div>
    )}
    <Input
      type="email"
      value={deleteEmail}
      onChange={(e) => setDeleteEmail(e.target.value)}
      placeholder={t("settings.deleteAccountConfirmPlaceholder")}
      required
      disabled={isDeleting}
      className="border-red-500/30"
    />
    <Button
      type="submit"
      disabled={isDeleting || deleteEmail.toLowerCase() !== session.user.email?.toLowerCase()}
      className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider text-xs px-4 py-2 disabled:opacity-50"
    >
      {isDeleting ? t("settings.deleteAccountDeleting") : t("settings.deleteAccountButton")}
    </Button>
  </form>
</Card>
```

- [ ] **Step 4: Manual verify**

1. Navigate to `/en/settings`
2. Scroll to bottom — confirm red "Delete Account" card appears
3. Confirm delete button is disabled until the correct email is typed

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/settings/page.tsx messages/en.json messages/de.json
git commit -m "feat: add account deletion UI to settings"
```

---

## Task 9: Terms re-acceptance on login

When the terms are updated, existing users must be prompted to re-accept. This is implemented via a NextAuth JWT callback check + a dedicated re-acceptance page.

**The current terms version is defined as a constant in `src/lib/auth.ts`.** When terms change, update this constant — users with an older stored version will be redirected on next login.

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `src/app/[locale]/terms-update/page.tsx`
- Create: `src/app/api/user/accept-terms/route.ts`

### 9a: Add version check to JWT callback

- [ ] **Step 1: Add CURRENT_TERMS_VERSION constant and needsTermsUpdate to JWT**

In `src/lib/auth.ts`, add at the top of the file:
```ts
export const CURRENT_TERMS_VERSION = "2026-03-25";
```

In the `jwt` callback, after the existing `if (trigger === "update" || trigger === "signIn")` block, add:
```ts
// Check if user needs to re-accept updated terms.
// Runs on signIn and on explicit update() calls (e.g. after accepting terms).
if (trigger === "signIn" || trigger === "update") {
  const dbUser = await prisma.user.findUnique({
    where: { id: token.id as string },
    select: { termsVersion: true },
  });
  token.needsTermsUpdate =
    !dbUser?.termsVersion || dbUser.termsVersion !== CURRENT_TERMS_VERSION;
}
```

In the `session` callback, expose the flag:
```ts
async session({ session, token }) {
  if (session.user) {
    session.user.id = token.id as string;
    session.user.image = (token.picture as string) || null;
    (session.user as any).needsTermsUpdate = token.needsTermsUpdate ?? false;
  }
  return session;
}
```

### 9b: Add terms re-acceptance page

- [ ] **Step 2: Add translation keys**

In `messages/en.json`, add a `"termsUpdate"` section:
```json
"termsUpdate": {
  "title": "Terms Updated",
  "subtitle": "Please review and accept the updated Terms of Service to continue.",
  "accept": "Accept and Continue",
  "accepting": "Saving..."
}
```

In `messages/de.json`:
```json
"termsUpdate": {
  "title": "AGB aktualisiert",
  "subtitle": "Bitte lesen und akzeptieren Sie die aktualisierten AGB, um fortzufahren.",
  "accept": "Akzeptieren und fortfahren",
  "accepting": "Wird gespeichert..."
}
```

- [ ] **Step 3: Create the accept-terms API route**

Create `src/app/api/user/accept-terms/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, CURRENT_TERMS_VERSION } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      termsAcceptedAt: new Date(),
      termsVersion: CURRENT_TERMS_VERSION,
    },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Create the terms-update page**

Create `src/app/[locale]/terms-update/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { Button } from "@/components/ui/button";

export default function TermsUpdatePage() {
  const t = useTranslations("termsUpdate");
  const tLegal = useTranslations("legal");
  const router = useRouter();
  const locale = useLocale();
  const { update } = useSession();
  const [isAccepting, setIsAccepting] = useState(false);

  async function handleAccept() {
    setIsAccepting(true);
    await fetch("/api/user/accept-terms", { method: "POST" });
    // Refresh the session JWT so needsTermsUpdate becomes false in the token.
    // Without this, TermsGuard reads the stale token and redirects back here.
    await update();
    router.push(`/${locale}/trips`);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full border-2 border-white/10 p-8">
        <h1 className="text-3xl font-black tracking-tighter mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
            {t("title")}
          </span>
        </h1>
        <p className="text-gray-400 mb-6">{t("subtitle")}</p>
        <div className="text-sm text-gray-500 mb-6">
          <Link href="/agb" target="_blank" className="text-teal-400 hover:underline">
            {tLegal("agb")}
          </Link>
          {" · "}
          <Link href="/datenschutz" target="_blank" className="text-teal-400 hover:underline">
            {tLegal("datenschutz")}
          </Link>
        </div>
        <Button variant="gradient" onClick={handleAccept} disabled={isAccepting} className="w-full">
          {isAccepting ? t("accepting") : t("accept")}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add redirect in app layout or middleware**

In `src/app/[locale]/layout.tsx`, the layout is a server component and can't read the session directly. Instead, add a client-side redirect check using a small `TermsGuard` component.

Create `src/components/TermsGuard.tsx`:

```tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect } from "react";

const EXEMPT_PATHS = ["/terms-update", "/agb", "/datenschutz", "/impressum", "/login", "/signup"];

export function TermsGuard() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    if (!session?.user) return;
    const needsUpdate = (session.user as any).needsTermsUpdate;
    if (!needsUpdate) return;
    const isExempt = EXEMPT_PATHS.some((p) => pathname.includes(p));
    if (!isExempt) {
      router.replace(`/${locale}/terms-update`);
    }
  }, [session, pathname, router, locale]);

  return null;
}
```

Add `<TermsGuard />` inside the `<NextIntlClientProvider>` wrapper in `src/app/[locale]/layout.tsx`:

```tsx
return (
  <NextIntlClientProvider messages={messages}>
    <TermsGuard />
    {children}
    <footer>...</footer>
  </NextIntlClientProvider>
);
```

- [ ] **Step 6: Manual verify**

1. Set a user's `termsVersion` to an old value (e.g. `"2024-01-01"`) in Prisma Studio
2. Log in as that user
3. Confirm redirect to `/en/terms-update`
4. Click "Accept and Continue"
5. Confirm redirect to trips page
6. Confirm `termsVersion` is now updated in the database

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth.ts src/app/[locale]/terms-update/page.tsx src/app/api/user/accept-terms/route.ts src/components/TermsGuard.tsx src/app/[locale]/layout.tsx messages/en.json messages/de.json
git commit -m "feat: add terms re-acceptance flow for updated terms versions"
```

---

## Done

All legal and GDPR compliance items from Phase 1 are now implemented:
- Impressum has phone number
- Datenschutz covers Resend DPA, push tokens, TTDSG session cookie exemption, data rights
- AGB page (locale-aware: DE for /de, EN for /en)
- Footer links to all three legal pages
- Signup requires terms acceptance with version tracking
- Account deletion available in settings with email confirmation
- Terms re-acceptance flow redirects users when terms version changes

**Next:** Execute Plan 2 (Security & Infrastructure) from `docs/superpowers/plans/2026-03-25-commercialisation-plan-2-security.md`
