import Link from "next/link";

import { QrCode, ShieldCheck } from "lucide-react";

import type { MunicipalCredential } from "../types/municipal-id";

export function CredentialCard({ credential }: { credential: MunicipalCredential }) {
  return (
    <article className="municipal-id-card" data-status={credential.status}>
      <div className="municipal-id-watermark">SAMPLE</div>
      <div className="municipal-id-brand">
        <span>
          <ShieldCheck size={19} />
        </span>
        <div>
          <strong>I ♥ Matnog</strong>
          <small>Municipal Resident ID · UI demo</small>
        </div>
      </div>
      <div className="municipal-id-body">
        <div className="municipal-id-photo" role="img" aria-label="Sample enrollment photo placeholder">
          MD
        </div>
        <div>
          <span>Holder</span>
          <h3>{credential.holderName}</h3>
          <p>{credential.personId}</p>
          <dl>
            <div>
              <dt>Credential</dt>
              <dd>{credential.id}</dd>
            </div>
            <div>
              <dt>Valid until</dt>
              <dd>{credential.validUntil}</dd>
            </div>
          </dl>
        </div>
        <Link href={`/verify/id/${credential.token}`} className="municipal-id-qr" aria-label="Verify sample credential">
          <QrCode size={44} />
          <span>Verify sample</span>
        </Link>
      </div>
      <div className="municipal-id-footer">
        <strong>{credential.status.toUpperCase()}</strong>
        <span>Not valid for official use</span>
      </div>
    </article>
  );
}
