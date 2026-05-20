// This is a Vercel Serverless Function that acts as a secure bridge.
// It receives a request from the frontend and triggers the GitHub Actions workflow.

export default async function handler(request, response) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { scrape_url } = request.body;

  if (!scrape_url) {
    return response.status(400).json({ message: 'scrape_url is required' });
  }

  // These values should be configured in your Vercel project's Environment Variables
  const GITHUB_TOKEN = process.env.GITHUB_PAT;
  const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER;
  const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
  const WORKFLOW_FILE_NAME = 'scrape.yml'; // The name of your workflow file

  // Add logging to debug environment variables
  console.log('--- Trigger Scrape Function ---');
  console.log('GITHUB_REPO_OWNER:', GITHUB_REPO_OWNER);
  console.log('GITHUB_REPO_NAME:', GITHUB_REPO_NAME);
  console.log('GITHUB_PAT is set:', !!GITHUB_TOKEN);
  console.log('-----------------------------');

  if (!GITHUB_TOKEN || !GITHUB_REPO_OWNER || !GITHUB_REPO_NAME) {
    const errorMessage = 'Server configuration error: Missing required environment variables (GITHUB_PAT, GITHUB_REPO_OWNER, GITHUB_REPO_NAME). Please set these in your Vercel project settings.';
    console.error(errorMessage);
    return response.status(500).json({ message: errorMessage });
  }

  const githubApiUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/actions/workflows/${WORKFLOW_FILE_NAME}/dispatches`;

  try {
    const dispatchResponse = await fetch(githubApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        ref: 'main', // Or your default branch
        inputs: {
          scrape_url: scrape_url,
        },
      }),
    });

    if (!dispatchResponse.ok) {
      const errorBody = await dispatchResponse.text();
      console.error(`GitHub API Error: ${dispatchResponse.status}`, errorBody);
      throw new Error(`GitHub API responded with ${dispatchResponse.status}. Check function logs on Vercel for details.`);
    }

    return response.status(202).json({ message: 'Workflow triggered successfully!' });
  } catch (error) {
    console.error('Error triggering GitHub workflow:', error);
    return response.status(500).json({ message: 'Failed to trigger workflow', error: error.message });
  }
}