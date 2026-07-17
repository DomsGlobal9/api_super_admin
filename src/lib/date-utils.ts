export function getDateBoundaries(tzOffsetMinutes?: number) {
  const now = new Date();
  
  if (typeof tzOffsetMinutes !== 'number' || isNaN(tzOffsetMinutes)) {
    return {
      todayStart: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      monthStart: new Date(now.getFullYear(), now.getMonth(), 1)
    };
  }

  // Calculate the local time representation in UTC
  const clientLocalTimeUtc = new Date(now.getTime() - tzOffsetMinutes * 60000);
  
  // Get midnight in that local representation
  const clientMidnightUtc = new Date(Date.UTC(
    clientLocalTimeUtc.getUTCFullYear(),
    clientLocalTimeUtc.getUTCMonth(),
    clientLocalTimeUtc.getUTCDate(),
    0, 0, 0, 0
  ));
  
  const clientMonthStartUtc = new Date(Date.UTC(
    clientLocalTimeUtc.getUTCFullYear(),
    clientLocalTimeUtc.getUTCMonth(),
    1,
    0, 0, 0, 0
  ));

  // Convert these midnights back to actual UTC absolute time
  const todayStart = new Date(clientMidnightUtc.getTime() + tzOffsetMinutes * 60000);
  const monthStart = new Date(clientMonthStartUtc.getTime() + tzOffsetMinutes * 60000);

  return { todayStart, monthStart, now };
}

export function getSpecificDateBoundaries(dateString: string, tzOffsetMinutes?: number) {
  const [year, month, day] = dateString.split('-').map(Number);
  
  if (typeof tzOffsetMinutes !== 'number' || isNaN(tzOffsetMinutes)) {
    const specificStart = new Date(year, month - 1, day);
    const specificEnd = new Date(year, month - 1, day + 1);
    return { specificStart, specificEnd };
  }

  const clientMidnightUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const clientNextMidnightUtc = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
  
  const specificStart = new Date(clientMidnightUtc.getTime() + tzOffsetMinutes * 60000);
  const specificEnd = new Date(clientNextMidnightUtc.getTime() + tzOffsetMinutes * 60000);
  
  return { specificStart, specificEnd };
}
