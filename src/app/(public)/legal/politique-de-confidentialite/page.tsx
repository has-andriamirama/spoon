export default function LegalPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-invert">
        <h1 className="font-display text-4xl text-[#F5F0EB] mb-8">Informations légales</h1>
        <div className="text-[#9A8F84] leading-relaxed space-y-6">
          <section>
            <h2 className="font-display text-2xl text-[#F5F0EB] mb-3">Éditeur du site</h2>
            <p>Spoon SAS — Capital social : 10 000 €<br/>12 Rue de Paris, 97400 Saint-Denis, La Réunion<br/>SIRET : 000 000 000 00000<br/>Email : contact@spoon.re</p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-[#F5F0EB] mb-3">Hébergement</h2>
            <p>Vercel Inc. — 340 Pine Street, Suite 701, San Francisco, CA 94104, USA</p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-[#F5F0EB] mb-3">Propriété intellectuelle</h2>
            <p>L'ensemble des contenus de ce site (textes, images, vidéos) sont la propriété exclusive de Spoon SAS et sont protégés par les lois françaises et internationales relatives à la propriété intellectuelle.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-[#F5F0EB] mb-3">Données personnelles</h2>
            <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. Pour exercer ce droit, contactez-nous à : contact@spoon.re</p>
          </section>
        </div>
      </div>
    </div>
  );
}
