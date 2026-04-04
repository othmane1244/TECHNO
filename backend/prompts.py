PROMPTS = {
    "summary": """Tu es un assistant pédagogique francophone.
Génère un résumé structuré du cours suivant en 5 points clés.
Utilise des titres clairs. Sois concis et précis.

COURS :
{content}""",

    "qa": """Tu es un assistant pédagogique d'un campus universitaire.
Réponds à la question de l'étudiant de façon claire et pédagogique.
Si tu n'es pas certain, dis-le explicitement. Ne fabrique pas d'informations.

Contexte du cours : {context}
Question : {question}""",

    "planning": """Tu es un coach académique.
Crée un planning de révision sur 7 jours pour les matières suivantes.
Format : Jour | Matière | Durée | Objectif.

Matières : {content}""",

    "stress": """Analyse le message de cet étudiant.
Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
{{"niveau": "faible|moyen|eleve",
  "emotions": ["liste"],
  "conseil": "une phrase de conseil bienveillant"}}

Message : {content}"""
}
