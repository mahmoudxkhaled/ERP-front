export interface ProfileOverview {
    fullName: string;
    role: string;
    avatarUrl: string;
}

export interface PasswordChangePayload {
    oldPassword: string;
    newPassword: string;
}

