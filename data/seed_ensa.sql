-- ══════════════════════════════════════════════════════════════════════
--  Seed ENSA IA Responsable → campus.db
--  Source : EDN_PROJECT/instance/ensa_ia.db
--  33 users · 36 queries · 6 consent_records · 6 rgpd_requests
-- ══════════════════════════════════════════════════════════════════════

-- ─── USERS (33 lignes) ───────────────────────────────────────────────
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('74e8bda7-3f85-4090-822b-221bae3ff691','admin','admin@ensa.ac.ma','$2b$12$xRJebDK653/sPePGRARr7uPTYq1o8wJgDl3LsDiiP1.s.MWhgtdFS','admin','2026-03-29 17:55:28.771527','2026-03-30 12:46:52.300818',0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('7ab7b6ec-3084-4caf-b242-5225f1abec81','dpo','dpo@ensa.ac.ma','$2b$12$9Kxi3zo.KmqdXWHoJt6Pl.Xyxl2VZiOhM3vVXjP9rZAf1vu9bGx7u','dpo','2026-03-29 17:55:29.073796','2026-03-30 12:52:32.711648',0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('92c15b1a-3a36-4bae-91a2-a9fcaa20ae2d','gouskir.mohamed','gouskir.mohamed@usms.ac.ma','$2b$12$5hOISCELsp85c5bHiH9AY.d.3Vb9F44...BEqPUTdGdgWvDxDGZa.','student','2025-09-01 00:00:00','2026-03-30 08:50:01.447196',0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('5260be2d-9228-4e71-9296-7bac5da1b0d2','kaab.mohamed','kaab.mohamed@usms.ac.ma','$2b$12$rUYcEZT6jo7HZWwaCe8Lou3Z.qePCI3tYeMii3v0w5aIp6m4B1Kde','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('61f1238c-ffaf-4f4b-9e91-ec0e80a9676e','oulcaid.mostapha','oulcaid.mostapha@usms.ac.ma','$2b$12$x1ijpxAWVXvx7VS62JJeo.s6KhWqhFTFE5wVhUsLvAkylzFLp5RQe','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('76b28785-0003-4598-aa0b-2cb36803b7ce','rokni.yahya','rokni.yahya@usms.ac.ma','$2b$12$IlcJFWcjmn.ODIJzuGnslO6iJGRMYMIayK.RUVjMzF98Efdk5q4qy','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('8f945d74-db88-48c0-bc60-b193aa5b3273','ouanan.hamid','ouanan.hamid@usms.ac.ma','$2b$12$RqVXnDdlOsZdlHrL5Ek0DudrIG04oDzMdptOoE2.PrHMpGxP3WMwi','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('2e577872-3fd2-4783-bf3b-41c1e2fc4b65','aouraghe.ibtissame','aouraghe.ibtissame@usms.ac.ma','$2b$12$2yS99wcZtqXIRBinzA.iE.6crfrCg2ZzDtFG1MiEc3NuO2YmWe5UW','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('ac03a558-e72c-419c-b2b4-688e29135470','belaid.bouikhalene','belaid.bouikhalene@usms.ac.ma','$2b$12$9yRQgnfl8buDgGhKneDh0ORNguLcfCFT6VpR3pDOFOERNtzFVxGcO','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('0ce6bd10-72ac-4333-b80b-b8cd81c60dab','allaoui.rabha','allaoui.rabha@usms.ac.ma','$2b$12$i8Tsre/WlrK2GP.hTqugreVGFTWbX61xdv3tcR.h6q3aTA0g.TTFu','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('997e6fff-4e8b-4b80-9013-281d16232dae','elalaoui.mohamed','elalaoui.mohamed@usms.ac.ma','$2b$12$BoYZ2CBhcwmF/.WshbB44OqwJNq4uZIegjw3Say/qCxXwQ/VvOThG','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('c95ececc-321b-42cf-9d95-03cdfbe717ac','belhouideg.soufiane','belhouideg.soufiane@usms.ac.ma','$2b$12$1hSqf5BqiXlQuAdGL09YkeOvhVbQgAzKpB9oqs.DQZqmxPUW/Krp6','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('8aa98bc7-9e8c-4b00-a49b-cce84743ab50','hirri.aziz','hirri.aziz@usms.ac.ma','$2b$12$T2Ky3lNsuR5O1z7N/VDNZeI7JXRko2Xiym.6BjJADa8x1UIv2cfzC','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('a0887af5-e54e-42ed-9b87-e76073613b6a','atifi.youness','atifi.youness@usms.ac.ma','$2b$12$k0G22fbVI3jjSq.a0ptoK.ZDhzvxQtjI4RRaRYtmil0rWGjF4/dAK','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('309f29af-a573-4003-abf0-7b0d940f0ac3','hamza.touil','hamza.touil@usms.ac.ma','$2b$12$fakehashbcrypt1234567890example','dpo','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('b315c01f-85f4-4fc0-9e72-9d2308c91f07','elhariri.zakaria','elhariri.zakaria@usms.ac.ma','$2b$12$HemTqS7/tLijgo6IcaE95eTDL3yylN.Mg.8YoQ8sMWiRwu8OlOHYu','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('85f5bc79-018b-446d-bbfb-ad300c868e3a','kerfal.anas','kerfal.anas@usms.ac.ma','$2b$12$uFfiNLnm.OdVaN6F2wHQJ.AC2EGRQ4rB/34XE9/19fUP4aq1UToAK','student','2025-10-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('f858fb0b-a815-4922-86e7-504d7e246f0a','oghrare.rahma','oghrare.rahma@usms.ac.ma','$2b$12$EbSrhMbmxc5AaFlVrOssruD9co7Lh1oAXfYMfVJqR3SuP8ZiFDKNi','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('bf128d5d-d255-40b1-b63c-690902ffcf7c','zaim.mohamed','zaim.mohamed@usms.ac.ma','$2b$12$JpPjg1EzYTH52LwJmtvLm.tO4iL.Mfm634wPKSgMkLxJDo4wpbrwa','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('7c910ad0-93b9-4719-b53d-7bf3eeca8005','ettijani.khaoula','ettijani.khaoula@usms.ac.ma','$2b$12$r.3tdg824DtA2oZPa6gWSuci01//5M2PmnpZpMImEiDuwI.ukH8Si','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('4804ed4b-8d14-4f61-acf4-a05dcba265ff','agourram.hajar','agourram.hajar@usms.ac.ma','$2b$12$696useI2ZESeX586gkxtG.1AUaSceV2UZyN2RvXssCRS6HbeZT86K','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('ed217cb4-b318-4db7-97ac-054175f2b343','chaibi.khaoula','chaibi.khaoula@usms.ac.ma','$2b$12$Ehzj1S9ucAvJAQkiGOrpKeMmOirQVBjcJPMCvASVcjl3lIRDwZOMu','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('f3b8a2a6-88df-407c-8390-cad74117bfe6','rami.meryem','rami.meryem@usms.ac.ma','$2b$12$QAJqo3J948LHHxDnvZYLoeM9.54LfXK.LqfGNXCGB5iVyDaJM4w0e','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('9f2bd5a2-50ea-4629-ad9e-97a84741acc9','habach.khadija','habach.khadija@usms.ac.ma','$2b$12$ArFlJgXOMaPYiaHgvf8jEO9x5yyVzjb6A71OTgZM00tI1QtqGmhgW','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('60cc7ce3-4030-4603-9cf7-d118e9b5589b','salman.chayma','salman.chayma@usms.ac.ma','$2b$12$RzmBMhqBKA6mb5/2bfn7SeW2oJnQ8zWgE/3T/DL4i6s8XR1u1lqwi','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('8be41d1a-b756-4d9b-950d-99eabf127ee3','bouifrigu.latifa','bouifrigu.latifa@usms.ac.ma','$2b$12$YtE4RyvZfSmLrWtT8oXY2.ClX9r8QD8fBxvSG9pGORorOYjV06Bka','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('1b04b099-37bf-44f6-b893-b53b2457309e','said.fatima','said.fatima@usms.ac.ma','$2b$12$mBjIPBFgHKlzGzdRge/RMukD3EM914AWrOLOL9ulMxw.Dw7taKrwS','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('20661979-b274-45a7-934f-c03d39aa3e8c','attarca.mohamedelyazid','attarca.mohamedelyazid@usms.ac.ma','$2b$12$Uhi2mZyQG8tiTkLAKY.N1OokJIwx3FUXY2uMUeWgE8yH7KDIubWS.','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('9a87b9bf-72e6-40f8-8917-08199ee23696','aitsai.elmehdi','aitsai.elmehdi@usms.ac.ma','$2b$12$5q/3L3m7czhzRIcSYFerm.AMuzYSLNXUkLbW64ntBcD3gpQ.ivRrq','student','2025-09-01 00:00:00',NULL,0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('c26c2805-2a51-40e2-b3d3-1be9648bc801','youssef ait karroum','kjean4386@gmail.com','$2b$12$2hMhsrfCjJrU23Grpyqbh.pIkoldSrdbWd7c6UEK/D06UyWx3PtKS','user','2026-03-29 23:34:18.782618','2026-03-30 08:57:51.135608',0,0,'9a9fb7f1-3427-4b40-9212-2d55d242fad1');
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('94ecff87-cef6-416d-bf11-306d9a379f66','Othmane Aliouali','youssef_aitkarroum@usms.ac.ma','$2b$12$q.ywwOE9trGmmW/ZWabdtejFrJjMUyQMwbDVPqY62Io/Y3QtM02WO','user','2026-03-29 23:36:45.988936','2026-03-31 12:12:53.450575',0,0,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('798ed1d6-8b00-470b-919e-dbfed7b33ea1','etudiant2','deleted_798ed1d6-8b00-470b-919e-dbfed7b33ea1@anonymized.local','$2b$12$7.UHyQa54eYqawPGs4ftBOZDEHHjTykFxglQ7fkzcGYhRls1h.yxi','user','2026-03-29 23:36:46.238786','2026-03-26 23:36:46.238345',0,1,NULL);
INSERT OR IGNORE INTO users (id,username,email,password_hash,role,created_at,last_login,ia_disabled,is_deleted,keycloak_id) VALUES ('010e52df-c34c-4696-b805-ff06cbaacffb','Othmane Alioualii','zineb@gmail.com','$2b$12$kDBICCvVjofjinhcJPib0udoE/myMdbBwbY2Z94HB28Q/Hxo5Nmcy','user','2026-03-30 12:39:24.138652',NULL,0,0,NULL);

-- ─── ENSA_QUERIES (36 lignes) ─────────────────────────────────────────
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('1448e335-5994-40d1-ae0b-2a9abbe15379','94ecff87-cef6-416d-bf11-306d9a379f66','Quels sont les modules du cycle ingenieur en informatique ?','Le programme de l''ENSA comprend :

Cycle preparatoire integre (2 ans) :
- Mathematiques, Physique, Chimie, Informatique
- Langues et Communication

Cycle ingenieur (3 ans) — Filieres :
- Genie Informatique
- Genie Electrique
- Genie Civil
- Genie Industriel','2026-03-23 20:36:46.255126',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('8ed7e4ee-dfa6-46bf-a511-75eb5034a21b','94ecff87-cef6-416d-bf11-306d9a379f66','Comment s''inscrire a l''ENSA Beni Mellal ?','Pour s''inscrire a l''ENSA Beni Mellal :

1. Via le Concours National Commun (CNC)
2. Via la passerelle en Licence ou Master
3. Via le concours d''acces en 1ere annee

Documents requis : baccalaureat, releves de notes, copie CIN, photos d''identite.','2026-03-24 16:36:46.255126',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('ed1b6905-7c9e-4745-afda-ed0833053c4d','94ecff87-cef6-416d-bf11-306d9a379f66','Comment trouver un stage PFE ?','Les stages a l''ENSA sont organises comme suit :

- 4eme annee : Stage d''initiation (1 mois minimum)
- 5eme annee : Projet de Fin d''Etudes (PFE) de 4 a 6 mois

Procedure : trouver une entreprise, faire signer la convention, deposer a l''administration.','2026-03-25 21:36:46.255126',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('720dae14-6d7a-4c04-9e7a-c063bff67f42','94ecff87-cef6-416d-bf11-306d9a379f66','Mon email est [EMAIL MASQUE], contactez-moi','Attention : des donnees personnelles ont ete detectees et automatiquement masquees.
PII detectees : Adresse e-mail (1x)

Je n''ai pas trouve d''information precise sur votre question.','2026-03-26 18:36:46.255126',1);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('1499217d-d2a1-4faf-98d4-4e6513da6648','94ecff87-cef6-416d-bf11-306d9a379f66','Quels sont les horaires de la bibliotheque ?','Bibliotheque de l''ENSA :

- Horaires : Lundi a Vendredi, 8h30 - 18h00
- Emprunt : 3 ouvrages maximum pour 15 jours
- Ressources numeriques : IEEE Xplore, Springer, ScienceDirect','2026-03-27 15:36:46.255126',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('9f8f863c-a765-40d7-af97-dc8fc37bf337','798ed1d6-8b00-470b-919e-dbfed7b33ea1','Comment obtenir une bourse d''excellence ?','Aides financieres et hebergement :

- Bourses d''excellence pour les meilleurs etudiants
- Bourses sociales sur criteres de revenus
- Residence universitaire (places limitees)

Les demandes se font en debut d''annee aupres du service des affaires etudiantes.','2026-03-25 22:36:46.255126',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('d564a2e3-7ebd-45bb-84f7-4665c0a382c5','798ed1d6-8b00-470b-919e-dbfed7b33ea1','Quels clubs existent a l''ENSA ?','Vie associative a l''ENSA :

- Club Informatique : hackathons, formations, projets
- Club Robotique : competitions nationales et internationales
- Club Culturel : evenements, theatre, musique
- Club Sportif : football, basketball, athletisme
- Club Entrepreneuriat : business plan, pitchs, networking','2026-03-26 17:36:46.255126',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('3e6cf6d6-3e01-4e14-b714-f24058d02078','798ed1d6-8b00-470b-919e-dbfed7b33ea1','Ma CIN est [CIN MASQUE], je veux m''inscrire','REQUETE BLOQUEE — Des donnees personnelles sensibles ont ete detectees.

PII detectees : CIN (1x)

Pour votre protection, cette requete n''a pas ete traitee par l''IA.','2026-03-27 20:36:46.255126',1);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('9153453d-57c7-447c-a425-a1baa6a46d18','94ecff87-cef6-416d-bf11-306d9a379f66','Quel est le reglement des examens ?','Systeme d''examens de l''ENSA :

- 2 sessions : ordinaire et rattrapage
- Validation d''un module : note >= 12/20
- Validation d''un semestre : moyenne >= 12/20
- Reclamations : 72h apres affichage des resultats','2026-03-28 19:36:46.255126',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('68c035ca-3483-46c2-b867-62423e03b9ad','94ecff87-cef6-416d-bf11-306d9a379f66','Resume les informations sur les stages','Resume :
Les stages a l''ENSA incluent un stage d''initiation en 4eme annee et un PFE en 5eme annee. La convention de stage doit etre signee et deposee a l''administration.','2026-03-29 17:36:46.255126',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('0a34dc8a-b007-4bc2-86ec-5086648a124d','7ab7b6ec-3084-4caf-b242-5225f1abec81','Comment s''inscrire a l''ENSA ?','Pour s''inscrire a l''ENSA Beni Mellal :

1. Via le Concours National Commun (CNC) apres les classes preparatoires
2. Via la passerelle en Licence (Bac+3) ou Master (Bac+5)
3. Via le concours d''acces en 1ere annee du cycle preparatoire

Documents requis : baccalaureat, releves de notes, copie CIN, photos d''identite, certificat de scolarite.

Les inscriptions se font en ligne sur la plateforme nationale.','2026-03-29 23:48:09.016281',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('b27b9a1f-272f-45f3-adab-c26d1ec2c11e','c26c2805-2a51-40e2-b3d3-1be9648bc801','Comment s''inscrire a l''ENSA ? sachant que mon cin est [CIN MASQUE]','REQUETE BLOQUEE — Des donnees personnelles sensibles ont ete detectees dans votre question.

PII detectees : Numero de telephone (international) (1x), CIN (Carte d''identite nationale) (1x)

Pour votre protection, cette requete n''a pas ete traitee par l''IA. Veuillez reformuler votre question sans inclure de donnees personnelles (CIN, CNE, numero de carte bancaire, RIB).

Base legale : Art. 5(1)(c) RGPD — Principe de minimisation des donnees.','2026-03-29 23:48:58.566077',1);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('851be2ae-8693-481f-9856-b7c6efc43138','c26c2805-2a51-40e2-b3d3-1be9648bc801','Quand ont lieu les examens ? be[TELEPHONE MASQUE]','Attention : des donnees personnelles ont ete detectees et automatiquement masquees dans votre question.
PII detectees : Numero de telephone (international) (1x)

Systeme d''examens de l''ENSA :

- 2 sessions : ordinaire et rattrapage
- Validation d''un module : note >= 12/20
- Validation d''un semestre : moyenne >= 12/20
- Reclamations : 72h apres affichage des resultats
- Passage en annee superieure : validation de tous les modules','2026-03-29 23:54:14.843136',1);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('d73672c1-f9ca-47d6-afe2-85fb8bf454e5','c26c2805-2a51-40e2-b3d3-1be9648bc801','sachant que mon CIN est be[TELEPHONE MASQUE]','Attention : des donnees personnelles ont ete detectees et automatiquement masquees dans votre question.
PII detectees : Numero de telephone (international) (1x)

Je n''ai pas trouve d''information precise sur votre question dans ma base de connaissances interne.

Sujets disponibles : inscription, stages/PFE, modules/filieres, reglement interieur, bibliotheque, examens, bourses, clubs.','2026-03-29 23:55:27.611136',1);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('350684cb-fd82-4845-9a38-82cd2702d074','92c15b1a-3a36-4bae-91a2-a9fcaa20ae2d','Comment s''inscrire a l''ENSA ?','Pour s''inscrire a l''ENSA Beni Mellal :

1. Via le Concours National Commun (CNC) apres les classes preparatoires
2. Via la passerelle en Licence (Bac+3) ou Master (Bac+5)
3. Via le concours d''acces en 1ere annee du cycle preparatoire

Documents requis : baccalaureat, releves de notes, copie CIN, photos d''identite, certificat de scolarite.

Les inscriptions se font en ligne sur la plateforme nationale.','2026-03-30 08:48:33.061512',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('5db02e5a-e10c-4aa2-967c-48329dbe4561','c26c2805-2a51-40e2-b3d3-1be9648bc801','Quelles sont les filieres disponibles a l''ENSA ?','Je n''ai pas trouve d''information precise sur votre question dans ma base de connaissances interne.

Sujets disponibles : inscription, stages/PFE, modules/filieres, reglement interieur, bibliotheque, examens, bourses, clubs.','2026-03-30 08:50:34.111076',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('d2bc00b1-d147-456c-94ab-7769ee5d67fd','c26c2805-2a51-40e2-b3d3-1be9648bc801','Comment faire une demande de bourse ?','Aides financieres et hebergement :

- Bourses d''excellence pour les meilleurs etudiants
- Bourses sociales sur criteres de revenus
- Residence universitaire (places limitees)
- Restaurant universitaire a tarif subventionne

Les demandes de bourse se font en debut d''annee aupres du service des affaires etudiantes.','2026-03-30 08:52:41.787740',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('10874c2a-e782-4df3-b4b5-10c46863a1a1','94ecff87-cef6-416d-bf11-306d9a379f66','Comment s''inscrire a l''ENSA ?','Pour s''inscrire a l''Ecole Nationale des Sciences Appliquees (ENSA) de Beni Mellal, voici les etapes a suivre :

1. Verifier les prerequis d''admission
2. Consulter le site web de l''ENSA
3. Telecharger le formulaire d''inscription
4. Remplir le formulaire et joindre les documents requis
5. Deposer le dossier d''inscription
6. Passer les examens d''entree
7. Reception de la reponse','2026-03-30 09:01:45.838721',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('72ab3935-87b5-4f00-8e44-2fb2a14d3c19','94ecff87-cef6-416d-bf11-306d9a379f66','Quelles sont les filieres disponibles a l''ENSA ?','L''Ecole Nationale des Sciences Appliquees (ENSA) de Beni Mellal offre :

1. Genie Civil
2. Genie Mecanique
3. Genie Electrique
4. Genie Informatique
5. Reseaux et Telecommunications
6. Systemes d''Information et de Communication
7. Genie des Procedes
8. Genie Industriel
9. Energetique et Environnement
10. Informatique et Systemes Intelligents','2026-03-30 09:01:59.299082',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('bfaea818-9947-4813-839e-590c2bdeab6d','94ecff87-cef6-416d-bf11-306d9a379f66','Quand ont lieu les examens ? sachant que mon apogee est : [TELEPHONE MASQUE]','Attention : des donnees personnelles ont ete detectees et automatiquement masquees dans votre question.
PII detectees : Numero de telephone (international) (1x)

Les examens a l''ENSA ont generalement lieu a la fin de chaque semestre, en decembre et en mai.','2026-03-30 09:02:44.083738',1);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('7f2f44a8-64c6-4070-b472-4ce24af5f031','94ecff87-cef6-416d-bf11-306d9a379f66','Quand ont lieu les examens ? sachant que mon apogee est [TELEPHONE MASQUE] et mon CIN est [CIN MASQUE]','REQUETE BLOQUEE — Des donnees personnelles sensibles ont ete detectees dans votre question.

PII detectees : Numero de telephone (international) (2x), CIN (Carte d''identite nationale) (1x)

Pour votre protection, cette requete n''a pas ete traitee par l''IA. Veuillez reformuler votre question sans inclure de donnees personnelles.

Base legale : Art. 5(1)(c) RGPD — Principe de minimisation des donnees.','2026-03-30 09:03:12.256009',1);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('f75204c7-cbae-43ae-bbfc-4d79c94b6bf5','94ecff87-cef6-416d-bf11-306d9a379f66','Comment s''inscrire a l''ENSA ?','Pour s''inscrire a l''ENSA Beni Mellal :

1. Via le Concours National Commun (CNC) apres les classes preparatoires
2. Via la passerelle en Licence (Bac+3) ou Master (Bac+5)
3. Via le concours d''acces en 1ere annee du cycle preparatoire

Documents requis : baccalaureat, releves de notes, copie CIN, photos d''identite, certificat de scolarite.','2026-03-30 12:42:30.888194',0);
INSERT OR IGNORE INTO ensa_queries (id,user_id,question,response,timestamp,is_flagged) VALUES ('a820afdc-31eb-4856-aba8-25e09cf88004','94ecff87-cef6-416d-bf11-306d9a379f66','mon CIN est [CIN MASQUE]','REQUETE BLOQUEE — Des donnees personnelles sensibles ont ete detectees dans votre question.

PII detectees : Numero de telephone (international) (1x), CIN (Carte d''identite nationale) (1x)

Pour votre protection, cette requete n''a pas ete traitee par l''IA. Veuillez reformuler votre question sans inclure de donnees personnelles.

Base legale : Art. 5(1)(c) RGPD — Principe de minimisation des donnees.','2026-03-30 12:43:48.210386',1);

-- ─── CONSENT_RECORDS (6 lignes) ──────────────────────────────────────
INSERT OR IGNORE INTO consent_records (id,user_id,consent_type,given_at,withdrawn_at) VALUES ('6eee82fb-b377-4b70-8b01-c5c09b1b5ed0','74e8bda7-3f85-4090-822b-221bae3ff691','data_processing','2026-03-29 17:55:28.797047',NULL);
INSERT OR IGNORE INTO consent_records (id,user_id,consent_type,given_at,withdrawn_at) VALUES ('f0bf5f47-94ad-4a61-a810-bb15f4dcc891','7ab7b6ec-3084-4caf-b242-5225f1abec81','data_processing','2026-03-29 17:55:29.082933',NULL);
INSERT OR IGNORE INTO consent_records (id,user_id,consent_type,given_at,withdrawn_at) VALUES ('cc4a0dc1-e74d-4463-bec1-c717c4461fec','c26c2805-2a51-40e2-b3d3-1be9648bc801','data_processing','2026-03-29 23:34:18.786300',NULL);
INSERT OR IGNORE INTO consent_records (id,user_id,consent_type,given_at,withdrawn_at) VALUES ('45c05c76-4fbb-4db5-9ed0-0083505a892a','94ecff87-cef6-416d-bf11-306d9a379f66','data_processing','2026-03-29 23:36:46.001016',NULL);
INSERT OR IGNORE INTO consent_records (id,user_id,consent_type,given_at,withdrawn_at) VALUES ('c8e120f6-36dd-4daf-bb62-e706c3082c91','798ed1d6-8b00-470b-919e-dbfed7b33ea1','data_processing','2026-03-29 23:36:46.247936',NULL);
INSERT OR IGNORE INTO consent_records (id,user_id,consent_type,given_at,withdrawn_at) VALUES ('9e059e26-ac17-4a54-b627-a5398e547127','010e52df-c34c-4696-b805-ff06cbaacffb','data_processing','2026-03-30 12:39:24.155688',NULL);

-- ─── RGPD_REQUESTS (6 lignes) ────────────────────────────────────────
INSERT OR IGNORE INTO rgpd_requests (id,user_id,request_type,status,created_at,processed_at) VALUES ('5ca5dfca-4f39-48c6-b1e7-4e62c3e14f85','798ed1d6-8b00-470b-919e-dbfed7b33ea1','deletion','pending','2026-03-24 23:36:46.255126',NULL);
INSERT OR IGNORE INTO rgpd_requests (id,user_id,request_type,status,created_at,processed_at) VALUES ('067b1f27-77e0-44e9-a7d0-bd62260fd88a','94ecff87-cef6-416d-bf11-306d9a379f66','access','completed','2026-03-27 23:36:46.255126','2026-03-27 23:36:46.255126');
INSERT OR IGNORE INTO rgpd_requests (id,user_id,request_type,status,created_at,processed_at) VALUES ('9b257e89-11f5-4a5c-996c-f971657000f2','94ecff87-cef6-416d-bf11-306d9a379f66','opposition','pending','2026-03-28 23:36:46.255126',NULL);
INSERT OR IGNORE INTO rgpd_requests (id,user_id,request_type,status,created_at,processed_at) VALUES ('5734d15f-89fb-4063-8289-236ab8593718','94ecff87-cef6-416d-bf11-306d9a379f66','rectification','completed','2026-03-29 23:40:48.823953','2026-03-29 23:40:48.822697');
INSERT OR IGNORE INTO rgpd_requests (id,user_id,request_type,status,created_at,processed_at) VALUES ('2e55b5ce-d579-47e7-beb3-229ee971deff','92c15b1a-3a36-4bae-91a2-a9fcaa20ae2d','access','completed','2026-03-30 08:48:41.881220','2026-03-30 08:48:41.875757');
INSERT OR IGNORE INTO rgpd_requests (id,user_id,request_type,status,created_at,processed_at) VALUES ('fb08ad4d-9b8f-4ea9-bdb9-12a88ccc4819','94ecff87-cef6-416d-bf11-306d9a379f66','access','completed','2026-03-30 12:44:33.741159','2026-03-30 12:44:33.739282');
