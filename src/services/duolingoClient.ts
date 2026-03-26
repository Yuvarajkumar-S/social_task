export async function checkDuolingoStreakToday(username: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/proxy/duolingo/${username}`);
    if (!res.ok) return false;
    const data = await res.json();
    if (data.users && data.users.length > 0) {
      const user = data.users[0];
      const streakData = user.streakData?.currentStreak;
      if (streakData && streakData.length > 0) {
        const endDate = streakData.endDate;
        const today = new Date().toLocaleDateString('en-CA');
        return endDate >= today;
      }
    }
    return false;
  } catch (error) {
    console.error("Error fetching Duolingo data:", error);
    return false;
  }
}
