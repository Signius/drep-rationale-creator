import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// You may want to move these to env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { org, repo, year, proposalName, rationale } = req.body;

    // Get the user from the JWT
    const accessToken = req.headers['authorization']?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Instead of fetching the GitHub token from Supabase, get it from an environment variable
    const githubToken = process.env.GITHUB_PAT_TOKEN;
    if (!githubToken) {
        return res.status(500).json({ error: 'GitHub Personal Access Token not configured on server.' });
    }

    // Prepare the file path and content
    const filePath = `vote-context/${year}/${proposalName}/Vote_Context.jsonId`;
    const content = Buffer.from(rationale, 'utf-8').toString('base64');
    const commitMessage = `Add rationale for ${proposalName} (${year})`;

    // Check if file exists to get the sha (required for update)
    let sha: string | undefined = undefined;
    try {
        const getRes = await fetch(`https://api.github.com/repos/${org}/${repo}/contents/${filePath}`, {
            headers: { Authorization: `token ${githubToken}` },
        });
        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        }
    } catch (e) { }

    // Create or update the file
    const githubRes = await fetch(`https://api.github.com/repos/${org}/${repo}/contents/${filePath}`,
        {
            method: 'PUT',
            headers: {
                Authorization: `token ${githubToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: commitMessage,
                content,
                sha,
            }),
        }
    );

    if (!githubRes.ok) {
        const error = await githubRes.json();
        return res.status(400).json({ error: error.message || 'GitHub commit failed.' });
    }

    return res.status(200).json({ success: true });
}
