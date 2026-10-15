# Winvite — Audit & plan d'amélioration

Oct 15, 2026 · @kadilab

## Résumé

50 nouveaux templates sont en ligne en **brouillon** (catalogue : 65 → 115) ; à toi de les relire et de les publier. L'audit relève 3 priorités : fiabiliser les commandes et quotas, corriger les compteurs incohérents du tableau de bord, et rendre l'éditeur capable de créer un fond sans image importée.

- **Inspiration** : les 12 visuels envoyés (photo ronde + aquarelle, hexagone doré sur bleu nuit, bandeau coloré sous les noms, photo fondue, cadre Art nouveau, feuillages sépia, line-art) + des motifs africains (kente, bogolan, wax, Kuba, cauris, perles).
- **Fonds** : dessinés en vectoriel (SVG) puis convertis en WebP 800×1120, sans aucune image sous licence.
- **Points bloquants à corriger d'abord** : commandes en double, quota dépassé (1 invitation générée pour 0 achetée), page /templates en 404 côté client, compteurs du dashboard faux.

## Templates créés

Tous sont Premium, au format A5 portrait (800×1120), animés à l'ouverture, avec QR code, et visibles dans Admin › Templates › Brouillons (source « Plateforme »). Les mariages ont le programme Commune / Église / Réception ; les autres ont un lieu unique.

| Catégorie | Nb | Templates |
| --- | --- | --- |
| Mariage | 27 | Hexagone Doré – Nuit d'Hiver, Pivoine Poudrée, Éclat Art Déco Émeraude, Arche Dune, Eucalyptus Givré, Constellation Saphir, Aquarelle Pêche, Marbre Blanc & Cuivre, Ligne Pure, Velours Grenat, Jardin Anglais, Géométrie Corail, Glycine, Dorure Minimal Noir, Terrazzo Pastel, Coucher Tropical, Champagne Fanfare, Rose Ancienne, Ciel d'Azur, Olivier Méditerranée, Arche Nuit & Or, Bleu Wedgwood, Bandeau Vert Sauge, Art Nouveau Or, Line-Art Champagne, Feuilles Sépia, Photo Fondue Lavande |
| Mariage coutumier | 12 | Kente Ashanti Or, Bogolan Ocre, Wax Cauris Turquoise, Liputa Rouge & Or, Raphia Kasaï, Pagne Indigo, Kente Vert Émeraude, Dot Royale Noir & Or, Soleil du Sahel, Perles Massaï, Wax Fleurs de Mariage, Cola & Cauris |
| Anniversaire | 4 | Arc-en-ciel Pop, Gold Glam Soirée, Ballons Or Rose, Fiesta Tropicale |
| Cérémonie | 3 | Noces d'Or, Action de Grâce, Baptême Douceur Rose |
| Conférence | 2 | Summit Indigo, Lancement Officiel |
| Autre événement | 2 | Soirée de Fiançailles, Baby Shower Nuage |

Prix : 500 FC par invitation, 1 000 FC pour 12 modèles « prestige » (Art déco, noir & or, marbre, velours…). À vérifier avant publication : le titre de « Cola & Cauris » est un peu collé au cadre, et le cercle photo d'« Arche Dune » touche le filet de l'arche.

## Bugs et incohérences constatés

Classés par gravité ; chaque ligne a été observée sur winvite.pro le 15/10/2026.

| Gravité | Où | Constat |
| --- | --- | --- |
| Haute | Achats d'invitations | Commandes identiques créées en rafale (5 × « 2 invitations · 600 FC » à quelques minutes d'écart), toutes « preuve non soumise » : pas d'anti-doublon ni d'expiration. |
| Haute | Paiements (client) | « 1 générée / 0 achetée » : des invitations sont générées sans quota payé. |
| Haute | Espace client › Templates | /templates renvoie une page 404 (lien du menu cassé). |
| Moyenne | Dashboard admin | « Aujourd'hui : 3 mariages · 17 commandes » affiche des totaux, pas ceux du jour. |
| Moyenne | Dashboard vs Supervision | 6 utilisateurs d'un côté, 7 de l'autre ; badge 17 commandes vs 10 « en attente » dans la page. |
| Moyenne | Dashboard | Revenus 0 FC alors que le solde K-PAY est de 1 013,12 CDF. |
| Moyenne | Événements | Une cérémonie affiche 1 invité mais 2 confirmés (liste) et 1 confirmé (détail). |
| Moyenne | Éditeur | 2 exceptions JavaScript non gérées à l'ouverture d'un template ; « Aucune image de fond » s'affiche 3–5 s avant le chargement. |
| Basse | Dashboard › Derniers mariages | Noms vides « & » pour les cérémonies, statut « DRAFT » non traduit. |
| Basse | Aperçus des templates | Les modèles non-mariage affichent « Marie & Jean » comme titre d'événement. |
| Basse | Invitation (aperçu client) | « Merci de confirmer avant le » reste affiché sans date ; pied « Mariée & Marié » sur une cérémonie. |
| Basse | Coupons | Le code WELCOME50 donne −70 %. |
| Basse | Achats d'invitations | Libellés « ÉVÉNEMENT » et « QUANTITÉ » qui se chevauchent, nom tronqué « Sch… ». |
| Basse | Utilisateurs, Événements | Tableaux plus larges que l'écran : colonne Actions coupée. |
| Basse | Espace client | « Tableau de bord » renvoie le super admin vers le dashboard admin. |

