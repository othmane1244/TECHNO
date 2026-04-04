# sync.py — Synchronisation cloud (fonctionnalité future)
#
# Ce module est un stub prévu pour une future synchronisation entre
# l'instance edge locale et un serveur cloud campus.
#
# Fonctionnalités prévues :
#   - push_stats()        : envoyer les statistiques anonymes vers le cloud
#   - pull_model_update() : récupérer les mises à jour du modèle
#   - sync_course_cache() : synchroniser le cache de résumés de cours
#
# Implémentation à compléter selon les besoins du projet.


def push_stats(stats: dict) -> bool:
    """Envoie les statistiques anonymes vers le serveur cloud campus."""
    # TODO: implémenter la synchronisation cloud
    raise NotImplementedError("Synchronisation cloud non encore implémentée")


def pull_model_update() -> str | None:
    """Vérifie si une nouvelle version du modèle est disponible."""
    # TODO: implémenter la vérification de mise à jour
    raise NotImplementedError("Vérification de mise à jour non encore implémentée")
