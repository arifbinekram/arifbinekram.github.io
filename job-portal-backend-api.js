/**
 * JobHunt Pro - Backend API Simulation
 * Demonstrates RESTful API design, authentication, and data management
 * Suitable for FAANG-level technical interviews
 */

// ============================================================================
// IMPORTS & CONFIGURATION
// ============================================================================

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Admin authorization middleware
const authorizeAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ============================================================================
// IN-MEMORY DATABASE (Replace with real DB in production)
// ============================================================================

class Database {
    constructor() {
        this.users = new Map();
        this.jobs = new Map();
        this.applications = new Map();
        this.companies = new Map();
        this.savedJobs = new Map(); // userId -> Set of jobIds
        
        this.initializeData();
    }
    
    initializeData() {
        // Initialize with sample data
        this.addUser({
            id: '1',
            email: 'admin@jobhunt.com',
            password: bcrypt.hashSync('admin123', 10),
            role: 'admin',
            name: 'Admin User',
            createdAt: new Date()
        });
        
        this.addUser({
            id: '2',
            email: 'user@example.com',
            password: bcrypt.hashSync('user123', 10),
            role: 'user',
            name: 'John Doe',
            profile: {
                title: 'Senior Software Engineer',
                location: 'San Francisco, CA',
                experience: 5,
                skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS']
            },
            createdAt: new Date()
        });
        
        // Initialize companies
        const companies = [
            { id: '1', name: 'Google', tier: 'FAANG', employees: '150k+', founded: 1998 },
            { id: '2', name: 'Meta', tier: 'FAANG', employees: '77k+', founded: 2004 },
            { id: '3', name: 'Amazon', tier: 'FAANG', employees: '1.5M+', founded: 1994 },
            { id: '4', name: 'Apple', tier: 'FAANG', employees: '164k+', founded: 1976 },
            { id: '5', name: 'Netflix', tier: 'FAANG', employees: '13k+', founded: 1997 }
        ];
        
        companies.forEach(company => this.addCompany(company));
        
        // Initialize sample jobs
        this.generateSampleJobs();
    }
    
    generateSampleJobs() {
        const jobTemplates = [
            {
                title: 'Senior Software Engineer',
                category: 'engineering',
                description: 'Build scalable systems that impact millions of users',
                requirements: ['5+ years experience', 'Strong CS fundamentals', 'System design expertise'],
                skills: ['JavaScript', 'Python', 'AWS', 'Docker', 'Kubernetes']
            },
            {
                title: 'Product Manager',
                category: 'product',
                description: 'Lead product strategy and execution for key initiatives',
                requirements: ['3+ years PM experience', 'Technical background preferred', 'Strong analytical skills'],
                skills: ['Product Strategy', 'Analytics', 'SQL', 'A/B Testing']
            },
            {
                title: 'Machine Learning Engineer',
                category: 'ai',
                description: 'Develop and deploy ML models at scale',
                requirements: ['MS in CS or related field', '3+ years ML experience', 'Strong Python skills'],
                skills: ['Python', 'TensorFlow', 'PyTorch', 'Deep Learning', 'NLP']
            }
        ];
        
        let jobId = 1;
        this.companies.forEach((company, companyId) => {
            jobTemplates.forEach(template => {
                this.addJob({
                    id: String(jobId++),
                    ...template,
                    companyId,
                    company: company.name,
                    location: ['San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Remote'][Math.floor(Math.random() * 4)],
                    experienceLevel: ['Mid', 'Senior', 'Lead'][Math.floor(Math.random() * 3)],
                    jobType: ['Full-time', 'Contract'][Math.floor(Math.random() * 2)],
                    workMode: ['Remote', 'Hybrid', 'On-site'][Math.floor(Math.random() * 3)],
                    salaryMin: 120000 + Math.floor(Math.random() * 80000),
                    salaryMax: 200000 + Math.floor(Math.random() * 200000),
                    postedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                    status: 'active',
                    applicants: Math.floor(Math.random() * 500) + 50
                });
            });
        });
    }
    
    // User methods
    addUser(user) {
        this.users.set(user.id, user);
    }
    
    getUserByEmail(email) {
        return Array.from(this.users.values()).find(u => u.email === email);
    }
    
    getUserById(id) {
        return this.users.get(id);
    }
    
    updateUser(id, updates) {
        const user = this.users.get(id);
        if (user) {
            this.users.set(id, { ...user, ...updates, updatedAt: new Date() });
            return this.users.get(id);
        }
        return null;
    }
    
