import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import styles from '../styles/Home.module.css';
import { supabase } from '../lib/supabaseClient';

const Home: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);

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

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({ provider: 'github' });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className={styles.container}>
            <h1>Welcome to My Next.js App</h1>
            <p>This is the homepage of your Next.js application.</p>
            {user ? (
                <>
                    <p>Logged in as: {user.email}</p>
                    <button onClick={handleLogout}>Logout</button>
                </>
            ) : (
                <button onClick={handleLogin}>Login with GitHub</button>
            )}
        </div>
    );
};

export default Home;