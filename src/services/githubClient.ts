export async function checkGithubCommitsToday(username: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/proxy/github/${username}`);
    if (!res.ok) return false;
    const events = await res.json();
    
    // Get today's date in YYYY-MM-DD
    const today = new Date().toLocaleDateString('en-CA');
    
    // Look for PushEvents today
    const hasCommitsToday = events.some((event: any) => {
      if (event.type === 'PushEvent') {
        const eventDate = new Date(event.created_at).toLocaleDateString('en-CA');
        return eventDate === today;
      }
      return false;
    });
    
    return hasCommitsToday;
  } catch (error) {
    console.error("Error fetching GitHub events:", error);
    return false;
  }
}