    // Job methods
    addJob(job) {
        this.jobs.set(job.id, { ...job, createdAt: new Date() });
    }
    
    getJob(id) {
        return this.jobs.get(id);
    }
    
    getAllJobs(filters = {}) {
        let jobs = Array.from(this.jobs.values());
        
        // Apply filters
        if (filters.category) {
            jobs = jobs.filter(j => j.category === filters.category);
        }
        if (filters.companyId) {
            jobs = jobs.filter(j => j.companyId === filters.companyId);
        }
        if (filters.experienceLevel) {
            jobs = jobs.filter(j => j.experienceLevel === filters.experienceLevel);
        }
        if (filters.workMode) {
            jobs = jobs.filter(j => j.workMode === filters.workMode);
        }
        if (filters.minSalary) {
            jobs = jobs.filter(j => j.salaryMax >= filters.minSalary);
        }
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            jobs = jobs.filter(j => 
                j.title.toLowerCase().includes(searchLower) ||
                j.company.toLowerCase().includes(searchLower) ||
                j.description.toLowerCase().includes(searchLower)
            );
        }
        
        // Pagination
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 20;
        const start = (page - 1) * limit;
        const end = start + limit;
        
        return {
            jobs: jobs.slice(start, end),
            total: jobs.length,
            page,
            pages: Math.ceil(jobs.length / limit)
        };
    }
    
    updateJob(id, updates) {
        const job = this.jobs.get(id);
        if (job) {
            this.jobs.set(id, { ...job, ...updates, updatedAt: new Date() });
            return this.jobs.get(id);
        }
        return null;
    }
    
    deleteJob(id) {
        return this.jobs.delete(id);
    }
    
    // Company methods
    addCompany(company) {
        this.companies.set(company.id, { ...company, createdAt: new Date() });
    }
    
    getCompany(id) {
        return this.companies.get(id);
    }
    
    getAllCompanies() {
        return Array.from(this.companies.values());
    }
    
    // Application methods
    createApplication(application) {
        const id = String(this.applications.size + 1);
        this.applications.set(id, {
            ...application,
            id,
            status: 'pending',
            createdAt: new Date()
        });
        
        // Increment applicant count on job
        const job = this.getJob(application.jobId);
        if (job) {
            job.applicants = (job.applicants || 0) + 1;
        }
        
        return this.applications.get(id);
    }
    
    getApplication(id) {
        return this.applications.get(id);
    }
    
    getUserApplications(userId) {
        return Array.from(this.applications.values())
            .filter(app => app.userId === userId);
    }
    
    getJobApplications(jobId) {
        return Array.from(this.applications.values())
            .filter(app => app.jobId === jobId);
    }
    
    updateApplicationStatus(id, status) {
        const app = this.applications.get(id);
        if (app) {
            app.status = status;
            app.updatedAt = new Date();
            return app;
        }
        return null;
    }
    
    // Saved jobs methods
    saveJob(userId, jobId) {
        if (!this.savedJobs.has(userId)) {
            this.savedJobs.set(userId, new Set());
        }
        this.savedJobs.get(userId).add(jobId);
    }
    
    unsaveJob(userId, jobId) {
        if (this.savedJobs.has(userId)) {
            this.savedJobs.get(userId).delete(jobId);
        }
    }
    
    getSavedJobs(userId) {
        if (!this.savedJobs.has(userId)) {
            return [];
        }
        const savedJobIds = Array.from(this.savedJobs.get(userId));
        return savedJobIds.map(id => this.getJob(id)).filter(Boolean);
    }
}

