import hashlib


def anonymize(student_id: str) -> str:
    """Hash SHA-256 de l'ID — données jamais stockées en clair."""
    return hashlib.sha256(student_id.encode()).hexdigest()[:16]


def validate_input(text: str) -> str:
    """Filtre les tentatives d'injection de prompts et limite la taille."""
    banned = [
        "ignore previous",
        "system:",
        "jailbreak",
        "forget instructions",
        "</s>",
    ]
    lower = text.lower()
    for b in banned:
        if b in lower:
            return ""
    return text[:2000]
