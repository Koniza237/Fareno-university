```javascript
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const TEACHERS_FILE = path.join(__dirname, 'teachers.json');
const GROUPS_FILE = path.join(__dirname, 'groups.json');
const ROOMS_FILE = path.join(__dirname, 'rooms.json');
const CONSTRAINTS_FILE = path.join(__dirname, 'constraints.json');
const TIMETABLE_FILE = path.join(__dirname, 'timetable.json');

async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw new Error('Failed to read file: ' + error.message);
    }
}

async function writeJsonFile(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        throw new Error('Failed to write file: ' + error.message);
    }
}

app.get('/api/teachers', async (req, res) => {
    try {
        const teachers = await readJsonFile(TEACHERS_FILE);
        res.json(teachers);
    } catch (error) {
        console.error('Failed to read teachers:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/teachers', async (req, res) => {
    try {
        const { name, email, subjects, availability } = req.body;
        if (!name || !email || !subjects) {
            return res.status(400).json({ error: 'Name, email, and subjects are required.' });
        }
        const teachers = await readJsonFile(TEACHERS_FILE);
        const id = teachers.length > 0 ? Math.max(...teachers.map(t => t.id)) + 1 : 1;
        const newTeacher = { id, name, email, subjects, availability: availability || null };
        teachers.push(newTeacher);
        await writeJsonFile(TEACHERS_FILE, teachers);
        res.status(201).json({ message: 'Teacher added successfully', teacher: newTeacher });
    } catch (error) {
        console.error('Failed to add teacher:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/teachers', async (req, res) => {
    try {
        const { id, name, email, subjects, availability } = req.body;
        const teachers = await readJsonFile(TEACHERS_FILE);
        const teacherIndex = teachers.findIndex(t => t.id === parseInt(id));
        if (teacherIndex === -1) {
            return res.status(404).json({ error: 'Teacher not found.' });
        }
        if (!name || !email || !subjects) {
            return res.status(400).json({ error: 'Name, email, and subjects are required.' });
        }
        teachers[teacherIndex] = { id: parseInt(id), name, email, subjects, availability: availability || null };
        await writeJsonFile(TEACHERS_FILE, teachers);
        res.json({ message: 'Teacher updated successfully', teacher: teachers[teacherIndex] });
    } catch (error) {
        console.error('Failed to update teacher:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/teachers/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const teachers = await readJsonFile(TEACHERS_FILE);
        const teacherIndex = teachers.findIndex(t => t.id === id);
        if (teacherIndex === -1) {
            return res.status(404).json({ error: 'Teacher not found.' });
        }
        teachers.splice(teacherIndex, 1);
        await writeJsonFile(TEACHERS_FILE, teachers);
        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error('Failed to delete teacher:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/groups', async (req, res) => {
    try {
        const groups = await readJsonFile(GROUPS_FILE);
        res.json(groups);
    } catch (error) {
        console.error('Failed to read groups:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/groups', async (req, res) => {
    try {
        const { name, student_count, subjects } = req.body;
        if (!name || !student_count) {
            return res.status(400).json({ error: 'Name and student count are required.' });
        }
        const groups = await readJsonFile(GROUPS_FILE);
        const id = groups.length > 0 ? Math.max(...groups.map(g => g.id)) + 1 : 1;
        const newGroup = { id, name, student_count: parseInt(student_count), subjects: subjects || null };
        groups.push(newGroup);
        await writeJsonFile(GROUPS_FILE, groups);
        res.status(201).json({ message: 'Group added successfully', group: newGroup });
    } catch (error) {
        console.error('Failed to add group:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/groups', async (req, res) => {
    try {
        const { id, name, student_count, subjects } = req.body;
        const groups = await readJsonFile(GROUPS_FILE);
        const groupIndex = groups.findIndex(g => g.id === parseInt(id));
        if (groupIndex === -1) {
            return res.status(404).json({ error: 'Group not found.' });
        }
        if (!name || !student_count) {
            return res.status(400).json({ error: 'Name and student count are required.' });
        }
        groups[groupIndex] = { id: parseInt(id), name, student_count: parseInt(student_count), subjects: subjects || null };
        await writeJsonFile(GROUPS_FILE, groups);
        res.json({ message: 'Group updated successfully', group: groups[groupIndex] });
    } catch (error) {
        console.error('Failed to update group:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/groups/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const groups = await readJsonFile(GROUPS_FILE);
        const groupIndex = groups.findIndex(g => g.id === id);
        if (groupIndex === -1) {
            return res.status(404).json({ error: 'Group not found.' });
        }
        groups.splice(groupIndex, 1);
        await writeJsonFile(GROUPS_FILE, groups);
        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Failed to delete group:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/rooms', async (req, res) => {
    try {
        const rooms = await readJsonFile(ROOMS_FILE);
        res.json(rooms);
    } catch (error) {
        console.error('Failed to read rooms:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/rooms', async (req, res) => {
    try {
        const { name, capacity, equipment } = req.body;
        if (!name || !capacity) {
            return res.status(400).json({ error: 'Name and capacity are required.' });
        }
        const rooms = await readJsonFile(ROOMS_FILE);
        const id = rooms.length > 0 ? Math.max(...rooms.map(r => r.id)) + 1 : 1;
        const newRoom = { id, name, capacity: parseInt(capacity), equipment: equipment || null };
        rooms.push(newRoom);
        await writeJsonFile(ROOMS_FILE, rooms);
        res.status(201).json({ message: 'Room added successfully', room: newRoom });
    } catch (error) {
        console.error('Failed to add room:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/rooms', async (req, res) => {
    try {
        const { id, name, capacity, equipment } = req.body;
        const rooms = await readJsonFile(ROOMS_FILE);
        const roomIndex = rooms.findIndex(r => r.id === parseInt(id));
        if (roomIndex === -1) {
            return res.status(404).json({ error: 'Room not found.' });
        }
        if (!name || !capacity) {
            return res.status(400).json({ error: 'Name and capacity are required.' });
        }
        rooms[roomIndex] = { id: parseInt(id), name, capacity: parseInt(capacity), equipment: equipment || null };
        await writeJsonFile(ROOMS_FILE, rooms);
        res.json({ message: 'Room updated successfully', room: rooms[roomIndex] });
    } catch (error) {
        console.error('Failed to update room:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/rooms/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const rooms = await readJsonFile(ROOMS_FILE);
        const roomIndex = rooms.findIndex(r => r.id === id);
        if (roomIndex === -1) {
            return res.status(404).json({ error: 'Room not found.' });
        }
        rooms.splice(roomIndex, 1);
        await writeJsonFile(ROOMS_FILE, rooms);
        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Failed to delete room:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/constraints', async (req, res) => {
    try {
        const constraints = await readJsonFile(CONSTRAINTS_FILE);
        res.json(constraints);
    } catch (error) {
        console.error('Failed to read constraints:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/constraints', async (req, res) => {
    try {
        const { resource_type, resource_id, resource_name, day, time, constraint_type } = req.body;
        if (!resource_type || !resource_id || !resource_name || !day || !time || !constraint_type) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        const constraints = await readJsonFile(CONSTRAINTS_FILE);
        const id = constraints.length > 0 ? Math.max(...constraints.map(c => c.id)) + 1 : 1;
        const newConstraint = { id, resource_type, resource_id: parseInt(resource_id), resource_name, day, time, constraint_type };
        constraints.push(newConstraint);
        await writeJsonFile(CONSTRAINTS_FILE, constraints);
        res.status(201).json({ message: 'Constraint added successfully', constraint: newConstraint });
    } catch (error) {
        console.error('Failed to add constraint:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/constraints', async (req, res) => {
    try {
        const { id, resource_type, resource_id, resource_name, day, time, constraint_type } = req.body;
        const constraints = await readJsonFile(CONSTRAINTS_FILE);
        const constraintIndex = constraints.findIndex(c => c.id === parseInt(id));
        if (constraintIndex === -1) {
            return res.status(404).json({ error: 'Constraint not found.' });
        }
        if (!resource_type || !resource_id || !resource_name || !day || !time || !constraint_type) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        constraints[constraintIndex] = { id: parseInt(id), resource_type, resource_id: parseInt(resource_id), resource_name, day, time, constraint_type };
        await writeJsonFile(CONSTRAINTS_FILE, constraints);
        res.json({ message: 'Constraint updated successfully', constraint: constraints[constraintIndex] });
    } catch (error) {
        console.error('Failed to update constraint:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/constraints/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const constraints = await readJsonFile(CONSTRAINTS_FILE);
        const constraintIndex = constraints.findIndex(c => c.id === id);
        if (constraintIndex === -1) {
            return res.status(404).json({ error: 'Constraint not found.' });
        }
        constraints.splice(constraintIndex, 1);
        await writeJsonFile(CONSTRAINTS_FILE, constraints);
        res.json({ message: 'Constraint deleted successfully' });
    } catch (error) {
        console.error('Failed to delete constraint:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/timetable', async (req, res) => {
    try {
        const timetable = await readJsonFile(TIMETABLE_FILE);
        const { search, group_id, teacher_id, date } = req.query;
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
        if (teacher_id) {
            filteredTimetable = filteredTimetable.filter(s => s.teacher_id === parseInt(teacher_id));
        }
        if (date) {
            filteredTimetable = filteredTimetable.filter(s => s.date === date);
        }

        res.json(filteredTimetable);
    } catch (error) {
        console.error('Failed to read timetable:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/timetable/dates', async (req, res) => {
    try {
        const timetable = await readJsonFile(TIMETABLE_FILE);
        const dates = [...new Set(timetable.map(s => s.date))].sort();
        res.json(dates);
    } catch (error) {
        console.error('Failed to read dates:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/timetable/generate', async (req, res) => {
    try {
        const { group_id, date } = req.body;
        if (!group_id || !date) {
            return res.status(400).json({ error: 'Group and date are required.' });
        }
        const timetable = await readJsonFile(TIMETABLE_FILE);
        const groups = await readJsonFile(GROUPS_FILE);
        const teachers = await readJsonFile(TEACHERS_FILE);
        const rooms = await readJsonFile(ROOMS_FILE);

        const group = groups.find(g => g.id === parseInt(group_id));
        if (!group) {
            return res.status(404).json({ error: 'Group not found.' });
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
                subject: group.subjects?.split(',')[0] || 'Mathematics',
                day: 'monday',
                start_time: '08:30',
                end_time: '10:00',
                date
            }
        ];

        timetable.push(...newSessions);
        await writeJsonFile(TIMETABLE_FILE, timetable);
        res.status(201).json({ message: 'Timetable generated successfully.' });
    } catch (error) {
        console.error('Failed to generate timetable:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/timetable/export/:format', async (req, res) => {
    try {
        const { format } = req.params;
        const timetable = await readJsonFile(TIMETABLE_FILE);
        if (!['csv', 'pdf', 'ical'].includes(format)) {
            return res.status(400).json({ error: 'Unsupported format.' });
        }
        res.json({ message: 'Export to ' + format + ' simulated.' });
    } catch (error) {
        console.error('Failed to export timetable:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(port, () => {
    console.log('Server listening on port ' + port);
});
```
