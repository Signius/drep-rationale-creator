import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import styles from '../styles/Home.module.css';
import { supabase } from '../lib/supabaseClient';

const Home: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [org, setOrg] = useState('');
    const [repo, setRepo] = useState('');
    const [loadingPrefs, setLoadingPrefs] = useState(false);
    const [savingPrefs, setSavingPrefs] = useState(false);
    const [prefsSaved, setPrefsSaved] = useState(false);

    const [rationale, setRationale] = useState('');
    const [commitStatus, setCommitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [commitError, setCommitError] = useState('');

    // Example proposal info (replace with real selection logic later)
    const [year, setYear] = useState('2025');
    const [proposalName, setProposalName] = useState('example_proposal_1234');

    useEffect(() => {
        const session = supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    // Load org/repo preferences when user logs in
    useEffect(() => {
        if (!user) {
            setOrg('');
            setRepo('');
            return;
        }
        setLoadingPrefs(true);
        supabase
            .from('user_settings')
            .select('org,repo')
            .eq('user_id', user.id)
            .single()
            .then(({ data, error }) => {
                if (data) {
                    setOrg(data.org || '');
                    setRepo(data.repo || '');
                }
                setLoadingPrefs(false);
            });
    }, [user]);

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({ provider: 'github' });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleSavePrefs = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSavingPrefs(true);
        setPrefsSaved(false);
        const { error } = await supabase
            .from('user_settings')
            .upsert({ user_id: user.id, org, repo }, { onConflict: 'user_id' });
        setSavingPrefs(false);
        setPrefsSaved(!error);
    };

    const handleRationaleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCommitStatus('submitting');
        setCommitError('');
        try {
            const res = await fetch('/api/commit-rationale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    org,
                    repo,
                    year,
                    proposalName,
                    rationale,
                }),
            });
            if (res.ok) {
                setCommitStatus('success');
                setRationale('');
            } else {
                const data = await res.json();
                setCommitStatus('error');
                setCommitError(data.error || 'Unknown error');
            }
        } catch (err: any) {
            setCommitStatus('error');
            setCommitError(err.message || 'Unknown error');
        }
    };

    return (
        <div className={styles.container}>
            <h1>Welcome to My Next.js App</h1>
            <p>This is the homepage of your Next.js application.</p>
            {user ? (
                <>
                    <p>Logged in as: {user.email}</p>
                    <form onSubmit={handleSavePrefs} style={{ marginBottom: 16 }}>
                        <label>
                            Organization:
                            <input value={org} onChange={e => setOrg(e.target.value)} disabled={loadingPrefs || savingPrefs} required style={{ marginLeft: 8 }} />
                        </label>
                        <br />
                        <label>
                            Repository:
                            <input value={repo} onChange={e => setRepo(e.target.value)} disabled={loadingPrefs || savingPrefs} required style={{ marginLeft: 8 }} />
                        </label>
                        <br />
                        <button type="submit" disabled={loadingPrefs || savingPrefs} style={{ marginTop: 8 }}>
                            {savingPrefs ? 'Saving...' : 'Save Preferences'}
                        </button>
                        {prefsSaved && <span style={{ color: 'green', marginLeft: 8 }}>Saved!</span>}
                    </form>
                    <form onSubmit={handleRationaleSubmit} style={{ marginBottom: 16 }}>
                        <h3>Submit Vote Rationale</h3>
                        <label>
                            Year:
                            <input value={year} onChange={e => setYear(e.target.value)} required style={{ marginLeft: 8 }} />
                        </label>
                        <br />
                        <label>
                            Proposal Name:
                            <input value={proposalName} onChange={e => setProposalName(e.target.value)} required style={{ marginLeft: 8 }} />
                        </label>
                        <br />
                        <label>
                            Rationale:
                            <textarea value={rationale} onChange={e => setRationale(e.target.value)} required style={{ marginLeft: 8, width: 300, height: 100 }} />
                        </label>
                        <br />
                        <button type="submit" disabled={commitStatus === 'submitting'} style={{ marginTop: 8 }}>
                            {commitStatus === 'submitting' ? 'Submitting...' : 'Submit Rationale'}
                        </button>
                        {commitStatus === 'success' && <span style={{ color: 'green', marginLeft: 8 }}>Committed!</span>}
                        {commitStatus === 'error' && <span style={{ color: 'red', marginLeft: 8 }}>Error: {commitError}</span>}
                    </form>
                    <button onClick={handleLogout}>Logout</button>
                </>
            ) : (
                <button onClick={handleLogin}>Login with GitHub</button>
            )}
        </div>
    );
};

export default Home;