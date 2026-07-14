// Informativa privacy (GDPR artt. 13-14): bozza-modello, non consulenza legale.
// Il titolare del trattamento deve compilare i propri dati e farla rivedere
// da un professionista prima di un uso reale, specialmente per la parte
// relativa a Telegram come archivio foto (termini extra-UE da verificare).
export default function PrivacyPolicy({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>🔒 Informativa privacy</h2>
          <button className="close" onClick={onClose}>✕</button>
        </div>

        <div className="privacy-doc">
          <p className="small muted">
            Ultimo aggiornamento: da compilare. Questa è un'informativa modello: il gestore
            dell'app deve completare i campi tra [parentesi] e verificarne la conformità.
          </p>

          <h4>1. Titolare del trattamento</h4>
          <p>[Nome/e-mail del titolare che gestisce questa app], che decide come e perché i tuoi dati vengono trattati.</p>

          <h4>2. Dati raccolti</h4>
          <p>
            • Email e password, per l'accesso (la password non è mai visibile al titolare: la gestisce Firebase Authentication).<br />
            • Nome visualizzato, mostrato agli altri utenti approvati.<br />
            • Posizione GPS, solo se la attivi: usata per centrare la mappa e ordinare i punti per distanza. Puoi disattivarla in qualsiasi momento da Altro → Privacy.<br />
            • Foto che carichi volontariamente per le tue proposte, archiviate tramite un bot Telegram.<br />
            • Le proposte che invii (punto, categoria, descrizione, nota) e il loro esito.
          </p>

          <h4>3. Finalità e base giuridica</h4>
          <p>
            Trattiamo questi dati per fornirti il servizio che hai richiesto registrandoti (esecuzione di un
            accordo con te) e, per la posizione, sulla base del tuo consenso esplicito e revocabile in ogni momento.
          </p>

          <h4>4. A chi vengono comunicati</h4>
          <p>
            • Google Firebase (autenticazione e database, server nell'Unione Europea).<br />
            • Cloudflare (proxy per le foto).<br />
            • Telegram, come archivio delle foto caricate — i suoi server possono trovarsi anche fuori dall'UE;
            verifica i termini di Telegram se questo aspetto è rilevante per te.<br />
            Nessun dato viene venduto o usato per pubblicità.
          </p>

          <h4>5. Conservazione</h4>
          <p>I tuoi dati restano finché il tuo account è attivo. Puoi richiederne la cancellazione in ogni momento (vedi punto 7).</p>

          <h4>6. Sicurezza</h4>
          <p>
            L'accesso ai dati è protetto da autenticazione e da regole lato server che permettono la lettura
            solo agli utenti approvati dal titolare (whitelist).
          </p>

          <h4>7. I tuoi diritti</h4>
          <p>
            Hai diritto di accedere ai tuoi dati, correggerli, chiederne la cancellazione, limitarne l'uso,
            opporti al trattamento e riceverli in formato portabile. Da Altro → Privacy puoi esportare i tuoi
            dati o eliminare il tuo account in autonomia. Le proposte già valutate da un admin restano visibili
            come cronologia dell'attività di moderazione, anche dopo la cancellazione dell'account. Le foto già
            caricate restano nell'archivio Telegram: per rimuoverle contatta il titolare.
          </p>
          <p>
            Puoi anche proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).
          </p>

          <h4>8. Minori</h4>
          <p>Il servizio non è pensato per minori di 16 anni.</p>

          <h4>9. Modifiche</h4>
          <p>Questa informativa può essere aggiornata; le modifiche rilevanti ti saranno comunicate in app.</p>
        </div>

        <button className="button" onClick={onClose}>Ho letto</button>
      </div>
    </div>
  )
}
