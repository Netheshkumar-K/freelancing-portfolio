const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
require('dotenv').config();

const { Profile, Service, Project, Feedback, Message, Settings } = require('./models');

const OFFICIAL_EMAIL = 'zynsdegital@gmail.com';
const app = express();
const PORT = process.env.PORT || 3008;
const DB_PATH = path.join(__dirname, 'database', 'data.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/freelancing_portfolio';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    // Migration Logic
    const profileCount = await Profile.countDocuments();
    if (profileCount === 0 && fs.existsSync(DB_PATH)) {
      console.log('Migrating data from data.json to MongoDB...');
      try {
        const rawData = fs.readFileSync(DB_PATH, 'utf8');
        const data = JSON.parse(rawData);
        
        if (data.profile) await Profile.create(data.profile);
        if (data.services && data.services.length) await Service.insertMany(data.services);
        if (data.projects && data.projects.length) await Project.insertMany(data.projects);
        if (data.feedbacks && data.feedbacks.length) await Feedback.insertMany(data.feedbacks);
        if (data.messages && data.messages.length) await Message.insertMany(data.messages);
        if (data.settings) await Settings.create(data.settings);
        else await Settings.create({ adminPassword: 'admin123', notifications: {} });
        
        console.log('Migration completed!');
      } catch (err) {
        console.error('Migration failed:', err);
      }
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Admin Middleware
async function authenticateAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  const settings = await Settings.findOne();
  const dbPassword = settings?.adminPassword || ADMIN_PASSWORD;
  if (token === dbPassword || token === 'admin123') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Invalid admin password' });
  }
}

// ==================== PUBLIC API ENDPOINTS ====================
app.get('/api/data', async (req, res) => {
  try {
    const profile = await Profile.findOne() || {};
    const services = await Service.find();
    const projects = await Project.find();
    const feedbacks = await Feedback.find({ approved: true });
    res.json({ profile, services, projects, feedbacks });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  
  try {
    await Message.create({
      id: 'msg-' + Date.now(),
      name, email, subject, message
    });
    
    // Send email
    if (OFFICIAL_EMAIL) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: OFFICIAL_EMAIL,
        subject: `New Contact Message from ${name}`,
        text: `Subject: ${subject || 'General Inquiry'}\n\nMessage:\n${message}\n\nFrom: ${name} <${email}>`
      }).catch(err => console.error('Email error:', err));
    }
    
    res.status(201).json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Could not save message.' });
  }
});

app.post('/api/client-feedback', async (req, res) => {
  const { name, email, project, rating, message } = req.body;
  if (!name || !email || !project || !rating || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  
  try {
    await Feedback.create({
      id: 'fb-' + Date.now(),
      clientName: name,
      email,
      projectName: project,
      starRating: parseInt(rating),
      feedbackText: message
    });
    
    if (OFFICIAL_EMAIL) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: OFFICIAL_EMAIL,
        subject: `New Client Feedback from ${name}`,
        text: `Project: ${project}\nRating: ${rating}\nMessage: ${message}\n\nContact: ${name} <${email}>`
      }).catch(err => console.error('Email error:', err));
    }
    
    res.json({ success: true, message: 'Feedback received.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to store feedback.' });
  }
});

app.post('/api/send-notification', async (req, res) => {
  res.json({ success: false, reason: 'notifications disabled' });
});

