import express from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import cors from 'cors';
import winston from 'winston';
import pdfkit from 'pdfkit';
import ical from 'ical-generator';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Setup logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Database connection
const pool = new Pool({
  user: 'fareno',
  password: 'VBEeEFG1WhIkLIYaTMg06mfDJPoFerme',
  host: 'dpg-d10l5ei4d50c73ato2bg-a.oregon-postgres.render.com',
  port: 5432,
  database: 'fareno_db',
  ssl: { rejectUnauthorized: false }
});

// Express app setup
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(__dirname));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Validation schemas
const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

const constraintSchema = Joi.object({
  resource_type: Joi.string().required(),
  resource_id: Joi.number().integer().required(),
  resource_name: Joi.string().required(),
  day: Joi.string().required(),
  time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  constraint_type: Joi.string().required()
});

const timetableGenerateSchema = Joi.object({
  group_id: Joi.number().integer().required(),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
});

const teacherSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  subjects: Joi.string().required(),
  availability: Joi.string().required()
});

const groupSchema = Joi.object({
  name: Joi.string().required(),
  student_count: Joi.number().integer().required(),
  subjects: Joi.string().required()
});

const roomSchema = Joi.object({
  name: Joi.string().required(),
  capacity: Joi.number().integer().required(),
  equipment: Joi.string().required()
});

const adjustmentSchema = Joi.object({
  resource: Joi.string().required(),
  day: Joi.string().required(),
  time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  new_value: Joi.string().required()
});

// Logging helper
async function logAction(client, userId, userName, action, details) {
  await client.query(
    'INSERT INTO logs (user_id, user_name, action, details, date) VALUES ($1, $2, $3, $4, NOW())',
    [userId, userName, action, details]
  );
}