const db = new Database();

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// AUTH ROUTES
// ============================================================================

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'All fields required' });
        }
        
        // Check if user exists
        if (db.getUserByEmail(email)) {
            return res.status(409).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = {
            id: String(db.users.size + 1),
            email,
            password: hashedPassword,
            name,
            role: 'user',
            createdAt: new Date()
        };
        
        db.addUser(user);
        
        // Generate token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = db.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
    const user = db.getUserById(req.user.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

// ============================================================================
// JOB ROUTES
// ============================================================================

// Get all jobs (with filters and pagination)
app.get('/api/jobs', (req, res) => {
    try {
        const filters = {
            category: req.query.category,
            companyId: req.query.companyId,
            experienceLevel: req.query.experienceLevel,
            workMode: req.query.workMode,
            minSalary: req.query.minSalary,
            search: req.query.search,
            page: req.query.page,
            limit: req.query.limit
        };
        
        const result = db.getAllJobs(filters);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single job
app.get('/api/jobs/:id', (req, res) => {
    const job = db.getJob(req.params.id);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
});

// Create job (admin only)
app.post('/api/jobs', authenticateToken, authorizeAdmin, (req, res) => {
    try {
        const job = {
            id: String(db.jobs.size + 1),
            ...req.body,
            status: 'active'
        };
        
        db.addJob(job);
        res.status(201).json(job);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update job (admin only)
app.put('/api/jobs/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const job = db.updateJob(req.params.id, req.body);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
});

// Delete job (admin only)
app.delete('/api/jobs/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const deleted = db.deleteJob(req.params.id);
    if (!deleted) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ message: 'Job deleted successfully' });
});

// ============================================================================
// APPLICATION ROUTES
// ============================================================================

// Apply to job
app.post('/api/applications', authenticateToken, (req, res) => {
    try {
        const { jobId, coverLetter, resume } = req.body;
        
        if (!jobId) {
            return res.status(400).json({ error: 'Job ID required' });
        }
        
        // Check if job exists
        const job = db.getJob(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        // Check if already applied
        const existingApps = db.getUserApplications(req.user.userId);
        if (existingApps.some(app => app.jobId === jobId)) {
            return res.status(409).json({ error: 'Already applied to this job' });
        }
        
        const application = db.createApplication({
            userId: req.user.userId,
            jobId,
            coverLetter,
            resume
        });
        
        res.status(201).json(application);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user's applications
app.get('/api/applications/my', authenticateToken, (req, res) => {
    const applications = db.getUserApplications(req.user.userId);
    res.json(applications);
});

// Get applications for a job (admin only)
app.get('/api/applications/job/:jobId', authenticateToken, authorizeAdmin, (req, res) => {
    const applications = db.getJobApplications(req.params.jobId);
    res.json(applications);
});

// Update application status (admin only)
app.patch('/api/applications/:id/status', authenticateToken, authorizeAdmin, (req, res) => {
    const { status } = req.body;
    
    if (!['pending', 'reviewing', 'accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    const application = db.updateApplicationStatus(req.params.id, status);
    if (!application) {
        return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json(application);
});

// ============================================================================
// SAVED JOBS ROUTES
// ============================================================================

// Save job
app.post('/api/saved-jobs/:jobId', authenticateToken, (req, res) => {
    const job = db.getJob(req.params.jobId);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    db.saveJob(req.user.userId, req.params.jobId);
    res.json({ message: 'Job saved successfully' });
});

// Unsave job
app.delete('/api/saved-jobs/:jobId', authenticateToken, (req, res) => {
    db.unsaveJob(req.user.userId, req.params.jobId);
    res.json({ message: 'Job unsaved successfully' });
});

// Get saved jobs
app.get('/api/saved-jobs', authenticateToken, (req, res) => {
    const savedJobs = db.getSavedJobs(req.user.userId);
    res.json(savedJobs);
});

// ============================================================================
// COMPANY ROUTES
// ============================================================================

// Get all companies
app.get('/api/companies', (req, res) => {
    const companies = db.getAllCompanies();
    res.json(companies);
});

// Get single company
app.get('/api/companies/:id', (req, res) => {
    const company = db.getCompany(req.params.id);
    if (!company) {
        return res.status(404).json({ error: 'Company not found' });
    }
    res.json(company);
});

// Get company's jobs
app.get('/api/companies/:id/jobs', (req, res) => {
    const result = db.getAllJobs({ companyId: req.params.id });
    res.json(result);
});

// ============================================================================
// ANALYTICS ROUTES (Admin only)
// ============================================================================

app.get('/api/analytics/overview', authenticateToken, authorizeAdmin, (req, res) => {
    const totalJobs = db.jobs.size;
    const totalApplications = db.applications.size;
    const totalUsers = db.users.size;
    const totalCompanies = db.companies.size;
    
    const jobsByCategory = {};
    db.jobs.forEach(job => {
        jobsByCategory[job.category] = (jobsByCategory[job.category] || 0) + 1;
    });
    
    const applicationsByStatus = {};
    db.applications.forEach(app => {
        applicationsByStatus[app.status] = (applicationsByStatus[app.status] || 0) + 1;
    });
    
    res.json({
        totalJobs,
        totalApplications,
        totalUsers,
        totalCompanies,
        jobsByCategory,
        applicationsByStatus,
        averageApplicationsPerJob: totalApplications / totalJobs || 0
    });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
    console.log(`🚀 JobHunt API Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app; // For testing
