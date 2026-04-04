import requests
import time

API = "http://localhost:8000"
N_TESTS = 5
LATENCY_LIMIT_MS = 200


def test_latency(task: str, payload: dict) -> float:
    times = []
    print(f"\n--- Test : {task} ({N_TESTS} requêtes) ---")
    for i in range(N_TESTS):
        start = time.time()
        r = requests.post(
            f"{API}/query",
            json={"student_id": "TEST", **payload, "task": task},
            timeout=60,
        )
        elapsed = (time.time() - start) * 1000
        d = r.json()
        times.append(elapsed)
        status = "OK" if elapsed < LATENCY_LIMIT_MS else "LENT"
        model_latency = d.get("latency_ms", "N/A")
        print(f"  [{i+1}] total={elapsed:.0f}ms  modèle={model_latency}ms  → {status}")

    avg = sum(times) / len(times)
    print(
        f"  Moyenne : {avg:.0f}ms | Max : {max(times):.0f}ms | "
        f"Contrainte {LATENCY_LIMIT_MS}ms : "
        f"{'RESPECTÉE ✓' if avg < LATENCY_LIMIT_MS else 'DÉPASSÉE ✗'}"
    )
    return avg


if __name__ == "__main__":
    print("=" * 50)
    print("  BENCHMARK CAMPUS AI EDGE")
    print("=" * 50)

    # Vérification santé
    try:
        h = requests.get(f"{API}/health", timeout=5).json()
        print(f"\nStatut  : {h['status']}")
        print(f"Modèle  : {h['model']}")
        print(f"Mode    : {h['mode']}")
    except Exception as e:
        print(f"\nERREUR : impossible de joindre le serveur — {e}")
        print("Assurez-vous que uvicorn tourne sur le port 8000.")
        exit(1)

    results = {}

    # Test Q&A
    results["qa"] = test_latency(
        "qa",
        {
            "question": "Qu'est-ce que l'IA Edge ?",
            "context": "L'IA Edge désigne le déploiement de modèles d'intelligence artificielle directement sur des appareils locaux, sans envoyer les données vers le cloud.",
        },
    )

    # Test résumé
    results["summary"] = test_latency(
        "summary",
        {
            "content": (
                "Le machine learning est un sous-domaine de l'IA qui permet aux machines "
                "d'apprendre depuis des données sans être explicitement programmées. "
                "Il existe trois grandes familles : supervisé, non supervisé et par renforcement."
            )
        },
    )

    # Test stress / bien-être
    results["stress"] = test_latency(
        "stress",
        {"content": "Je suis très stressé par les examens, j'ai l'impression de ne pas avoir assez révisé."},
    )

    # Résultats finaux
    print("\n" + "=" * 50)
    print("  RÉSULTATS FINAUX")
    print("=" * 50)
    for task, avg in results.items():
        icon = "✓" if avg < LATENCY_LIMIT_MS else "✗"
        print(f"  {icon} {task:<12} : {avg:.0f} ms")

    s = requests.get(f"{API}/stats", timeout=5).json()
    print(f"\nTotal requêtes enregistrées : {s['total_queries']}")
    print(f"Latence moyenne (edge)      : {s['avg_latency_ms']} ms")
