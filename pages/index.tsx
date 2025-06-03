import React from 'react';
import styles from '../styles/Home.module.css';

const Home: React.FC = () => {
    return (
        <div className={styles.container}>
            <h1>Welcome to My Next.js App</h1>
            <p>This is the homepage of your Next.js application.</p>
        </div>
    );
};

export default Home;