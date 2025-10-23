import { Injectable } from '@angular/core';
import { ApiResult } from '../Dtos/ApiResult';

export interface MockUser {
    userId: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'employee' | 'supervisor' | 'company-admin' | 'system-admin';
    permissions: string[];
    theme: 'light' | 'dark';
    isEmailConfirmed: boolean;
    tenantId: string;
    department?: string;
    jobTitle?: string;
}

@Injectable({
    providedIn: 'root'
})
export class MockDataService {

    // Mock users with different business roles and permissions
    private mockUsers: MockUser[] = [
        {
            userId: 'system-admin-001',
            email: 'system.admin@iaware.com',
            password: 'SystemAdmin@123',
            firstName: 'System',
            lastName: 'Administrator',
            role: 'system-admin',
            permissions: [
                'Users', 'TenantGroups', 'TenantUnit', 'PointingSystem', 'Role',
                'TenantSettings', 'Badge', 'Campaign', 'CampaignManagement',
                'EmailDomains', 'Languages', 'NotificationSettings', 'PageManagement',
                'PhishingCategory', 'PhishingEmailTemplates', 'SecurityTraining',
                'Subscription', 'SupportCategory', 'SupportSubject', 'SupportStatus',
                'iAwarePortal', 'TenantAdminPortal', 'TenantUserPortal',
                'LibraryBackground', 'LibraryCharacter', 'LibraryQuote', 'LibraryWallpaper',
                'Leaderboard', 'Gamification', 'Invoice', 'TrainingCampaigns',
                'PhishingCampaigns', 'MultimediaLibrary', 'Industry'
            ],
            theme: 'light',
            isEmailConfirmed: true,
            tenantId: 'iex',
            department: 'IT Administration',
            jobTitle: 'System Administrator'
        },
        {
            userId: 'company-admin-001',
            email: 'company.admin@company.com',
            password: 'CompanyAdmin@123',
            firstName: 'Company',
            lastName: 'Administrator',
            role: 'company-admin',
            permissions: [
                'Users', 'TenantGroups', 'TenantUnit', 'Campaign', 'CampaignManagement',
                'PhishingCategory', 'PhishingEmailTemplates', 'Leaderboard', 'Gamification',
                'Invoice', 'TrainingCampaigns', 'PhishingCampaigns', 'MultimediaLibrary',
                'TenantAdminPortal', 'TenantUserPortal', 'Badge', 'PointingSystem'
            ],
            theme: 'light',
            isEmailConfirmed: true,
            tenantId: 'company-001',
            department: 'Human Resources',
            jobTitle: 'Company Administrator'
        },
        {
            userId: 'supervisor-001',
            email: 'supervisor@company.com',
            password: 'Supervisor@123',
            firstName: 'Team',
            lastName: 'Supervisor',
            role: 'supervisor',
            permissions: [
                'Users', 'Campaign', 'Leaderboard', 'Gamification', 'TrainingCampaigns',
                'PhishingCampaigns', 'MultimediaLibrary', 'TenantUserPortal', 'Badge'
            ],
            theme: 'light',
            isEmailConfirmed: true,
            tenantId: 'company-001',
            department: 'Security Training',
            jobTitle: 'Security Training Supervisor'
        },
        {
            userId: 'employee-001',
            email: 'employee@company.com',
            password: 'Employee@123',
            firstName: 'John',
            lastName: 'Employee',
            role: 'employee',
            permissions: [
                'Campaign', 'Leaderboard', 'Gamification', 'TrainingCampaigns',
                'PhishingCampaigns', 'MultimediaLibrary', 'TenantUserPortal'
            ],
            theme: 'light',
            isEmailConfirmed: true,
            tenantId: 'company-001',
            department: 'Marketing',
            jobTitle: 'Marketing Specialist'
        },
        {
            userId: 'unconfirmed-001',
            email: 'unconfirmed@company.com',
            password: 'Unconfirmed@123',
            firstName: 'Unconfirmed',
            lastName: 'User',
            role: 'employee',
            permissions: [],
            theme: 'light',
            isEmailConfirmed: false,
            tenantId: 'company-001',
            department: 'IT',
            jobTitle: 'IT Support'
        }
    ];

    // Active sessions tracking for force logout simulation
    private activeSessions: Map<string, string[]> = new Map();

    constructor() {
        // Initialize with some active sessions for testing
        this.activeSessions.set('admin@iaware.com', ['session-1', 'session-2']);
        this.activeSessions.set('tenant@company.com', ['session-3']);
    }

    /**
     * Find user by email and password
     */
    findUserByCredentials(email: string, password: string): MockUser | null {
        return this.mockUsers.find(user =>
            user.email === email && user.password === password
        ) || null;
    }

    /**
     * Find user by email only
     */
    findUserByEmail(email: string): MockUser | null {
        return this.mockUsers.find(user => user.email === email) || null;
    }

    /**
     * Generate mock JWT token
     */
    generateMockToken(user: MockUser): string {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: user.userId,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        }));
        const signature = btoa('mock-signature');
        return `${header}.${payload}.${signature}`;
    }

    /**
     * Check if user has active sessions (for force logout simulation)
     */
    hasActiveSessions(email: string): boolean {
        const sessions = this.activeSessions.get(email) || [];
        return sessions.length > 0;
    }

    /**
     * Add active session
     */
    addActiveSession(email: string, sessionId: string): void {
        const sessions = this.activeSessions.get(email) || [];
        sessions.push(sessionId);
        this.activeSessions.set(email, sessions);
    }

    /**
     * Remove all sessions for user (force logout)
     */
    clearAllSessions(email: string): void {
        this.activeSessions.delete(email);
    }

    /**
     * Get user permissions for menu building
     */
    getUserPermissions(user: MockUser): string[] {
        return user.permissions;
    }

    /**
     * Create successful login response
     */
    createLoginResponse(user: MockUser): ApiResult {
        const token = this.generateMockToken(user);
        const expiresIn = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

        return {
            message: 'Login successful',
            isSuccess: true,
            data: {
                token: token,
                expiresIn: expiresIn,
                userId: user.userId,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                permissions: user.permissions,
                theme: user.theme,
                tenantId: user.tenantId
            },
            code: 200,
            totalRecords: 1,
            errorList: null
        };
    }

    /**
     * Create force logout response (code 800)
     */
    createForceLogoutResponse(user: MockUser): ApiResult {
        return {
            message: 'We noticed that your account is currently active in another session. Would you like to log out from the previous session and continue here?',
            isSuccess: false,
            data: {
                userId: user.userId,
                email: user.email
            },
            code: 800,
            totalRecords: 0,
            errorList: null
        };
    }

    /**
     * Create email not confirmed response
     */
    createEmailNotConfirmedResponse(): ApiResult {
        return {
            message: 'Email Not Confirmed',
            isSuccess: false,
            data: null,
            code: 400,
            totalRecords: 0,
            errorList: null
        };
    }

    /**
     * Create invalid credentials response
     */
    createInvalidCredentialsResponse(): ApiResult {
        return {
            message: 'Invalid email or password',
            isSuccess: false,
            data: null,
            code: 401,
            totalRecords: 0,
            errorList: null
        };
    }

    /**
     * Get all mock users (for debugging)
     */
    getAllUsers(): MockUser[] {
        return [...this.mockUsers];
    }

    /**
     * Get mock credentials for testing
     */
    getMockCredentials(): { email: string; password: string; role: string; department?: string; jobTitle?: string }[] {
        return this.mockUsers.map(user => ({
            email: user.email,
            password: user.password,
            role: user.role,
            department: user.department,
            jobTitle: user.jobTitle
        }));
    }
}
