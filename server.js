const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

// Charger les variables d'environnement depuis .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Servir les fichiers statiques depuis la racine

// Routes factices pour les endpoints API (à remplacer par ta logique réelle)
app.get('/api/teachers', (req, res) => {
    res.json([
        { id: 1, name: 'Professeur A', email: 'profA@example.com', subjects: 'Maths', availability: 'Lundi 8h-12h' },
        { id: 2, name: 'Professeur B', email: 'profB@example.com', subjects: 'Physique', availability: 'Mardi 14h-18h' }
    ]);
});

app.post('/api/teachers', (req, res) => {
    const { name, email, subjects, availability } = req.body;
    res.json({ message: `Enseignant ${name} ajouté avec succès`, id: Math.floor(Math.random() * 1000) });
});

app.put('/api/teachers', (req, res) => {
    const { id, name } = req.body;
    res.json({ message: `Enseignant ${name} (ID: ${id}) modifié avec succès` });
});

app.delete('/api/teachers/:id', (req, res) => {
    const { id } = req.params;
    res.json({ message: `Enseignant ID ${id} supprimé avec succès` });
});

app.get('/api/groups', (req, res) => {
    res.json([
        { id: 1, name: 'Groupe 1', student_count: 30, subjects: 'Maths, Physique' },
        { id: 2, name: 'Groupe 2', student_count: 25, subjects: 'Chimie, Biologie' }
    ]);
});

app.post('/api/groups', (req, res) => {
    const { name, student_count, subjects } = req.body;
    res.json({ message: `Groupe ${name} ajouté avec succès`, id: Math.floor(Math.random() * 1000) });
});

app.put('/api/groups', (req, res) => {
    const { id, name } = req.body;
    res.json({ message: `Groupe ${name} (ID: ${id}) modifié avec succès` });
});

app.delete('/api/groups/:id', (req, res) => {
    const { id } = req.params;
    res.json({ message: `Groupe ID ${id} supprimé avec succès` });
});

app.get('/api/rooms', (req, res) => {
    res.json([
        { id: 1, name: 'Salle 101', capacity: 40, equipment: 'Projecteur' },
        { id: 2, name: 'Salle 102', capacity: 30, equipment: 'Tableau interactif' }
    ]);
});

app.post('/api/rooms', (req, res) => {
    const { name, capacity, equipment } = req.body;
    res.json({ message: `Salle ${name} ajoutée avec succès`, id: Math.floor(Math.random() * 1000) });
});

app.put('/api/rooms', (req, res) => {
    const { id, name } = req.body;
    res.json({ message: `Salle ${name} (ID: ${id}) modifiée avec succès` });
});

app.delete('/api/rooms/:id', (req, res) => {
    const { id } = req.params;
    res.json({ message: `Salle ID ${id} supprimée avec succès` });
});

app.get('/api/constraints', (req, res) => {
    res.json([
        { id: 1, resource_type: 'teacher', resource_id: 1, resource_name: 'Professeur A', day: 'lundi', time: '08:00', constraint_type: 'unavailable' },
        { id: 2, resource_type: 'room', resource_id: 1, resource_name: 'Salle 101', day: 'mardi', time: '14:00', constraint_type: 'preference' }
    ]);
});

app.post('/api/constraints', (req, res) => {
    const { resource_type, resource_id, resource_name, day, time, constraint_type } = req.body;
    res.json({ message: `Contrainte pour ${resource_name} ajoutée avec succès`, id: Math.floor(Math.random() * 1000) });
});

app.put('/api/constraints', (req, res) => {
    const { id, resource_name } = req.body;
    res.json({ message: `Contrainte pour ${resource_name} (ID: ${id}) modifiée avec succès` });
});

app.delete('/api/constraints/:id', (req, res) => {
    const { id } = req.params;
    res.json({ message: `Contrainte ID ${id} supprimée avec succès` });
});

app.get('/api/timetable', (req, res) => {
    const { search, group_id, teacher_id, date } = req.query;
    res.json([
        { id: 1, subject: 'Maths', teacher_name: 'Professeur A', room_name: 'Salle 101', day: 'lundi', start_time: '08:00', end_time: '10:00' },
        { id: 2, subject: 'Physique', teacher_name: 'Professeur B', room_name: 'Salle 102', day: 'mardi', start_time: '14:00', end_time: '16:00' }
    ]);
});

app.get('/api/timetable/dates', (req, res) => {
    res.json(['2025-06-02', '2025-06-09', '2025-06-16']);
});

app.post('/api/timetable/generate', (req, res) => {
    const { group_id, date } = req.body;
    res.json({ message: `Emploi du temps généré pour le groupe ${group_id} à la date ${date}` });
});

app.get('/api/timetable/export/:format', (req, res) => {
    const { format } = req.params;
    const { group_id, teacher_id, date } = req.query;
    res.json({ message: `Exportation en ${format} pour groupe ${group_id || 'tous'}, enseignant ${teacher_id || 'tous'}, date ${date || 'toutes'}` });
});

// Route pour servir les fichiers HTML
app.get(['/', '/dashboard.html', '/gestion-ressources.html', '/saisie-contraintes.html', '/visualisation.html', '/exportation.html', '/administration.html', '/profil.html', '/aide.html', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, req.path === '/' ? 'index.html' : req.path));
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).send('Page non trouvée');
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Erreur serveur');
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
