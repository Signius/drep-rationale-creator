import React, { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css';

interface Proposal {
    name: string;
    year: string;
}

interface ProposalData {
    action_id: string;
    title: string;
}

const owner = 'MeshJS';
const repo = 'governance';

const Home: React.FC = () => {
    const [pendingProposals, setPendingProposals] = useState<Proposal[]>([]);
    const [proposalsData, setProposalsData] = useState<ProposalData[]>([]);
    const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
    const [rationale, setRationale] = useState('');
    const [commitStatus, setCommitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [commitError, setCommitError] = useState('');
    const [loading, setLoading] = useState(true);
    const [repo, setRepo] = useState('governance');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch available years
                const yearsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/vote-context`;
                const yearsRes = await fetch(yearsUrl);
                if (!yearsRes.ok) throw new Error('Error fetching available years');
                const yearsData = await yearsRes.json();
                const years = yearsData
                    .filter((item: any) => item.type === 'dir' && /^\d{4}$/.test(item.name) && parseInt(item.name) >= 2025)
                    .map((item: any) => item.name)
                    .sort((a: string, b: string) => parseInt(b) - parseInt(a));

                // 2. Fetch proposals.json
                const proposalsUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/vote-context/proposals.json`;
                const proposalsRes = await fetch(proposalsUrl);
                if (!proposalsRes.ok) throw new Error('Error fetching proposals.json');
                const proposalsJson = await proposalsRes.json();
                setProposalsData(proposalsJson);

                // 3. Fetch all voted suffixes
                const votedSuffixes = new Set<string>();
                for (const year of years) {
                    const votingHistoryUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/voting-history/${year}/${year}-votes.md`;
                    const votingHistoryRes = await fetch(votingHistoryUrl);
                    if (votingHistoryRes.ok) {
                        const votingHistoryText = await votingHistoryRes.text();
                        extractActionIDSuffixes(votingHistoryText).forEach(suffix => votedSuffixes.add(suffix));
                    }
                }

                // 4. Fetch all pending proposals from all years
                const allPendingProposals: Proposal[] = [];
                for (const year of years) {
                    const voteContextUrl = `https://api.github.com/repos/${owner}/${repo}/contents/vote-context/${year}`;
                    const voteContextRes = await fetch(voteContextUrl);
                    if (voteContextRes.ok) {
                        const voteContextData = await voteContextRes.json();
                        const yearPendingProposals = voteContextData.filter((item: any) => {
                            if (item.type !== 'dir') return false;
                            const parts = item.name.split('_');
                            if (parts.length < 2) return false;
                            const suffix = parts[1];
                            return !votedSuffixes.has(suffix);
                        }).map((item: any) => ({ name: item.name, year }));
                        allPendingProposals.push(...yearPendingProposals);
                    }
                }
                setPendingProposals(allPendingProposals);
            } catch (err) {
                setPendingProposals([]);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    function extractActionIDSuffixes(markdown: string): string[] {
        const suffixes: string[] = [];
        const lines = markdown.split('\n');
        lines.forEach(line => {
            if (line.includes('Action ID')) {
                const parts = line.split('|').map(part => part.trim());
                if (parts.length >= 3 && parts[1] === 'Action ID') {
                    const actionId = parts[2];
                    const suffix = actionId.slice(-4);
                    suffixes.push(suffix);
                }
            }
        });
        return suffixes;
    }

    const handleRationaleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProposal) return;
        setCommitStatus('submitting');
        setCommitError('');
        try {
            const res = await fetch('/api/commit-rationale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    org: owner,
                    repo,
                    year: selectedProposal.year,
                    proposalName: selectedProposal.name,
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
            <h1>Proposals Pending Vote</h1>
            {loading ? (
                <p>Loading proposals...</p>
            ) : pendingProposals.length === 0 ? (
                <p>No pending proposals from 2025 or later. All recent proposals have been voted on!</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', padding: '20px' }}>
                    {pendingProposals.map(proposal => {
                        const proposalData = proposalsData.find(p => p.action_id.includes(proposal.name.split('_')[1]));
                        return (
                            <div key={proposal.year + proposal.name} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                <span style={{ backgroundColor: '#e1e4e8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8em', color: '#24292e', marginBottom: '10px', display: 'inline-block' }}>{proposal.year}</span>
                                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1em', color: '#333' }}>{proposalData ? proposalData.title : 'Untitled Proposal'}</h3>
                                <button onClick={() => setSelectedProposal(proposal)} style={{ padding: '8px 12px', backgroundColor: '#0366d6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: 8 }}>
                                    Enter Vote Rationale
                                </button>
                                <button onClick={() => navigator.clipboard.writeText(`https://raw.githubusercontent.com/${owner}/${repo}/main/vote-context/${proposal.year}/${proposal.name}/Vote_Context.jsonId`)} style={{ padding: '8px 12px', backgroundColor: '#f6f8fa', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>
                                    Copy raw GitHub path URL
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
            {selectedProposal && (
                <form onSubmit={handleRationaleSubmit} style={{ marginTop: 32, marginBottom: 16 }}>
                    <h3>Submit Vote Rationale for {selectedProposal.year} / {selectedProposal.name}</h3>
                    <label>
                        Repository:
                        <input value={repo} onChange={e => setRepo(e.target.value)} required style={{ marginLeft: 8 }} />
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
            )}
        </div>
    );
};

export default Home;