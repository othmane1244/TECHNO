import streamlit as st
import requests
import json

API = "http://localhost:8000"

st.set_page_config(
    page_title="Campus AI — Assistant Intelligent",
    page_icon="🎓",
    layout="wide",
)

# --- Sidebar ---
with st.sidebar:
    st.title("Campus AI")
    st.caption("Assistant IA Génératif Edge")

    student_id = st.text_input(
        "ID Étudiant",
        value="ETU2024001",
        help="Anonymisé côté serveur via SHA-256",
    )

    st.divider()
    st.caption("Statut du système")
    try:
        h = requests.get(f"{API}/health", timeout=2).json()
        st.success(f"Mode : {h['status']}")
        st.caption(f"Modèle : {h['model']}")
    except Exception:
        st.error("Serveur hors ligne")

    st.divider()
    if st.button("Voir les statistiques"):
        try:
            s = requests.get(f"{API}/stats", timeout=5).json()
            st.metric("Requêtes totales", s["total_queries"])
            st.metric("Latence moy.", f"{s['avg_latency_ms']} ms")
            if s["by_task"]:
                st.caption("Par tâche :")
                for task, count in s["by_task"].items():
                    st.caption(f"  • {task} : {count}")
        except Exception:
            st.error("Impossible de récupérer les stats")

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
    course = st.text_area("Collez le contenu du cours ici :", height=220)
    if st.button("Générer le résumé", type="primary", key="btn_summary"):
        if course.strip():
            with st.spinner("Traitement Edge en cours..."):
                r = requests.post(
                    f"{API}/query",
                    json={
                        "student_id": student_id,
                        "content": course,
                        "task": "summary",
                    },
                )
                d = r.json()
            col1, col2 = st.columns([3, 1])
            with col1:
                st.markdown(d["answer"])
            with col2:
                st.metric("Latence", f"{d['latency_ms']} ms")
                st.metric("Mode", d["mode"])
        else:
            st.warning("Veuillez coller le contenu du cours avant de générer.")

# ── Tab 2 : Q&A ─────────────────────────────────────────────────────────────
with tab2:
    st.subheader("Posez votre question")
    ctx = st.text_area("Contexte du cours (optionnel) :", height=100)
    q = st.text_input("Votre question :")
    if st.button("Obtenir une réponse", type="primary", key="btn_qa"):
        if q.strip():
            with st.spinner("Recherche en cours..."):
                r = requests.post(
                    f"{API}/query",
                    json={
                        "student_id": student_id,
                        "question": q,
                        "context": ctx,
                        "task": "qa",
                    },
                )
                d = r.json()
            st.info(f"Latence : {d['latency_ms']} ms  |  Mode : {d['mode']}")
            st.markdown(d["answer"])
        else:
            st.warning("Veuillez saisir une question.")

# ── Tab 3 : Planning ─────────────────────────────────────────────────────────
with tab3:
    st.subheader("Planning personnalisé de révision")
    matieres = st.text_area(
        "Matières à réviser (une par ligne) :",
        height=120,
        value="Mathématiques\nPhysique\nInformatique",
    )
    if st.button("Créer mon planning", type="primary", key="btn_planning"):
        with st.spinner("Génération du planning..."):
            r = requests.post(
                f"{API}/query",
                json={
                    "student_id": student_id,
                    "content": matieres,
                    "task": "planning",
                },
            )
            d = r.json()
        st.info(f"Latence : {d['latency_ms']} ms")
        st.markdown(d["answer"])

# ── Tab 4 : Bien-être ────────────────────────────────────────────────────────
with tab4:
    st.subheader("Comment vous sentez-vous ?")
    st.caption(
        "Analyse confidentielle et bienveillante. "
        "Vos données restent sur le campus."
    )
    msg = st.text_area("Décrivez votre état en quelques mots :", height=100)
    if st.button("Analyser", type="primary", key="btn_stress"):
        if msg.strip():
            with st.spinner("Analyse..."):
                r = requests.post(
                    f"{API}/query",
                    json={
                        "student_id": student_id,
                        "content": msg,
                        "task": "stress",
                    },
                )
                d = r.json()
            try:
                res = json.loads(d["answer"])
                colors = {"faible": "green", "moyen": "orange", "eleve": "red"}
                niv = res.get("niveau", "faible")
                st.markdown(
                    f"**Niveau détecté :** :{colors.get(niv, 'gray')}[{niv.upper()}]"
                )
                emotions = res.get("emotions", [])
                if emotions:
                    st.write("Émotions :", ", ".join(emotions))
                conseil = res.get("conseil", "")
                if conseil:
                    st.info(conseil)
            except (json.JSONDecodeError, TypeError):
                # Le modèle n'a pas retourné du JSON propre — afficher tel quel
                st.markdown(d["answer"])
        else:
            st.warning("Veuillez décrire votre état avant d'analyser.")
