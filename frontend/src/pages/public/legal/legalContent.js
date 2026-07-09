// Contenu des pages légales. Centralisé ici pour une seule source de vérité.
// Les valeurs société (raison sociale, RCCM, adresse…) sont à compléter :
// cherchez « [À COMPLÉTER » dans ce fichier.
//
// siteName / contactEmail / supportPhone sont injectés depuis les réglages du
// site (useSiteSettingsStore) pour rester cohérents avec le reste de l'app.

export const LEGAL_SLUGS = ['conditions', 'confidentialite', 'remboursement', 'mentions']

export const LEGAL_UPDATED = '9 juillet 2026'

// Menu affiché dans la barre latérale des pages légales.
export const LEGAL_NAV = [
  { slug: 'conditions', label: "Conditions générales" },
  { slug: 'confidentialite', label: 'Confidentialité' },
  { slug: 'remboursement', label: 'Remboursement' },
  { slug: 'mentions', label: 'Mentions légales' },
]

export function getLegalDoc(slug, ctx = {}) {
  const site = ctx.siteName || 'Winvite.pro'
  const email = ctx.contactEmail || '[À COMPLÉTER : email de contact]'
  const phone = ctx.supportPhone || '[À COMPLÉTER : téléphone support]'
  const company = '[À COMPLÉTER : raison sociale / nom de l’entreprise]'
  const address = '[À COMPLÉTER : adresse du siège, ville, RDC]'

  const docs = {
    // ============================ CGU / CGV ============================
    conditions: {
      title: "Conditions Générales d'Utilisation et de Vente",
      subtitle: `Règles d'utilisation de la plateforme ${site} et conditions de vente.`,
      sections: [
        { h: '1. Objet', p: [
          `Les présentes Conditions Générales (les « Conditions ») régissent l'accès et l'utilisation de la plateforme ${site} (le « Service »), éditée par ${company}, ainsi que la vente des prestations proposées.`,
          `En créant un compte ou en utilisant le Service, vous acceptez sans réserve les présentes Conditions. Si vous n'êtes pas d'accord, n'utilisez pas le Service.`,
        ] },
        { h: '2. Définitions', list: [
          `« Utilisateur » : toute personne disposant d'un compte sur le Service.`,
          `« Client » : Utilisateur qui crée et gère des événements et des invitations.`,
          `« Créateur » : Utilisateur qui conçoit et publie des modèles (templates) sur la marketplace.`,
          `« Invité » : destinataire d'une invitation générée via le Service.`,
          `« Crédit / Quota » : nombre d'invitations qu'un Client peut générer après paiement.`,
        ] },
        { h: '3. Compte et inscription', p: [
          `La création d'un compte nécessite une adresse email valide et des informations exactes. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée depuis votre compte.`,
          `Vous devez avoir la capacité juridique de contracter. Un compte par personne ou entité, sauf autorisation.`,
        ] },
        { h: '4. Description des services', p: [
          `${site} permet notamment de : créer des invitations digitales pour vos événements, générer un QR code unique par invité, suivre les confirmations (RSVP) en temps réel, commander des impressions, et accéder à une marketplace de modèles.`,
          `Le Service est fourni « en l'état ». Les fonctionnalités peuvent évoluer, être ajoutées ou retirées afin d'améliorer la plateforme.`,
        ] },
        { h: '5. Tarifs et paiement', p: [
          `Certaines fonctionnalités sont gratuites, d'autres payantes (quota d'invitations, modèles premium, impressions). Les prix applicables sont indiqués avant chaque achat.`,
          `Les paiements sont traités via le prestataire de paiement K-PAY (Mobile Money et autres moyens proposés). En validant un paiement, vous autorisez le débit du montant correspondant.`,
          `Sauf indication contraire, les montants sont exprimés dans la devise affichée au moment de l'achat. Le paiement confirme l'achat et débloque la prestation associée (ex. crédits d'invitations).`,
        ] },
        { h: '6. Quota d’invitations', p: [
          `L'achat d'un quota crédite votre compte d'un nombre d'invitations générables. Les crédits sont rattachés à votre compte et utilisables selon les conditions en vigueur. Un crédit consommé (invitation générée) est réputé exécuté.`,
        ] },
        { h: '7. Marketplace des créateurs', p: [
          `Un Créateur peut publier des modèles après validation par ${site}. Le Créateur fixe le prix de vente lors de la publication.`,
          `Répartition du produit de chaque vente d'un modèle : 40 % pour le Créateur, 40 % pour ${site}, et 20 % de frais de transaction. Les gains du Créateur sont cumulés puis versés sur demande de retrait, sous réserve de validation et d'un compte de paiement valide.`,
          `Le Créateur garantit détenir tous les droits sur les contenus qu'il publie et s'interdit de reproduire le modèle d'un autre créateur. ${site} peut retirer tout modèle non conforme.`,
        ] },
        { h: '8. Propriété intellectuelle', p: [
          `La plateforme, sa marque, son code et ses éléments graphiques sont protégés et demeurent la propriété de ${company} ou de ses partenaires.`,
          `Les contenus que vous importez (noms, photos, textes des invités) restent votre propriété ; vous accordez à ${site} une licence limitée strictement nécessaire à la fourniture du Service (génération, affichage, impression des invitations).`,
        ] },
        { h: '9. Obligations et usages interdits', list: [
          `Fournir des informations exactes et à jour.`,
          `Ne pas utiliser le Service à des fins illégales, frauduleuses ou trompeuses.`,
          `Ne pas porter atteinte aux droits de tiers (données personnelles des invités, droits d'auteur).`,
          `Ne pas tenter de contourner les mesures de sécurité, ni surcharger ou perturber le Service.`,
        ] },
        { h: '10. Disponibilité et maintenance', p: [
          `${site} met en œuvre des moyens raisonnables pour assurer la disponibilité du Service, sans garantie d'absence totale d'interruption. Des opérations de maintenance peuvent être réalisées, si possible avec préavis.`,
        ] },
        { h: '11. Responsabilité', p: [
          `${site} ne saurait être tenu responsable des dommages indirects, ni de la perte de données résultant d'un mauvais usage, d'un cas de force majeure ou d'un manquement de l'Utilisateur. La responsabilité de ${company} est, en tout état de cause, limitée aux montants effectivement payés par l'Utilisateur au titre de la prestation concernée.`,
        ] },
        { h: '12. Résiliation', p: [
          `Vous pouvez cesser d'utiliser le Service à tout moment. ${site} peut suspendre ou fermer un compte en cas de manquement aux présentes Conditions. Les sommes dues restent exigibles ; les crédits non utilisés peuvent être perdus en cas de résiliation pour manquement.`,
        ] },
        { h: '13. Données personnelles', p: [
          `Le traitement des données personnelles est décrit dans la Politique de confidentialité, qui fait partie intégrante des présentes Conditions.`,
        ] },
        { h: '14. Droit applicable et litiges', p: [
          `Les présentes Conditions sont régies par le droit de la République Démocratique du Congo. En cas de litige, les parties rechercheront une solution amiable avant toute action ; à défaut, les tribunaux compétents du siège de l'éditeur seront saisis.`,
        ] },
        { h: '15. Contact', p: [
          `Pour toute question relative aux présentes Conditions : ${email}${phone ? ` — ${phone}` : ''}.`,
        ] },
      ],
    },

    // ====================== POLITIQUE DE CONFIDENTIALITÉ ======================
    confidentialite: {
      title: 'Politique de confidentialité',
      subtitle: `Comment ${site} collecte, utilise et protège vos données personnelles.`,
      sections: [
        { h: '1. Responsable du traitement', p: [
          `Le responsable du traitement des données est ${company}, ${address}. Contact : ${email}.`,
        ] },
        { h: '2. Données que nous collectons', list: [
          `Données de compte : nom, prénom, email, mot de passe (chiffré), rôle.`,
          `Données d'événement et d'invités : titres, dates, lieux, noms des invités, statuts RSVP, éventuelles photos importées.`,
          `Données de paiement : traitées par notre prestataire K-PAY. Nous ne stockons pas vos identifiants Mobile Money ; nous conservons les références de transaction et le statut du paiement.`,
          `Données d'usage : journaux de connexion, adresse IP, statistiques de vues d'invitations, à des fins de sécurité et d'amélioration.`,
        ] },
        { h: '3. Finalités', list: [
          `Fournir et gérer le Service (création d'invitations, suivi RSVP, impressions).`,
          `Traiter les paiements et prévenir la fraude.`,
          `Vous contacter (confirmations, informations importantes, support).`,
          `Améliorer et sécuriser la plateforme.`,
        ] },
        { h: '4. Base légale et consentement', p: [
          `Les traitements reposent selon les cas sur l'exécution du contrat (fourniture du Service), votre consentement (ex. certaines communications), ou l'intérêt légitime (sécurité, amélioration). Vous pouvez retirer votre consentement à tout moment lorsqu'il s'applique.`,
        ] },
        { h: '5. Partage des données', p: [
          `Vos données ne sont ni vendues ni louées. Elles peuvent être partagées avec des prestataires strictement nécessaires : K-PAY (paiement), notre hébergeur, et notre service d'envoi d'emails, chacun tenu à la confidentialité.`,
        ] },
        { h: '6. Durée de conservation', p: [
          `Les données sont conservées le temps nécessaire aux finalités ci-dessus et aux obligations légales (notamment comptables). Vous pouvez demander la suppression de votre compte ; certaines données peuvent être conservées pour des raisons légales.`,
        ] },
        { h: '7. Sécurité', p: [
          `Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables (mots de passe chiffrés, accès restreints, connexions sécurisées). Aucun système n'étant infaillible, nous ne pouvons garantir une sécurité absolue.`,
        ] },
        { h: '8. Vos droits', p: [
          `Vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition sur vos données. Pour exercer ces droits, écrivez à ${email}.`,
        ] },
        { h: '9. Responsabilité concernant les invités', p: [
          `En important les coordonnées de vos invités, vous vous engagez à disposer du droit de le faire et à les informer de l'usage de leurs données dans le cadre de votre événement. Vous agissez comme responsable de ces données ; ${site} agit comme sous-traitant pour votre compte.`,
        ] },
        { h: '10. Cookies', p: [
          `La plateforme utilise des cookies/technologies similaires strictement nécessaires au fonctionnement (session, préférences de thème) et, le cas échéant, à la mesure d'audience. Vous pouvez configurer votre navigateur pour les limiter.`,
        ] },
        { h: '11. Contact', p: [
          `Pour toute question relative à vos données : ${email}${phone ? ` — ${phone}` : ''}.`,
        ] },
      ],
    },

    // ====================== POLITIQUE DE REMBOURSEMENT ======================
    remboursement: {
      title: 'Politique de remboursement',
      subtitle: 'Conditions applicables aux prestations numériques et aux impressions.',
      sections: [
        { h: '1. Nature des prestations', p: [
          `${site} fournit principalement des prestations numériques (crédits d'invitations, modèles, fonctionnalités) exécutées immédiatement, ainsi que des commandes d'impression personnalisées.`,
        ] },
        { h: '2. Principe', p: [
          `Les prestations numériques déjà exécutées (ex. crédits utilisés pour générer des invitations, modèle acheté et téléchargé) ne sont pas remboursables, l'exécution ayant commencé avec votre accord dès le paiement.`,
        ] },
        { h: '3. Cas donnant droit à remboursement', list: [
          `Double paiement ou débit erroné pour une même commande.`,
          `Paiement débité alors que la prestation n'a pas été délivrée (ex. crédits non ajoutés malgré paiement confirmé).`,
          `Défaillance technique imputable au Service empêchant l'utilisation de la prestation payée et non résolue par le support.`,
        ] },
        { h: '4. Cas exclus', list: [
          `Crédits déjà consommés / invitations déjà générées.`,
          `Changement d'avis après exécution d'une prestation numérique.`,
          `Erreur de saisie de votre part dans le contenu de l'invitation (modifiable de votre côté).`,
        ] },
        { h: '5. Impressions', p: [
          `Les commandes d'impression sont des produits personnalisés fabriqués à la demande. Une fois la production lancée, elles ne sont pas remboursables, sauf défaut de fabrication avéré ou erreur imputable au Service. Contactez le support avec photos à l'appui.`,
        ] },
        { h: '6. Marketplace', p: [
          `L'achat d'un modèle est définitif dès son déblocage. En cas de problème (modèle non accessible, litige de droits), contactez le support : après vérification, un remboursement ou un remplacement pourra être proposé.`,
        ] },
        { h: '7. Procédure et délais', p: [
          `Adressez votre demande à ${email} en indiquant la référence de transaction et le motif. Après validation, le remboursement est effectué via le moyen de paiement d'origine (K-PAY / Mobile Money) dans un délai raisonnable, sous réserve des délais du prestataire.`,
        ] },
      ],
    },

    // ============================ MENTIONS LÉGALES ============================
    mentions: {
      title: 'Mentions légales',
      subtitle: `Informations relatives à l'éditeur et à l'hébergeur du site ${site}.`,
      sections: [
        { h: '1. Éditeur du site', list: [
          `Dénomination : ${company}`,
          `Forme juridique / capital : [À COMPLÉTER]`,
          `Siège social : ${address}`,
          `RCCM : [À COMPLÉTER]  —  Identifiant National : [À COMPLÉTER]  —  Numéro Impôt (NIF) : [À COMPLÉTER]`,
          `Email : ${email}${phone ? `  —  Téléphone : ${phone}` : ''}`,
        ] },
        { h: '2. Directeur de la publication', p: [
          `[À COMPLÉTER : nom du responsable de la publication].`,
        ] },
        { h: '3. Hébergement', p: [
          `Le site est hébergé par : [À COMPLÉTER : nom de l'hébergeur, adresse, contact].`,
        ] },
        { h: '4. Propriété intellectuelle', p: [
          `L'ensemble des éléments du site (marque, logo, textes, interfaces, code) est protégé. Toute reproduction non autorisée est interdite.`,
        ] },
        { h: '5. Contact', p: [
          `Pour toute question : ${email}.`,
        ] },
      ],
    },
  }

  return docs[slug] || null
}
