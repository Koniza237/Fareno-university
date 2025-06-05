
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(__dirname));

const TEACHERS_FILE = path.join(__dirname, 'teachers.json');
const GROUPS_FILE = path.join(__dirname, 'groups.json');
const ROOMS_FILE = path.join(__dirname, 'rooms.json');
const CONSTRAINTS_FILE = path.join(__dirname, 'constraints.json');
const TIMETABLE_FILE = path.join(__dirname, 'timetable.json');

// Créer les fichiers JSON s'ils n'existent pas
async function initializeFiles() {
    try {
        const files = [
            { path: TEACHERS_FILE, initialContent: [{ id: 1, name: 'Dr. Dupont', email: 'dupont@example.com', subjects: 'Mathematiques', availability: 'Lundi-Mardi' }] },
            { path: GROUPS_FILE, initialContent: [{ id: 1, name: 'Groupe A', student_count: 30, subjects: 'Mathematiques, Physique' }] },
            { path: ROOMS_FILE, initialContent: [{ id: 1, name: 'Salle 101', capacity: 40, equipment: 'Projecteur' }] },
            { path: CONSTRAINTS_FILE, initialContent: [] },
            { path: TIMETABLE_FILE, initialContent: [] }
        ];
        for (const file of files) {
            try {
                await fs.access(file.path);
            } catch {
                await fs.writeFile(file.path, JSON.stringify(file.initialContent, null, 2));
            }
        }
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des fichiers:', error);
    }
}

async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw new Error('Echec de la lecture du fichier: ' + error.message);
    }
}

async function writeJsonFile(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        throw new Error('Echec de l\'ecriture du fichier: ' + error.message);
    }
}

// Initialiser les fichiers au démarrage
initializeFiles().then(() => {
    console.log('Fichiers JSON initialises');
});

