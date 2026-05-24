export interface PotentialJudge {
    id: number;
    full_name: string | null;
    email: string;
    username: string;
}

export interface JudgeLinkEntry {
    id: number;
    type: 'link';
    user_id: number;
    user_email: string;
    user_name: string;
    status: 'active' | 'expired' | 'used';
    expires_at: string;
    created_at: string;
    token: string;
}

export interface JudgeInvitationEntry {
    id: number;
    type: 'invitation';
    invited_email: string;
    invited_name: string;
    status: 'pending' | 'claimed' | 'expired';
    expires_at: string;
    claimed_at: string | null;
    created_at: string;
    token: string;
}

export type JudgeEntry = JudgeLinkEntry | JudgeInvitationEntry;

export interface AllJudgesResponse {
    invitations: JudgeInvitationEntry[];
    links: JudgeLinkEntry[];
    total_count: number;
}