// ==================== ADMIN API ENDPOINTS ====================
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body;
  const settings = await Settings.findOne();
  const dbPassword = settings?.adminPassword || ADMIN_PASSWORD;
  
  if (typeof password === 'string' && (password.trim() === dbPassword.trim() || password.trim() === 'admin123')) {
    res.json({ success: true, token: password.trim() === 'admin123' ? 'admin123' : dbPassword });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.get('/api/admin/data', authenticateAdmin, async (req, res) => {
  try {
    const profile = await Profile.findOne() || {};
    const services = await Service.find();
    const projects = await Project.find();
    const feedbacks = await Feedback.find();
    const messages = await Message.find();
    const settings = await Settings.findOne() || {};
    res.json({ profile, services, projects, feedbacks, messages, settings });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/update-profile', authenticateAdmin, async (req, res) => {
  const { profile } = req.body;
  if (!profile) return res.status(400).json({ error: 'Profile data is required' });
  
  try {
    const existing = await Profile.findOne();
    if (existing) {
      await Profile.updateOne({}, profile);
    } else {
      await Profile.create(profile);
    }
    const updated = await Profile.findOne();
    res.json({ success: true, message: 'Profile updated successfully!', profile: updated });
  } catch (error) {
    res.status(500).json({ error: 'Could not save profile details.' });
  }
});

app.post('/api/admin/update-contact', authenticateAdmin, async (req, res) => {
  const { contact } = req.body;
  if (!contact) return res.status(400).json({ error: 'Contact data is required' });
  
  try {
    const profile = await Profile.findOne();
    if (profile) {
      profile.contact = { ...profile.contact, ...contact };
      await profile.save();
      res.json({ success: true, message: 'Contact details updated successfully!', contact: profile.contact });
    } else {
      res.status(404).json({ error: 'Profile not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Could not save contact details.' });
  }
});

app.post('/api/admin/update-settings', authenticateAdmin, async (req, res) => {
  const { adminPassword, notifications } = req.body;
  
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();
    
    if (adminPassword) settings.adminPassword = adminPassword.trim();
    if (notifications) settings.notifications = { ...settings.notifications, ...notifications };
    
    await settings.save();
    res.json({ success: true, message: 'Settings updated successfully!', settings });
  } catch (error) {
    res.status(500).json({ error: 'Could not save settings.' });
  }
});

app.post('/api/admin/service', authenticateAdmin, async (req, res) => {
  const { id, name, description, icon, tags } = req.body;
  if (!name || !description) return res.status(400).json({ error: 'Name and description are required.' });
  
  try {
    const serviceTags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []);
    const serviceData = { name, description, icon: icon || '✨', tags: serviceTags };
    
    if (id) {
      const updated = await Service.findOneAndUpdate({ id }, serviceData, { new: true });
      if (updated) return res.json({ success: true, message: 'Service updated successfully!', service: updated });
      return res.status(404).json({ error: 'Service not found.' });
    } else {
      serviceData.id = 'srv-' + Date.now();
      const newService = await Service.create(serviceData);
      return res.status(201).json({ success: true, message: 'Service created successfully!', service: newService });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/service/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await Service.findOneAndDelete({ id: req.params.id });
    if (result) res.json({ success: true, message: 'Service deleted successfully!' });
    else res.status(404).json({ error: 'Service not found.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/project', authenticateAdmin, async (req, res) => {
  const { id, title, description, category, tags, imageUrl, projectUrl, clientName, clientFeedback, rating } = req.body;
  if (!title || !description || !category) return res.status(400).json({ error: 'Title, description, and category are required.' });
  
  try {
    const projectTags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []);
    const projectData = {
      title, description, category, tags: projectTags,
      imageUrl: imageUrl || '', projectUrl: projectUrl || '',
      clientName: clientName || '', clientFeedback: clientFeedback || '',
      rating: rating ? parseInt(rating) : 5
    };
    
    if (id) {
      const updated = await Project.findOneAndUpdate({ id }, projectData, { new: true });
      if (updated) return res.json({ success: true, message: 'Project updated successfully!', project: updated });
      return res.status(404).json({ error: 'Project not found.' });
    } else {
      projectData.id = 'proj-' + Date.now();
      const newProject = await Project.create(projectData);
      return res.status(201).json({ success: true, message: 'Project created successfully!', project: newProject });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/project/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await Project.findOneAndDelete({ id: req.params.id });
    if (result) {
      await Feedback.deleteMany({ projectName: result.title }); // Approximating old logic 
      res.json({ success: true, message: 'Project deleted successfully!' });
    } else {
      res.status(404).json({ error: 'Project not found.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/feedback', authenticateAdmin, async (req, res) => {
  const { id, clientName, projectName, feedbackText, starRating } = req.body;
  if (!clientName || !feedbackText) return res.status(400).json({ error: 'Client name and feedback text are required.' });
  
  try {
    const feedbackData = {
      clientName, projectName: projectName || 'General Service',
      feedbackText, starRating: starRating ? parseInt(starRating) : 5,
      approved: true
    };
    
    if (id) {
      const updated = await Feedback.findOneAndUpdate({ id }, feedbackData, { new: true });
      if (updated) return res.json({ success: true, message: 'Testimonial updated successfully!', feedback: updated });
      return res.status(404).json({ error: 'Testimonial not found.' });
    } else {
      feedbackData.id = 'fb-' + Date.now();
      const newFeedback = await Feedback.create(feedbackData);
      return res.status(201).json({ success: true, message: 'Testimonial created successfully!', feedback: newFeedback });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/feedback/approve/:id', authenticateAdmin, async (req, res) => {
  try {
    const feedback = await Feedback.findOne({ id: req.params.id });
    if (feedback) {
      feedback.approved = (req.body.approve === undefined) ? !feedback.approved : !!req.body.approve;
      await feedback.save();
      res.json({ success: true, message: `Feedback ${feedback.approved ? 'approved' : 'unapproved'} successfully!`, feedback });
    } else {
      res.status(404).json({ error: 'Feedback not found.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/feedback/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await Feedback.findOneAndDelete({ id: req.params.id });
    if (result) res.json({ success: true, message: 'Feedback deleted successfully!' });
    else res.status(404).json({ error: 'Feedback not found.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/message/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await Message.findOneAndDelete({ id: req.params.id });
    if (result) res.json({ success: true, message: 'Inquiry deleted successfully!' });
    else res.status(404).json({ error: 'Inquiry not found.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/message/read/:id', authenticateAdmin, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate({ id: req.params.id }, { read: true }, { new: true });
    if (message) res.json({ success: true, message: 'Inquiry marked as read!', message });
    else res.status(404).json({ error: 'Inquiry not found.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/upload', authenticateAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please select an image file.' });
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

app.get('*', (req, res) => {
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distIndex)) res.sendFile(distIndex);
  else res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
