import { getTranslations } from "next-intl/server";
import { LocaleLink as Link } from "@/components/LocaleLink";

const content = `
<h2>1. Datenschutz auf einen Blick</h2>
<h3>Allgemeine Hinweise</h3>
<p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten Datenschutzerklärung.</p>
<h3>Datenerfassung auf dieser Website</h3>
<h4>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</h4>
<p>Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis zur Verantwortlichen Stelle" in dieser Datenschutzerklärung entnehmen.</p>
<h4>Wie erfassen wir Ihre Daten?</h4>
<p>Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Kontaktformular eingeben.</p>
<p>Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die Erfassung dieser Daten erfolgt automatisch, sobald Sie diese Website betreten.</p>
<h4>Wofür nutzen wir Ihre Daten?</h4>
<p>Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden. Sofern über die Website Verträge geschlossen oder angebahnt werden können, werden die übermittelten Daten auch für Vertragsangebote, Bestellungen oder sonstige Auftragsanfragen verarbeitet.</p>
<h4>Welche Rechte haben Sie bezüglich Ihrer Daten?</h4>
<p>Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese Einwilligung jederzeit für die Zukunft widerrufen. Außerdem haben Sie das Recht, unter bestimmten Umständen die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.</p>
<p>Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit an uns wenden.</p>

<h2>2. Hosting</h2>
<p>Wir hosten die Inhalte unserer Website bei folgendem Anbieter:</p>
<h3>Externes Hosting</h3>
<p>Diese Website wird extern gehostet. Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters / der Hoster gespeichert. Hierbei kann es sich v. a. um IP-Adressen, Kontaktanfragen, Meta- und Kommunikationsdaten, Vertragsdaten, Kontaktdaten, Namen, Websitezugriffe und sonstige Daten, die über eine Website generiert werden, handeln.</p>
<p>Das externe Hosting erfolgt zum Zwecke der Vertragserfüllung gegenüber unseren potenziellen und bestehenden Kunden (Art. 6 Abs. 1 lit. b DSGVO) und im Interesse einer sicheren, schnellen und effizienten Bereitstellung unseres Online-Angebots durch einen professionellen Anbieter (Art. 6 Abs. 1 lit. f DSGVO).</p>
<p>Wir setzen folgende(n) Hoster ein:</p>
<p>Tobias Busch<br>Friedrich-Ebert-Str 146<br>47179 Duisburg</p>

<h2>3. Allgemeine Hinweise und Pflichtinformationen</h2>
<h3>Datenschutz</h3>
<p>Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.</p>
<p>Wenn Sie diese Website benutzen, werden verschiedene personenbezogene Daten erhoben. Personenbezogene Daten sind Daten, mit denen Sie persönlich identifiziert werden können. Die vorliegende Datenschutzerklärung erläutert, welche Daten wir erheben und wofür wir sie nutzen. Sie erläutert auch, wie und zu welchem Zweck das geschieht.</p>
<p>Wir weisen darauf hin, dass die Datenübertragung im Internet (z. B. bei der Kommunikation per E-Mail) Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist nicht möglich.</p>
<h3>Hinweis zur verantwortlichen Stelle</h3>
<p>Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:</p>
<p>Tobias Busch<br>Friedrich-Ebert-Str 146<br>47179 Duisburg</p>
<p>E-Mail: tobias_busch@ymail.com</p>
<p>Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten entscheidet.</p>
<h3>Speicherdauer</h3>
<p>Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für die Speicherung Ihrer personenbezogenen Daten haben.</p>
<h3>Allgemeine Hinweise zu den Rechtsgrundlagen der Datenverarbeitung auf dieser Website</h3>
<p>Sofern Sie in die Datenverarbeitung eingewilligt haben, verarbeiten wir Ihre personenbezogenen Daten auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO bzw. Art. 9 Abs. 2 lit. a DSGVO. Sind Ihre Daten zur Vertragserfüllung oder zur Durchführung vorvertraglicher Maßnahmen erforderlich, verarbeiten wir Ihre Daten auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO. Des Weiteren verarbeiten wir Ihre Daten, sofern diese zur Erfüllung einer rechtlichen Verpflichtung erforderlich sind auf Grundlage von Art. 6 Abs. 1 lit. c DSGVO.</p>
<h3>Empfänger von personenbezogenen Daten</h3>
<p>Im Rahmen unserer Geschäftstätigkeit arbeiten wir mit verschiedenen externen Stellen zusammen. Dabei ist teilweise auch eine Übermittlung von personenbezogenen Daten an diese externen Stellen erforderlich. Wir geben personenbezogene Daten nur dann an externe Stellen weiter, wenn dies im Rahmen einer Vertragserfüllung erforderlich ist, wenn wir gesetzlich hierzu verpflichtet sind oder wenn eine sonstige Rechtsgrundlage die Datenweitergabe erlaubt.</p>
<h3>Widerruf Ihrer Einwilligung zur Datenverarbeitung</h3>
<p>Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.</p>
<h3>Beschwerderecht bei der zuständigen Aufsichtsbehörde</h3>
<p>Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein Beschwerderecht bei einer Aufsichtsbehörde, insbesondere in dem Mitgliedstaat ihres gewöhnlichen Aufenthalts, ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes zu.</p>
<h3>Recht auf Datenübertragbarkeit</h3>
<p>Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder in Erfüllung eines Vertrags automatisiert verarbeiten, an sich oder an einen Dritten in einem gängigen, maschinenlesbaren Format aushändigen zu lassen.</p>
<h3>Auskunft, Berichtigung und Löschung</h3>
<p>Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema personenbezogene Daten können Sie sich jederzeit an uns wenden.</p>
<h3>Recht auf Einschränkung der Verarbeitung</h3>
<p>Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Hierzu können Sie sich jederzeit an uns wenden.</p>

<h2>4. Datenerfassung auf dieser Website</h2>
<h3>Cookies</h3>
<p>Unsere Internetseiten verwenden so genannte „Cookies". Cookies sind kleine Datenpakete und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert. Session-Cookies werden nach Ende Ihres Besuchs automatisch gelöscht.</p>
<p>Cookies, die zur Durchführung des elektronischen Kommunikationsvorgangs oder zur Bereitstellung bestimmter, von Ihnen erwünschter Funktionen erforderlich sind (notwendige Cookies), werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO gespeichert.</p>
<h3>Server-Log-Dateien</h3>
<p>Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind:</p>
<ul>
<li>Browsertyp und Browserversion</li>
<li>verwendetes Betriebssystem</li>
<li>Referrer URL</li>
<li>Hostname des zugreifenden Rechners</li>
<li>Uhrzeit der Serveranfrage</li>
<li>IP-Adresse</li>
</ul>
<p>Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen. Die Erfassung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.</p>

<h2>5. Auftragsverarbeitung — E-Mail-Versand</h2>
<p>Für den Versand transaktionaler E-Mails (E-Mail-Verifizierung, Passwort-Zurücksetzen) nutzen wir den Dienst <strong>Resend</strong> (Resend Inc., 2261 Market Street #5275, San Francisco, CA 94114, USA). Resend verarbeitet dabei Ihre E-Mail-Adresse und Ihren Namen. Es besteht ein Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO mit Resend. Die Übermittlung in die USA erfolgt auf Grundlage der Standardvertragsklauseln der EU-Kommission.</p>

<h2>6. Push-Benachrichtigungen</h2>
<p>Wenn Sie Push-Benachrichtigungen aktivieren, speichern wir ein technisches Abonnement-Token (Push-Subscription-Endpoint und Schlüsselmaterial) in unserer Datenbank. Dieses Token ist notwendig, um Benachrichtigungen an Ihr Gerät zu senden. Rechtsgrundlage ist Ihre ausdrückliche Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Sie können Push-Benachrichtigungen jederzeit in den App-Einstellungen deaktivieren, wodurch das Token gelöscht wird.</p>

<h2>7. Cookies und Sitzungsdaten</h2>
<p>Diese Website verwendet ausschließlich technisch notwendige Session-Cookies zur Authentifizierung (<code>next-auth.session-token</code>). Diese Cookies sind für die Nutzung des eingeloggten Bereichs unbedingt erforderlich und fallen unter die Ausnahme von der Einwilligungspflicht gemäß § 25 Abs. 2 Nr. 2 TTDSG. Eine Einwilligung ist daher nicht erforderlich. Es werden keine Analyse-, Tracking- oder Werbe-Cookies eingesetzt.</p>

<h2>8. Ihre Rechte — Datenabruf und Löschung</h2>
<p>Sie können jederzeit eine Kopie aller Ihrer gespeicherten personenbezogenen Daten als JSON-Datei herunterladen. Diese Funktion finden Sie in den <a href="/settings" style="color: #2dd4bf;">Einstellungen</a> unter „Meine Daten herunterladen".</p>
<p>Sie haben außerdem das Recht, Ihr Konto und alle zugehörigen Daten dauerhaft zu löschen. Diese Funktion finden Sie in den <a href="/settings" style="color: #2dd4bf;">Einstellungen</a> unter „Konto löschen". <strong>Bitte beachten Sie:</strong> Wenn Sie Reisen besitzen, werden diese Reisen und alle darin enthaltenen Daten (einschließlich Beiträge anderer Mitglieder) ebenfalls gelöscht.</p>

<p style="margin-top: 2rem; font-size: 0.875rem;">Quelle: <a href="https://www.e-recht24.de" target="_blank" rel="noopener noreferrer">eRecht24</a></p>
`;

export default async function DatenschutzPage() {
  const t = await getTranslations("legal");

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
            Datenschutzerklärung
          </span>
        </h1>

        <div
          className="prose prose-invert prose-sm max-w-none text-gray-300
            [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4
            [&_h3]:text-white [&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2
            [&_h4]:text-gray-200 [&_h4]:text-sm [&_h4]:font-bold [&_h4]:mt-4 [&_h4]:mb-2
            [&_p]:mb-4 [&_p]:leading-relaxed
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1
            [&_a]:text-teal-400 [&_a]:hover:underline"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </main>
  );
}
