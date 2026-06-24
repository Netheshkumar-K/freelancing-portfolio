import React, { useState, useEffect } from 'react';
import * as RawIcons from 'lucide-react';
import fallbackData from './database/data.json';

// ==========================================
// LUCIDE ICON PROXY FOR v0.400+ RESOLUTION
// ==========================================
const iconAliases = {
  CircleAlert: "AlertCircle",
  CircleCheck: "CheckCircle",
  TriangleAlert: "AlertTriangle",
  CircleHelp: "HelpCircle",
  FolderGit: "FolderGit2",
  AlertCircle: "CircleAlert",
  CheckCircle: "CircleCheck",
  AlertTriangle: "TriangleAlert",
  HelpCircle: "CircleHelp",
  FolderGit2: "FolderGit"
};

// Custom SVG icon components for brands since newer Lucide versions don't bundle them
const GithubIcon = ({ className = "w-6 h-6", ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = ({ className = "w-6 h-6", ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const InstagramIcon = ({ className = "w-6 h-6", ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const TwitterIcon = ({ className = "w-6 h-6", ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

// Copy properties of RawIcons into a plain object to avoid ES module sealing Proxy issues
const iconsRegistry = {};
Object.keys(RawIcons).forEach(key => {
  iconsRegistry[key] = RawIcons[key];
});

// Bind custom social SVG icons
iconsRegistry.Github = GithubIcon;
iconsRegistry.Linkedin = LinkedinIcon;
iconsRegistry.Instagram = InstagramIcon;
iconsRegistry.Twitter = TwitterIcon;

const Icons = new Proxy(iconsRegistry, {
  get: (target, prop) => {
    if (target[prop]) return target[prop];
    const alt = iconAliases[prop];
    if (alt && target[alt]) return target[alt];
    return target.Info || target.HelpCircle || target.CircleHelp || (() => null);
  }
});

// Helper component to render Lucide icons dynamically
const DynamicIcon = ({ name, className = "w-6 h-6", ...props }) => {
  const IconComponent = Icons[name] || Icons.HelpCircle;
  return <IconComponent className={className} {...props} />;
};

// ==========================================
// STORAGE PERSISTENCE HELPER W/ FALLBACK
// ==========================================
const storageAPI = {
  get: async (key) => {
    try {
      if (window.storage && typeof window.storage.get === 'function') {
        const result = await window.storage.get(key);
        if (!result) return null;
        
        if (typeof Response !== 'undefined' && result instanceof Response) {
          const text = await result.text();
          return text || null;
        }
        
        if (typeof result === 'object' && 'value' in result) {
          return result.value;
        }
        
        if (typeof result === 'string') {
          return result;
        }
      }
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage read error, using localStorage fallback:", e);
      return localStorage.getItem(key);
    }
  },
  set: async (key, value) => {
    try {
      if (window.storage && typeof window.storage.set === 'function') {
        await window.storage.set(key, value);
        return true;
      }
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn("Storage write error, using localStorage fallback:", e);
      localStorage.setItem(key, value);
      return true;
    }
  }
};

async function getData(key, fallback) {
  try {
    const raw = await storageAPI.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Error parsing data for key ${key}:`, error);
    return fallback;
  }
}

async function setData(key, value) {
  try {
    await storageAPI.set(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error stringifying data for key ${key}:`, error);
    return false;
  }
}

// Utility to compress and convert file uploads to Base64 data URLs
const convertToBase64 = (file, maxWidth = 1000, maxHeight = 1000, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    // Fallback if not an image
    if (!file || !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions keeping aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with quality compression (e.g. 70%)
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// ==========================================
// DEFAULT SEED DATA (First load)
// ==========================================
const DEFAULT_PROJECTS = [
  {
    id: "p1",
    title: "E-Commerce Platform",
    description: "Full-stack shopping platform with payment integration",
    category: "Web",
    tags: ["React", "Node.js", "Stripe"],
    imageUrl: "",
    projectUrl: "#",
    clientName: "Rahul Sharma",
    clientFeedback: "Exceptional work! The platform exceeded all expectations.",
    rating: 5
  },
  {
    id: "p2", 
    title: "Fitness Tracker App",
    description: "Cross-platform mobile app for workout tracking",
    category: "App",
    tags: ["React Native", "Firebase"],
    imageUrl: "",
    projectUrl: "#",
    clientName: "Priya Nair",
    clientFeedback: "Amazing UI and smooth performance. Highly recommended!",
    rating: 5
  },
  {
    id: "p3",
    title: "Brand Identity Design",
    description: "Complete branding package for a startup",
    category: "Branding",
    tags: ["Logo", "Brand Guide", "Stationery"],
    imageUrl: "",
    projectUrl: "#",
    clientName: "Karthik Rajan",
    clientFeedback: "Creative and professional. Loved the final result!",
    rating: 4
  }
];

const DEFAULT_SERVICES = [
  { id: "s1", name: "Web Development", description: "Modern, responsive websites built with latest technologies", icon: "Globe", tags: ["React", "Next.js", "Node.js"] },
  { id: "s2", name: "App Development", description: "Cross-platform mobile apps for iOS and Android", icon: "Smartphone", tags: ["React Native", "Flutter"] },
  { id: "s3", name: "UI/UX Design", description: "User-centered design that converts visitors to customers", icon: "Layers", tags: ["Figma", "Prototyping"] },
  { id: "s4", name: "Logo Design", description: "Memorable logos that represent your brand identity", icon: "PenTool", tags: ["Illustrator", "Branding"] },
  { id: "s5", name: "Poster Design", description: "Eye-catching posters and marketing materials", icon: "Image", tags: ["Photoshop", "Print"] },
  { id: "s6", name: "Branding", description: "Complete brand identity packages for businesses", icon: "Star", tags: ["Strategy", "Visual Identity"] }
];

const DEFAULT_FEEDBACK = [
  { id: "f1", clientName: "Rahul Sharma", projectName: "E-Commerce Platform", feedbackText: "Exceptional work! The platform exceeded all expectations.", starRating: 5 },
  { id: "f2", clientName: "Priya Nair", projectName: "Fitness Tracker App", feedbackText: "Amazing UI and smooth performance. Highly recommended!", starRating: 5 },
  { id: "f3", clientName: "Karthik Rajan", projectName: "Brand Identity Design", feedbackText: "Creative and professional. Loved the final result!", starRating: 4 }
];

const DEFAULT_ABOUT = {
  name: "Zayn Stark",
  title: "Founder & Creative Lead",
  bio: "I am a multi-disciplinary software engineer and brand designer. Over the past 6 years, I have built web apps, designed brand guidelines, and created layouts for companies worldwide. I focus on raw efficiency, minimal color palettes, and bold gold aesthetics.",
  avatar: "/founder.png",
  stats: {
    projects: 54,
    experience: 6,
    clients: 32,
    satisfaction: 100
  },
  socials: {
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    instagram: "https://instagram.com",
    twitter: "https://twitter.com"
  }
};

const DEFAULT_CONTACT = {
  email: "netheshkumark@gmail.com",
  phone: "+1 (555) 304-2983",
  location: "San Francisco, CA (Remote available)",
  hours: "Mon - Fri, 9:00 AM - 6:00 PM EST"
};

const DEFAULT_PASSWORD = "zyns2024";

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  // Navigation & View State
  const [currentView, setCurrentView] = useState("home"); // "home" or "admin"
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState("dashboard");

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [about, setAbout] = useState({});
  const [contact, setContact] = useState({});
  const [messages, setMessages] = useState([]);
  const [adminPassword, setAdminPassword] = useState("");
  const [notificationSettings, setNotificationSettings] = useState({
    twilioSid: "",
    twilioAuth: "",
    twilioPhone: "",
    twilioWhatsAppPhone: "",
    callmebotApiKey: ""
  });

  // UI States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState("All");
  const [toasts, setToasts] = useState([]);
  const [manualNotification, setManualNotification] = useState({ open: false, phone: "", text: "" });

  // Form states for contact
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactType, setContactType] = useState("Web Development");
  const [contactMsg, setContactMsg] = useState("");

  // Modal forms for Admin Panel
  const [editingProject, setEditingProject] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [editingFeedback, setEditingFeedback] = useState(null);

  // Image upload preview states inside Admin panel
  const [projectImgPreview, setProjectImgPreview] = useState("");
  const [avatarImgPreview, setAvatarImgPreview] = useState("");
  const [activeModalForm, setActiveModalForm] = useState(null); // null, "feedback", "contact"
  const [modalStatus, setModalStatus] = useState(""); // "", "Sent Successfully"

  // Hidden admin console access: Keyboard listener
  useEffect(() => {
    let typed = "";
    const handleKeyDown = (e) => {
      typed += e.key;
      if (typed.endsWith("/admin")) {
        setIsPasswordModalOpen(true);
        typed = "";
      }
      if (typed.length > 20) {
        typed = typed.slice(-10);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadAdminData = async (token) => {
    try {
      const res = await fetch("/api/admin/data", {
        headers: { "x-admin-token": token }
      });
      if (res.ok) {
        const adminData = await res.json();
        setMessages(adminData.messages || []);
        setFeedbacks(adminData.feedbacks || []);
        if (adminData.settings) {
          setAdminPassword(adminData.settings.adminPassword || DEFAULT_PASSWORD);
          setNotificationSettings(adminData.settings.notifications || {
            twilioSid: "", twilioAuth: "", twilioPhone: "", twilioWhatsAppPhone: "", callmebotApiKey: ""
          });
        }
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    }
  };

  // Fetch all data on mount
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // 1. Fetch public data from server database or fallback to static JSON
        let publicData;
        try {
          const res = await fetch("/api/data");
          if (!res.ok) {
            throw new Error("Failed to fetch public data");
          }
          publicData = await res.json();
        } catch (e) {
          console.log("Using static fallback data for GitHub Pages");
          publicData = fallbackData;
        }
        
        // Parse profile data
        const profile = publicData.profile || {};
        const parsedAbout = {
          name: profile.name || DEFAULT_ABOUT.name,
          title: profile.title || DEFAULT_ABOUT.title,
          bio: profile.bio || DEFAULT_ABOUT.bio,
          avatar: profile.avatar || DEFAULT_ABOUT.avatar,
          stats: profile.stats || DEFAULT_ABOUT.stats,
          socials: profile.socials || DEFAULT_ABOUT.socials
        };

        const parsedContact = {
          email: profile.contact?.email || DEFAULT_CONTACT.email,
          phone: profile.contact?.phone || DEFAULT_CONTACT.phone,
          location: profile.contact?.location || DEFAULT_CONTACT.location,
          hours: profile.contact?.hours || DEFAULT_CONTACT.hours
        };

        // Project Migration / Fallback check
        const rawProjects = publicData.projects || [];
        const parsedProjects = rawProjects.map(p => {
          if (p.id === "p1" && (!p.imageUrl || p.imageUrl === "")) {
            return { ...p, imageUrl: "/uploads/project1.png" };
          }
          if (p.id === "p2" && (!p.imageUrl || p.imageUrl === "")) {
            return { ...p, imageUrl: "/uploads/project2.png" };
          }
          return p;
        });

        setProjects(parsedProjects.length > 0 ? parsedProjects : DEFAULT_PROJECTS);
        setServices(publicData.services?.length > 0 ? publicData.services : DEFAULT_SERVICES);
        setFeedbacks(publicData.feedbacks?.length > 0 ? publicData.feedbacks : DEFAULT_FEEDBACK);
        setAbout(parsedAbout);
        setContact(parsedContact);
        setAvatarImgPreview(parsedAbout.avatar || "");

        // 2. Fetch admin details if logged in (from sessionStorage)
        const adminToken = sessionStorage.getItem("zyns-admin-token");
        const savedView = sessionStorage.getItem("zyns-current-view");
        // Auto‑login to admin only if a token exists **and** the last view was admin
        if (adminToken && savedView === "admin") {
          setIsAdminAuthenticated(true);
          setCurrentView("admin");
          await loadAdminData(adminToken);
        } else if (adminToken) {
          // Token exists but user was not on admin; keep authenticated flag
          setIsAdminAuthenticated(true);
          // Stay on whatever view is default (home)
        }
      } catch (err) {
        console.error("Initial data load error:", err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Synchronize state across tabs/windows on localStorage updates
  useEffect(() => {
    const handleStorageChange = async (e) => {
      if (!e.key) return;
      try {
        if (e.key === "zyns-projects") {
          const val = e.newValue ? JSON.parse(e.newValue) : null;
          if (val) setProjects(val);
        } else if (e.key === "zyns-about") {
          const val = e.newValue ? JSON.parse(e.newValue) : null;
          if (val) {
            setAbout(val);
            setAvatarImgPreview(val.avatar || "");
          }
        } else if (e.key === "zyns-services") {
          const val = e.newValue ? JSON.parse(e.newValue) : null;
          if (val) setServices(val);
        } else if (e.key === "zyns-feedback") {
          const val = e.newValue ? JSON.parse(e.newValue) : null;
          if (val) setFeedbacks(val);
        } else if (e.key === "zyns-contact") {
          const val = e.newValue ? JSON.parse(e.newValue) : null;
          if (val) setContact(val);
        } else if (e.key === "zyns-messages") {
          const val = e.newValue ? JSON.parse(e.newValue) : null;
          if (val) setMessages(val);
        } else if (e.key === "zyns-admin-pass") {
          const val = e.newValue ? JSON.parse(e.newValue) : null;
          if (val) setAdminPassword(val);
        } else if (e.key === "zyns-notification-settings") {
          const val = e.newValue ? JSON.parse(e.newValue) : null;
          if (val) setNotificationSettings(val);
        }
      } catch (err) {
        console.error("Error syncing storage change across tabs:", err);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Toast System
  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Authenticate Admin Password
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPasswordInput })
      });
      if (res.ok) {
        const data = await res.json();
        setIsAdminAuthenticated(true);
        setIsPasswordModalOpen(false);
        setCurrentView("admin");
        sessionStorage.setItem("zyns-current-view", "admin");
        setAdminPasswordInput("");
        sessionStorage.setItem("zyns-admin-token", data.token);
        showToast("Access Granted. Welcome back!");
        await loadAdminData(data.token);
      } else {
        showToast("Incorrect password. Access Denied.", "error");
      }
    } catch (err) {
      showToast("Authentication server error.", "error");
    }
  };

  // Submit Inquiry message from contact form
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMsg) {
      showToast("Please fill out all required fields.", "error");
      return;
    }

    showToast("Sending message...");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          subject: contactType,
          message: contactMsg
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Message delivered instantly!");
        const adminToken = sessionStorage.getItem("zyns-admin-token");
        if (adminToken) {
          await loadAdminData(adminToken);
        }
        setContactName("");
        setContactEmail("");
        setContactMsg("");
      } else {
        showToast(data.error || "Failed to send message.", "error");
      }
    } catch (err) {
      console.error("Backend contact save error:", err);
      showToast("Failed to send message.", "error");
    }
  };

  // Feedback Submission Form submit handler (with Hidden Backdoor admin bypass)
  const handleFeedbackFormSubmit = async (e) => {
    e.preventDefault();
    const nameVal = e.target.fbFormName.value.trim();
    const emailVal = e.target.fbFormEmail.value.trim();
    const ratingVal = parseInt(e.target.fbFormRating.value);
    const projVal = e.target.fbFormProj.value;
    const textVal = e.target.fbFormText.value.trim();

    if (!nameVal || !emailVal || !textVal) {
      showToast("Please fill out all fields.", "error");
      return;
    }

    // Hidden Admin backdoor authentication check
    if (nameVal.toLowerCase() === "admin" && (emailVal === adminPassword || emailVal === "zyns2024")) {
      setIsAdminAuthenticated(true);
      setCurrentView("admin");
      sessionStorage.setItem("zyns-current-view", "admin");
      sessionStorage.setItem("zyns-admin-token", emailVal);
      showToast("Backdoor Unlocked: Welcome Zayn Stark!");
      await loadAdminData(emailVal);
      e.target.reset();
      return;
    }

    showToast("Submitting feedback...");

    try {
      const res = await fetch("/api/client-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameVal,
          email: emailVal,
          project: projVal,
          rating: ratingVal,
          message: textVal
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Feedback sent successfully! It will appear once approved.");
        const adminToken = sessionStorage.getItem("zyns-admin-token");
        if (adminToken) {
          await loadAdminData(adminToken);
        }
        e.target.reset();
      } else {
        showToast(data.error || "Failed to send feedback.", "error");
      }
    } catch (err) {
      console.error("Backend feedback save error:", err);
      showToast("Failed to send feedback.", "error");
    }
  };

  // Wrappers for Modal forms that display "Sent Successfully" overlay
  const handleFeedbackModalSubmit = async (e) => {
    e.preventDefault();
    await handleFeedbackFormSubmit(e);
    setModalStatus("Sent Successfully");
    setTimeout(() => {
      setActiveModalForm(null);
      setModalStatus("");
    }, 1500);
  };

  const handleContactModalSubmit = async (e) => {
    e.preventDefault();
    await handleContactSubmit(e);
    setModalStatus("Sent Successfully");
    setTimeout(() => {
      setActiveModalForm(null);
      setModalStatus("");
    }, 1500);
  };

  // Reset all data to defaults
  const handleResetData = async () => {
    if (confirm("Are you sure you want to reset all data? This will overwrite everything.")) {
      setLoading(true);
      try {
        const adminToken = sessionStorage.getItem("zyns-admin-token");
        await fetch("/api/admin/update-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
          body: JSON.stringify({ profile: DEFAULT_ABOUT })
        });
        await fetch("/api/admin/update-contact", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
          body: JSON.stringify({ contact: DEFAULT_CONTACT })
        });
        await fetch("/api/admin/update-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
          body: JSON.stringify({ adminPassword: DEFAULT_PASSWORD, notifications: { twilioSid: "", twilioAuth: "", twilioPhone: "", twilioWhatsAppPhone: "", callmebotApiKey: "" } })
        });

        for (const p of projects) {
          await fetch(`/api/admin/project/${p.id}`, { method: "DELETE", headers: { "x-admin-token": adminToken } });
        }
        for (const s of services) {
          await fetch(`/api/admin/service/${s.id}`, { method: "DELETE", headers: { "x-admin-token": adminToken } });
        }

        for (const p of DEFAULT_PROJECTS) {
          await fetch("/api/admin/project", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
            body: JSON.stringify(p)
          });
        }
        for (const s of DEFAULT_SERVICES) {
          await fetch("/api/admin/service", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
            body: JSON.stringify(s)
          });
        }

        const res = await fetch("/api/data");
        const publicData = await res.json();
        setProjects(publicData.projects || DEFAULT_PROJECTS);
        setServices(publicData.services || DEFAULT_SERVICES);
        setFeedbacks(publicData.feedbacks || DEFAULT_FEEDBACK);
        setAbout(DEFAULT_ABOUT);
        setContact(DEFAULT_CONTACT);
        setAdminPassword(DEFAULT_PASSWORD);
        setMessages([]);
        setAvatarImgPreview(DEFAULT_ABOUT.avatar || "");
        showToast("All data successfully reset to defaults!");
      } catch (err) {
        showToast("Error resetting data.", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  // Render Loader
  if (loading) {
    return (
      <div className="min-h-screen bg-bgPrimary flex items-center justify-center flex-col gap-4 text-textPrimary">
        <Icons.RefreshCw className="animate-spin text-accent w-12 h-12" />
        <span className="font-syne tracking-widest text-sm text-textSecondary">ZYNS DIGITAL</span>
      </div>
    );
  }

  // ==========================================
  // VIEW: ADMIN PANEL
  // ==========================================
  if (currentView === "admin" && isAdminAuthenticated) {
    
    // Project CRUD actions
    const handleSaveProject = async (e) => {
      e.preventDefault();
      const form = e.target;
      const title = form.projTitle.value;
      const description = form.projDesc.value;
      const category = form.projCat.value;
      const projectUrl = form.projUrl.value;
      const clientName = form.clientName.value;
      const clientFeedback = form.clientFeedback.value;
      const rating = parseInt(form.projRating.value);
      const tags = form.projTags.value.split(",").map(t => t.trim()).filter(t => t);
      const imageUrl = projectImgPreview;

      if (!title || !description) {
        showToast("Title and Description are required.", "error");
        return;
      }

      const adminToken = sessionStorage.getItem("zyns-admin-token");
      try {
        const res = await fetch("/api/admin/project", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": adminToken
          },
          body: JSON.stringify({
            id: editingProject?.id,
            title, description, category, tags: form.projTags.value, imageUrl, projectUrl, clientName, clientFeedback, rating
          })
        });
        if (res.ok) {
          const responseData = await res.json();
          const savedProj = responseData.project;
          let updatedProjects = [...projects];
          if (editingProject?.id) {
            updatedProjects = updatedProjects.map(p => p.id === savedProj.id ? savedProj : p);
          } else {
            updatedProjects.push(savedProj);
          }
          setProjects(updatedProjects);
          
          if (clientName && clientFeedback) {
            await loadAdminData(adminToken);
          }
          showToast(editingProject?.id ? "Project successfully updated!" : "Project successfully created!");
        } else {
          showToast("Error saving project details to server.", "error");
        }
      } catch (err) {
        showToast("Server communication error.", "error");
      }

      setEditingProject(null);
      setProjectImgPreview("");
    };

    const handleDeleteProject = async (id) => {
      if (confirm("Delete this project card?")) {
        const adminToken = sessionStorage.getItem("zyns-admin-token");
        try {
          const res = await fetch(`/api/admin/project/${id}`, {
            method: "DELETE",
            headers: { "x-admin-token": adminToken }
          });
          if (res.ok) {
            setProjects(projects.filter(p => p.id !== id));
            await loadAdminData(adminToken);
            showToast("Project deleted.");
          } else {
            showToast("Error deleting project from server.", "error");
          }
        } catch (err) {
          showToast("Server communication error.", "error");
        }
      }
    };

    // Services CRUD actions
    const handleSaveService = async (e) => {
      e.preventDefault();
      const form = e.target;
      const name = form.srvName.value;
      const description = form.srvDesc.value;
      const icon = form.srvIcon.value;
      const tags = form.srvTags.value.split(",").map(t => t.trim()).filter(t => t);

      if (!name || !description) {
        showToast("Service Name and Description are required.", "error");
        return;
      }

      const adminToken = sessionStorage.getItem("zyns-admin-token");
      try {
        const res = await fetch("/api/admin/service", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": adminToken
          },
          body: JSON.stringify({
            id: editingService?.id,
            name, description, icon, tags: form.srvTags.value
          })
        });
        if (res.ok) {
          const responseData = await res.json();
          const savedSrv = responseData.service;
          let updatedServices = [...services];
          if (editingService?.id) {
            updatedServices = updatedServices.map(s => s.id === savedSrv.id ? savedSrv : s);
          } else {
            updatedServices.push(savedSrv);
          }
          setServices(updatedServices);
          showToast(editingService?.id ? "Service successfully updated!" : "Service successfully created!");
        } else {
          showToast("Error saving service details to server.", "error");
        }
      } catch (err) {
        showToast("Server communication error.", "error");
      }

      setEditingService(null);
    };

    const handleDeleteService = async (id) => {
      if (confirm("Delete this service?")) {
        const adminToken = sessionStorage.getItem("zyns-admin-token");
        try {
          const res = await fetch(`/api/admin/service/${id}`, {
            method: "DELETE",
            headers: { "x-admin-token": adminToken }
          });
          if (res.ok) {
            setServices(services.filter(s => s.id !== id));
            showToast("Service removed.");
          } else {
            showToast("Error deleting service from server.", "error");
          }
        } catch (err) {
          showToast("Server communication error.", "error");
        }
      }
    };

    // Feedback CRUD actions
    const handleSaveFeedback = async (e) => {
      e.preventDefault();
      const form = e.target;
      const clientName = form.fbClient.value;
      const projectName = form.fbProj.value;
      const feedbackText = form.fbText.value;
      const starRating = parseInt(form.fbRating.value);

      if (!clientName || !feedbackText) {
        showToast("Client Name and Feedback are required.", "error");
        return;
      }

      const adminToken = sessionStorage.getItem("zyns-admin-token");
      try {
        const res = await fetch("/api/admin/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": adminToken
          },
          body: JSON.stringify({
            id: editingFeedback?.id,
            clientName, projectName, feedbackText, starRating
          })
        });
        if (res.ok) {
          const responseData = await res.json();
          const savedFb = responseData.feedback;
          let updatedFeedbacks = [...feedbacks];
          if (editingFeedback?.id) {
            updatedFeedbacks = updatedFeedbacks.map(f => f.id === savedFb.id ? savedFb : f);
          } else {
            updatedFeedbacks.push(savedFb);
          }
          setFeedbacks(updatedFeedbacks);
          showToast(editingFeedback?.id ? "Testimonial updated!" : "Testimonial created!");
        } else {
          showToast("Error saving testimonial details to server.", "error");
        }
      } catch (err) {
        showToast("Server communication error.", "error");
      }

      setEditingFeedback(null);
    };

    const handleDeleteFeedback = async (id) => {
      if (confirm("Delete this feedback?")) {
        const adminToken = sessionStorage.getItem("zyns-admin-token");
        try {
          const res = await fetch(`/api/admin/feedback/${id}`, {
            method: "DELETE",
            headers: { "x-admin-token": adminToken }
          });
          if (res.ok) {
            setFeedbacks(feedbacks.filter(f => f.id !== id));
            showToast("Testimonial removed.");
          } else {
            showToast("Error deleting feedback from server.", "error");
          }
        } catch (err) {
          showToast("Server communication error.", "error");
        }
      }
    };

    // Edit Founder Profile
    const handleSaveProfile = async (e) => {
      e.preventDefault();
      const form = e.target;
      const name = form.aboutName.value;
      const title = form.aboutTitle.value;
      const bio = form.aboutBio.value;
      const projectsCount = parseInt(form.statProj.value);
      const experienceCount = parseInt(form.statExp.value);
      const clientsCount = parseInt(form.statClients.value);
      const satisfaction = parseInt(form.statSat.value);
      const github = form.socialGithub.value;
      const linkedin = form.socialLinkedin.value;
      const instagram = form.socialInstagram.value;
      const twitter = form.socialTwitter.value;
      const avatar = avatarImgPreview;

      const updatedAbout = {
        name,
        title,
        bio,
        avatar,
        stats: { projects: projectsCount, experience: experienceCount, clients: clientsCount, satisfaction },
        socials: { github, linkedin, instagram, twitter }
      };

      const adminToken = sessionStorage.getItem("zyns-admin-token");
      try {
        const res = await fetch("/api/admin/update-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": adminToken
          },
          body: JSON.stringify({ profile: updatedAbout })
        });
        if (res.ok) {
          setAbout(updatedAbout);
          showToast("Founder details saved successfully!");
        } else {
          showToast("Error saving profile details to server.", "error");
        }
      } catch (err) {
        showToast("Server communication error.", "error");
      }
    };

    // Save Contact Info Settings
    const handleSaveContactSettings = async (e) => {
      e.preventDefault();
      const form = e.target;
      const email = form.contEmail.value;
      const phone = form.contPhone.value;
      const location = form.contLoc.value;
      const hours = form.contHours.value;

      const updatedContact = { email, phone, location, hours };
      const adminToken = sessionStorage.getItem("zyns-admin-token");
      try {
        const res = await fetch("/api/admin/update-contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": adminToken
          },
          body: JSON.stringify({ contact: updatedContact })
        });
        if (res.ok) {
          setContact(updatedContact);
          showToast("Contact information updated!");
        } else {
          showToast("Error saving contact details to server.", "error");
        }
      } catch (err) {
        showToast("Server communication error.", "error");
      }
    };

    // Change Admin Password
    const handleChangePassword = async (e) => {
      e.preventDefault();
      const newPass = e.target.newPassword.value;
      if (!newPass) {
        showToast("Password cannot be blank.", "error");
        return;
      }
      const adminToken = sessionStorage.getItem("zyns-admin-token");
      try {
        const res = await fetch("/api/admin/update-settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": adminToken
          },
          body: JSON.stringify({ adminPassword: newPass })
        });
        if (res.ok) {
          setAdminPassword(newPass);
          sessionStorage.setItem("zyns-admin-token", newPass);
          showToast("Admin password successfully changed!");
          e.target.reset();
        } else {
          showToast("Error updating password on server.", "error");
        }
      } catch (err) {
        showToast("Server communication error.", "error");
      }
    };

    // Save Notification Settings
    const handleSaveNotificationSettings = async (e) => {
      e.preventDefault();
      const form = e.target;
      const twilioSid = form.twilioSid.value.trim();
      const twilioAuth = form.twilioAuth.value.trim();
      const twilioPhone = form.twilioPhone.value.trim();
      const twilioWhatsAppPhone = form.twilioWhatsAppPhone.value.trim();
      const callmebotApiKey = form.callmebotApiKey.value.trim();

      const updatedSettings = { twilioSid, twilioAuth, twilioPhone, twilioWhatsAppPhone, callmebotApiKey };
      const adminToken = sessionStorage.getItem("zyns-admin-token");
      try {
        const res = await fetch("/api/admin/update-settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": adminToken
          },
          body: JSON.stringify({ notifications: updatedSettings })
        });
        if (res.ok) {
          setNotificationSettings(updatedSettings);
          showToast("Notification settings saved successfully!");
        } else {
          showToast("Error saving settings on server.", "error");
        }
      } catch (err) {
        showToast("Server communication error.", "error");
      }
    };

    // Inbox messages operations
    const handleMarkInquiryRead = async (id) => {
      const adminToken = sessionStorage.getItem("zyns-admin-token");
      try {
        const res = await fetch(`/api/admin/message/read/${id}`, {
          method: "POST",
          headers: { "x-admin-token": adminToken }
        });
        if (res.ok) {
          setMessages(messages.map(m => m.id === id ? { ...m, read: true } : m));
          showToast("Message marked as read.");
        } else {
          showToast("Error updating message on server.", "error");
        }
      } catch (err) {
        showToast("Server communication error.", "error");
      }
    };

    const handleDeleteInquiry = async (id) => {
      if (confirm("Delete this message?")) {
        const adminToken = sessionStorage.getItem("zyns-admin-token");
        try {
          const res = await fetch(`/api/admin/message/${id}`, {
            method: "DELETE",
            headers: { "x-admin-token": adminToken }
          });
          if (res.ok) {
            setMessages(messages.filter(m => m.id !== id));
            showToast("Message deleted.");
          } else {
            showToast("Error deleting message from server.", "error");
          }
        } catch (err) {
          showToast("Server communication error.", "error");
        }
      }
    };

    return (
      <>
        {/* Dynamic Font Imports & Unique Luxurious Dark Theme Styles */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@500;700;800&display=swap');
          
          :root {
            --bg-primary: #131625; /* Very deep navy background */
            --bg-secondary: #1b1e32; /* Slightly lighter deep navy */
            --bg-card: #2d3250; /* Card Background from palette */
            --accent: #f9b17a; /* Primary Accent: Peach/Apricot */
            --accent-light: #676f9d; /* Secondary Accent: Cool Slate Blue */
            --highlight: #f9b17a;
            --text-primary: #ffffff; /* White text */
            --text-secondary: #a3a8c3; /* Readable Slate text */
            --border: #424769; /* Dark Slate Border */
          }

          body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-primary);
            color: var(--text-primary);
          }
          
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Syne', sans-serif;
          }

          /* Dark Theme overrides for hardcoded classes */
          .bg-\[\#0a0a0a\] {
            background-color: var(--bg-primary) !important;
          }
          .bg-\[\#111111\] {
            background-color: var(--bg-secondary) !important;
          }
          .bg-\[\#161616\] {
            background-color: var(--bg-card) !important;
          }
          .bg-\[\#111111\]\/40 {
            background-color: rgba(27, 30, 50, 0.4) !important;
          }
          .bg-\[\#111111\]\/20 {
            background-color: rgba(27, 30, 50, 0.2) !important;
          }
          .bg-\[\#111111\]\/30 {
            background-color: rgba(27, 30, 50, 0.3) !important;
          }
          .bg-\[\#0f0f0f\] {
            background-color: var(--bg-secondary) !important;
          }
          .bg-black\/85 {
            background-color: rgba(19, 22, 37, 0.85) !important;
            backdrop-filter: blur(8px);
          }
          .bg-black\/80 {
            background-color: rgba(45, 50, 80, 0.8) !important;
            color: var(--accent) !important;
            border-color: var(--border) !important;
          }
          
          /* Borders */
          .border-\[\#222222\] {
            border-color: var(--border) !important;
          }
          .divide-\[\#222222\] > :not([hidden]) ~ :not([hidden]) {
            border-color: var(--border) !important;
          }
          .border-borderCustom {
            border-color: var(--border) !important;
          }
          
          /* Text Colors */
          .text-white {
            color: var(--text-primary) !important;
          }
          .text-gray-400 {
            color: var(--text-secondary) !important;
          }
          .text-gray-300 {
            color: var(--text-primary) !important;
          }
          .text-textSecondary {
            color: var(--text-secondary) !important;
          }
          
          /* Accents and Highlights mapping (formerly gold, now peach/apricot) */
          .text-\[\#D4AF37\] {
            color: var(--accent) !important;
          }
          .bg-\[\#D4AF37\] {
            background-color: var(--accent) !important;
            color: #131625 !important; /* contrast text on peach bg */
          }
          .bg-accent {
            background-color: var(--accent) !important;
            color: #131625 !important; /* dark text for high contrast on peach */
            font-weight: 600;
          }
          .bg-accent:hover {
            background-color: var(--accent-light) !important;
            color: #ffffff !important; /* white text on hover */
          }
          .border-\[\#D4AF37\] {
            border-color: var(--accent) !important;
          }
          .hover\:text-\[\#D4AF37\]:hover {
            color: var(--accent) !important;
          }
          .hover\:border-\[\#D4AF37\]:hover {
            border-color: var(--accent) !important;
          }
          .hover\:bg-\[\#D4AF37\]:hover {
            background-color: var(--accent-light) !important;
            color: #ffffff !important;
          }
          .hover\:bg-\[\#F5D76E\]:hover {
            background-color: var(--accent-light) !important;
            color: #ffffff !important;
          }
          
          /* Transparencies */
          .bg-\[\#D4AF37\]\/5 {
            background-color: rgba(249, 177, 122, 0.05) !important;
          }
          .border-\[\#D4AF37\]\/30 {
            border-color: rgba(249, 177, 122, 0.3) !important;
          }
          .bg-\[\#0a0a0a\]\/80 {
            background-color: rgba(19, 22, 37, 0.8) !important;
          }
          
          /* Soft Shadow override for premium look */
          .shadow-lg {
            box-shadow: 0 10px 30px -3px rgba(249, 177, 122, 0.04), 0 4px 6px -2px rgba(103, 111, 157, 0.02) !important;
          }
          .border-gold-highlight {
            border: 1px solid var(--accent-light);
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.6s ease forwards;
          }
          .scrollbar-none {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-none::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="min-h-screen bg-bgPrimary text-textPrimary flex flex-col md:flex-row">
        {/* Admin Sidebar */}
        <aside className="w-full md:w-64 bg-bgSecondary border-b md:border-b-0 md:border-r border-borderCustom p-4 md:p-6 flex flex-col md:justify-between justify-start gap-4">
          <div className="w-full">
            {/* Header row: Logo + admin title on left, Sign Out on right (on mobile) */}
            <div className="flex items-center justify-between md:block mb-2 md:mb-8">
              <div className="flex items-center gap-3">
                <img src="/uploads/logo.png" className="h-10 w-auto object-contain" alt="ZD" onError={(e)=>{e.target.style.display='none'}} />
                <h2 className="font-syne font-bold text-lg tracking-wider text-textPrimary">ZYNS ADMIN</h2>
              </div>
              {/* Sign Out Button on Mobile Header */}
              <button 
                onClick={() => { setIsAdminAuthenticated(false); setCurrentView("home"); sessionStorage.setItem("zyns-current-view", "home"); showToast("Signed out successfully."); }}
                className="md:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 hover:text-red-400 border border-red-200/50 hover:bg-red-50/10 transition-colors"
              >
                <Icons.LogOut size={13} />
                Sign Out
              </button>
            </div>

            {/* Navigation tabs track */}
            <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-2 pb-2 md:pb-0 md:space-y-2 scrollbar-none">
              <button 
                onClick={() => { setActiveAdminTab("dashboard"); setEditingProject(null); setEditingService(null); setEditingFeedback(null); }}
                className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3 py-2.5 text-xs md:text-sm font-medium transition-colors border-b-2 md:border-b-0 md:border-l-2 ${activeAdminTab === 'dashboard' ? 'bg-bgCard border-accent text-textPrimary' : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-bgCard'}`}
              >
                <Icons.LayoutDashboard size={16} />
                Dashboard
              </button>
              <button 
                onClick={() => { setActiveAdminTab("projects"); setEditingProject(null); }}
                className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3 py-2.5 text-xs md:text-sm font-medium transition-colors border-b-2 md:border-b-0 md:border-l-2 ${activeAdminTab === 'projects' ? 'bg-bgCard border-accent text-textPrimary' : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-bgCard'}`}
              >
                <Icons.FolderGit size={16} />
                Projects
              </button>
              <button 
                onClick={() => { setActiveAdminTab("services"); setEditingService(null); }}
                className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3 py-2.5 text-xs md:text-sm font-medium transition-colors border-b-2 md:border-b-0 md:border-l-2 ${activeAdminTab === 'services' ? 'bg-bgCard border-accent text-textPrimary' : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-bgCard'}`}
              >
                <Icons.Briefcase size={16} />
                Services
              </button>
              <button 
                onClick={() => { setActiveAdminTab("feedbacks"); setEditingFeedback(null); }}
                className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3 py-2.5 text-xs md:text-sm font-medium transition-colors border-b-2 md:border-b-0 md:border-l-2 ${activeAdminTab === 'feedbacks' ? 'bg-bgCard border-accent text-textPrimary' : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-bgCard'}`}
              >
                <Icons.Star size={16} />
                Feedback
              </button>
              <button 
                onClick={() => { setActiveAdminTab("about"); }}
                className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3 py-2.5 text-xs md:text-sm font-medium transition-colors border-b-2 md:border-b-0 md:border-l-2 ${activeAdminTab === 'about' ? 'bg-bgCard border-accent text-textPrimary' : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-bgCard'}`}
              >
                <Icons.User size={16} />
                About
              </button>
              <button 
                onClick={() => { setActiveAdminTab("contact"); }}
                className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3 py-2.5 text-xs md:text-sm font-medium transition-colors border-b-2 md:border-b-0 md:border-l-2 ${activeAdminTab === 'contact' ? 'bg-bgCard border-accent text-textPrimary' : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-bgCard'}`}
              >
                <Icons.Mail size={16} />
                Contact Info
              </button>
              <button 
                onClick={() => { setActiveAdminTab("settings"); }}
                className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3 py-2.5 text-xs md:text-sm font-medium transition-colors border-b-2 md:border-b-0 md:border-l-2 ${activeAdminTab === 'settings' ? 'bg-bgCard border-accent text-textPrimary' : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-bgCard'}`}
              >
                <Icons.Settings size={16} />
                Settings
              </button>
            </nav>
          </div>

          <div className="hidden md:block pt-6 border-t border-borderCustom mt-6">
            <button 
              onClick={() => { setIsAdminAuthenticated(false); setCurrentView("home"); sessionStorage.setItem("zyns-current-view", "home"); showToast("Signed out successfully."); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:text-red-400 hover:bg-red-50 transition-colors border border-red-200"
            >
              <Icons.LogOut size={18} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {/* Header */}
          <header className="flex justify-between items-center mb-8 pb-4 border-b border-borderCustom">
            <div>
              <h1 className="font-syne font-bold text-2xl md:text-3xl text-textPrimary capitalize">{activeAdminTab} Panel</h1>
              <p className="text-textSecondary text-xs mt-1">ZYNS DIGITAL Custom Administration Dashboard</p>
            </div>
            <button 
              onClick={() => { setCurrentView("home"); sessionStorage.setItem("zyns-current-view", "home"); }}
              className="inline-flex items-center gap-2 border border-borderCustom px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent bg-bgCard transition-all"
            >
              <Icons.Eye size={16} />
              Back to Site
            </button>
          </header>

          {/* ================= ADMIN TAB: DASHBOARD ================= */}
          {activeAdminTab === "dashboard" && (
            <div className="space-y-8 animate-fadeIn">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-bgCard p-6 border border-borderCustom hover:border-accent transition-colors">
                  <span className="text-textSecondary text-xs uppercase tracking-wider block mb-2">Total Projects</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-syne font-bold">{projects.length}</span>
                    <span className="text-accent text-xs">Dynamic Cards</span>
                  </div>
                </div>
                <div className="bg-bgCard p-6 border border-borderCustom hover:border-accent transition-colors">
                  <span className="text-textSecondary text-xs uppercase tracking-wider block mb-2">Total Services</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-syne font-bold">{services.length}</span>
                    <span className="text-accent text-xs">Capabilities</span>
                  </div>
                </div>
                <div className="bg-bgCard p-6 border border-borderCustom hover:border-accent transition-colors">
                  <span className="text-textSecondary text-xs uppercase tracking-wider block mb-2">Testimonials</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-syne font-bold">{feedbacks.length}</span>
                    <span className="text-accent text-xs">Verified Reviews</span>
                  </div>
                </div>
                <div className="bg-bgCard p-6 border border-borderCustom hover:border-accent transition-colors">
                  <span className="text-textSecondary text-xs uppercase tracking-wider block mb-2">Inquiries</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-syne font-bold">{messages.length}</span>
                    <span className="text-accent text-xs">Unread: {messages.filter(m => !m.read).length}</span>
                  </div>
                </div>
              </div>

              {/* Message Inquiries List */}
              <div className="bg-bgCard border border-borderCustom p-6">
                <h3 className="font-syne font-bold text-lg mb-4 text-accent">Recent Client Messages</h3>
                {messages.length === 0 ? (
                  <p className="text-textSecondary text-sm">No inquiries in your inbox yet.</p>
                ) : (
                  <div className="space-y-4">
                    {messages.slice(0, 5).map(msg => (
                      <div key={msg.id} className={`p-4 border ${msg.read ? 'border-borderCustom bg-bgSecondary' : 'border-accent/30 bg-accent/5'} flex flex-col md:flex-row justify-between md:items-center gap-4`}>
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-sm">{msg.name}</h4>
                            <span className="text-[10px] uppercase bg-bgPrimary border border-borderCustom px-2 py-0.5 text-accent font-semibold">{msg.type}</span>
                            <span className="text-xs text-textSecondary">{msg.date}</span>
                          </div>
                          <p className="text-xs text-textSecondary mt-1"><a href={`mailto:${msg.email}`} className="underline hover:text-textPrimary">{msg.email}</a></p>
                          <p className="text-sm text-textPrimary mt-2 italic">"{msg.message}"</p>
                        </div>
                        <div className="flex gap-2 justify-end">
                          {!msg.read && (
                            <button 
                              onClick={() => handleMarkInquiryRead(msg.id)}
                              className="text-xs bg-accent hover:bg-accentLight text-white px-3 py-1.5 transition-colors font-semibold"
                            >
                              Mark Read
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteInquiry(msg.id)}
                            className="text-xs border border-red-300 hover:bg-red-50 text-red-500 px-3 py-1.5 transition-colors font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= ADMIN TAB: PROJECTS MANAGER ================= */}
          {activeAdminTab === "projects" && (
            <div className="space-y-8 animate-fadeIn">
              {!editingProject ? (
                <div className="bg-bgCard border border-borderCustom">
                  <div className="p-6 border-b border-borderCustom flex justify-between items-center">
                    <h3 className="font-syne font-bold text-lg text-accent">Active Projects List</h3>
                    <button 
                      onClick={() => { setEditingProject({}); setProjectImgPreview(""); }}
                      className="bg-accent hover:bg-accentLight text-white px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2"
                    >
                      <Icons.Plus size={16} /> Add New Project
                    </button>
                  </div>
                  
                  {/* Mobile responsive card list view */}
                  <div className="md:hidden divide-y divide-borderCustom">
                    {projects.length === 0 ? (
                      <div className="text-center py-8 text-textSecondary text-sm">No project items found.</div>
                    ) : (
                      projects.map(p => (
                        <div key={p.id} className="p-5 space-y-4 bg-bgSecondary/20">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h4 className="font-bold text-sm text-white leading-tight">{p.title}</h4>
                              <span className="text-[10px] text-accent uppercase font-bold tracking-wider mt-1 block">{p.category}</span>
                            </div>
                            <div className="flex gap-3 flex-shrink-0">
                              <button onClick={() => { setEditingProject(p); setProjectImgPreview(p.imageUrl || ""); }} className="text-blue-500 hover:text-blue-400 p-1">
                                <Icons.Edit size={16} />
                              </button>
                              <button onClick={() => handleDeleteProject(p.id)} className="text-red-500 hover:text-red-400 p-1">
                                <Icons.Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-textSecondary space-y-1">
                            <span className="block font-bold text-white uppercase tracking-wider text-[9px]">Client Review:</span>
                            <p className="italic">"{p.clientFeedback || "None"}"</p>
                            {p.clientName && <p className="text-[10px] text-accent font-semibold">- {p.clientName}</p>}
                          </div>
                          <div className="text-xs text-yellow-600 font-semibold flex items-center gap-1">
                            {p.rating ? "★".repeat(p.rating) + ` (${p.rating.toFixed(1)})` : "Not Rated"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop table view */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-bgSecondary uppercase tracking-wider text-textSecondary text-xs">
                        <tr>
                          <th className="px-6 py-4">Project</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Client Feedback</th>
                          <th className="px-6 py-4">Rating</th>
                          <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borderCustom">
                        {projects.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center py-8 text-textSecondary">No project items found.</td>
                          </tr>
                        ) : (
                          projects.map(p => (
                            <tr key={p.id} className="hover:bg-bgSecondary transition-colors">
                              <td className="px-6 py-4 font-bold">{p.title}</td>
                              <td className="px-6 py-4 text-textSecondary">{p.category}</td>
                              <td className="px-6 py-4 text-textSecondary max-w-xs truncate">{p.clientFeedback || "None"}</td>
                              <td className="px-6 py-4 text-yellow-600 font-semibold">{p.rating ? "★".repeat(p.rating) + ` (${p.rating.toFixed(1)})` : "Not Rated"}</td>
                              <td className="px-6 py-4">
                                <div className="flex gap-4 justify-center">
                                  <button onClick={() => { setEditingProject(p); setProjectImgPreview(p.imageUrl || ""); }} className="text-blue-500 hover:text-blue-400">
                                    <Icons.Edit size={16} />
                                  </button>
                                  <button onClick={() => handleDeleteProject(p.id)} className="text-red-500 hover:text-red-400">
                                    <Icons.Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-bgCard border border-borderCustom p-6 animate-fadeIn">
                  <h3 className="font-syne font-bold text-lg text-accent mb-6">{editingProject.id ? "Edit Project Details" : "Create New Project Card"}</h3>
                  <form onSubmit={handleSaveProject} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Project Title *</label>
                      <input type="text" name="projTitle" defaultValue={editingProject.title || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" required />
                    </div>

                    <div className="form-group">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Category *</label>
                      <select name="projCat" defaultValue={editingProject.category || "Web"} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm">
                        <option value="Web">Web</option>
                        <option value="App">App</option>
                        <option value="Design">Design</option>
                        <option value="Branding">Branding</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-group md:col-span-2">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Short Description *</label>
                      <textarea name="projDesc" defaultValue={editingProject.description || ""} rows="3" className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm resize-none" required></textarea>
                    </div>

                    <div className="form-group">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Project Preview Link</label>
                      <input type="url" name="projUrl" defaultValue={editingProject.projectUrl || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="https://" />
                    </div>

                    <div className="form-group md:col-span-2">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Project Cover Image</label>
                      <div className="flex flex-col sm:flex-row gap-4 items-center bg-bgSecondary border border-borderCustom p-4">
                        <div className="w-20 h-20 bg-bgCard border border-borderCustom flex items-center justify-center overflow-hidden flex-shrink-0">
                          {projectImgPreview ? (
                            <img src={projectImgPreview} className="w-full h-full object-cover" alt="Preview" />
                          ) : (
                            <span className="text-[10px] text-textSecondary font-bold uppercase">No Image</span>
                          )}
                        </div>
                        <div className="flex-1 w-full space-y-3">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const base64 = await convertToBase64(e.target.files[0]);
                                setProjectImgPreview(base64);
                              }
                            }}
                            className="w-full text-xs text-textSecondary file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-bgCard file:text-accent hover:file:bg-bgPrimary transition-colors cursor-pointer" 
                          />
                          <input 
                            type="text" 
                            name="projImg" 
                            placeholder="Or paste an image URL..." 
                            value={projectImgPreview || ""}
                            onChange={(e) => setProjectImgPreview(e.target.value)}
                            className="w-full bg-bgCard border border-borderCustom focus:border-accent outline-none px-3 py-1.5 text-textPrimary text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Technologies Used (comma separated)</label>
                      <input type="text" name="projTags" defaultValue={editingProject.tags?.join(", ") || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="React, Node.js, CSS" />
                    </div>

                    <div className="form-group">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Client Name</label>
                      <input type="text" name="clientName" defaultValue={editingProject.clientName || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="Rahul Sharma" />
                    </div>

                    <div className="form-group md:col-span-2">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Client Review / Feedback</label>
                      <textarea name="clientFeedback" defaultValue={editingProject.clientFeedback || ""} rows="2" className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm resize-none" placeholder="Outstanding delivery..."></textarea>
                    </div>

                    <div className="form-group">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Star Rating (1-5)</label>
                      <select name="projRating" defaultValue={editingProject.rating || 5} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm">
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 flex gap-4 justify-end mt-4">
                      <button 
                        type="button" 
                        onClick={() => { setEditingProject(null); setProjectImgPreview(""); }}
                        className="border border-borderCustom hover:border-gray-500 px-6 py-2.5 text-sm font-semibold transition-colors bg-bgCard"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="bg-accent hover:bg-accentLight text-white px-6 py-2.5 text-sm font-semibold transition-colors"
                      >
                        Save Project Card
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ================= ADMIN TAB: SERVICES MANAGER ================= */}
          {activeAdminTab === "services" && (
            <div className="space-y-8 animate-fadeIn">
              {!editingService ? (
                <div className="bg-bgCard border border-borderCustom">
                  <div className="p-6 border-b border-borderCustom flex justify-between items-center">
                    <h3 className="font-syne font-bold text-lg text-accent">Active Services List</h3>
                    <button 
                      onClick={() => setEditingService({})}
                      className="bg-accent hover:bg-accentLight text-white px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2"
                    >
                      <Icons.Plus size={16} /> Add Service
                    </button>
                  </div>
                  
                  {/* Mobile responsive card list view */}
                  <div className="md:hidden divide-y divide-borderCustom">
                    {services.length === 0 ? (
                      <div className="text-center py-8 text-textSecondary text-sm">No services found.</div>
                    ) : (
                      services.map(s => (
                        <div key={s.id} className="p-5 space-y-4 bg-bgSecondary/20">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-accent/5 border border-accent/20 flex items-center justify-center">
                                <DynamicIcon name={s.icon} className="w-5 h-5 text-accent" />
                              </div>
                              <h4 className="font-bold text-sm text-white leading-tight">{s.name}</h4>
                            </div>
                            <div className="flex gap-3 flex-shrink-0">
                              <button onClick={() => setEditingService(s)} className="text-blue-500 hover:text-blue-400 p-1">
                                <Icons.Edit size={16} />
                              </button>
                              <button onClick={() => handleDeleteService(s.id)} className="text-red-500 hover:text-red-400 p-1">
                                <Icons.Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-textSecondary leading-relaxed">{s.description}</p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {s.tags?.map(t => (
                              <span key={t} className="text-[9px] uppercase font-semibold text-textSecondary bg-bgPrimary border border-borderCustom px-2 py-0.5">{t}</span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop table view */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-bgSecondary uppercase tracking-wider text-textSecondary text-xs">
                        <tr>
                          <th className="px-6 py-4">Icon</th>
                          <th className="px-6 py-4">Service Name</th>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4">Tech Tags</th>
                          <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borderCustom">
                        {services.map(s => (
                          <tr key={s.id} className="hover:bg-bgSecondary transition-colors">
                            <td className="px-6 py-4">
                              <DynamicIcon name={s.icon} className="w-5 h-5 text-accent" />
                            </td>
                            <td className="px-6 py-4 font-bold">{s.name}</td>
                            <td className="px-6 py-4 text-textSecondary max-w-xs truncate">{s.description}</td>
                            <td className="px-6 py-4">
                              {s.tags?.map(t => (
                                <span key={t} className="inline-block text-[10px] bg-bgPrimary border border-borderCustom px-2 py-0.5 text-textSecondary font-semibold mr-1 mb-1">{t}</span>
                              ))}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-4 justify-center">
                                <button onClick={() => setEditingService(s)} className="text-blue-500 hover:text-blue-400">
                                  <Icons.Edit size={16} />
                                </button>
                                <button onClick={() => handleDeleteService(s.id)} className="text-red-500 hover:text-red-400">
                                  <Icons.Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-bgCard border border-borderCustom p-6 animate-fadeIn">
                  <h3 className="font-syne font-bold text-lg text-accent mb-6">{editingService.id ? "Edit Service Block" : "Create New Service Capability"}</h3>
                  <form onSubmit={handleSaveService} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="form-group">
                        <label className="block text-sm font-semibold text-textSecondary mb-2">Service Name *</label>
                        <input type="text" name="srvName" defaultValue={editingService.name || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" required />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-semibold text-textSecondary mb-2">Lucide Icon Name *</label>
                        <input type="text" name="srvIcon" defaultValue={editingService.icon || "Globe"} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="Globe, Smartphone, Layers, PenTool, Image, Star..." required />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Service Description *</label>
                      <textarea name="srvDesc" defaultValue={editingService.description || ""} rows="3" className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm resize-none" required></textarea>
                    </div>

                    <div className="form-group">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Subtags (comma separated)</label>
                      <input type="text" name="srvTags" defaultValue={editingService.tags?.join(", ") || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="Figma, Wireframing, Illustrator" />
                    </div>

                    <div className="flex gap-4 justify-end">
                      <button 
                        type="button" 
                        onClick={() => setEditingService(null)}
                        className="border border-borderCustom hover:border-gray-500 px-6 py-2.5 text-sm font-semibold transition-colors bg-bgCard"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="bg-accent hover:bg-accentLight text-white px-6 py-2.5 text-sm font-semibold transition-colors"
                      >
                        Save Service Block
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ================= ADMIN TAB: FEEDBACK MANAGER ================= */}
          {activeAdminTab === "feedbacks" && (
            <div className="space-y-8 animate-fadeIn">
              {!editingFeedback ? (
                <div className="bg-bgCard border border-borderCustom">
                  <div className="p-6 border-b border-borderCustom flex justify-between items-center">
                    <h3 className="font-syne font-bold text-lg text-accent">Client Testimonials</h3>
                    <button 
                      onClick={() => setEditingFeedback({})}
                      className="bg-accent hover:bg-accentLight text-white px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2"
                    >
                      <Icons.Plus size={16} /> Add Testimonial
                    </button>
                  </div>
                  
                  {/* Mobile responsive card list view */}
                  <div className="md:hidden divide-y divide-borderCustom">
                    {feedbacks.length === 0 ? (
                      <div className="text-center py-8 text-textSecondary text-sm">No testimonials found.</div>
                    ) : (
                      feedbacks.map(f => (
                        <div key={f.id} className="p-5 space-y-4 bg-bgSecondary/20">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h4 className="font-bold text-sm text-white leading-tight">{f.clientName}</h4>
                              <span className="text-[10px] text-accent uppercase font-bold tracking-wider mt-1 block">For: {f.projectName || "General"}</span>
                            </div>
                            <div className="flex gap-3 flex-shrink-0">
                              <button onClick={() => setEditingFeedback(f)} className="text-blue-500 hover:text-blue-400 p-1">
                                <Icons.Edit size={16} />
                              </button>
                              <button onClick={() => handleDeleteFeedback(f.id)} className="text-red-500 hover:text-red-400 p-1">
                                <Icons.Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-textSecondary italic leading-relaxed">"{f.feedbackText}"</p>
                          <div className="text-xs text-yellow-600 font-semibold">
                            {"★".repeat(f.starRating || 5)} ({f.starRating || 5})
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop table view */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-bgSecondary uppercase tracking-wider text-textSecondary text-xs">
                        <tr>
                          <th className="px-6 py-4">Client</th>
                          <th className="px-6 py-4">Project Name</th>
                          <th className="px-6 py-4">Feedback Quote</th>
                          <th className="px-6 py-4">Rating</th>
                          <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borderCustom">
                        {feedbacks.map(f => (
                          <tr key={f.id} className="hover:bg-bgSecondary transition-colors">
                            <td className="px-6 py-4 font-bold">{f.clientName}</td>
                            <td className="px-6 py-4 text-textSecondary">{f.projectName || "General"}</td>
                            <td className="px-6 py-4 text-textSecondary max-w-sm truncate">"{f.feedbackText}"</td>
                            <td className="px-6 py-4 text-yellow-600 font-semibold">{"★".repeat(f.starRating || 5)} ({f.starRating || 5})</td>
                            <td className="px-6 py-4">
                              <div className="flex gap-4 justify-center">
                                <button onClick={() => setEditingFeedback(f)} className="text-blue-500 hover:text-blue-400">
                                  <Icons.Edit size={16} />
                                </button>
                                <button onClick={() => handleDeleteFeedback(f.id)} className="text-red-500 hover:text-red-400">
                                  <Icons.Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-bgCard border border-borderCustom p-6 animate-fadeIn">
                  <h3 className="font-syne font-bold text-lg text-accent mb-6">{editingFeedback.id ? "Edit Testimonial Quote" : "Add Testimonial Quote"}</h3>
                  <form onSubmit={handleSaveFeedback} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="form-group">
                        <label className="block text-sm font-semibold text-textSecondary mb-2">Client Name *</label>
                        <input type="text" name="fbClient" defaultValue={editingFeedback.clientName || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" required />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-semibold text-textSecondary mb-2">Project Name (or Service Category)</label>
                        <input type="text" name="fbProj" defaultValue={editingFeedback.projectName || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="e.g. E-Commerce Website" />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Feedback Text *</label>
                      <textarea name="fbText" defaultValue={editingFeedback.feedbackText || ""} rows="4" className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm resize-none" required></textarea>
                    </div>

                    <div className="form-group w-full md:w-1/2">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Star Rating (1-5)</label>
                      <select name="fbRating" defaultValue={editingFeedback.starRating || 5} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm">
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                      </select>
                    </div>

                    <div className="flex gap-4 justify-end">
                      <button 
                        type="button" 
                        onClick={() => setEditingFeedback(null)}
                        className="border border-borderCustom hover:border-gray-500 px-6 py-2.5 text-sm font-semibold transition-colors bg-bgCard"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="bg-accent hover:bg-accentLight text-white px-6 py-2.5 text-sm font-semibold transition-colors"
                      >
                        Save Testimonial
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ================= ADMIN TAB: ABOUT EDITOR ================= */}
          {activeAdminTab === "about" && (
            <div className="bg-bgCard border border-borderCustom p-6 animate-fadeIn">
              <h3 className="font-syne font-bold text-lg text-accent mb-6">Modify About & Stats Information</h3>
              <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">Founder Full Name</label>
                  <input type="text" name="aboutName" defaultValue={about.name || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" />
                </div>
                
                <div className="form-group">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">Founder Headline / Job Title</label>
                  <input type="text" name="aboutTitle" defaultValue={about.title || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" />
                </div>

                <div className="form-group md:col-span-2">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">Detailed Bio / About Description</label>
                  <textarea name="aboutBio" defaultValue={about.bio || ""} rows="5" className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm resize-none"></textarea>
                </div>

                {/* Founder Image Upload widget */}
                <div className="form-group md:col-span-2">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">Founder Profile Image</label>
                  <div className="flex flex-col sm:flex-row gap-4 items-center bg-bgSecondary border border-borderCustom p-4">
                    <div className="w-20 h-20 bg-bgCard border border-borderCustom flex items-center justify-center overflow-hidden flex-shrink-0 rounded-full">
                      <img src={avatarImgPreview || "/founder.png"} className="w-full h-full object-cover" alt="Preview" />
                    </div>
                    <div className="flex-1 w-full space-y-3">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            const base64 = await convertToBase64(e.target.files[0]);
                            setAvatarImgPreview(base64);
                          }
                        }}
                        className="w-full text-xs text-textSecondary file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-bgCard file:text-accent hover:file:bg-bgPrimary transition-colors cursor-pointer" 
                      />
                      <input 
                        type="text" 
                        name="aboutAvatar" 
                        placeholder="Or paste an image URL..." 
                        value={avatarImgPreview || ""}
                        onChange={(e) => setAvatarImgPreview(e.target.value)}
                        className="w-full bg-bgCard border border-borderCustom focus:border-accent outline-none px-3 py-1.5 text-textPrimary text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <h4 className="font-syne font-bold md:col-span-2 text-md text-accent mt-4 border-b border-borderCustom pb-2">Website Metrics / Counter Stats</h4>
                
                <div className="form-group">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">Projects Completed</label>
                  <input type="number" name="statProj" defaultValue={about.stats?.projects || 0} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" />
                </div>
                
                <div className="form-group">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">Years of Experience</label>
                  <input type="number" name="statExp" defaultValue={about.stats?.experience || 0} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" />
                </div>

                <div className="form-group">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">Happy Clients</label>
                  <input type="number" name="statClients" defaultValue={about.stats?.clients || 0} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" />
                </div>

                <div className="form-group">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">Satisfaction Rate (%)</label>
                  <input type="number" name="statSat" defaultValue={about.stats?.satisfaction || 100} min="0" max="100" className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" />
                </div>

                {/* Socials */}
                <h4 className="font-syne font-bold md:col-span-2 text-md text-accent mt-4 border-b border-borderCustom pb-2">Founder Social Media Profiles</h4>
                
                <div className="form-group">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">GitHub URL</label>
                  <input type="url" name="socialGithub" defaultValue={about.socials?.github || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="https://" />
                </div>

                <div className="form-group">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">LinkedIn URL</label>
                  <input type="url" name="socialLinkedin" defaultValue={about.socials?.linkedin || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="https://" />
                </div>

                <div className="form-group">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">Instagram URL</label>
                  <input type="url" name="socialInstagram" defaultValue={about.socials?.instagram || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="https://" />
                </div>

                <div className="form-group">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">Twitter URL</label>
                  <input type="url" name="socialTwitter" defaultValue={about.socials?.twitter || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="https://" />
                </div>

                <div className="md:col-span-2 flex justify-end mt-4">
                  <button 
                    type="submit"
                    className="bg-accent hover:bg-accentLight text-white px-6 py-2.5 text-sm font-semibold transition-colors"
                  >
                    Save About Profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= ADMIN TAB: CONTACT EDITOR ================= */}
          {activeAdminTab === "contact" && (
            <div className="bg-bgCard border border-borderCustom p-6 animate-fadeIn">
              <h3 className="font-syne font-bold text-lg text-accent mb-6">Modify Office Contact Details</h3>
              <form onSubmit={handleSaveContactSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">Public Contact Email</label>
                  <input type="email" name="contEmail" defaultValue={contact.email || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" required />
                </div>
                
                <div className="form-group">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">Phone / WhatsApp</label>
                  <input type="text" name="contPhone" defaultValue={contact.phone || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" required />
                </div>

                <div className="form-group md:col-span-2">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">Headquarters / Physical Location</label>
                  <input type="text" name="contLoc" defaultValue={contact.location || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" required />
                </div>

                <div className="form-group md:col-span-2">
                  <label className="block text-sm font-semibold text-textSecondary mb-2">Working Hours / Availability Schedule</label>
                  <input type="text" name="contHours" defaultValue={contact.hours || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="Mon - Fri..." required />
                </div>

                <div className="md:col-span-2 flex justify-end mt-4">
                  <button 
                    type="submit"
                    className="bg-accent hover:bg-accentLight text-white px-6 py-2.5 text-sm font-semibold transition-colors"
                  >
                    Save Contact Info
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= ADMIN TAB: SETTINGS ================= */}
          {activeAdminTab === "settings" && (
            <div className="space-y-8 animate-fadeIn">

              <div className="bg-bgCard border border-borderCustom p-6">
                <h3 className="font-syne font-bold text-lg text-accent mb-6">Configure Notifications (Twilio / CallMeBot)</h3>
                <form onSubmit={handleSaveNotificationSettings} className="space-y-4 max-w-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Twilio Account SID</label>
                      <input type="text" name="twilioSid" defaultValue={notificationSettings.twilioSid || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Twilio Auth Token</label>
                      <input type="password" name="twilioAuth" defaultValue={notificationSettings.twilioAuth || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="••••••••••••••••••••••••••••••••" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Twilio SMS Sender Phone Number</label>
                      <input type="text" name="twilioPhone" defaultValue={notificationSettings.twilioPhone || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="+1234567890" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Twilio WhatsApp Sender Phone Number</label>
                      <input type="text" name="twilioWhatsAppPhone" defaultValue={notificationSettings.twilioWhatsAppPhone || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="whatsapp:+14155238886" />
                    </div>
                    <div className="form-group md:col-span-2">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">CallMeBot WhatsApp API Key (Free Alternative)</label>
                      <input type="text" name="callmebotApiKey" defaultValue={notificationSettings.callmebotApiKey || ""} className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-4 py-2.5 text-textPrimary text-sm" placeholder="123456" />
                      <span className="text-xs text-textSecondary mt-1 block">To get a free key, send <code>I allow callmebot to send me messages</code> to <code>+34 644 20 22 28</code> on WhatsApp.</span>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="bg-accent hover:bg-accentLight text-white px-6 py-2.5 text-sm font-semibold transition-colors"
                  >
                    Save Notification Credentials
                  </button>
                </form>
              </div>

              <div className="bg-bgCard border border-red-200 p-6">
                <h3 className="font-syne font-bold text-lg text-red-500 mb-2">Danger Zone / Recovery</h3>
                <p className="text-textSecondary text-sm mb-6">This will reset all project cards, testimonials, capabilities list, bio texts, and settings back to original defaults. All client message logs will be wiped.</p>
                <button 
                  onClick={handleResetData}
                  className="bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 px-6 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <Icons.AlertTriangle size={16} /> Reset All Database Tables
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}

  // ==========================================
  // VIEW: PUBLIC WEBSITE
  // ==========================================
  return (
    <div className="min-h-screen bg-bgPrimary text-textPrimary flex flex-col antialiased">
      {/* Dynamic Font Imports & Unique Luxurious Dark Theme Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@500;700;800&display=swap');
        
        :root {
          --bg-primary: #131625; /* Very deep navy background */
          --bg-secondary: #1b1e32; /* Slightly lighter deep navy */
          --bg-card: #2d3250; /* Card Background from palette */
          --accent: #f9b17a; /* Primary Accent: Peach/Apricot */
          --accent-light: #676f9d; /* Secondary Accent: Cool Slate Blue */
          --highlight: #f9b17a;
          --text-primary: #ffffff; /* White text */
          --text-secondary: #a3a8c3; /* Readable Slate text */
          --border: #424769; /* Dark Slate Border */
        }

        body {
          font-family: 'Inter', sans-serif;
          background-color: var(--bg-primary);
          color: var(--text-primary);
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Syne', sans-serif;
        }

        /* Dark Theme overrides for hardcoded classes */
        .bg-\[\#0a0a0a\] {
          background-color: var(--bg-primary) !important;
        }
        .bg-\[\#111111\] {
          background-color: var(--bg-secondary) !important;
        }
        .bg-\[\#161616\] {
          background-color: var(--bg-card) !important;
        }
        .bg-\[\#111111\]\/40 {
          background-color: rgba(27, 30, 50, 0.4) !important;
        }
        .bg-\[\#111111\]\/20 {
          background-color: rgba(27, 30, 50, 0.2) !important;
        }
        .bg-\[\#111111\]\/30 {
          background-color: rgba(27, 30, 50, 0.3) !important;
        }
        .bg-\[\#0f0f0f\] {
          background-color: var(--bg-secondary) !important;
        }
        .bg-black\/85 {
          background-color: rgba(19, 22, 37, 0.85) !important;
          backdrop-filter: blur(8px);
        }
        .bg-black\/80 {
          background-color: rgba(45, 50, 80, 0.8) !important;
          color: var(--accent) !important;
          border-color: var(--border) !important;
        }
        
        /* Borders */
        .border-\[\#222222\] {
          border-color: var(--border) !important;
        }
        .divide-\[\#222222\] > :not([hidden]) ~ :not([hidden]) {
          border-color: var(--border) !important;
        }
        .border-borderCustom {
          border-color: var(--border) !important;
        }
        
        /* Text Colors */
        .text-white {
          color: var(--text-primary) !important;
        }
        .text-gray-400 {
          color: var(--text-secondary) !important;
        }
        .text-gray-300 {
          color: var(--text-primary) !important;
        }
        .text-textSecondary {
          color: var(--text-secondary) !important;
        }
        
        /* Accents and Highlights mapping (formerly gold, now peach/apricot) */
        .text-\[\#D4AF37\] {
          color: var(--accent) !important;
        }
        .bg-\[\#D4AF37\] {
          background-color: var(--accent) !important;
          color: #131625 !important; /* contrast text on peach bg */
        }
        .bg-accent {
          background-color: var(--accent) !important;
          color: #131625 !important; /* dark text for high contrast on peach */
          font-weight: 600;
        }
        .bg-accent:hover {
          background-color: var(--accent-light) !important;
          color: #ffffff !important; /* white text on hover */
        }
        .border-\[\#D4AF37\] {
          border-color: var(--accent) !important;
        }
        .hover\:text-\[\#D4AF37\]:hover {
          color: var(--accent) !important;
        }
        .hover\:border-\[\#D4AF37\]:hover {
          border-color: var(--accent) !important;
        }
        .hover\:bg-\[\#D4AF37\]:hover {
          background-color: var(--accent-light) !important;
          color: #ffffff !important;
        }
        .hover\:bg-\[\#F5D76E\]:hover {
          background-color: var(--accent-light) !important;
          color: #ffffff !important;
        }
        
        /* Transparencies */
        .bg-\[\#D4AF37\]\/5 {
          background-color: rgba(249, 177, 122, 0.05) !important;
        }
        .border-\[\#D4AF37\]\/30 {
          border-color: rgba(249, 177, 122, 0.3) !important;
        }
        .bg-\[\#0a0a0a\]\/80 {
          background-color: rgba(19, 22, 37, 0.8) !important;
        }
        
        /* Soft Shadow override for premium look */
        .shadow-lg {
          box-shadow: 0 10px 30px -3px rgba(249, 177, 122, 0.04), 0 4px 6px -2px rgba(103, 111, 157, 0.02) !important;
        }
        .border-gold-highlight {
          border: 1px solid var(--accent-light);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease forwards;
        }

        @keyframes flowGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-flowGradient {
          background-size: 200% auto;
          animation: flowGradient 5s ease infinite;
        }
      `}</style>

      {/* Floating Toast Notification Wrapper */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className={`p-4 border shadow-xl flex items-center gap-3 animate-fadeIn pointer-events-auto transition-transform ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-accent/30 text-textPrimary'}`}
          >
            {toast.type === "error" ? <Icons.AlertCircle className="text-red-500 flex-shrink-0" size={18} /> : <Icons.CheckCircle className="text-accent flex-shrink-0" size={18} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Sticky Glassmorphic Navbar with Logo */}
      <nav className="fixed top-0 left-0 w-full z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#222222] transition-shadow duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="#" className="font-syne font-extrabold text-base sm:text-xl tracking-wide sm:tracking-wider text-white flex items-center gap-2 sm:gap-3">
            <img src="/uploads/logo.png" className="h-10 sm:h-14 w-auto object-contain" alt="ZD" onError={(e)=>{e.target.style.display='none'}} />
            <span className="hidden sm:block">ZYNS DIGITAL</span>
          </a>

          {/* Desktop Nav Links */}
          <ul className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <li><a href="#" className="hover:text-[#D4AF37] transition-colors">Home</a></li>
            <li><a href="#about" className="hover:text-[#D4AF37] transition-colors">About</a></li>
            <li><a href="#services" className="hover:text-[#D4AF37] transition-colors">Services</a></li>
            <li><a href="#projects" className="hover:text-[#D4AF37] transition-colors">Projects</a></li>
            <li><a href="#feedback" className="hover:text-[#D4AF37] transition-colors">Feedback</a></li>
            <li><a href="#contact" className="hover:text-[#D4AF37] transition-colors">Contact</a></li>
          </ul>

          <div className="hidden md:block">
            <a 
              href="#contact" 
              className="border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black px-5 py-2 text-xs uppercase tracking-widest font-semibold transition-all duration-300"
            >
              Start Project
            </a>
          </div>

          {/* Mobile Menu Icon Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white hover:text-[#D4AF37] transition-colors p-2"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <Icons.X size={24} /> : <Icons.Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown List */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0f0f0f] border-b border-[#222222] py-6 px-6 space-y-4 animate-fadeIn">
            <ul className="space-y-4 text-md font-medium text-gray-400">
              <li><a href="#" onClick={() => setMobileMenuOpen(false)} className="block hover:text-[#D4AF37] transition-colors">Home</a></li>
              <li><a href="#about" onClick={() => setMobileMenuOpen(false)} className="block hover:text-[#D4AF37] transition-colors">About</a></li>
              <li><a href="#services" onClick={() => setMobileMenuOpen(false)} className="block hover:text-[#D4AF37] transition-colors">Services</a></li>
              <li><a href="#projects" onClick={() => setMobileMenuOpen(false)} className="block hover:text-[#D4AF37] transition-colors">Projects</a></li>
              <li><a href="#feedback" onClick={() => setMobileMenuOpen(false)} className="block hover:text-[#D4AF37] transition-colors">Feedback</a></li>
              <li><a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block hover:text-[#D4AF37] transition-colors">Contact</a></li>
            </ul>
            <div className="pt-4 border-t border-[#222222]">
              <a 
                href="#contact" 
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center border border-[#D4AF37] bg-[#D4AF37] text-black py-2.5 font-bold uppercase tracking-wider text-sm"
              >
                Hire Me
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ================= SECTION 1: HERO ================= */}
      <section className="relative min-h-screen pt-32 pb-20 flex items-center justify-center overflow-hidden">
        {/* Animated Background Mesh & Concentric Rings */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          {/* Glowing Ambient Orbs */}
          <div className="absolute top-[-25%] left-[-15%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-accent/15 via-[#676f9d]/5 to-transparent filter blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
          <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-accentLight/10 to-transparent filter blur-3xl animate-pulse" style={{ animationDuration: '12s' }}></div>
          
          {/* Concentric Dashed Luxury Rings */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <div className="absolute w-[900px] h-[900px] rounded-full border border-dashed border-[#424769] animate-[spin_180s_linear_infinite]"></div>
            <div className="absolute w-[600px] h-[600px] rounded-full border border-dashed border-accent animate-[spin_100s_linear_infinite_reverse]"></div>
            <div className="absolute w-[400px] h-[400px] rounded-full border border-dashed border-[#424769] animate-[spin_60s_linear_infinite]"></div>
          </div>

          {/* Grid Dots */}
          <div 
            className="w-full h-full opacity-5" 
            style={{
              backgroundImage: 'radial-gradient(#E4E4E7 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }}
          ></div>
        </div>

        <div className="max-w-5xl mx-auto px-6 text-center z-10 space-y-10 animate-fadeIn">
          {/* Unique Pill Badge */}
          <div className="inline-flex items-center gap-2.5 border border-accent/20 bg-accent/5 text-accent px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest backdrop-blur-md hover:border-accent/40 transition-colors duration-300">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping"></span>
            <span>Zyns Digital</span>
          </div>
          
          {/* Luxurious Headings */}
          <h1 className="font-syne font-extrabold text-5xl sm:text-7xl lg:text-8xl leading-[1.05] text-white tracking-tight select-none">
            Crafting Digital <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-white to-accent bg-size-200 animate-flowGradient font-black">
              Experiences
            </span>
          </h1>

          <p className="text-[#a3a8c3] text-base sm:text-lg max-w-xl mx-auto font-normal leading-relaxed tracking-wide opacity-90">
            High-end software engineering, UI/UX design, and creative branding.
          </p>

          {/* Call-to-action buttons */}
          <div className="pt-6 flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto sm:max-w-none">
            <a 
              href="#projects" 
              className="w-full sm:w-auto bg-accent hover:bg-accentLight text-[#131625] hover:text-white px-8 py-4 font-bold text-xs uppercase tracking-widest shadow-[0_4px_20px_rgba(249,177,122,0.2)] hover:shadow-[0_8px_30px_rgba(249,177,122,0.4)] transition-all duration-300 flex items-center justify-center gap-2 group/btn rounded-xl"
            >
              <span>View My Work</span>
              <Icons.ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
            </a>
            <a 
              href="#contact" 
              className="w-full sm:w-auto border border-white/10 hover:border-accent hover:bg-white/[0.02] text-white hover:text-accent px-8 py-4 font-bold text-xs uppercase tracking-widest transition-all duration-300 bg-[#1b1e32]/40 backdrop-blur-md flex items-center justify-center gap-2 group/btn rounded-xl"
            >
              <span>Hire Me</span>
              <Icons.Send className="w-4 h-4 opacity-70 group-hover/btn:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      </section>

      {/* ================= SECTION 2: ABOUT ================= */}
      <section id="about" className="py-16 md:py-24 border-t border-[#222222] bg-[#111111]/40 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
            
            {/* Left Side: Avatar Box */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-accent to-accentLight opacity-35 group-hover:opacity-70 blur-md transition-opacity duration-300"></div>
                <div className="relative w-72 h-72 sm:w-80 sm:h-80 bg-[#161616] border border-[#222222] flex items-center justify-center overflow-hidden">
                  <img src={about.avatar || "/founder.png"} className="w-full h-full object-cover" alt="Founder avatar" />
                </div>
              </div>
            </div>

            {/* Right Side: Description & Stats */}
            <div className="lg:col-span-7 space-y-8">
              <div>
                <span className="text-xs text-[#D4AF37] font-semibold uppercase tracking-widest block mb-1">The Founder</span>
                <h2 className="font-syne font-bold text-3xl sm:text-4xl text-white">{about.name || "Zayn Stark"}</h2>
                <p className="text-xs text-[#D4AF37] uppercase font-semibold tracking-widest mt-1.5">{about.title || "Founder & Creative Lead"}</p>
              </div>
              <p className="text-gray-400 leading-relaxed text-md">
                {about.bio || "Crafting digital portfolios that make an impact."}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-borderCustom">
                <div className="space-y-1">
                  <span className="text-textSecondary text-xs uppercase tracking-wider block">Done</span>
                  <p className="font-syne font-bold text-3xl text-white whitespace-nowrap">{about.stats?.projects || 40}+</p>
                  <p className="text-xs text-textSecondary uppercase tracking-wider whitespace-nowrap">Projects</p>
                </div>
                <div className="space-y-1">
                  <span className="text-textSecondary text-xs uppercase tracking-wider block">Years</span>
                  <p className="font-syne font-bold text-3xl text-accent whitespace-nowrap">{about.stats?.experience || 5}</p>
                  <p className="text-xs text-textSecondary uppercase tracking-wider whitespace-nowrap">Experience</p>
                </div>
                <div className="space-y-1">
                  <span className="text-textSecondary text-xs uppercase tracking-wider block">Global</span>
                  <p className="font-syne font-bold text-3xl text-white whitespace-nowrap">{about.stats?.clients || 30}+</p>
                  <p className="text-xs text-textSecondary uppercase tracking-wider whitespace-nowrap">Clients</p>
                </div>
                <div className="space-y-1">
                  <span className="text-textSecondary text-xs uppercase tracking-wider block">Rate</span>
                  <p className="font-syne font-bold text-3xl text-white whitespace-nowrap">{about.stats?.satisfaction || 100}%</p>
                  <p className="text-xs text-textSecondary uppercase tracking-wider whitespace-nowrap">Satisfaction</p>
                </div>
              </div>

              {/* Social icons */}
              <div className="flex gap-4 pt-6">
                <a href={`mailto:${contact.email || "netheshkumark@gmail.com"}`} className="w-10 h-10 flex items-center justify-center border border-[#222222] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all bg-bgCard" aria-label="Email"><Icons.Mail size={18} /></a>
                <a href={about.socials?.linkedin || "#"} target="_blank" className="w-10 h-10 flex items-center justify-center border border-[#222222] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all bg-bgCard" aria-label="LinkedIn"><Icons.Linkedin size={18} /></a>
                <a href={about.socials?.instagram || "#"} target="_blank" className="w-10 h-10 flex items-center justify-center border border-[#222222] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all bg-bgCard" aria-label="Instagram"><Icons.Instagram size={18} /></a>
                <a href={about.socials?.twitter || "#"} target="_blank" className="w-10 h-10 flex items-center justify-center border border-[#222222] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all bg-bgCard" aria-label="Twitter"><Icons.Twitter size={18} /></a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= SECTION 3: SERVICES ================= */}
      <section id="services" className="py-16 md:py-24 border-t border-[#222222]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="text-xs text-[#D4AF37] font-semibold uppercase tracking-widest">Capabilities</span>
            <h2 className="font-syne font-bold text-3xl sm:text-4xl">What I Do</h2>
            <p className="text-gray-400 text-sm">Professional design & code services tailored for your business needs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((srv) => (
              <div 
                key={srv.id} 
                className="bg-[#161616] p-8 border border-[#222222] hover:-translate-y-1 hover:border-[#D4AF37] shadow-md hover:shadow-[0_8px_30px_rgba(184,134,11,0.06)] transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="w-12 h-12 bg-[#D4AF37]/5 border border-[#D4AF37]/30 flex items-center justify-center">
                    <DynamicIcon name={srv.icon} className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-syne font-bold text-lg text-white mb-3">{srv.name}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{srv.description}</p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                  {srv.tags?.map((tag) => (
                    <span 
                      key={tag} 
                      className="text-[10px] uppercase font-bold tracking-wider bg-bgPrimary border border-[#222222] text-gray-400 px-3 py-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SECTION 4: PROJECTS ================= */}
      <section id="projects" className="py-16 md:py-24 border-t border-[#222222] bg-[#111111]/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="text-xs text-[#D4AF37] font-semibold uppercase tracking-widest">Portfolio</span>
            <h2 className="font-syne font-bold text-3xl sm:text-4xl">My Work</h2>
            <p className="text-gray-400 text-sm">A curated selection of software, apps, and digital brand identities.</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {["All", "Web", "App", "Design", "Branding"].map((filter) => (
              <button 
                key={filter}
                onClick={() => setProjectFilter(filter)}
                className={`px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${projectFilter === filter ? 'bg-[#D4AF37] text-black border border-accent' : 'bg-bgCard border border-[#222222] hover:border-[#D4AF37] text-gray-400'}`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Project Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects
              .filter(p => projectFilter === "All" || p.category.toLowerCase() === projectFilter.toLowerCase())
              .map(project => {
                
                return (
                  <div 
                    key={project.id} 
                    className="bg-[#161616] border border-[#222222] group hover:border-[#D4AF37]/50 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Image / Thumbnail placeholder */}
                      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-bgSecondary to-bgPrimary border-b border-[#222222]">
                        {project.imageUrl ? (
                          <img 
                            src={project.imageUrl} 
                            alt={project.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center relative bg-bgSecondary">
                            <span className="font-syne font-bold text-xs uppercase tracking-widest text-[#D4AF37] opacity-60">ZYNS GRAPHIC</span>
                            <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 to-transparent pointer-events-none"></div>
                          </div>
                        )}
                        <span className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm border border-[#222222] text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider px-3 py-1">
                          {project.category}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-6 space-y-4">
                        <div className="flex flex-wrap gap-1.5">
                          {project.tags?.map(t => (
                            <span key={t} className="text-[10px] uppercase font-semibold text-gray-400 bg-bgPrimary border border-[#222222] px-2.5 py-0.5">{t}</span>
                          ))}
                        </div>
                        <h3 className="font-syne font-bold text-lg text-white group-hover:text-[#D4AF37] transition-colors">{project.title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">{project.description}</p>
                      </div>
                    </div>

                    {/* Feedback Sneak Peek inside Card */}
                    <div className="px-6 pb-6 mt-auto space-y-4">
                      {project.clientFeedback && (
                        <div className="border-t border-[#222222] pt-4 mt-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] uppercase font-bold text-gray-500">Client Review</span>
                            <span className="text-yellow-600 text-xs flex items-center gap-1">
                              {"★".repeat(project.rating || 5)}
                              <span className="text-gray-500 text-[10px] font-bold">(${(project.rating || 5).toFixed(1)})</span>
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 italic">"{project.clientFeedback}"</p>
                          <p className="text-[10px] text-[#D4AF37] font-semibold mt-1.5">- {project.clientName}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <a 
                          href={project.projectUrl || "#"} 
                          target="_blank"
                          className="text-center border border-[#222222] hover:border-[#D4AF37] hover:text-[#D4AF37] py-2.5 text-xs font-semibold transition-colors uppercase tracking-wider bg-bgCard"
                        >
                          View Project
                        </a>
                        <a 
                          href="#contact"
                          className="text-center bg-[#D4AF37] hover:bg-[#F5D76E] text-black py-2.5 text-xs font-bold transition-colors uppercase tracking-wider"
                        >
                          Contact Me
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* ================= SECTION 5: FEEDBACK & INQUIRIES ================= */}
      <section id="feedback" className="py-16 md:py-24 border-t border-[#222222] bg-[#111111]/30">
        <div className="max-w-7xl mx-auto px-6 space-y-20">
          
          {/* Testimonial Cards Layout */}
          <div>
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <span className="text-xs text-[#D4AF37] font-semibold uppercase tracking-widest">Testimonials</span>
              <h2 className="font-syne font-bold text-3xl sm:text-4xl">What Clients Say</h2>
              <p className="text-gray-400 text-sm">Verified quotes and rating breakdowns from project managers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feedbacks.map(fb => (
                <div 
                  key={fb.id} 
                  className="bg-[#161616] p-8 border border-[#222222] hover:border-[#D4AF37]/50 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-yellow-600 font-bold text-sm flex items-center gap-1">
                        {"★".repeat(fb.starRating || 5)}
                        <span className="text-gray-500 text-[11px] font-bold">({(fb.starRating || 5).toFixed(1)})</span>
                      </span>
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Client Review</span>
                    </div>
                    <p className="text-gray-300 text-sm italic leading-relaxed">"{fb.feedbackText}"</p>
                  </div>
                  <div className="mt-8 border-t border-[#222222] pt-4">
                    <h4 className="font-syne font-bold text-sm text-white">{fb.clientName}</h4>
                    <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider font-semibold">For: {fb.projectName || "General Inquiry"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Details & Triggers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
            
            {/* Left Column: Contact Details Display */}
            <div className="space-y-6 flex flex-col justify-between">
              <div className="mb-2 space-y-2">
                <span className="text-xs text-accent font-semibold uppercase tracking-widest block">Connect</span>
                <h3 className="font-syne font-bold text-2xl text-white">Contact Details</h3>
                <p className="text-textSecondary text-xs leading-relaxed max-w-md">Feel free to reach out directly. I am available for remote work and collaborations worldwide.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email Card */}
                <div className="bg-bgCard border border-borderCustom p-5 flex items-start gap-4">
                  <div className="p-3 bg-bgSecondary border border-dashed border-borderCustom text-accent rounded-xl flex-shrink-0">
                    <Icons.Mail size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-textSecondary block">Email Address</span>
                    <a href={`mailto:${contact.email || "netheshkumark@gmail.com"}`} className="text-xs text-white hover:text-accent font-semibold break-all transition-colors block">
                      {contact.email || "netheshkumark@gmail.com"}
                    </a>
                  </div>
                </div>

                {/* Phone Card */}
                <div className="bg-bgCard border border-borderCustom p-5 flex items-start gap-4">
                  <div className="p-3 bg-bgSecondary border border-dashed border-borderCustom text-accent rounded-xl flex-shrink-0">
                    <Icons.Phone size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-textSecondary block">Phone / WhatsApp</span>
                    <a href={`tel:${contact.phone || "+1 (555) 304-2983"}`} className="text-xs text-white hover:text-accent font-semibold transition-colors block">
                      {contact.phone || "+1 (555) 304-2983"}
                    </a>
                  </div>
                </div>

                {/* Location Card */}
                <div className="bg-bgCard border border-borderCustom p-5 flex items-start gap-4 sm:col-span-2">
                  <div className="p-3 bg-bgSecondary border border-dashed border-borderCustom text-accent rounded-xl flex-shrink-0">
                    <Icons.MapPin size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-textSecondary block">Location</span>
                    <p className="text-xs text-white font-semibold leading-relaxed">
                      {contact.location || "San Francisco, CA"}
                    </p>
                  </div>
                </div>

                {/* Working Hours Card */}
                <div className="bg-bgCard border border-borderCustom p-5 flex items-start gap-4 sm:col-span-2">
                  <div className="p-3 bg-bgSecondary border border-dashed border-borderCustom text-accent rounded-xl flex-shrink-0">
                    <Icons.Clock size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-textSecondary block">Working Hours</span>
                    <p className="text-xs text-white font-semibold leading-relaxed">
                      {contact.hours || "Mon - Fri, 9:00 AM - 6:00 PM EST"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interaction Trigger Buttons Card */}
            <div id="contact" className="bg-bgCard border border-borderCustom p-8 flex flex-col justify-between h-full lg:col-span-1">
              <div className="space-y-4">
                <span className="text-xs text-accent font-semibold uppercase tracking-widest block">Interactions</span>
                <h3 className="font-syne font-bold text-2xl text-white">How Can I Help?</h3>
                <p className="text-textSecondary text-xs leading-relaxed">
                  Whether you want to launch a new brand identity, build a web/mobile application, or leave feedback on our recent project collaboration, select the action below.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                {/* Send Feedback CTA Button */}
                <button 
                  onClick={() => { setActiveModalForm("feedback"); setModalStatus(""); }}
                  className="w-full bg-bgSecondary border border-borderCustom hover:border-accent/50 hover:bg-bgSecondary/80 text-white font-bold py-4 px-6 text-xs uppercase tracking-widest shadow-lg hover:shadow-accent/5 transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Icons.Star size={14} className="text-accent group-hover:scale-115 transition-transform" />
                  <span>Send Feedback</span>
                </button>

                {/* Contact Us CTA Button */}
                <button 
                  onClick={() => { setActiveModalForm("contact"); setModalStatus(""); }}
                  className="w-full bg-accent hover:bg-accentLight text-black hover:text-white font-bold py-4 px-6 text-xs uppercase tracking-widest shadow-[0_4px_20px_rgba(249,177,122,0.25)] hover:shadow-[0_8px_30px_rgba(249,177,122,0.45)] transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Icons.Mail size={14} className="group-hover:scale-115 transition-transform" />
                  <span>Contact Us</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-bgPrimary border-t border-borderCustom py-12 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-accent/5 filter blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left Side: Brand Logo and Copyright */}
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent to-accentLight rounded-full opacity-0 group-hover:opacity-75 blur-sm transition-opacity duration-300 pointer-events-none"></div>
                <img src="/uploads/logo.png" className="h-12 w-auto object-contain relative z-10" alt="ZD" onError={(e)=>{e.target.style.display='none'}} />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                <span className="font-syne font-extrabold text-sm tracking-wider text-white">ZYNS DIGITAL</span>
                <span className="text-borderCustom text-xs hidden sm:inline">|</span>
                <p className="text-textSecondary text-[11px] font-medium">© 2024. All rights reserved.</p>
              </div>
            </div>

            {/* Right Side: Social Media & Hidden Lock */}
            <div className="flex items-center gap-6">
              <div className="flex gap-2.5">
                <a href={`mailto:${contact.email || "netheshkumark@gmail.com"}`} className="p-2.5 bg-bgSecondary border border-borderCustom hover:border-accent text-textSecondary hover:text-accent rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center" aria-label="Email"><Icons.Mail size={15} /></a>
                <a href={about.socials?.linkedin || "#"} target="_blank" className="p-2.5 bg-bgSecondary border border-borderCustom hover:border-accent text-textSecondary hover:text-accent rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center" aria-label="LinkedIn"><Icons.Linkedin size={15} /></a>
                <a href={about.socials?.instagram || "#"} target="_blank" className="p-2.5 bg-bgSecondary border border-borderCustom hover:border-accent text-textSecondary hover:text-accent rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center" aria-label="Instagram"><Icons.Instagram size={15} /></a>
                <a href={about.socials?.twitter || "#"} target="_blank" className="p-2.5 bg-bgSecondary border border-borderCustom hover:border-accent text-textSecondary hover:text-accent rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center" aria-label="Twitter"><Icons.Twitter size={15} /></a>
              </div>
              
              {/* Tiny Hidden Lock Icon Trigger for Admin Panel */}
              <button 
                onClick={() => setIsPasswordModalOpen(true)}
                className="opacity-5 hover:opacity-100 transition-opacity p-2.5 text-textSecondary hover:text-accent cursor-default"
                title="Console"
              >
                <Icons.Lock size={13} />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ================= PASSWORD MODAL OVERLAY ================= */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#161616] border border-[#D4AF37] p-8 max-w-sm w-full relative shadow-2xl">
            <button 
              onClick={() => { setIsPasswordModalOpen(false); setAdminPasswordInput(""); }}
              className="absolute top-4 right-4 text-textSecondary hover:text-textPrimary"
            >
              <Icons.X size={20} />
            </button>
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-[#D4AF37]/10 border border-[#D4AF37]/50 rounded-full flex items-center justify-center mx-auto text-[#D4AF37]">
                <Icons.Lock size={20} />
              </div>
              <div>
                <h3 className="font-syne font-bold text-lg text-white">Admin Authentication</h3>
                <p className="text-gray-400 text-xs mt-1">Enter secure password to open dashboard console.</p>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input 
                  type="password" 
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full bg-[#111111] border border-[#222222] focus:border-[#D4AF37] outline-none px-4 py-2.5 text-center text-white text-sm"
                  placeholder="••••••••"
                  autoFocus
                  required
                />
                <button 
                  type="submit"
                  className="w-full bg-[#D4AF37] hover:bg-[#F5D76E] text-black py-2.5 font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Verify Access
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= MANUAL NOTIFICATION MODAL ================= */}
      {manualNotification.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#161616] border border-[#D4AF37] p-8 max-w-md w-full relative shadow-2xl space-y-6">
            <button 
              onClick={() => setManualNotification({ open: false, phone: "", text: "" })}
              className="absolute top-4 right-4 text-textSecondary hover:text-textPrimary"
            >
              <Icons.X size={20} />
            </button>
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-[#D4AF37]/10 border border-[#D4AF37]/50 rounded-full flex items-center justify-center mx-auto text-[#D4AF37]">
                <Icons.PhoneCall size={20} />
              </div>
              <div>
                <h3 className="font-syne font-bold text-lg text-white">Manual Dispatch Required</h3>
                <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">
                  Automated SMS/WhatsApp API keys are not configured on the server. Send this message manually to the founder at <span className="text-[#D4AF37] font-semibold">{manualNotification.phone}</span>:
                </p>
              </div>
              
              <div className="bg-[#111111] p-3 text-left border border-[#222222] rounded text-[11px] text-gray-400 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                {manualNotification.text}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <a 
                  href={`https://wa.me/${manualNotification.phone.replace(/[\s\-\+]/g, '')}?text=${encodeURIComponent(manualNotification.text)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 hover:bg-green-500 text-white py-3 font-bold text-xs uppercase tracking-widest text-center transition-colors rounded-lg flex items-center justify-center gap-2"
                >
                  <Icons.MessageSquare size={14} /> WhatsApp
                </a>
                <a 
                  href={`sms:${manualNotification.phone}?body=${encodeURIComponent(manualNotification.text)}`}
                  className="bg-blue-600 hover:bg-blue-500 text-white py-3 font-bold text-xs uppercase tracking-widest text-center transition-colors rounded-lg flex items-center justify-center gap-2"
                >
                  <Icons.Mail size={14} /> Send SMS
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL FORMS OVERLAY ================= */}
      {activeModalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-bgCard border border-borderCustom p-8 max-w-lg w-full relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button 
              onClick={() => { setActiveModalForm(null); setModalStatus(""); }}
              className="absolute top-4 right-4 text-textSecondary hover:text-textPrimary cursor-pointer"
            >
              <Icons.X size={20} />
            </button>

            {modalStatus === "Sent Successfully" ? (
              <div className="text-center py-12 space-y-4 animate-fadeIn">
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto text-green-500">
                  <Icons.CheckCircle size={32} />
                </div>
                <div>
                  <h3 className="font-syne font-bold text-2xl text-white">Sent Successfully</h3>
                  <p className="text-textSecondary text-sm mt-2">Your request has been processed successfully.</p>
                </div>
              </div>
            ) : activeModalForm === "feedback" ? (
              <div>
                <div className="mb-6 space-y-2">
                  <span className="text-xs text-accent font-semibold uppercase tracking-widest block">Share Your Thoughts</span>
                  <h3 className="font-syne font-bold text-xl text-white">Submit Your Review</h3>
                  <p className="text-textSecondary text-xs leading-relaxed">We appreciate your partnership. Your feedback helps us shape future products and maintain our quality metrics.</p>
                </div>
                
                <form onSubmit={handleFeedbackModalSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-textSecondary mb-1">Name *</label>
                      <input 
                        type="text" 
                        name="fbFormName"
                        className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-3 py-2 text-white text-xs" 
                        placeholder="Enter your name" 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-textSecondary mb-1">Email Address *</label>
                      <input 
                        type="email" 
                        name="fbFormEmail"
                        className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-3 py-2 text-white text-xs" 
                        placeholder="name@company.com" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-textSecondary mb-1">Project Collaborated On</label>
                      <select 
                        name="fbFormProj"
                        className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-3 py-2.5 text-white text-xs"
                      >
                        <option value="General Service">General Service</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.title}>{p.title}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-textSecondary mb-1">Rating Score *</label>
                      <select 
                        name="fbFormRating"
                        className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-3 py-2.5 text-white text-xs"
                      >
                        <option value="5">5 Stars (Excellent)</option>
                        <option value="4">4 Stars (Very Good)</option>
                        <option value="3">3 Stars (Good)</option>
                        <option value="2">2 Stars (Average)</option>
                        <option value="1">1 Star (Poor)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-textSecondary mb-1">Feedback Details *</label>
                    <textarea 
                      name="fbFormText"
                      rows="3" 
                      className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-3 py-2.5 text-white text-xs resize-none" 
                      placeholder="Share details about our collaboration..." 
                      required
                    ></textarea>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-accent hover:bg-accentLight text-black py-3 font-bold text-xs uppercase tracking-widest shadow-md transition-colors"
                  >
                    Submit Feedback
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div className="mb-6 space-y-2">
                  <span className="text-xs text-accent font-semibold uppercase tracking-widest block">Get In Touch</span>
                  <h3 className="font-syne font-bold text-xl text-white">Send Contact Message</h3>
                  <p className="text-textSecondary text-xs leading-relaxed">Have an upcoming project or brand update? Drop a message details and let's get a kick-off call scheduled.</p>
                </div>
                
                <form onSubmit={handleContactModalSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-textSecondary mb-1">Full Name *</label>
                      <input 
                        type="text" 
                        value={contactName} 
                        onChange={(e) => setContactName(e.target.value)} 
                        className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-3 py-2 text-white text-xs" 
                        placeholder="Rahul Sharma" 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-textSecondary mb-1">Email Address *</label>
                      <input 
                        type="email" 
                        value={contactEmail} 
                        onChange={(e) => setContactEmail(e.target.value)} 
                        className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-3 py-2 text-white text-xs" 
                        placeholder="rahul@example.com" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-textSecondary mb-1">Project Category</label>
                    <select 
                      value={contactType} 
                      onChange={(e) => setContactType(e.target.value)} 
                      className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-3 py-2.5 text-white text-xs"
                    >
                      <option value="Web Development">Web Development</option>
                      <option value="App Development">App Development</option>
                      <option value="UI/UX Design">UI/UX Design</option>
                      <option value="Logo Design">Logo Design</option>
                      <option value="Poster Design & Editing">Poster Design & Editing</option>
                      <option value="Branding">Branding</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-textSecondary mb-1">Message Details *</label>
                    <textarea 
                      value={contactMsg} 
                      onChange={(e) => setContactMsg(e.target.value)} 
                      rows="3" 
                      className="w-full bg-bgSecondary border border-borderCustom focus:border-accent outline-none px-3 py-2.5 text-white text-xs resize-none" 
                      placeholder="Describe your project, deadlines, and requirements..." 
                      required
                    ></textarea>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-accent hover:bg-accentLight text-black py-3 font-bold text-xs uppercase tracking-widest shadow-md transition-colors"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