## Éditeur de templates : améliorations

Le plus gros frein : l'éditeur exige une image de fond importée, donc chaque template dépend d'un visuel fait ailleurs.

1. **Générateur de fonds intégré** : couleur unie, dégradé, motifs (kente, wax, bogolan, Art déco, floral, étoiles) paramétrables par la palette, exportés en WebP — la logique existe déjà dans les scripts utilisés pour ces 50 modèles.
2. **Barre d'alignement** sur sélection multiple : aligner gauche/centre/droite, haut/milieu/bas, répartir l'espacement, centrer sur la page.
3. **Guides magnétiques** au déplacement (centre de page, bords et centres des autres éléments).
4. **Panneau de propriétés à droite** : aujourd'hui il remplace la liste des éléments à gauche ; la zone droite reste vide.
5. **Masques photo** : cercle et rectangle seulement ; ajouter arche, hexagone, cœur, forme organique (blob), fondu en dégradé.
6. **Mise en page automatique par type d'événement** : insérer d'un clic le bloc Commune/Église/Réception ou le bloc Lieu unique, déjà empilés et centrés.
7. **Données d'exemple cohérentes** : « Anniversaire de Sophie », « Conférence… » au lieu de « Marie & Jean » pour les types non-mariage.
8. **Masquage automatique** des champs vides (RSVP, table, adresse) et ré-empilement des éléments en dessous.
9. **Styles de texte réutilisables** (Titre, Noms, Corps, Détail) appliqués en un clic, liés à la palette.
10. **Duplication en variante** : cloner un template en changeant seulement la palette (5 variantes de couleur en un clic).
11. **Vérifications avant publication** : texte hors canevas, contraste insuffisant, QR trop petit (< 100 px), élément masqué par le fond.
12. **Chargement** : squelette pendant le chargement au lieu de l'état vide, et capture des erreurs JS.

## Espace client, admin, site public : améliorations

**Admin**

- Publication en masse des brouillons (cases à cocher + « Publier la sélection ») et filtre Brouillons/Publiés combinable avec le type d'événement.
- Commandes : statut « En attente de paiement » distinct de « À valider », expiration automatique après 24 h, regroupement des doublons.
- Un seul service de statistiques partagé par Dashboard et Supervision, avec « aujourd'hui » calculé sur un fuseau configurable (Africa/Lubumbashi par défaut).
- Tableaux responsives : colonne Actions fixe ou menu « ⋯ ».

**Espace client**

- Vignettes d'événement avec la miniature du template choisi au lieu de l'initiale « C ».
- Titre d'événement saisi librement pour les cérémonies (« Baptême de Grace »), pas « Cérémonie de X » imposé.
- Tuiles d'actions (Invités, Plan de table…) : textes tronqués à corriger (grille 3 colonnes ou texte sur 2 lignes).
- Textes génériques « événement » au lieu de « mariage » dans Impressions et les aperçus.
- Sélecteur de templates : filtres par style et couleur, aperçu plein écran animé.

**Site public**

- La section « Modèles » montre 5 maquettes codées en dur (Ava & Liam, Paris…) : afficher les vrais templates publiés, avec des prénoms et villes locaux.
- Ajouter une grille de prix (FC par invitation, exemples 50 / 150 / 300 invités) et des témoignages réels.
- Titre de page « Invitations de Mariage Numériques » : élargir aux dots, anniversaires et conférences pour le référencement.

## Directives à coller dans Claude (VS Code)

