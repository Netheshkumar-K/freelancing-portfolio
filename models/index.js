const mongoose = require('mongoose');

// =======================
// SCHEMAS
// =======================

const profileSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  title: { type: String, default: '' },
  bio: { type: String, default: '' },
  longBio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  stats: {
    projects: { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
    clients: { type: Number, default: 0 },
    satisfaction: { type: Number, default: 0 }
  },
  socials: {
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    instagram: { type: String, default: '' },
    twitter: { type: String, default: '' }
  },
  contact: {
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    hours: { type: String, default: '' }
  }
});

const serviceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Keeping old string IDs for backwards compatibility with frontend
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, default: '✨' },
  tags: [{ type: String }]
});

const projectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  tags: [{ type: String }],
  imageUrl: { type: String, default: '' },
  projectUrl: { type: String, default: '' },
  clientName: { type: String, default: '' },
  clientFeedback: { type: String, default: '' },
  rating: { type: Number, default: 5 }
});

const feedbackSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  clientName: { type: String, required: true },
  email: { type: String, default: '' },
  projectName: { type: String, default: 'General Service' },
  starRating: { type: Number, default: 5 },
  feedbackText: { type: String, required: true },
  approved: { type: Boolean, default: false },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] }
});

const messageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, default: 'General Inquiry' },
  message: { type: String, required: true },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  read: { type: Boolean, default: false }
});

const settingsSchema = new mongoose.Schema({
  adminPassword: { type: String, default: 'admin123' },
  notifications: {
    twilioSid: { type: String, default: '' },
    twilioAuth: { type: String, default: '' },
    twilioPhone: { type: String, default: '' },
    twilioWhatsAppPhone: { type: String, default: 'whatsapp:+14155238886' },
    callmebotApiKey: { type: String, default: '' }
  }
});

// =======================
// MODELS
// =======================

const Profile = mongoose.model('Profile', profileSchema);
const Service = mongoose.model('Service', serviceSchema);
const Project = mongoose.model('Project', projectSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const Message = mongoose.model('Message', messageSchema);
const Settings = mongoose.model('Settings', settingsSchema);

module.exports = {
  Profile,
  Service,
  Project,
  Feedback,
  Message,
  Settings
};
