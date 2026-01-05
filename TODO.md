# ATTENDIFY - Application Mobile de Gestion des Présences

## ✅ Fonctionnalités Implémentées

### 🔐 Authentification
- [x] Connexion avec Firebase Auth
- [x] Gestion des rôles (Admin, Professeur, Étudiant)
- [x] Navigation basée sur le rôle
- [x] Création d'utilisateurs par l'admin

### 👑 Panel Admin
- [x] Dashboard avec statistiques
- [x] Gestion des utilisateurs (CRUD complet)
  - [x] Création avec mot de passe initial
  - [x] Voir/Réinitialiser mot de passe
  - [x] Suppression permanente (Auth + Firestore)
- [x] Gestion des groupes
- [x] Gestion des cours

### 👨‍🏫 Panel Professeur
- [x] Dashboard avec cours assignés
- [x] Génération QR code avec countdown (MM:SS)
- [x] Durée configurable (5, 10, 15, 20, 30, 45 min)
- [x] Auto-terminer session à 00:00
- [x] Bouton "Consulter liste présence" après session
- [x] Modal présences (Nom, Prénom, Statut)
- [x] Statistiques Présents/Absents/Retards

### 👨‍🎓 Panel Étudiant
- [x] Dashboard avec historique présences
- [x] Affichage nom du cours dans l'historique
- [x] Scanner QR code avec caméra
- [x] Message de confirmation avec nom étudiant

### 🎨 UI/UX
- [x] Design moderne avec gradient sombre
- [x] Composants réutilisables (FormModal, FormInput, etc.)
- [x] Animations fluides
- [x] Responsive design

## 📁 Structure du Projet

```
src/
├── components/     # Composants UI réutilisables
├── config/         # Configuration Firebase
├── contexts/       # AuthContext, CountdownContext
├── hooks/          # Hooks personnalisés
├── navigation/     # Types de navigation
├── screens/        # Écrans de l'application
├── services/       # Services Firebase (Auth, Users, Groups, etc.)
├── types/          # Types TypeScript
└── utils/          # Fonctions utilitaires
```

## 🔑 Comptes de Test

| Rôle      | Email              | Mot de passe |
|-----------|-------------------|--------------|
| Admin     | admin@attendify.com | Admin123!   |

## 🚀 Lancer l'application

```bash
cd ATTENDIFY/frontend/attendify-mobile
npx expo start
```

## ✅ Projet Finalisé