Colle un bloc à la fois, dans l'ordre, et fais relire le plan de Claude avant qu'il modifie le code. Les routes citées sont celles observées dans l'application (front React/Vite, API sous /api).

**1. Commandes et quotas (priorité haute)**

```text
Analyse le flux d'achat d'invitations (frontend page Paiements + API des commandes d'invitations et de génération). Corrige :
1) Anti-doublon : une seule commande "en attente" par événement et quantité ; réutilise-la au lieu d'en créer une nouvelle (clé d'idempotence côté API + bouton désactivé pendant l'envoi).
2) Statuts : AWAITING_PAYMENT (preuve non soumise) distinct de PENDING_REVIEW ; expiration auto des AWAITING_PAYMENT après 24 h (job planifié).
3) Quota : refuse côté serveur toute génération d'invitation au-delà du quota acheté (aujourd'hui on voit "1 générée / 0 achetée"). Ajoute un test.
4) Badge du menu admin = même requête que le compteur de la page Achats d'invitations.
Montre-moi le plan et les fichiers touchés avant de coder.
```

**2. Statistiques cohérentes**

```text
Crée un service unique de statistiques utilisé par /api/admin/dashboard et la page Supervision. Corrige : la bannière "Aujourd'hui" doit compter uniquement les inscriptions, événements et commandes du jour (fuseau configurable, défaut Africa/Lubumbashi) ; même nombre d'utilisateurs partout (précise si les admins sont exclus) ; "Revenus invitations" doit refléter les paiements K-PAY confirmés ; le nombre de confirmés ne peut pas dépasser le nombre d'invités. Pour les événements non-mariage, affiche le titre de l'événement au lieu de "& " et traduis les statuts (DRAFT → Brouillon).
```

**3. Navigation et pages cassées**

```text
Dans l'espace client : le lien "Templates" (/templates) affiche une 404 pour un super admin ; corrige la garde de route. "Tableau de bord" (/dashboard) ne doit pas rediriger un super admin vers /admin quand il est dans l'espace client. Rends les tableaux admin (Utilisateurs, Événements, Achats d'invitations) responsives : colonne Actions toujours visible, libellés qui ne se chevauchent pas, noms d'événement non tronqués.
```

**4. Générateur de fonds dans l'éditeur**

```text
Dans TemplateDesigner, onglet "Fond", ajoute "Générer un fond" en plus de l'import d'image. Propose des styles paramétrables par la palette du template : uni, dégradé, cadre classique doré, Art déco, floral aux coins, aquarelle, étoiles, arche, géométrique, kente, bogolan, wax, motif Kuba, cauris, perles. Génère un SVG 800x1120 (ou aux dimensions du format), rends-le dans un canvas, exporte en WebP 0.9 et envoie-le via POST /api/templates/upload-background (champ templateBackground). Ajoute un bouton "Aléatoire" (seed) et un aperçu avant validation.
```

**5. Ergonomie de l'éditeur**

```text
Améliore l'éditeur de templates : (a) barre d'alignement et de répartition pour la sélection multiple, (b) guides magnétiques (centre de page, bords et centres des autres éléments), (c) panneau de propriétés à droite pour garder la liste des éléments à gauche, (d) nouveaux masques photo : arche, hexagone, cœur, blob, fondu dégradé, (e) squelette de chargement au lieu de "Aucune image de fond" et capture des exceptions non gérées au chargement d'un template existant.
```

**6. Mise en page intelligente et contrôles avant publication**

```text
Ajoute : (1) des blocs prêts à insérer selon le type d'événement (Commune/Église/Réception pour WEDDING et DOT, Lieu unique sinon) ; (2) masquage automatique des champs vides au rendu de l'invitation (RSVP, table, adresse) avec ré-empilement vertical ; (3) données d'exemple par type d'événement dans les aperçus (pas "Marie & Jean" pour un anniversaire) ; (4) au clic sur Publier, un contrôle qui signale texte hors canevas, contraste insuffisant (WCAG AA), QR < 100 px ; (5) publication en masse des brouillons dans /admin/templates.
```

**7. Site public**

```text
Sur la page d'accueil, remplace les 5 modèles codés en dur (Ava & Liam, Paris…) par les templates publiés réels (GET /api/templates), avec des prénoms et villes de RDC. Ajoute une section tarifs (prix par invitation en FC, exemples pour 50, 150 et 300 invités) et mets à jour le <title> et la meta description pour couvrir mariages, dots, anniversaires, cérémonies et conférences.
```
