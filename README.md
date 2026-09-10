# Empreinte — scanner d'impact carbone

Scanne un code-barres (ou une photo en secours) pour afficher l'empreinte
carbone d'un produit, à partir des données ouvertes **ADEME Agribalyse** via
**Open Food Facts**. Contrairement à Yuka, l'appli ne s'occupe pas des
additifs ou du Nutri-Score : uniquement l'impact carbone.

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS — identité visuelle custom (voir `tailwind.config.ts`)
- `html5-qrcode` pour le scan de code-barres côté navigateur
- Supabase (Postgres) pour l'historique des scans, sans compte utilisateur
  (identifiant anonyme généré en local)
- Optionnel : API Claude (vision) pour identifier un produit sans code-barres

## Mise en route en local

```bash
npm install
cp .env.example .env.local   # puis renseignez vos clés
npm run dev
```

## Configuration Supabase

1. Créez un projet gratuit sur [supabase.com](https://supabase.com)
2. Dans l'éditeur SQL du projet, exécutez le contenu de `supabase/schema.sql`
3. Récupérez `Project URL` et la clé `anon public` dans Settings → API, et
   renseignez-les dans `.env.local` / dans les variables d'environnement Vercel

## Déploiement sur Vercel

1. Poussez ce dossier sur un dépôt GitHub
2. Sur [vercel.com](https://vercel.com), "New Project" → importez le dépôt
3. Ajoutez les variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, et `ANTHROPIC_API_KEY` si vous activez la
   reconnaissance photo)
4. Déployez — Next.js est reconnu automatiquement, aucune config Vercel
   supplémentaire n'est nécessaire

## Coût de production (estimation vérifiée, à confirmer selon votre trafic)

| Poste | Coût |
|---|---|
| Vercel Hobby (perso, non-commercial) | 0 € |
| Vercel Pro (usage public retenu ici) | 20 $/mois par siège, incluant 20 $ de crédit d'usage ; au-delà, facturation à l'usage (bande passante, invocations de fonctions) |
| Open Food Facts API | 0 € (données ouvertes) |
| Supabase (historique) | 0 € en free tier pour un volume perso/démo |
| Nom de domaine (optionnel) | ~10-15 €/an |
| Reconnaissance photo IA (optionnelle) | Facturée à l'usage par appel — vérifiez le tarif courant sur https://docs.claude.com/en/docs/about-claude/pricing avant activation en production, et fixez si besoin une limite de volume |

**Le plan Pro Vercel à 20 $/mois est un forfait de base** : au-delà du crédit
inclus, le trafic supplémentaire est facturé à l'usage. Pour un lancement
public mais à faible trafic, prévoyez de surveiller le tableau de bord
Vercel les premières semaines pour caler un budget réaliste.

## Limites connues à ce stade

- Les valeurs carbone viennent d'Agribalyse (moyennes par catégorie de
  produit), pas d'une mesure spécifique à chaque marque/lot
- La reconnaissance par photo est une estimation moins fiable qu'un scan de
  code-barres (elle identifie le produit par nom, pas par référence exacte)
- Le schéma Supabase fourni est un point de départ ; en production réelle,
  ajoutez une authentification anonyme Supabase pour des règles RLS plus
  strictes que la policy `using (true)` fournie ici
