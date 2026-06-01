# Rêvalys — contes du soir (Web, GitHub Pages)

App web statique : l'utilisateur choisit une durée, écrit **ou dicte** des idées,
l'IA génère une histoire et l'app la **raconte à voix haute**.

## Stack (100% navigateur, gratuit, sans clé)

- **Texte (LLM)** : [Pollinations.ai](https://pollinations.ai) — API gratuite,
  **sans clé**, sans inscription, CORS ouvert → utilisable depuis une page
  statique. Repli sur une histoire locale si l'API ne répond pas.
- **Dictée** : Web Speech API (`SpeechRecognition`) du navigateur.
- **Voix** : `speechSynthesis` du navigateur — meilleure voix FR de l'appareil,
  lecture phrase par phrase avec pauses naturelles.

> ⚠️ **Pourquoi pas Grok / une vraie voix neurale ici ?** GitHub Pages est
> 100% statique : toute clé API mise dans le code serait **publique**. Pour une
> voix « studio » (ElevenLabs/OpenAI) et un LLM à clé (Grok/Claude), il faut un
> **backend** qui garde le secret — c'est le rôle de `lullaby-api` (Fastify +
> `@getexp/core`) dans le framework. Voir la note en bas.

## Déploiement (déjà câblé)

`.github/workflows/pages.yml` publie ce dossier sur GitHub Pages à chaque push.
**Une seule action manuelle, une fois** : sur GitHub →
**Settings → Pages → Build and deployment → Source : GitHub Actions**.
L'URL sera `https://koko878.github.io/getexp-framewok/`.

## Local

Ouvre simplement `index.html` dans un navigateur (Chrome/Safari).

## Étape suivante (vraie voix humaine)

Brancher un backend `lullaby-api` qui appelle un **TTS neural** (ElevenLabs /
OpenAI TTS) avec la clé côté serveur, et renvoie un vrai fichier audio.
