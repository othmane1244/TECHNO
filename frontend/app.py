import streamlit as st
import requests
import json

API = "http://localhost:8000"
REQUEST_TIMEOUT = 120  # secondes — tolérant pour la génération locale

st.set_page_config(
    page_title="Campus AI — Assistant Intelligent",
    page_icon="🎓",
    layout="wide",
)

# --- Sidebar ---
with st.sidebar:
    st.title("🎓 Campus AI")
    st.caption("Assistant IA Génératif Edge")

    student_id = st.text_input(
        "ID Étudiant",
        value="ETU2024001",
        help="Anonymisé côté serveur via SHA-256 — jamais stocké en clair",
    )

    st.divider()
    st.caption("📡 Statut du système")
    try:
        h = requests.get(f"{API}/health", timeout=3).json()
        status = h.get("status", "inconnu")
        model = h.get("model", "?")
        if status == "online":
            st.success(f"✅ En ligne — Mode : {status}")
        else:
            st.warning(f"⚠️ Mode : {status}")
        st.caption(f"Modèle actif : `{model}`")
    except requests.exceptions.ConnectionError:
        st.error("🔴 Serveur FastAPI hors ligne")
        st.caption("Lancez : `uvicorn main:app --port 8000`")
    except Exception as e:
        st.error(f"Erreur : {e}")

    st.divider()
    if st.button("📊 Voir les statistiques"):
        try:
            s = requests.get(f"{API}/stats", timeout=5).json()
            st.metric("Requêtes totales", s["total_queries"])
            st.metric("Latence moy. (Edge)", f"{s['avg_latency_ms']} ms")
            if s["by_task"]:
                st.caption("Par tâche :")
                for task, count in s["by_task"].items():
                    st.caption(f"  • {task} : {count}")
        except Exception:
            st.error("Impossible de récupérer les stats")


def call_api(payload: dict) -> dict | None:
    """Appel centralisé à l'API avec gestion d'erreurs robuste."""
    try:
        r = requests.post(f"{API}/query", json=payload, timeout=REQUEST_TIMEOUT)
        if r.status_code != 200:
            st.error(f"❌ Erreur serveur ({r.status_code}) : {r.text[:200]}")
            return None
        return r.json()
    except requests.exceptions.ConnectionError:
        st.error("❌ Connexion refusée — le serveur FastAPI n'est pas démarré.")
        return None
    except requests.exceptions.Timeout:
        st.error("⏱️ Le modèle met trop de temps à répondre. Ollama est peut-être encore en chargement.")
        return None
    except Exception as e:
        st.error(f"Erreur inattendue : {e}")
        return None


def show_meta(d: dict):
    """Affiche les méta-données de latence et mode sous chaque réponse."""
    mode_color = "green" if d.get("mode") == "edge" else "orange"
    col1, col2 = st.columns(2)
    with col1:
        st.metric("⚡ Latence", f"{d.get('latency_ms', 0)} ms")
    with col2:
        st.markdown(f"**Mode :** :{mode_color}[{d.get('mode', '?').upper()}]")


# --- Onglets principaux ---
tab1, tab2, tab3, tab4 = st.tabs([
    "📄 Résumé de cours",
    "❓ Questions / Réponses",
    "📅 Planning de révision",
    "💙 Bien-être étudiant",
])

# ── Tab 1 : Résumé ──────────────────────────────────────────────────────────
with tab1:
    st.subheader("Résumé automatique de cours")
    st.caption("Collez le contenu brut de votre cours — l'IA génère 5 points clés structurés.")
    course = st.text_area("Contenu du cours :", height=220, placeholder="Collez ici le texte de votre cours...")
    if st.button("🔍 Générer le résumé", type="primary", key="btn_summary"):
        if course.strip():
            with st.spinner("⚙️ Traitement Edge en cours..."):
                d = call_api({"student_id": student_id, "content": course, "task": "summary"})
            if d:
                st.markdown(d["answer"])
                show_meta(d)
        else:
            st.warning("⚠️ Veuillez coller le contenu du cours avant de générer.")

# ── Tab 2 : Q&A ─────────────────────────────────────────────────────────────
with tab2:
    st.subheader("Posez votre question")
    ctx = st.text_area("Contexte du cours (optionnel) :", height=100,
                        placeholder="Ex : chapitre sur les réseaux de neurones...")
    q = st.text_input("Votre question :", placeholder="Ex : Quelle est la différence entre CNN et RNN ?")
    if st.button("💬 Obtenir une réponse", type="primary", key="btn_qa"):
        if q.strip():
            with st.spinner("🔎 Recherche en cours..."):
                d = call_api({"student_id": student_id, "question": q, "context": ctx, "task": "qa"})
            if d:
                st.markdown(d["answer"])
                show_meta(d)
        else:
            st.warning("⚠️ Veuillez saisir une question.")

# ── Tab 3 : Planning ─────────────────────────────────────────────────────────
with tab3:
    st.subheader("Planning personnalisé de révision")
    st.caption("Entrez vos matières — l'IA génère un planning sur 7 jours avec objectifs.")
    matieres = st.text_area(
        "Matières à réviser (une par ligne) :",
        height=120,
        value="Mathématiques\nPhysique\nInformatique",
    )
    if st.button("📅 Créer mon planning", type="primary", key="btn_planning"):
        with st.spinner("📋 Génération du planning..."):
            d = call_api({"student_id": student_id, "content": matieres, "task": "planning"})
        if d:
            st.markdown(d["answer"])
            show_meta(d)

# ── Tab 4 : Bien-être ────────────────────────────────────────────────────────
with tab4:
    st.subheader("💙 Comment vous sentez-vous ?")
    st.caption(
        "Analyse confidentielle et bienveillante. "
        "Vos données restent sur le campus — aucune information ne quitte la machine."
    )
    msg = st.text_area("Décrivez votre état en quelques mots :",
                        height=100, placeholder="Ex : Je suis très stressé par les examens...")
    if st.button("🔬 Analyser", type="primary", key="btn_stress"):
        if msg.strip():
            with st.spinner("💭 Analyse en cours..."):
                d = call_api({"student_id": student_id, "content": msg, "task": "stress"})
            if d:
                try:
                    res = json.loads(d["answer"])
                    niv = res.get("niveau", "faible")
                    colors = {"faible": "green", "moyen": "orange", "eleve": "red"}
                    emoji = {"faible": "😊", "moyen": "😐", "eleve": "😟"}
                    st.markdown(
                        f"### {emoji.get(niv, '')} Niveau détecté : "
                        f":{colors.get(niv, 'gray')}[**{niv.upper()}**]"
                    )
                    emotions = res.get("emotions", [])
                    if emotions:
                        st.write("**Émotions détectées :**", ", ".join(emotions))
                    conseil = res.get("conseil", "")
                    if conseil:
                        st.info(f"💡 {conseil}")
                    show_meta(d)
                except (json.JSONDecodeError, TypeError):
                    # Le modèle n'a pas retourné du JSON propre — afficher tel quel
                    st.markdown(d["answer"])
                    show_meta(d)
        else:
            st.warning("⚠️ Veuillez décrire votre état avant d'analyser.")