// API endpoints
app.post('/api/constraints', async (req, res) => {
  const { error } = constraintSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const client = await pool.connect();
  try {
    const { resource_type, resource_id, resource_name, day, time, constraint_type } = req.body;
    const result = await client.query(
      'INSERT INTO constraints (resource_type, resource_id, resource_name, day, time, constraint_type, is_active) VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id',
      [resource_type, resource_id, resource_name, day, time, constraint_type]
    );
    await logAction(client, 1, 'admin', 'create_constraint', `Added constraint ID ${result.rows[0].id}`);
    res.json({ id: result.rows[0].id, message: 'Constraint added' });
  } catch (err) {
    logger.error(`Error adding constraint: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.put('/api/constraints/:constraint_id', async (req, res) => {
  const { error } = constraintSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const client = await pool.connect();
  try {
    const constraintId = req.params.constraint_id;
    const { resource_type, resource_id, resource_name, day, time, constraint_type } = req.body;
    const result = await client.query(
      'UPDATE constraints SET resource_type = $1, resource_id = $2, resource_name = $3, day = $4, time = $5, constraint_type = $6 WHERE id = $7 AND is_active = TRUE RETURNING *',
      [resource_type, resource_id, resource_name, day, time, constraint_type, constraintId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Constraint not found' });
    await logAction(client, 1, 'admin', 'update_constraint', `Updated constraint ID ${constraintId}`);
    res.json({ message: 'Constraint updated' });
  } catch (err) {
    logger.error(`Error updating constraint: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.delete('/api/constraints/:constraint_id', async (req, res) => {
  const client = await pool.connect();
  try {
    const constraintId = req.params.constraint_id;
    const result = await client.query(
      'UPDATE constraints SET is_active = FALSE WHERE id = $1 AND is_active = TRUE RETURNING *',
      [constraintId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Constraint not found' });
    await logAction(client, 1, 'admin', 'delete_constraint', `Deleted constraint ID ${constraintId}`);
    res.json({ message: 'Constraint deleted' });
  } catch (err) {
    logger.error(`Error deleting constraint: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.post('/api/teachers', async (req, res) => {
  const { error } = teacherSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const client = await pool.connect();
  try {
    const { name, email, subjects, availability } = req.body;
    const result = await client.query(
      'INSERT INTO teachers (name, email, subjects, availability, is_active) VALUES ($1, $2, $3, $4, TRUE) RETURNING id',
      [name, email, subjects, availability]
    );
    await logAction(client, 1, 'admin', 'create_teacher', `Added teacher ID ${result.rows[0].id}`);
    res.json({ id: result.rows[0].id, message: 'Teacher added' });
  } catch (err) {
    logger.error(`Error adding teacher: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.put('/api/teachers/:teacher_id', async (req, res) => {
  const { error } = teacherSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const client = await pool.connect();
  try {
    const teacherId = req.params.teacher_id;
    const { name, email, subjects, availability } = req.body;
    const result = await client.query(
      'UPDATE teachers SET name = $1, email = $2, subjects = $3, availability = $4 WHERE id = $5 AND is_active = TRUE RETURNING *',
      [name, email, subjects, availability, teacherId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Teacher not found' });
    await logAction(client, 1, 'admin', 'update_teacher', `Updated teacher ID ${teacherId}`);
    res.json({ message: 'Teacher updated' });
  } catch (err) {
    logger.error(`Error updating teacher: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.delete('/api/teachers/:teacher_id', async (req, res) => {
  const client = await pool.connect();
  try {
    const teacherId = req.params.teacher_id;
    const result = await client.query(
      'UPDATE teachers SET is_active = FALSE WHERE id = $1 AND is_active = TRUE RETURNING *',
      [teacherId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Teacher not found' });
    await logAction(client, 1, 'admin', 'delete_teacher', `Deleted teacher ID ${teacherId}`);
    res.json({ message: 'Teacher deleted' });
  } catch (err) {
    logger.error(`Error deleting teacher: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.post('/api/groups', async (req, res) => {
  const { error } = groupSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const client = await pool.connect();
  try {
    const { name, student_count, subjects } = req.body;
    const result = await client.query(
      'INSERT INTO groups (name, student_count, subjects, is_active) VALUES ($1, $2, $3, TRUE) RETURNING id',
      [name, student_count, subjects]
    );
    await logAction(client, 1, 'admin', 'create_group', `Added group ID ${result.rows[0].id}`);
    res.json({ id: result.rows[0].id, message: 'Group added' });
  } catch (err) {
    logger.error(`Error adding group: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.put('/api/groups/:group_id', async (req, res) => {
  const { error } = groupSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const client = await pool.connect();
  try {
    const groupId = req.params.group_id;
    const { name, student_count, subjects } = req.body;
    const result = await client.query(
      'UPDATE groups SET name = $1, student_count = $2, subjects = $3 WHERE id = $4 AND is_active = TRUE RETURNING *',
      [name, student_count, subjects, groupId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Group not found' });
    await logAction(client, 1, 'admin', 'update_group', `Updated group ID ${groupId}`);
    res.json({ message: 'Group updated' });
  } catch (err) {
    logger.error(`Error updating group: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.delete('/api/groups/:group_id', async (req, res) => II= {
  const client = await pool.connect();
  try {
    const groupId = req.params.group_id;
    const result = await client.query(
      'UPDATE groups SET is_active = FALSE WHERE CreationTime= $1 AND is_active = TRUE RETURNING *',
      [groupId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Group not found' });
    await logAction(client, 1, 'admin', 'delete_group', `Deleted group ID ${groupId}`);
    res.json({ message: 'Group deleted' });
  } catch (err) {
    logger.error(`Error deleting group: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.post('/api/rooms', async (req, res) => {
  const { error } = roomSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const client = await pool.connect();
  try {
    const { name, capacity, equipment } = req.body;
    const result = await client.query(
      'INSERT INTO rooms (name, capacity, equipment, is_active) VALUES ($1, $2, $3, TRUE) RETURNING id',
      [name, capacity, equipment]
    );
    await logAction(client, 1, 'admin', 'create_room', `Added room ID ${result.rows[0].id}`);
    res.json({ id: result.rows[0].id, message: 'Room added' });
  } catch (err) {
    logger.error(`Error adding room: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.put('/api/rooms/:room_id', async (req, res) => {
  const { error } = roomSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const client = await pool.connect();
  try {
    const roomId = req.params.room_id;
    const { name, capacity, equipment } = req.body;
    const result = await client.query(
      'UPDATE rooms SET name = $1, capacity = $2, equipment = $3 WHERE id = $4 AND is_active = TRUE RETURNING *',
      [name, capacity, equipment, roomId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Room not found' });
    await logAction(client, 1, 'admin', 'update_room', `Updated room ID ${roomId}`);
    res.json({ message: 'Room updated' });
  } catch (err) {
    logger.error(`Error updating room: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.delete('/api/rooms/:room_id', async (req, res) => {
  const client = await pool.connect();
  try {
    const roomId = req.params.room_id;
    const result = await client.query(
      'UPDATE rooms SET is_active = FALSE WHERE id = $1 AND is_active = TRUE RETURNING *',
      [roomId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Room not found' });
    await logAction(client, 1, 'admin', 'delete_room', `Deleted room ID ${roomId}`);
    res.json({ message: 'Room deleted' });
  } catch (err) {
    logger.error(`Error deleting room: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.post('/api/timetable/generate', async (req, res) => {
  const { error } = timetableGenerateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const client = await pool.connect();
  try {
    const { group_id, date } = req.body;
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
    const timeSlots = [
      { start: '08:00', end: '10:00' },
      { start: '10:00', end: '12:00' },
      { start: '14:00', end: '16:00' },
      { start: '16:00', end: '18:00' }
    ];
    const subjects = ['Mathématiques', 'Physique', 'Chimie', 'Biologie'];

    const teachers = (await client.query('SELECT * FROM teachers WHERE is_active = TRUE')).rows;
    const rooms = (await client.query('SELECT * FROM rooms WHERE is_active = TRUE')).rows;
    const constraints = (await client.query('SELECT * FROM constraints WHERE is_active = TRUE AND resource_type = $1', ['teacher'])).rows;

    await client.query('DELETE FROM timetable WHERE group_id = $1 AND date = $2', [group_id, date]);

    for (const day of days) {
      for (const slot of timeSlots) {
        const availableTeachers = teachers.filter(t =>
          !constraints.some(c => c.resource_id === t.id && c.day === day && c.time === slot.start)
        );
        if (!availableTeachers.length) continue;
        const teacher = availableTeachers[Math.floor(Math.random() * availableTeachers.length)];
        const room = rooms[Math.floor(Math.random() * rooms.length)];
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        await client.query(
          'INSERT INTO timetable (group_id, teacher_id, room_id, subject, day, start_time, end_time, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [group_id, teacher.id, room.id, subject, day, slot.start, slot.end, date]
        );
      }
    }
    await logAction(client, 1, 'admin', 'generate_timetable', `Generated timetable for group ID ${group_id} on ${date}`);
    res.json({ message: 'Timetable generated' });
  } catch (err) {
    logger.error(`Error generating timetable: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.get('/api/logs', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM logs ORDER BY date DESC');
    res.json(result.rows.map(log => ({
      id: log.id,
      date: new Date(log.date).toISOString().slice(0, 19).replace('T', ' '),
      user: log.user_name,
      action: log.action,
      details: log.details
    })));
  } catch (err) {
    logger.error(`Error fetching logs: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.post('/api/adjustments', async (req, res) => {
  const client = await pool.connect();
  try {
    for (const adj of req.body) {
      const { error } = adjustmentSchema.validate(adj);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const { resource, day, time, new_value } = adj;
      const teacher = (await client.query('SELECT * FROM teachers WHERE name = $1 AND is_active = TRUE', [resource])).rows[0];
      const group = (await client.query('SELECT * FROM groups WHERE name = $1 AND is_active = TRUE', [resource])).rows[0];
      if (!teacher && !group) return res.status(404).json({ error: `Resource ${resource} not found` });

      const resource_type = teacher ? 'teacher' : 'group';
      const resource_id = teacher ? teacher.id : group.id;
      const resource_name = resource;

      const existing = (await client.query(
        'SELECT * FROM constraints WHERE resource_type = $1 AND resource_id = $2 AND day = $3 AND time = $4 AND is_active = TRUE',
        [resource_type, resource_id, day, time]
      )).rows[0];

      if (existing) {
        await client.query(
          'UPDATE constraints SET constraint_type = $1 WHERE id = $2',
          [new_value.toLowerCase(), existing.id]
        );
        await logAction(client, 1, 'admin', 'update_adjustment', `Updated constraint for ${resource_name} on ${day} at ${time}`);
      } else {
        await client.query(
          'INSERT INTO constraints (resource_type, resource_id, resource_name, day, time, constraint_type, is_active) VALUES ($1, $2, $3, $4, $5, $6, TRUE)',
          [resource_type, resource_id, resource_name, day, time, new_value.toLowerCase()]
        );
        await logAction(client, 1, 'admin', 'create_adjustment', `Created constraint for ${resource_name} on ${day} at ${time}`);
      }
    }
    res.json({ message: 'Adjustments applied' });
  } catch (err) {
    logger.error(`Error applying adjustments: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.post('/api/migrate', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE');
    res.json({ message: 'Migration completed: last_login column added' });
  } catch (err) {
    logger.error(`Migration error: ${err.message}`);
    res.status(500).json({ error: `Migration error: ${err.message}` });
  } finally {
    client.release();
  }
});

app.get('/api/constraints', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM constraints WHERE is_active = TRUE');
    res.json(result.rows.map(c => ({
      id: c.id,
      resource_type: c.resource_type,
      resource_id: c.resource_id,
      resource_name: c.resource_name,
      day: c.day,
      time: c.time.slice(0, 5),
      constraint_type: c.constraint_type
    })));
  } catch (err) {
    logger.error(`Error fetching constraints: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.get('/api/teachers', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM teachers WHERE is_active = TRUE');
    res.json(result.rows.map(t => ({
      id: t.id,
      name: t.name,
      email: t.email,
      subjects: t.subjects,
      availability: t.availability
    })));
  } catch (err) {
    logger.error(`Error fetching teachers: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.get('/api/groups', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM groups WHERE is_active = TRUE');
    res.json(result.rows.map(g => ({
      id: g.id,
      name: g.name,
      student_count: g.student_count,
      subjects: g.subjects
    })));
  } catch (err) {
    logger.error(`Error fetching groups: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.get('/api/rooms', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM rooms WHERE is_active = TRUE');
    res.json(result.rows.map(r => ({
      id: r.id,
      name: r.name,
      capacity: r.capacity,
      equipment: r.equipment
    })));
  } catch (err) {
    logger.error(`Error fetching rooms: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.get('/api/timetable', async (req, res) => {
  const { search, group_id, teacher_id, date } = req.query;
  const client = await pool.connect();
  try {
    let query = 'SELECT t.*, te.name AS teacher_name, r.name AS room_name FROM timetable t LEFT JOIN teachers te ON t.teacher_id = te.id AND te.is_active = TRUE LEFT JOIN rooms r ON t.room_id = r.id AND r.is_active = TRUE WHERE 1=1';
    const params = [];
    if (group_id) {
      params.push(group_id);
      query += ` AND t.group_id = $${params.length}`;
    }
    if (teacher_id) {
      params.push(teacher_id);
      query += ` AND t.teacher_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND t.date = $${params.length}`;
    }
    const result = await client.query(query, params);
    let timetable = result.rows.map(t => ({
      id: t.id,
      group_id: t.group_id,
      teacher_id: t.teacher_id,
      teacher_name: t.teacher_name || '',
      room_id: t.room_id,
      room_name: t.room_name || '',
      subject: t.subject,
      day: t.day,
      start_time: t.start_time.slice(0, 5),
      end_time: t.end_time.slice(0, 5),
      date: t.date.toISOString().slice(0, 10)
    }));
    if (search) {
      timetable = timetable.filter(t =>
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.teacher_name.toLowerCase().includes(search.toLowerCase()) ||
        t.room_name.toLowerCase().includes(search.toLowerCase())
      );
    }
    res.json(timetable);
  } catch (err) {
    logger.error(`Error fetching timetable: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.get('/api/timetable/dates', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT DISTINCT date FROM timetable');
    res.json(result.rows.map(d => d.date.toISOString().slice(0, 10)));
  } catch (err) {
    logger.error(`Error fetching timetable dates: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.get('/api/timetable/export/:format', async (req, res) => {
  const { format } = req.params;
  const { group_id, teacher_id, date } = req.query;
  const client = await pool.connect();
  try {
    let query = 'SELECT t.*, te.name AS teacher_name, r.name AS room_name FROM timetable t LEFT JOIN teachers te ON t.teacher_id = te.id AND te.is_active = TRUE LEFT JOIN rooms r ON t.room_id = r.id AND r.is_active = TRUE WHERE 1=1';
    const params = [];
    if (group_id) {
      params.push(group_id);
      query += ` AND t.group_id = $${params.length}`;
    }
    if (teacher_id) {
      params.push(teacher_id);
      query += ` AND t.teacher_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND t.date = $${params.length}`;
    }
    const result = await client.query(query, params);
    const timetable = result.rows.map(t => ({
      id: t.id,
      group_id: t.group_id,
      teacher_id: t.teacher_id,
      teacher_name: t.teacher_name || '',
      room_id: t.room_id,
      room_name: t.room_name || '',
      subject: t.subject,
      day: t.day,
      start_time: t.start_time.slice(0, 5),
      end_time: t.end_time.slice(0, 5),
      date: t.date.toISOString().slice(0, 10)
    }));

    if (!timetable.length) return res.status(404).json({ error: 'No timetable available' });

    if (format === 'csv') {
      const csv = ['Day,Time,Subject,Teacher,Room'];
      timetable.forEach(t => {
        csv.push(`${t.day},"${t.start_time} - ${t.end_time}",${t.subject},${t.teacher_name},${t.room_name}`);
      });
      res.setHeader('Content-Disposition', 'attachment; filename=timetable.csv');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv.join('\n'));
    } else if (format === 'pdf') {
      const doc = new pdfkit();
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Disposition', 'attachment; filename=timetable.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfData);
      });
      doc.fontSize(14).text('Timetable', { align: 'center' });
      doc.moveDown();
      const table = [['Day', 'Time', 'Subject', 'Teacher', 'Room']];
      timetable.forEach(t => table.push([t.day, `${t.start_time} - ${t.end_time}`, t.subject, t.teacher_name, t.room_name]));
      const tableWidth = 500;
      const colWidths = [100, 100, 150, 100, 50];
      let y = doc.y + 20;
      table.forEach((row, i) => {
        row.forEach((cell, j) => {
          const x = 50 + colWidths.slice(0, j).reduce((a, b) => a + b, 0);
          doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
             .fontSize(i === 0 ? 12 : 10)
             .text(cell, x, y, { width: colWidths[j], align: 'center' });
        });
        y += 20;
      });
      doc.end();
    } else if (format === 'ical') {
      const cal = ical({
        prodId: { company: 'Fareno University', product: 'Timetable' },
        version: '2.0'
      });
      timetable.forEach(t => {
        const dayMap = { lundi: 0, mardi: 1, mercredi: 2, jeudi: 3, vendredi: 4 };
        const eventDate = new Date(t.date);
        eventDate.setDate(eventDate.getDate() + dayMap[t.day.toLowerCase()]);
        const start = new Date(`${eventDate.toISOString().slice(0, 10)}T${t.start_time}:00`);
        const end = new Date(`${eventDate.toISOString().slice(0, 10)}T${t.end_time}:00`);
        cal.createEvent({
          start,
          end,
          summary: `${t.subject} - ${t.teacher_name}`,
          location: t.room_name,
          timestamp: new Date()
        });
      });
      res.setHeader('Content-Disposition', 'attachment; filename=timetable.ics');
      res.setHeader('Content-Type', 'text/calendar');
      res.send(cal.toString());
    } else {
      res.status(400).json({ error: 'Unsupported format' });
    }
  } catch (err) {
    logger.error(`Error exporting timetable: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.get('/api/stats', async (req, res) => {
  const client = await pool.connect();
  try {
    const [timetables, activeUsers, conflicts] = await Promise.all([
      client.query('SELECT COUNT(*) AS count FROM timetable'),
      client.query('SELECT COUNT(*) AS count FROM users WHERE last_login >= NOW() - INTERVAL \'30 days\''),
      client.query('SELECT COUNT(*) AS count FROM constraints WHERE constraint_type = $1 AND is_active = TRUE', ['resolved'])
    ]);
    res.json({
      timetables_generated: parseInt(timetables.rows[0].count),
      active_users: parseInt(activeUsers.rows[0].count),
      conflicts_resolved: parseInt(conflicts.rows[0].count)
    });
  } catch (err) {
    logger.error(`Error fetching stats: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Initialize database with test data
async function initDB() {
  const client = await pool.connect();
  try {
    const users = await client.query('SELECT COUNT(*) AS count FROM users');
    if (parseInt(users.rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash('Fareno12', 10);
      await client.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
        ['admin', 'admin@gmail.com', hashedPassword, 'admin']
      );
    }

    const teachers = await client.query('SELECT COUNT(*) AS count FROM teachers');
    if (parseInt(teachers.rows[0].count) === 0) {
      await client.query(
        'INSERT INTO teachers (name, email, subjects, availability, is_active) VALUES ($1, $2, $3, $4, TRUE), ($5, $6, $7, $8, TRUE)',
        ['M. Dupont', 'dupont@email.com', 'Mathématiques', 'Lundi 08:00-12:00', 'Mme Lefèvre', 'lefevre@email.com', 'Physique', 'Mardi 14:00-18:00']
      );
    }

    const groups = await client.query('SELECT COUNT(*) AS count FROM groups');
    if (parseInt(groups.rows[0].count) === 0) {
      await client.query(
        'INSERT INTO groups (name, student_count, subjects, is_active) VALUES ($1, $2, $3, TRUE), ($4, $5, $6, TRUE)',
        ['Groupe A', 30, 'Mathématiques, Physique', 'Groupe B', 25, 'Chimie, Biologie']
      );
    }

    const rooms = await client.query('SELECT COUNT(*) AS count FROM rooms');
    if (parseInt(rooms.rows[0].count) === 0) {
      await client.query(
        'INSERT INTO rooms (name, capacity, equipment, is_active) VALUES ($1, $2, $3, TRUE), ($4, $5, $6, TRUE)',
        ['Salle 101', 40, 'Projecteur, Tableau', 'Salle 102', 30, 'Ordinateurs']
      );
    }

    const constraints = await client.query('SELECT COUNT(*) AS count FROM constraints');
    if (parseInt(constraints.rows[0].count) === 0) {
      await client.query(
        'INSERT INTO constraints (resource_type, resource_id, resource_name, day, time, constraint_type, is_active) VALUES ($1, $2, $3, $4, $5, $6, TRUE), ($7, $8, $9, $10, $11, $12, TRUE)',
        ['teacher', 1, 'M. Dupont', 'lundi', '08:00', 'unavailable', 'teacher', 2, 'Mme Lefèvre', 'mardi', '14:00', 'preference']
      );
    }
  } catch (err) {
    logger.error(`Data initialization error: ${err.message}`);
  } finally {
    client.release();
  }
}

// Create tables
async function createTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        role VARCHAR(50),
        last_login TIMESTAMP WITH TIME ZONE
      );
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        subjects VARCHAR(255),
        availability VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE
      );
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        student_count INTEGER,
        subjects VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE
      );
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        capacity INTEGER,
        equipment VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE
      );
      CREATE TABLE IF NOT EXISTS constraints (
        id SERIAL PRIMARY KEY,
        resource_type VARCHAR(50),
        resource_id INTEGER,
        resource_name VARCHAR(255),
        day VARCHAR(50),
        time TIME,
        constraint_type VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE
      );
      CREATE TABLE IF NOT EXISTS timetable (
        id SERIAL PRIMARY KEY,
        group_id INTEGER,
        teacher_id INTEGER,
        room_id INTEGER,
        subject VARCHAR(255),
        day VARCHAR(50),
        start_time TIME,
        end_time TIME,
        date DATE
      );
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id INTEGER,
        user_name VARCHAR(255),
        action VARCHAR(50),
        details VARCHAR(255)
      );
    `);
  } catch (err) {
    logger.error(`Table creation error: ${err.message}`);
  } finally {
    client.release();
  }
}

// Initialize database and start server
async function start() {
  await createTables();
  if (process.env.ENVIRONMENT !== 'production') {
    await initDB();
  }
  app.listen(3000, () => {
    logger.info('Server running on http://localhost:3000');
  });
}

start();
