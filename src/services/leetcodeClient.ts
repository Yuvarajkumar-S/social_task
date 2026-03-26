export async function checkLeetCodeSolvedToday(username: string): Promise<boolean> {
  try {
    const query = `
      query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          id
          title
          titleSlug
          timestamp
        }
      }
    `;
    const res = await fetch('/api/proxy/leetcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { username, limit: 15 }
      })
    });
    if (!res.ok) return false;
    const data = await res.json();
    const submissions = data.data?.recentAcSubmissionList || [];
    
    const today = new Date().toLocaleDateString('en-CA');
    return submissions.some((sub: any) => {
      const subDate = new Date(parseInt(sub.timestamp) * 1000).toLocaleDateString('en-CA');
      return subDate === today;
    });
  } catch (error) {
    console.error("Error fetching LeetCode submissions:", error);
    return false;
  }
}
