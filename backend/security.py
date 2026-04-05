import hashlib
import unicodedata


def anonymize(student_id: str) -> str:
    """Hash SHA-256 de l'ID — données jamais stockées en clair."""
    return hashlib.sha256(student_id.encode()).hexdigest()[:16]


# Patterns de prompt injection — comparaison insensible à la casse et aux homoglyphes
_BANNED = [
    "ignore previous",
    "ignore all previous",
    "system:",
    "[system]",
    "jailbreak",
    "forget instructions",
    "forget all instructions",
    "new instructions",
    "disregard",
    "act as",
    "you are now",
    "pretend",
    "roleplay",
    "bypass",
    "</s>",
    "###",
    "---",
]


def validate_input(text: str) -> str:
    """Filtre les tentatives d'injection de prompts et limite la taille.

    Normalise d'abord en NFKC pour résister aux homoglyphes unicode
    (ex: 'ｓｙｓｔｅｍ:' → 'system:').
    """
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKC", text).lower()
    for pattern in _BANNED:
        if pattern in normalized:
            return ""
    return text[:2000]
