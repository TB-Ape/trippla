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
