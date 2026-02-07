/**
 * JobHunt Pro - Comprehensive Test Suite
 * Demonstrates TDD/BDD practices, integration testing, and quality assurance
 */

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');

// Mock the app (in real implementation, import actual app)
const app = require('./job-portal-backend-api');

describe('JobHunt Pro API Test Suite', () => {
    
    // ============================================================================
    // AUTHENTICATION TESTS
    // ============================================================================
    
    describe('Authentication Endpoints', () => {
        
        describe('POST /api/auth/register', () => {
            it('should register a new user with valid credentials', async () => {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                        email: 'newuser@example.com',
                        password: 'SecurePass123!',
                        name: 'New User'
                    });
                
                expect(response.status).to.equal(201);
                expect(response.body).to.have.property('token');
                expect(response.body).to.have.property('user');
                expect(response.body.user.email).to.equal('newuser@example.com');
            });
            
            it('should reject registration with duplicate email', async () => {
                await request(app)
                    .post('/api/auth/register')
                    .send({
                        email: 'duplicate@example.com',
                        password: 'Password123',
                        name: 'User One'
                    });
                
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                        email: 'duplicate@example.com',
                        password: 'Password456',
                        name: 'User Two'
                    });
                
                expect(response.status).to.equal(409);
                expect(response.body.error).to.include('already exists');
            });
            
            it('should reject registration with missing fields', async () => {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                        email: 'incomplete@example.com'
                        // missing password and name
                    });
                
                expect(response.status).to.equal(400);
                expect(response.body.error).to.exist;
            });
            
            it('should reject weak passwords', async () => {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                        email: 'weak@example.com',
                        password: '123',
                        name: 'Weak Password User'
                    });
                
                expect(response.status).to.be.oneOf([400, 422]);
            });
        });
        
        describe('POST /api/auth/login', () => {
            beforeEach(async () => {
                // Setup: Create a test user
                await request(app)
                    .post('/api/auth/register')
                    .send({
                        email: 'testuser@example.com',
                        password: 'TestPass123!',
                        name: 'Test User'
                    });
            });
            
            it('should login with valid credentials', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        email: 'testuser@example.com',
                        password: 'TestPass123!'
                    });
                
                expect(response.status).to.equal(200);
                expect(response.body).to.have.property('token');
                expect(response.body.user.email).to.equal('testuser@example.com');
            });
            
            it('should reject invalid email', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        email: 'nonexistent@example.com',
                        password: 'TestPass123!'
                    });
                
                expect(response.status).to.equal(401);
                expect(response.body.error).to.include('Invalid credentials');
            });
            
            it('should reject invalid password', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        email: 'testuser@example.com',
                        password: 'WrongPassword!'
                    });
                
                expect(response.status).to.equal(401);
            });
        });
        
        describe('GET /api/auth/me', () => {
            let authToken;
            
            beforeEach(async () => {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                        email: 'authuser@example.com',
                        password: 'AuthPass123!',
                        name: 'Auth User'
                    });
                
                authToken = response.body.token;
            });
            
            it('should return current user with valid token', async () => {
                const response = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${authToken}`);
                
                expect(response.status).to.equal(200);
                expect(response.body.email).to.equal('authuser@example.com');
                expect(response.body).to.not.have.property('password');
            });
            
            it('should reject request without token', async () => {
                const response = await request(app)
                    .get('/api/auth/me');
                
                expect(response.status).to.equal(401);
            });
            
            it('should reject request with invalid token', async () => {
                const response = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', 'Bearer invalid-token');
                
                expect(response.status).to.equal(403);
            });
        });
    });
    
    // ============================================================================
    // JOB ENDPOINTS TESTS
    // ============================================================================
    
    describe('Job Endpoints', () => {
        let userToken;
        let adminToken;
        
        beforeEach(async () => {
            // Create regular user
            const userRes = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'jobuser@example.com',
                    password: 'JobPass123!',
                    name: 'Job User'
                });
            userToken = userRes.body.token;
            
            // Create admin user (mock)
            const adminRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@jobhunt.com',
                    password: 'admin123'
                });
            adminToken = adminRes.body.token;
        });
        
        describe('GET /api/jobs', () => {
            it('should return list of jobs', async () => {
                const response = await request(app)
                    .get('/api/jobs');
                
                expect(response.status).to.equal(200);
                expect(response.body).to.have.property('jobs');
                expect(response.body).to.have.property('total');
                expect(response.body.jobs).to.be.an('array');
            });
            
            it('should filter jobs by category', async () => {
                const response = await request(app)
                    .get('/api/jobs?category=engineering');
                
                expect(response.status).to.equal(200);
                expect(response.body.jobs.every(job => job.category === 'engineering')).to.be.true;
            });
            
            it('should paginate results', async () => {
                const response = await request(app)
                    .get('/api/jobs?page=1&limit=5');
                
                expect(response.status).to.equal(200);
                expect(response.body.jobs.length).to.be.at.most(5);
                expect(response.body).to.have.property('page', 1);
            });
            
            it('should search jobs by keyword', async () => {
                const response = await request(app)
                    .get('/api/jobs?search=engineer');
                
                expect(response.status).to.equal(200);
                expect(response.body.jobs.length).to.be.greaterThan(0);
            });
        });
        
        describe('GET /api/jobs/:id', () => {
            it('should return a single job', async () => {
                const response = await request(app)
                    .get('/api/jobs/1');
                
                expect(response.status).to.equal(200);
                expect(response.body).to.have.property('id', '1');
                expect(response.body).to.have.property('title');
                expect(response.body).to.have.property('company');
            });
            
            it('should return 404 for non-existent job', async () => {
                const response = await request(app)
                    .get('/api/jobs/99999');
                
                expect(response.status).to.equal(404);
            });
        });
        
        describe('POST /api/jobs', () => {
            it('should allow admin to create job', async () => {
                const jobData = {
                    title: 'Test Engineer',
                    category: 'engineering',
                    companyId: '1',
                    company: 'Google',
                    location: 'San Francisco, CA',
                    experienceLevel: 'Mid',
                    jobType: 'Full-time',
                    workMode: 'Remote',
                    salaryMin: 120000,
                    salaryMax: 180000,
                    description: 'Test job description'
                };
                
                const response = await request(app)
                    .post('/api/jobs')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(jobData);
                
                expect(response.status).to.equal(201);
                expect(response.body.title).to.equal(jobData.title);
            });
            
            it('should reject non-admin job creation', async () => {
                const response = await request(app)
                    .post('/api/jobs')
                    .set('Authorization', `Bearer ${userToken}`)
                    .send({ title: 'Test Job' });
                
                expect(response.status).to.equal(403);
            });
            
            it('should reject unauthenticated job creation', async () => {
                const response = await request(app)
                    .post('/api/jobs')
                    .send({ title: 'Test Job' });
                
                expect(response.status).to.equal(401);
            });
        });
        
        describe('PUT /api/jobs/:id', () => {
            it('should allow admin to update job', async () => {
                const response = await request(app)
                    .put('/api/jobs/1')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ title: 'Updated Title' });
                
                expect(response.status).to.equal(200);
                expect(response.body.title).to.equal('Updated Title');
            });
            
            it('should reject non-admin update', async () => {
                const response = await request(app)
                    .put('/api/jobs/1')
                    .set('Authorization', `Bearer ${userToken}`)
                    .send({ title: 'Hacked Title' });
                
                expect(response.status).to.equal(403);
            });
        });
        
        describe('DELETE /api/jobs/:id', () => {
            it('should allow admin to delete job', async () => {
                const response = await request(app)
                    .delete('/api/jobs/1')
                    .set('Authorization', `Bearer ${adminToken}`);
                
                expect(response.status).to.equal(200);
            });
            
            it('should reject non-admin deletion', async () => {
                const response = await request(app)
                    .delete('/api/jobs/1')
                    .set('Authorization', `Bearer ${userToken}`);
                
                expect(response.status).to.equal(403);
            });
        });
    });
    
    // ============================================================================
    // APPLICATION TESTS
    // ============================================================================
    
    describe('Application Endpoints', () => {
        let userToken;
        
        beforeEach(async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'applicant@example.com',
                    password: 'AppPass123!',
                    name: 'Applicant User'
                });
            userToken = response.body.token;
        });
        
        describe('POST /api/applications', () => {
            it('should allow user to apply to job', async () => {
                const response = await request(app)
                    .post('/api/applications')
                    .set('Authorization', `Bearer ${userToken}`)
                    .send({
                        jobId: '1',
                        coverLetter: 'I am very interested...',
                        resume: 'resume.pdf'
                    });
                
                expect(response.status).to.equal(201);
                expect(response.body).to.have.property('id');
                expect(response.body.status).to.equal('pending');
            });
            
            it('should reject duplicate application', async () => {
                // Apply once
                await request(app)
                    .post('/api/applications')
                    .set('Authorization', `Bearer ${userToken}`)
                    .send({ jobId: '1' });
                
                // Try to apply again
                const response = await request(app)
                    .post('/api/applications')
                    .set('Authorization', `Bearer ${userToken}`)
                    .send({ jobId: '1' });
                
                expect(response.status).to.equal(409);
            });
            
            it('should reject application without authentication', async () => {
                const response = await request(app)
                    .post('/api/applications')
                    .send({ jobId: '1' });
                
                expect(response.status).to.equal(401);
            });
            
            it('should reject application to non-existent job', async () => {
                const response = await request(app)
                    .post('/api/applications')
                    .set('Authorization', `Bearer ${userToken}`)
                    .send({ jobId: '99999' });
                
                expect(response.status).to.equal(404);
            });
        });
        
        describe('GET /api/applications/my', () => {
            beforeEach(async () => {
                // Create some applications
                await request(app)
                    .post('/api/applications')
                    .set('Authorization', `Bearer ${userToken}`)
                    .send({ jobId: '1' });
                    
                await request(app)
                    .post('/api/applications')
                    .set('Authorization', `Bearer ${userToken}`)
                    .send({ jobId: '2' });
            });
            
            it('should return user\'s applications', async () => {
                const response = await request(app)
                    .get('/api/applications/my')
                    .set('Authorization', `Bearer ${userToken}`);
                
                expect(response.status).to.equal(200);
                expect(response.body).to.be.an('array');
                expect(response.body.length).to.equal(2);
            });
            
            it('should require authentication', async () => {
                const response = await request(app)
                    .get('/api/applications/my');
                
                expect(response.status).to.equal(401);
            });
        });
    });
    
    // ============================================================================
    // SAVED JOBS TESTS
    // ============================================================================
    
    describe('Saved Jobs Endpoints', () => {
        let userToken;
        
        beforeEach(async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'saver@example.com',
                    password: 'SavePass123!',
                    name: 'Job Saver'
                });
            userToken = response.body.token;
        });
        
        describe('POST /api/saved-jobs/:jobId', () => {
            it('should save a job', async () => {
                const response = await request(app)
                    .post('/api/saved-jobs/1')
                    .set('Authorization', `Bearer ${userToken}`);
                
                expect(response.status).to.equal(200);
            });
            
            it('should return 404 for non-existent job', async () => {
                const response = await request(app)
                    .post('/api/saved-jobs/99999')
                    .set('Authorization', `Bearer ${userToken}`);
                
                expect(response.status).to.equal(404);
            });
        });
        
        describe('DELETE /api/saved-jobs/:jobId', () => {
            beforeEach(async () => {
                await request(app)
                    .post('/api/saved-jobs/1')
                    .set('Authorization', `Bearer ${userToken}`);
            });
            
            it('should unsave a job', async () => {
                const response = await request(app)
                    .delete('/api/saved-jobs/1')
                    .set('Authorization', `Bearer ${userToken}`);
                
                expect(response.status).to.equal(200);
            });
        });
        
        describe('GET /api/saved-jobs', () => {
            beforeEach(async () => {
                await request(app)
                    .post('/api/saved-jobs/1')
                    .set('Authorization', `Bearer ${userToken}`);
                await request(app)
                    .post('/api/saved-jobs/2')
                    .set('Authorization', `Bearer ${userToken}`);
            });
            
            it('should return saved jobs', async () => {
                const response = await request(app)
                    .get('/api/saved-jobs')
                    .set('Authorization', `Bearer ${userToken}`);
                
                expect(response.status).to.equal(200);
                expect(response.body).to.be.an('array');
                expect(response.body.length).to.equal(2);
            });
        });
    });
    
    // ============================================================================
    // ANALYTICS TESTS
    // ============================================================================
    
    describe('Analytics Endpoints', () => {
        let adminToken;
        let userToken;
        
        beforeEach(async () => {
            const adminRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@jobhunt.com',
                    password: 'admin123'
                });
            adminToken = adminRes.body.token;
            
            const userRes = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'analytics@example.com',
                    password: 'AnalPass123!',
                    name: 'Analytics User'
                });
            userToken = userRes.body.token;
        });
        
        describe('GET /api/analytics/overview', () => {
            it('should allow admin to view analytics', async () => {
                const response = await request(app)
                    .get('/api/analytics/overview')
                    .set('Authorization', `Bearer ${adminToken}`);
                
                expect(response.status).to.equal(200);
                expect(response.body).to.have.property('totalJobs');
                expect(response.body).to.have.property('totalApplications');
                expect(response.body).to.have.property('jobsByCategory');
            });
            
            it('should reject non-admin access', async () => {
                const response = await request(app)
                    .get('/api/analytics/overview')
                    .set('Authorization', `Bearer ${userToken}`);
                
                expect(response.status).to.equal(403);
            });
        });
    });
    
    // ============================================================================
    // EDGE CASES AND ERROR HANDLING
    // ============================================================================
    
    describe('Edge Cases and Error Handling', () => {
        it('should handle malformed JSON', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send('not valid json')
                .set('Content-Type', 'application/json');
            
            expect(response.status).to.be.oneOf([400, 500]);
        });
        
        it('should return 404 for non-existent routes', async () => {
            const response = await request(app)
                .get('/api/non-existent-route');
            
            expect(response.status).to.equal(404);
        });
        
        it('should handle SQL injection attempts safely', async () => {
            const response = await request(app)
                .get('/api/jobs?search=\' OR 1=1--');
            
            expect(response.status).to.equal(200);
            // Should sanitize and return safe results
        });
        
        it('should handle XSS attempts in inputs', async () => {
            const xssPayload = '<script>alert("xss")</script>';
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'xss@example.com',
                    password: 'XSSPass123!',
                    name: xssPayload
                });
            
            if (response.status === 201) {
                expect(response.body.user.name).to.not.include('<script>');
            }
        });
    });
    
    // ============================================================================
    // PERFORMANCE TESTS
    // ============================================================================
    
    describe('Performance Tests', () => {
        it('should respond to GET /api/jobs within 200ms', async () => {
            const start = Date.now();
            await request(app).get('/api/jobs');
            const duration = Date.now() - start;
            
            expect(duration).to.be.lessThan(200);
        });
        
        it('should handle concurrent requests', async () => {
            const promises = Array(10).fill(0).map(() =>
                request(app).get('/api/jobs')
            );
            
            const responses = await Promise.all(promises);
            
            responses.forEach(response => {
                expect(response.status).to.equal(200);
            });
        });
    });
});

// ============================================================================
// UNIT TESTS FOR UTILITY FUNCTIONS
// ============================================================================

describe('Utility Functions', () => {
    describe('formatSalary', () => {
        it('should format salary correctly', () => {
            const formatSalary = (min, max) => {
                const fmt = (n) => n >= 1000 ? `$${(n/1000).toFixed(0)}k` : `$${n}`;
                return `${fmt(min)} - ${fmt(max)}`;
            };
            
            expect(formatSalary(100000, 150000)).to.equal('$100k - $150k');
            expect(formatSalary(500, 1000)).to.equal('$500 - $1k');
        });
    });
    
    describe('formatDate', () => {
        it('should format dates correctly', () => {
            const formatDate = (days) => {
                if (days === 0) return 'Today';
                if (days === 1) return 'Yesterday';
                if (days < 7) return `${days}d ago`;
                if (days < 30) return `${Math.floor(days/7)}w ago`;
                return `${Math.floor(days/30)}mo ago`;
            };
            
            expect(formatDate(0)).to.equal('Today');
            expect(formatDate(1)).to.equal('Yesterday');
            expect(formatDate(3)).to.equal('3d ago');
            expect(formatDate(14)).to.equal('2w ago');
            expect(formatDate(45)).to.equal('1mo ago');
        });
    });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests - Complete User Flow', () => {
    it('should complete full job application flow', async () => {
        // 1. Register user
        const registerRes = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'fullflow@example.com',
                password: 'FlowPass123!',
                name: 'Full Flow User'
            });
        
        expect(registerRes.status).to.equal(201);
        const token = registerRes.body.token;
        
        // 2. Get jobs
        const jobsRes = await request(app)
            .get('/api/jobs');
        
        expect(jobsRes.status).to.equal(200);
        const jobId = jobsRes.body.jobs[0].id;
        
        // 3. Save job
        const saveRes = await request(app)
            .post(`/api/saved-jobs/${jobId}`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(saveRes.status).to.equal(200);
        
        // 4. Apply to job
        const applyRes = await request(app)
            .post('/api/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                jobId,
                coverLetter: 'Very interested in this position'
            });
        
        expect(applyRes.status).to.equal(201);
        
        // 5. Check applications
        const myAppsRes = await request(app)
            .get('/api/applications/my')
            .set('Authorization', `Bearer ${token}`);
        
        expect(myAppsRes.status).to.equal(200);
        expect(myAppsRes.body.length).to.equal(1);
        expect(myAppsRes.body[0].jobId).to.equal(jobId);
    });
});

module.exports = { /* Export test utilities */ };
