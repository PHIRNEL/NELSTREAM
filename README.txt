NEL_STREAM - VERSION VERCEL

1. Le fichier index.html doit être à la racine du projet.
2. Le dossier api/tmdb.js doit aussi être à la racine.
3. Dans Vercel, ouvrez le projet > Settings > Environment Variables.
4. Ajoutez :
   Name: TMDB_TOKEN
   Value: votre API Read Access Token TMDB
   Environnements: Production et Preview (selon vos besoins)
5. Enregistrez, puis allez dans Deployments et relancez le déploiement.

Ne placez jamais le jeton dans js/app.js ou dans index.html.

TEST API
Ouvrez :
https://VOTRE-SITE.vercel.app/api/tmdb?path=tv/popular&language=fr-FR

Vous devez recevoir du JSON contenant "results".
- Erreur TMDB_TOKEN non configuré : ajoutez la variable puis redéployez.
- Erreur 401/403 : vérifiez le jeton TMDB et son accès.
- Erreur 404 : vérifiez que api/tmdb.js est bien à la racine du projet.

Réglages Vercel :
Framework Preset: Other
Root Directory: le dossier contenant index.html et api/
Build Command: vide
Output Directory: laissez le réglage par défaut si les fichiers sont à la racine.

Cette version affiche les catalogues, saisons, épisodes, bandes-annonces et
fournisseurs de streaming référencés. Elle ne récupère pas les flux vidéo
complets des plateformes. Leur lecture directe nécessite un accord de diffusion.

Attribution : ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié
par TMDB. Les disponibilités sont fournies par JustWatch via TMDB.