app.get('/api/teachers', async (req, res) => {
    try {
        const teachers = await readJsonFile(TEACHERS_FILE);
        res.json(teachers);
    } catch (error) {
        console.error('Echec de la lecture des enseignants:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/teachers', async (req, res) => {
    try {
        const { name, email, subjects, availability } = req.body;
        if (!name || !email || !subjects) {
            return res.status(400).json({ error: 'Nom, email et matieres sont requis.' });
        }
        const teachers = await readJsonFile(TEACHERS_FILE);
        const id = teachers.length > 0 ? Math.max(...teachers.map(t => t.id)) + 1 : 1;
        const newTeacher = { id, name, email, subjects, availability: availability || null };
        teachers.push(newTeacher);
        await writeJsonFile(TEACHERS_FILE, teachers);
        res.status(201).json({ message: 'Enseignant ajoute avec succes', teacher: newTeacher });
    } catch (error) {
        console.error('Echec de l\'ajout de l\'enseignant:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.put('/api/teachers', async (req, res) => {
    try {
        const { id, name, email, subjects, availability } = req.body;
        const teachers = await readJsonFile(TEACHERS_FILE);
        const teacherIndex = teachers.findIndex(t => t.id === parseInt(id));
        if (teacherIndex === -1) {
            return res.status(404).json({ error: 'Enseignant non trouve.' });
        }
        if (!name || !email || !subjects) {
            return res.status(400).json({ error: 'Nom, email et matieres sont requis.' });
        }
        teachers[teacherIndex] = { id: parseInt(id), name, email, subjects, availability: availability || null };
        await writeJsonFile(TEACHERS_FILE, teachers);
        res.json({ message: 'Enseignant mis a jour avec succes', teacher: teachers[teacherIndex] });
    } catch (error) {
        console.error('Echec de la mise a jour de l\'enseignant:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/teachers/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const teachers = await readJsonFile(TEACHERS_FILE);
        const teacherIndex = teachers.findIndex(t => t.id === id);
        if (teacherIndex === -1) {
            return res.status(404).json({ error: 'Enseignant non trouve.' });
        }
        teachers.splice(teacherIndex, 1);
        await writeJsonFile(TEACHERS_FILE, teachers);
        res.json({ message: 'Enseignant supprime avec succes' });
    } catch (error) {
        console.error('Echec de la suppression de l\'enseignant:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/groups', async (req, res) => {
    try {
        const groups = await readJsonFile(GROUPS_FILE);
        res.json(groups);
    } catch (error) {
        console.error('Echec de la lecture des groupes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/groups', async (req, res) => {
    try {
        const { name, student_count, subjects } = req.body;
        if (!name || !student_count) {
            return res.status(400).json({ error: 'Nom et nombre d\'etudiants sont requis.' });
        }
        const groups = await readJsonFile(GROUPS_FILE);
        const id = groups.length > 0 ? Math.max(...groups.map(g => g.id)) + 1 : 1;
        const newGroup = { id, name, student_count: parseInt(student_count), subjects: subjects || null };
        groups.push(newGroup);
        await writeJsonFile(GROUPS_FILE, groups);
        res.status(201).json({ message: 'Groupe ajoute avec succes', group: newGroup });
    } catch (error) {
        console.error('Echec de l\'ajout du groupe:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.put('/api/groups', async (req, res) => {
    try {
        const { id, name, student_count, subjects } = req.body;
        const groups = await readJsonFile(GROUPS_FILE);
        const groupIndex = groups.findIndex(g => g.id === parseInt(id));
        if (groupIndex === -1) {
            return res.status(404).json({ error: 'Groupe non trouve.' });
        }
        if (!name || !student_count) {
            return res.status(400).json({ error: 'Nom et nombre d\'etudiants sont requis.' });
        }
        groups[groupIndex] = { id: parseInt(id), name, student_count: parseInt(student_count), subjects: subjects || null };
        await writeJsonFile(GROUPS_FILE, groups);
        res.json({ message: 'Groupe mis a jour avec succes', group: groups[groupIndex] });
    } catch (error) {
        console.error('Echec de la mise a jour du groupe:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/groups/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const groups = await readJsonFile(GROUPS_FILE);
        const groupIndex = groups.findIndex(g => g.id === id);
        if (groupIndex === -1) {
            return res.status(404).json({ error: 'Groupe non trouve.' });
        }
        groups.splice(groupIndex, 1);
        await writeJsonFile(GROUPS_FILE, groups);
        res.json({ message: 'Groupe supprime avec succes' });
    } catch (error) {
        console.error('Echec de la suppression du groupe:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/rooms', async (req, res) => {
    try {
        const rooms = await readJsonFile(ROOMS_FILE);
        res.json(rooms);
    } catch (error) {
        console.error('Echec de la lecture des salles:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/rooms', async (req, res) => {
    try {
        const { name, capacity, equipment } = req.body;
        if (!name || !capacity) {
            return res.status(400).json({ error: 'Nom et capacite sont requis.' });
        }
        const rooms = await readJsonFile(ROOMS_FILE);
        const id = rooms.length > 0 ? Math.max(...rooms.map(r => r.id)) + 1 : 1;
        const newRoom = { id, name, capacity: parseInt(capacity), equipment: equipment || null };
        rooms.push(newRoom);
        await writeJsonFile(ROOMS_FILE, rooms);
        res.status(201).json({ message: 'Salle ajoutee avec succes', room: newRoom });
    } catch (error) {
        console.error('Echec de l\'ajout de la salle:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.put('/api/rooms', async (req, res) => {
    try {
        const { id, name, capacity, equipment } = req.body;
        const rooms = await readJsonFile(ROOMS_FILE);
        const roomIndex = rooms.findIndex(r => r.id === parseInt(id));
        if (roomIndex === -1) {
            return res.status(404).json({ error: 'Salle non trouvee.' });
        }
        if (!name || !capacity) {
            return res.status(400).json({ error: 'Nom et capacite sont requis.' });
        }
        rooms[roomIndex] = { id: parseInt(id), name, capacity: parseInt(capacity), equipment: equipment || null };
        await writeJsonFile(ROOMS_FILE, rooms);
        res.json({ message: 'Salle mise a jour avec succes', room: rooms[roomIndex] });
    } catch (error) {
        console.error('Echec de la mise a jour de la salle:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/rooms/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const rooms = await readJsonFile(ROOMS_FILE);
        const roomIndex = rooms.findIndex(r => r.id === id);
        if (roomIndex === -1) {
            return res.status(404).json({ error: 'Salle non trouvee.' });
        }
        rooms.splice(roomIndex, 1);
        await writeJsonFile(ROOMS_FILE, rooms);
        res.json({ message: 'Salle supprimee avec succes' });
    } catch (error) {
        console.error('Echec de la suppression de la salle:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/constraints', async (req, res) => {
    try {
        const constraints = await readJsonFile(CONSTRAINTS_FILE);
        res.json(constraints);
    } catch (error) {
        console.error('Echec de la lecture des contraintes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/constraints', async (req, res) => {
    try {
        const { resource_type, resource_id, resource_name, day, time, constraint_type } = req.body;
        if (!resource_type || !resource_id || !resource_name || !day || !time || !constraint_type) {
            return res.status(400).json({ error: 'Tous les champs sont requis.' });
        }
        const constraints = await readJsonFile(CONSTRAINTS_FILE);
        const id = constraints.length > 0 ? Math.max(...constraints.map(c => c.id)) + 1 : 1;
        const newConstraint = { id, resource_type, resource_id: parseInt(resource_id), resource_name, day, time, constraint_type };
        constraints.push(newConstraint);
        await writeJsonFile(CONSTRAINTS_FILE, constraints);
        res.status(201).json({ message: 'Contrainte ajoutee avec succes', constraint: newConstraint });
    } catch (error) {
        console.error('Echec de l\'ajout de la contrainte:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.put('/api/constraints', async (req, res) => {
    try {
        const { id, resource_type, resource_id, resource_name, day, time, constraint_type } = req.body;
        const constraints = await readJsonFile(CONSTRAINTS_FILE);
        const constraintIndex = constraints.findIndex(c => c.id === parseInt(id));
        if (constraintIndex === -1) {
            return res.status(404).json({ error: 'Contrainte non trouvee.' });
        }
        if (!resource_type || !resource_id || !resource_name || !day || !time || !constraint_type) {
            return res.status(400).json({ error: 'Tous les champs sont requis.' });
        }
        constraints[constraintIndex] = { id: parseInt(id), resource_type, resource_id: parseInt(resource_id), resource_name, day, time, constraint_type };
        await writeJsonFile(CONSTRAINTS_FILE, constraints);
        res.json({ message: 'Contrainte mise a jour avec succes', constraint: constraints[constraintIndex] });
    } catch (error) {
        console.error('Echec de la mise a jour de la contrainte:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/constraints/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const constraints = await readJsonFile(CONSTRAINTS_FILE);
        const constraintIndex = constraints.findIndex(c => c.id === id);
        if (constraintIndex === -1) {
            return res.status(404).json({ error: 'Contrainte non trouvee.' });
        }
        constraints.splice(constraintIndex, 1);
        await writeJsonFile(CONSTRAINTS_FILE, constraints);
        res.json({ message: 'Contrainte supprimee avec succes' });
    } catch (error) {
        console.error('Echec de la suppression de la contrainte:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/timetable', async (req, res) => {
    try {
        const timetable = await readJsonFile(TIMETABLE_FILE);
        const { search, group_id, date } = req.query;
        let filteredTimetable = timetable;

        if (search) {
            const searchLower = search.toLowerCase();
            filteredTimetable = filteredTimetable.filter(s =>
                s.subject.toLowerCase().includes(searchLower) ||
                s.teacher_name.toLowerCase().includes(searchLower) ||
                s.room_name.toLowerCase().includes(searchLower)
            );
        }
        if (group_id) {
            filteredTimetable = filteredTimetable.filter(s => s.group_id === parseInt(group_id));
        }
        if (date) {
            filteredTimetable = filteredTimetable.filter(s => s.date === date);
        }

        res.json(filteredTimetable);
    } catch (error) {
        console.error('Echec de la lecture de l\'emploi du temps:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/timetable/dates', async (req, res) => {
    try {
        const timetable = await readJsonFile(TIMETABLE_FILE);
        const dates = [...new Set(timetable.map(s => s.date))].sort();
        res.json(dates);
    } catch (error) {
        console.error('Echec de la lecture des dates:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/timetable/generate', async (req, res) => {
    try {
        const { group_id, date } = req.body;
        if (!group_id || !date) {
            return res.status(400).json({ error: 'Groupe et date sont requis.' });
        }
        const timetable = await readJsonFile(TIMETABLE_FILE);
        const groups = await readJsonFile(GROUPS_FILE);
        const teachers = await readJsonFile(TEACHERS_FILE);
        const rooms = await readJsonFile(ROOMS_FILE);

        const group = groups.find(g => g.id === parseInt(group_id));
        if (!group) {
            return res.status(404).json({ error: 'Groupe non trouve.' });
        }

        const newSessions = [
            {
                id: timetable.length > 0 ? Math.max(...timetable.map(s => s.id)) + 1 : 1,
                group_id: parseInt(group_id),
                group_name: group.name,
                teacher_id: teachers[0]?.id || 1,
                teacher_name: teachers[0]?.name || 'Dr. Dupont',
                room_id: rooms[0]?.id || 1,
                room_name: rooms[0]?.name || 'Salle 101',
                subject: group.subjects?.split(',')[0] || 'Mathematiques',
                day: 'lundi',
                start_time: '08:30',
                end_time: '10:00',
                date
            }
        ];

        timetable.push(...newSessions);
        await writeJsonFile(TIMETABLE_FILE, timetable);
        res.status(201).json({ message: 'Emploi du temps genere avec succes.' });
    } catch (error) {
        console.error('Echec de la generation de l\'emploi du temps:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/timetable/export/:format', async (req, res) => {
    try {
        const { format } = req.params;
        const timetable = await readJsonFile(TIMETABLE_FILE);
        if (!['csv', 'pdf', 'ical'].includes(format)) {
            return res.status(400).json({ error: 'Format non supporte.' });
        }
        res.json({ message: 'Exportation vers ' + format + ' simulee.' });
    } catch (error) {
        console.error('Echec de l\'exportation de l\'emploi du temps:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvee' });
});

app.listen(port, () => {
    console.log('Serveur en ecoute sur le port ' + port);
});
