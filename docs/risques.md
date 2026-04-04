# Analyse des risques — Campus AI Edge

## 1. Risques liés aux biais du modèle

### Identification
| Risque | Description | Probabilité | Impact |
|--------|-------------|-------------|--------|
| Biais linguistique | Gemma 4 est entraîné majoritairement sur de l'anglais — réponses en français parfois moins précises | Moyenne | Modéré |
| Biais culturel | Le modèle peut refléter des biais présents dans ses données d'entraînement (genre, origine, discipline) | Faible-Moyenne | Élevé |
| Hallucination | Le modèle peut générer des informations factuellement incorrectes avec assurance | Moyenne | Élevé |
| Biais pédagogique | Tendance à sur-simplifier ou à privilegier certains styles d'explication | Faible | Modéré |

### Mesures d'atténuation
- **Température 0.3** : réduit les réponses aléatoires et les hallucinations
- **Prompt engineering** : instructions explicites « Si tu n'es pas certain, dis-le »
- **Supervision humaine** : les réponses ne remplacent pas l'enseignant — outil d'aide uniquement
- **Limitation du contexte** : 4096 tokens max pour éviter les dérives en longue conversation

---

## 2. Risques RGPD

### Données traitées
| Donnée | Traitement | Durée de conservation |
|--------|-----------|----------------------|
| ID étudiant | Hashé SHA-256 (16 chars) avant stockage | Indéfinie (hash irréversible) |
| Contenu du cours | Transmis au modèle local, **jamais stocké** | 0 (traitement en mémoire) |
| Questions posées | Transmises au modèle local, **jamais stockées** | 0 (traitement en mémoire) |
| Métadonnées (tâche, latence, timestamp) | Stockées dans SQLite local | Configurable |

### Conformité
- **Article 5 RGPD** (minimisation) : seules les métadonnées anonymes sont conservées ✓
- **Article 25 RGPD** (privacy by design) : anonymisation par défaut dès la réception ✓
- **Article 32 RGPD** (sécurité) : aucune transmission réseau externe, données sur le campus ✓
- **Transfert hors UE** : inexistant — modèle 100% local ✓

### Points de vigilance
- Le fichier `campus.db` doit être protégé par les permissions système
- En cas de suppression de compte étudiant, les hash restent (irréversibles par conception)
- Documenter la base légale du traitement (mission de service public d'enseignement)

---

## 3. Risques de cybersécurité

### Attaques identifiées

#### Injection de prompts (Prompt Injection)
- **Risque** : un étudiant malveillant insère des instructions cachées pour manipuler le modèle
- **Mitigation** : `validate_input()` filtre les patterns connus (`ignore previous`, `jailbreak`, etc.)
- **Limite** : les attaques d'injection évoluent constamment — la liste noire est à maintenir

#### Attaque par déni de service (DoS)
- **Risque** : envoi massif de requêtes saturant le CPU/GPU
- **Mitigation** : limiter le nombre de requêtes par IP (à implémenter via FastAPI middleware)
- **Recommandation** : ajouter `slowapi` pour le rate limiting

#### Exfiltration de données via le modèle
- **Risque** : le modèle répète des informations sensibles présentes dans le contexte
- **Mitigation** : limite de 2000 caractères par entrée, pas de stockage du contenu

#### Accès non autorisé à l'API
- **Risque** : l'API est ouverte (CORS `*`) — accessible sur le réseau local campus
- **Recommandation** : ajouter une authentification JWT pour la mise en production

### Matrice de risques

```
Impact
  ↑
Élevé  │  Hallucination    │  Injection prompts │
       │  Biais culturel   │                    │
Modéré │  Biais pédago     │  DoS               │
       │                   │  Accès non autorisé│
Faible │                   │  Exfiltration      │
       └────────────────────────────────────────→ Probabilité
            Faible              Moyenne
```

---

## 4. Plan de mitigation prioritaire

1. **Court terme** : maintenir la liste noire anti-injection à jour
2. **Moyen terme** : ajouter rate limiting (`slowapi`) + authentification JWT
3. **Long terme** : audit régulier des réponses du modèle pour détecter les biais persistants
4. **Continu** : mettre à jour le modèle via `ollama pull` pour bénéficier des correctifs
