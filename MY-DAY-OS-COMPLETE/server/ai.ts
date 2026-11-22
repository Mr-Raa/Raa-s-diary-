import { GoogleGenAI, ThinkingLevel, Type, type GenerateContentResponse } from '@google/genai';
import {
  getAlarms,
  getAllRoutineOccurrences,
  getCalendarEvents,
  getDayContext,
  getFocusSessions,
  getGoals,
  getHabits,
  getNotes,
  getRoutines,
  getSettings,
  getStudySessions,
  getStudySubjects,
  getTasks,
  getTrackerEntries,
  getWorkProjects,
  getWorkSessions,
} from './db';
import { addDays, getTodayInTimezone } from '../src/utils/dateLogic';
import { buildDateRangeAnalytics, calculateHabitStreak } from '../src/utils/analyticsLogic';
import type { AiDailyPlan, AiProposedAction, DailyAffirmation } from '../src/types';

function createAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch {
    return null;
  }
}

function buildUserContextSnapshot(userId: string) {
  const settings = getSettings(userId);
  const tz = settings.timezone || 'Asia/Kolkata';
  const today = getTodayInTimezone(tz);
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const currentLocalTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

  const todayCtx = getDayContext(userId, today, today);
  const yesterdayCtx = getDayContext(userId, yesterday, today);
  const allTasks = getTasks(userId);
  const upcomingTasks = allTasks.filter((t) => t.dueDate > today && t.status !== 'Completed').slice(0, 12);
  const upcomingEvents = getCalendarEvents(userId).filter((e) => e.date >= today).slice(0, 12);
  const goals = getGoals(userId).slice(0, 8);
  const studySubjects = getStudySubjects(userId);
  const workProjects = getWorkProjects(userId);
  const recentNotes = getNotes(userId).slice(0, 6);
  const alarms = getAlarms(userId);
  const habits = getHabits(userId);
  const routines = getRoutines(userId, today);
  const weeklyTrend = buildDateRangeAnalytics({
    endDate: today,
    daysCount: 7,
    routines,
    routineOccurrences: getAllRoutineOccurrences(userId),
    tasks: allTasks,
    studySessions: getStudySessions(userId),
    workSessions: getWorkSessions(userId),
    focusSessions: getFocusSessions(userId),
    habits,
  });

  return {
    timezone: tz,
    currentLocalTime,
    languagePreference: settings.language,
    responseStyle: settings.aiResponseStyle,
    today,
    yesterday,
    tomorrow,
    allTasks,
    todaySummary: {
      productivityScore: todayCtx.productivityScore,
      waterIntake: todayCtx.waterIntake,
      routines: todayCtx.routines.map((r) => ({
        id: r.id,
        title: r.title,
        time: `${r.startTime}-${r.endTime}`,
        category: r.category,
        status: r.occurrenceStatus,
      })),
      tasks: todayCtx.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        time: t.dueTime || 'Anytime',
        priority: t.priority,
        status: t.status,
        category: t.category,
      })),
      overdueTasks: todayCtx.overdueTasks.map((t) => ({
        id: t.id,
        title: t.title,
        originalDueDate: t.dueDate,
        priority: t.priority,
        category: t.category,
      })),
      events: todayCtx.events.map((e) => ({
        title: e.title,
        time: `${e.startTime}-${e.endTime}`,
        location: e.location,
      })),
      diaryLogsToday: todayCtx.diaryLogs.map((d) => ({
        time: d.entryTime,
        title: d.title,
        activity: d.activity,
        category: d.category,
        mood: d.mood,
        energy: d.energy,
      })),
      focusMinutesToday: todayCtx.focusSessions.reduce((s, f) => s + f.actualMinutes, 0),
      healthTrackersToday: getTrackerEntries(userId, today).map((t) => ({
        tracker: t.trackerKey,
        value: `${t.valueNumber} ${t.unit}`,
        label: t.label,
        time: t.time,
      })),
    },
    yesterdaySummary: {
      productivityScore: yesterdayCtx.productivityScore,
      waterIntake: yesterdayCtx.waterIntake,
      routinesCompleted: yesterdayCtx.routines.filter((r) => r.occurrenceStatus === 'completed').length,
      routinesTotal: yesterdayCtx.routines.length,
      routinesSkipped: yesterdayCtx.routines
        .filter((r) => r.occurrenceStatus === 'skipped')
        .map((r) => ({ title: r.title, reason: r.skippedReason })),
      tasksCompleted: yesterdayCtx.tasks.filter((t) => t.status === 'Completed').length,
      tasksTotal: yesterdayCtx.tasks.length,
      studyMinutes: yesterdayCtx.studySessions.reduce((s, x) => s + x.durationMinutes, 0),
      workMinutes: yesterdayCtx.workSessions.reduce((s, x) => s + x.durationMinutes, 0),
      diaryLogsCount: yesterdayCtx.diaryLogs.length,
      journalReflection: yesterdayCtx.journal?.reflection || '',
    },
    alarms: alarms.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.alarmType,
      time: a.time,
      repeatMode: a.repeatMode,
      intervalMinutes: a.intervalMinutes,
      enabled: a.enabled,
    })),
    habits: habits.map((h) => ({
      id: h.id,
      title: h.title,
      category: h.category,
      weeklyTarget: h.weeklyTarget,
      doneToday: h.entries.some((e) => e.date === today && e.completed),
      streakDays: calculateHabitStreak(h, today),
    })),
    weeklyTrend: weeklyTrend.map((p) => ({
      date: p.date,
      score: p.score,
      tasks: `${p.tasksCompleted}/${p.tasksTotal}`,
      routines: `${p.routinesCompleted}/${p.routinesTotal}`,
      focusMin: p.focusMinutes,
    })),
    upcomingTasks: upcomingTasks.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate, priority: t.priority })),
    upcomingEvents: upcomingEvents.map((e) => ({ title: e.title, date: e.date, time: `${e.startTime}-${e.endTime}` })),
    goals: goals.map((g) => ({ id: g.id, title: g.title, progress: g.progress, status: g.status, targetDate: g.targetDate })),
    studySubjects: studySubjects.map((s) => ({
      name: s.name,
      chapters: `${s.chaptersCompleted}/${s.chaptersTotal}`,
      nextRevisionDate: s.nextRevisionDate,
    })),
    workProjects: workProjects.map((w) => ({
      title: w.title,
      deadline: w.deadline,
      progress: w.progress,
      status: w.status,
    })),
    recentNotes: recentNotes.map((n) => ({ title: n.title, category: n.category, content: n.content.slice(0, 180) })),
  };
}

function parseProposedActions(rawText: string): { cleanText: string; proposedActions: AiProposedAction[] } {
  const match = rawText.match(/<proposed_actions>([\s\S]*?)<\/proposed_actions>/i);
  if (!match) {
    return { cleanText: rawText.trim(), proposedActions: [] };
  }
  const cleanText = rawText.replace(/<proposed_actions>[\s\S]*?<\/proposed_actions>/i, '').trim();
  try {
    const parsed = JSON.parse(match[1].trim());
    if (Array.isArray(parsed)) {
      return { cleanText, proposedActions: parsed };
    }
  } catch {
    // ignore malformed action JSON
  }
  return { cleanText, proposedActions: [] };
}

function runSmartLocalAi(
  params: {
    message: string;
    voiceMode?: boolean;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
  },
  snapshot: ReturnType<typeof buildUserContextSnapshot>
): {
  reply: string;
  modelUsed: string;
  thinkingUsed: boolean;
  proposedActions: AiProposedAction[];
} {
  const msg = (params.message || '').toLowerCase();
  const isGu =
    msg.includes('પ્લાન') ||
    msg.includes('કામ') ||
    msg.includes('ડાયરી') ||
    msg.includes('પાણી') ||
    msg.includes('આજ') ||
    msg.includes('કરો') ||
    msg.includes('કેમ') ||
    msg.includes('su karyu') ||
    msg.includes('ketla vage') ||
    msg.includes('maro') ||
    snapshot.languagePreference === 'gu' ||
    snapshot.languagePreference === 'gu-en';

  const actions: AiProposedAction[] = [];
  let replyText = '';

  const pendingTasks = snapshot.allTasks.filter((t) => t.status !== 'Completed');
  const overdueTasks = pendingTasks.filter((t) => t.dueDate < snapshot.today);
  const todaysTasks = pendingTasks.filter((t) => t.dueDate === snapshot.today);

  // Check for navigation intent
  if (msg.includes('routine') || msg.includes('રૂટિન') || msg.includes('timetable')) {
    actions.push({
      type: 'navigate_module',
      label: 'Open Routine & Timetable',
      payload: { module: 'routine' },
    });
  } else if (msg.includes('task') || msg.includes('કામ') || msg.includes('todo')) {
    actions.push({
      type: 'navigate_module',
      label: 'Open Tasks List',
      payload: { module: 'tasks' },
    });
  } else if (msg.includes('diary') || msg.includes('ડાયરી') || msg.includes('note') || msg.includes('નોટ્સ')) {
    actions.push({
      type: 'navigate_module',
      label: 'Open Diary & Notes',
      payload: { module: 'notes' },
    });
  } else if (msg.includes('alarm') || msg.includes('એલાર્મ')) {
    actions.push({
      type: 'navigate_module',
      label: 'Open Alarms',
      payload: { module: 'alarms' },
    });
  }

  // 1. Day Plan Intent
  if (msg.includes('plan') || msg.includes('પ્લાન') || msg.includes('schedule') || msg.includes('day') || msg.includes('divas')) {
    if (isGu) {
      replyText = `### 📋 તમારા આજના દિવસનો બેસ્ટ પ્લાન (${snapshot.currentLocalTime})\n\n`;
      replyText += `તમારા રેકોર્ડ્સ મુજબ: તમારી પાસે આજે **${todaysTasks.length} આજના કામો** છે અને **${overdueTasks.length} જૂના કામો** બાકી છે.\n\n`;
      replyText += `**આગળનું શિડ્યુલ:**\n`;
      replyText += `- **${snapshot.currentLocalTime} — પ્રાયોરિટી ફોકસ બ્લોક**: સૌથી મહત્વનું પેન્ડિંગ કામ પૂરું કરો.\n`;
      replyText += `- **હાઇડ્રેશન & એનર્જી રીચાર્જ**: એક ગ્લાસ પાણી પીવો અને ૫ મિનિટ વોક લો.\n`;
      replyText += `- **સાંજે રિવ્યુ & ડાયરી**: આજના પૂરા થયેલા કામો નોંધીને ડાયરી લખો.\n\n`;
      replyText += `નીચે ૧-ક્લિક બટન આપેલા છે જેનાથી તમે સીધા ટાસ્ક અને એલાર્મ સેવ કરી શકો છો.`;
    } else {
      replyText = `### 📋 Your Optimized Day Plan (${snapshot.currentLocalTime})\n\n`;
      replyText += `Based on your records, you have **${todaysTasks.length} tasks scheduled for today** and **${overdueTasks.length} overdue items** needing attention.\n\n`;
      replyText += `**Action Timeline:**\n`;
      replyText += `- **${snapshot.currentLocalTime} — Deep Focus Block**: Knock out your top priority item.\n`;
      replyText += `- **Afternoon Hydration & Break**: Log water and recharge energy.\n`;
      replyText += `- **Evening Review**: Complete pending to-dos and record your daily diary story.\n\n`;
      replyText += `Tap the 1-click action buttons below to quickly confirm and save.`;
    }

    if (todaysTasks[0]) {
      actions.push({
        type: 'create_alarm',
        label: `Set Focus Alarm: '${todaysTasks[0].title.slice(0, 24)}'`,
        payload: {
          title: `Focus: ${todaysTasks[0].title}`,
          time: snapshot.currentLocalTime,
          alarmType: 'task',
          tone: 'crystal',
        },
      });
    }
    actions.push({
      type: 'log_water',
      label: 'Log +250 ml Water Intake',
      payload: { date: snapshot.today, amountMl: 250 },
    });
  }
  // 2. Diary & Review Intent
  else if (msg.includes('diary') || msg.includes('ડાયરી') || msg.includes('review') || msg.includes('story') || msg.includes('લખો') || msg.includes('વાગે')) {
    if (isGu) {
      replyText = `### 📖 આજની ડાયરી અને રિવ્યુ સમરી\n\n`;
      replyText += `આજે તારીખ **${snapshot.today}** ના રોજ તમે તમારા કામો અને આદતો પર સારો ફોકસ જાળવ્યો છે.\n\n`;
      replyText += `- **સમય**: ${snapshot.currentLocalTime}\n`;
      replyText += `- **સ્થિતિ**: દિવસના રૂટિન વ્યવસ્થિત ચાલી રહ્યા છે.\n`;
      replyText += `- **સુઝાવ**: આજના દિવસના મુખ્ય અનુભવો અને સિદ્ધિઓ ડાયરીમાં નોંધી લો.\n\n`;
      replyText += `તમારા માટે ૧-ક્લિકમાં આજની ડાયરી એન્ટ્રી તૈયાર છે:`;
    } else {
      replyText = `### 📖 Daily Review & Journal Brief\n\n`;
      replyText += `Reviewing your progress for **${snapshot.today}** at **${snapshot.currentLocalTime}**:\n\n`;
      replyText += `- **Status**: Consistent progress across active tasks and habits.\n`;
      replyText += `- **Reflection**: Maintaining momentum and staying on schedule.\n\n`;
      replyText += `I have prepared a one-click diary reflection for you below:`;
    }

    actions.push({
      type: 'log_diary',
      label: `Save Diary Entry (${snapshot.currentLocalTime})`,
      payload: {
        date: snapshot.today,
        entryTime: snapshot.currentLocalTime,
        title: 'Daily Progress & Reflection',
        activity: 'Focused on daily routines, completed scheduled tasks, and maintained positive habits.',
        category: 'Personal',
        mood: 'Focused',
        energy: 4,
      },
    });
  }
  // 3. Water / Hydration Intent
  else if (msg.includes('water') || msg.includes('પાણી') || msg.includes('hydration') || msg.includes('glass')) {
    if (isGu) {
      replyText = `### 💧 પાણી પીવાનું ટ્રેકિંગ અને એલાર્મ\n\n`;
      replyText += `હાઇડ્રેશન તમારા શરીર અને મગજની ઊર્જા માટે ખૂબ જ જરૂરી છે.\n`;
      replyText += `હમણાં જ એક મોટો ગ્લાસ (૨૫૦ મિલી) પાણી પી લો! ૧-ક્લિકમાં નીચેથી લોગ કરી લો.`;
    } else {
      replyText = `### 💧 Hydration Tracker & Coach\n\n`;
      replyText += `Staying hydrated is key for sustained focus and energy throughout the day.\n`;
      replyText += `Drink a fresh glass of water (250 ml) right now! Tap below to log it.`;
    }

    actions.push({
      type: 'log_water',
      label: 'Log +250 ml Water (+૧ ગ્લાસ)',
      payload: { date: snapshot.today, amountMl: 250 },
    });
    actions.push({
      type: 'create_alarm',
      label: 'Set Hydration Alarm (દર ૯૦ મિનિટે)',
      payload: {
        title: 'Drink Water (પાણી પીવાનો સમય)',
        time: snapshot.currentLocalTime,
        alarmType: 'water',
        repeatMode: 'interval',
        intervalMinutes: 90,
        startTime: '08:00',
        endTime: '22:00',
        tone: 'waterdrop',
      },
    });
  }
  // 4. Default Assistant Answer
  else {
    if (isGu) {
      replyText = `### 🌟 AURAA AI આસિસ્ટન્ટ તૈયાર છે\n\n`;
      replyText += `નમસ્તે! હું તમારા તમામ ટાસ્ક, રૂટિન, ડાયરી, એલાર્મ અને પાણીના ટાર્ગેટ સાથે લાઈવ જોડાયેલો છું.\n\n`;
      replyText += `**હું તમારી શું મદદ કરી શકું?**\n`;
      replyText += `- *"આજનો પ્લાન બનાવો"* — સમય મુજબ શેડ્યુલ ગોઠવવા માટે\n`;
      replyText += `- *"ડાયરીમાં લખો"* — આજના દિવસની સમરી અને એન્ટ્રી કરવા માટે\n`;
      replyText += `- *"પાણીનો એલાર્મ મુકો"* — દર થોડા સમયે હાઇડ્રેશન યાદ અપાવવા માટે\n`;
      replyText += `- *"કામ ઉમેરો"* — નવું કોઈ પણ ટાસ્ક સેવ કરવા માટે\n\n`;
      replyText += `તમે જે પણ કહેશો, તેનું ૧-ક્લિક સેવ બટન હું તૈયાર કરી આપીશ!`;
    } else {
      replyText = `### 🌟 AURAA AI Assistant Ready\n\n`;
      replyText += `Hello! I am connected in real-time to your tasks, routines, alarms, water tracker, and diary.\n\n`;
      replyText += `**How I can help you right now:**\n`;
      replyText += `- **"Auto-Plan My Day"**: Generate an hour-by-hour balanced schedule.\n`;
      replyText += `- **"Log Diary"**: Record your achievements and thoughts.\n`;
      replyText += `- **"Water Alarm"**: Set hydration intervals and log intake.\n`;
      replyText += `- **"Add Task"**: Create new priority tasks.\n\n`;
      replyText += `Ask me anything, and I will prepare 1-click confirm actions for you!`;
    }
  }

  return {
    reply: replyText,
    modelUsed: 'AURAA Smart Assistant',
    thinkingUsed: false,
    proposedActions: actions,
  };
}

export async function runMyDayAiChat(params: {
  userId: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  message: string;
  requestedModel?: 'gemini-4-hydrogen' | 'gemini-4-carbon' | 'gemini-3.1-flash-lite' | 'gemini-4-argon';
  highThinking?: boolean;
  voiceMode?: boolean;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<{
  reply: string;
  modelUsed: string;
  thinkingUsed: boolean;
  proposedActions: AiProposedAction[];
}> {
  const snapshot = buildUserContextSnapshot(params.userId);
  const ai = createAiClient();

  if (!ai) {
    return runSmartLocalAi(params, snapshot);
  }

  const hasImage = Boolean(params.imageBase64 && params.imageMimeType);
  let model = params.requestedModel || 'gemini-4-hydrogen';
  let useHighThinking = Boolean(params.highThinking || model === 'gemini-4-carbon');

  if (hasImage) {
    model = 'gemini-4-argon';
    useHighThinking = false;
  }

  const voiceToneInstruction = params.voiceMode
    ? `- VOICE FRIEND MODE IS ACTIVE: Respond warmly like a smart, supportive best friend having a live voice conversation ("koy mitra vat karta hoy ne tema"). Keep the spoken reply natural, encouraging, and concise (2 to 4 short sentences without markdown headers, asterisks, or bullet symbols) so text-to-speech reads it smoothly aloud. Confirm what action you prepared cleanly.`
    : `- Format replies with crisp structure using short headings (###), bullet points (- ), and bold key times/names (**07:30 AM — Study**) so it reads like a polished OS brief.`;

  const systemInstruction = `You are Raa's AI, the elite personal life architect, productivity strategist, and warm diary companion inside Raa's Diary.

Identity & Capabilities:
- You have full real-time visibility into the user's tasks, routines, alarms (wake-up, hydration/water, task alerts), daily water intake, time-stamped diary logs ("ketla vage su karyu"), habits & streaks, study subjects, work projects, goals, calendar events, and 7-day productivity trends.
- Current local time is ${snapshot.currentLocalTime} (${snapshot.timezone}) on ${snapshot.today}. Avoid scheduling new blocks in the past for today unless the user explicitly asks to log a past diary entry.
- Match the user's language naturally: if they write or speak in Gujarati or Gujarati-English (e.g. "ketla vage", "maro divas", "su karyu"), reply fluently in clear, helpful Gujarati or Gujarati-English; if Hindi, reply naturally in Hindi; otherwise use preferred setting (${snapshot.languagePreference}) and response style (${snapshot.responseStyle}).
${voiceToneInstruction}
- Never invent fake tasks, fake scores, or fake diary entries. Base all analysis strictly on the JSON snapshot below.

Database Snapshot (Live User Records):
${JSON.stringify(snapshot)}

One-Click Action Proposal Protocol:
Whenever the user asks you to plan, add tasks, set wake-up or water alarms, log what they did at a time into their diary ("diary ma lakho"), track water glasses, reschedule overdue tasks, mark a task complete, create calendar events, save notes, update goal progress, OR open/switch to a screen/module ("Open Calendar", "Routine khol", "Settings dikhao") — DO NOT claim you already saved them unless the UI executes it. Append a single valid JSON array inside <proposed_actions>...</proposed_actions> at the very end of your reply using ONLY these schemas:
- {"type":"create_task","label":"Add Task: <title>","payload":{"title":"...","dueDate":"YYYY-MM-DD","dueTime":"HH:mm","category":"Study|Work|Personal|Health|Exercise|Learning|Family|Other","priority":"Low|Medium|High|Urgent","description":"..."}}
- {"type":"complete_task","label":"Mark Done: <title>","payload":{"taskId":"<real task id from snapshot>"}}
- {"type":"reschedule_task","label":"Move '<title>' to YYYY-MM-DD","payload":{"taskId":"<real task id from snapshot>","dueDate":"YYYY-MM-DD","dueTime":"HH:mm"}}
- {"type":"create_routine","label":"Add Routine: <title>","payload":{"title":"...","startTime":"HH:mm","endTime":"HH:mm","date":"YYYY-MM-DD","category":"Personal|Study|Work|Health|Exercise|Learning|Family|Other","priority":"Medium","recurrence":"daily|none|weekly"}}
- {"type":"create_alarm","label":"Set Alarm: <title> (<HH:mm>)","payload":{"title":"...","time":"HH:mm","alarmType":"wakeup|water|task|routine|custom","repeatMode":"daily|weekdays|weekends|once|interval","intervalMinutes":60,"startTime":"08:00","endTime":"21:00","tone":"crystal|sunrise|waterdrop|pulse","reminderNote":"..."}}
- {"type":"log_diary","label":"Log Diary (<HH:mm>): <title>","payload":{"date":"YYYY-MM-DD","entryTime":"HH:mm","title":"...","activity":"...","category":"Personal|Study|Work|Health|Exercise|Learning|Family|Other","mood":"Calm|Focused|Happy|Tired|Motivated","energy":4}}
- {"type":"log_water","label":"Log +250 ml Water","payload":{"date":"YYYY-MM-DD","amountMl":250}}
- {"type":"create_event","label":"Add Event: <title>","payload":{"title":"...","date":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm","category":"Personal|Work|Study","location":""}}
- {"type":"create_note","label":"Save Note: <title>","payload":{"title":"...","content":"...","category":"Personal","linkedDate":"YYYY-MM-DD"}}
- {"type":"update_goal","label":"Update Goal Progress","payload":{"goalId":"<real goal id>","progress":75}}
- {"type":"navigate_module","label":"Open <Module>","payload":{"module":"dashboard|routine|tasks|alarms|calendar|trackers|goals|study|work|focus|notes|analytics|history|ai|settings"}}

Only include <proposed_actions> when concrete saved actions or module navigation help the user act.`;

  const contentsHistory = params.history.slice(-10).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const currentParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (hasImage && params.imageBase64 && params.imageMimeType) {
    currentParts.push({
      inlineData: {
        mimeType: params.imageMimeType,
        data: params.imageBase64,
      },
    });
  }
  currentParts.push({ text: params.message || 'Analyze this image and organize my schedule.' });

  const config: Record<string, unknown> = {
    systemInstruction,
  };

  if (model === 'gemini-4-carbon' && useHighThinking) {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [...contentsHistory, { role: 'user', parts: currentParts }],
      config,
    });
    const rawText = response.text ?? '';
    const { cleanText, proposedActions } = parseProposedActions(rawText);
    return {
      reply: cleanText,
      modelUsed: model,
      thinkingUsed: useHighThinking,
      proposedActions,
    };
  } catch (err) {
    console.warn('Gemini API call failed, using smart local fallback:', err);
    return runSmartLocalAi(params, snapshot);
  }
}

export async function generateQuickDashboardInsight(userId: string): Promise<{
  insight: string;
  modelUsed: string;
}> {
  const snapshot = buildUserContextSnapshot(userId);
  const ai = createAiClient();
  if (!ai) {
    const pendingCount = snapshot.todaySummary.tasks.filter((t) => t.status !== 'Completed').length;
    const waterRemain = Math.max(0, snapshot.todaySummary.waterIntake.targetGlasses - snapshot.todaySummary.waterIntake.glasses);
    const insight = snapshot.languagePreference === 'gu'
      ? `આજે ${pendingCount} મુખ્ય કામ બાકી છે. ${waterRemain > 0 ? `શરીરને હાઇડ્રેટ રાખવા હજુ ${waterRemain} ગ્લાસ પાણી પીવો.` : 'તમારો પાણીનો ટાર્ગેટ પૂરો થયો છે!'}`
      : `You have ${pendingCount} pending task(s) today. ${waterRemain > 0 ? `Drink ${waterRemain} more glasses of water to hit your goal.` : 'Daily hydration target reached!'}`;
    return { insight, modelUsed: 'local-smart-rule-engine' };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `You are Raa's AI inside Raa's Diary. Based strictly on this user's live data at ${snapshot.currentLocalTime} on ${snapshot.today}, give 2 crisp, personalized recommendations covering priority tasks/routines, water intake (${snapshot.todaySummary.waterIntake.glasses}/${snapshot.todaySummary.waterIntake.targetGlasses} glasses), or habit streaks. Keep it under 55 words, warm and concrete:\n${JSON.stringify({ todaySummary: snapshot.todaySummary, habits: snapshot.habits })}`,
    });
    return {
      insight: (response.text ?? '').trim(),
      modelUsed: 'gemini-3.1-flash-lite',
    };
  } catch (err) {
    console.warn('Dashboard insight fallback:', err);
    return {
      insight: snapshot.languagePreference === 'gu'
        ? `આજના મુખ્ય લક્ષ્ય પર ધ્યાન આપો અને નિયમિત વિરામ લો.`
        : `Focus on today's highest-leverage task and remember to stay hydrated.`,
      modelUsed: 'local-smart-rule-engine',
    };
  }
}

const affirmationCache = new Map<string, DailyAffirmation>();

export async function generateDailyAffirmation(
  userId: string,
  forceRefresh = false
): Promise<DailyAffirmation> {
  const snapshot = buildUserContextSnapshot(userId);
  const cacheKey = `${userId}::${snapshot.today}::${snapshot.languagePreference}`;
  if (!forceRefresh) {
    const cached = affirmationCache.get(cacheKey);
    if (cached) return cached;
  }

  const ai = createAiClient();
  if (!ai) {
    const fallback: DailyAffirmation = {
      quote: snapshot.languagePreference === 'gu'
        ? 'ધીરજ અને સતત પ્રયાસથી જ જીવનમાં શાંતિ અને સફળતા મળે છે.'
        : 'Small intentional hours quietly build an extraordinary life.',
      author: 'MY DAY OS',
      theme: 'Mindful Clarity',
      date: snapshot.today,
      modelUsed: 'local-smart-rule-engine',
    };
    affirmationCache.set(cacheKey, fallback);
    return fallback;
  }

  const model = 'gemini-3.1-flash-lite';
  const langNote =
    snapshot.languagePreference === 'gu'
      ? 'Write the affirmation in warm, uplifting Gujarati (with natural rhythm).'
      : snapshot.languagePreference === 'gu-en'
        ? 'Write an uplifting quote in crisp English paired with a short encouraging vibe suited to a Gujarati user.'
        : 'Write a poetic, grounded English daily affirmation.';

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Generate an original daily inspirational affirmation or timeless reflective quote personalized for ${snapshot.today} (${snapshot.currentLocalTime}). User goals & habits context: ${JSON.stringify(
        {
          goals: snapshot.goals.slice(0, 3).map((g) => g.title),
          habits: snapshot.habits.slice(0, 3).map((h) => h.title),
          productivityScore: snapshot.todaySummary.productivityScore,
        }
      )}. ${langNote} Keep the quote under 28 words.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quote: { type: Type.STRING },
            author: { type: Type.STRING },
            theme: { type: Type.STRING },
          },
          required: ['quote', 'author', 'theme'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}') as {
      quote?: string;
      author?: string;
      theme?: string;
    };
    const result: DailyAffirmation = {
      quote: parsed.quote?.trim() || (snapshot.languagePreference === 'gu' ? 'ધીરજ અને સતત પ્રયાસથી જ સફળતા મળે છે.' : 'Small intentional hours quietly build an extraordinary life.'),
      author: parsed.author?.trim() || 'MY DAY OS',
      theme: parsed.theme?.trim() || 'Mindful Clarity',
      date: snapshot.today,
      modelUsed: model,
    };
    affirmationCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('Affirmation fallback:', err);
    const fallback: DailyAffirmation = {
      quote: snapshot.languagePreference === 'gu'
        ? 'દરેક નવો દિવસ નવી શક્તિ અને નવા વિચારો લઈને આવે છે.'
        : 'Small intentional hours quietly build an extraordinary life.',
      author: 'MY DAY OS',
      theme: 'Mindful Clarity',
      date: snapshot.today,
      modelUsed: 'local-smart-rule-engine',
    };
    affirmationCache.set(cacheKey, fallback);
    return fallback;
  }
}

export async function generateAiDailySchedule(userId: string): Promise<AiDailyPlan> {
  const snapshot = buildUserContextSnapshot(userId);
  const ai = createAiClient();
  if (!ai) {
    // Generate a clean local plan from pending tasks
    const pendingTasks = snapshot.todaySummary.tasks.filter((t) => t.status !== 'Completed').slice(0, 4);
    const blocks = pendingTasks.map((t, idx) => ({
      time: `${String(10 + idx * 2).padStart(2, '0')}:00`,
      endTime: `${String(11 + idx * 2).padStart(2, '0')}:30`,
      title: t.title,
      category: (t.category as any) || 'Work',
      priority: (t.priority as any) || 'Medium',
      reason: 'Scheduled based on your active priority tasks.',
      actionType: 'create_task' as const,
    }));
    return {
      summary: snapshot.languagePreference === 'gu'
        ? 'તમારા આજના મુખ્ય કાર્યો અનુસાર સ્માર્ટ પ્લાન તૈયાર કરવામાં આવ્યો છે.'
        : 'Personalized schedule generated based on your pending priorities.',
      focusGoal: snapshot.goals[0]?.title ?? 'Daily Progress',
      blocks,
      modelUsed: 'local-smart-rule-engine',
    };
  }

  const model = 'gemini-4-hydrogen';

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Analyze this user's live tasks, overdue tasks, today's routines, calendar events, and active goals as of ${snapshot.currentLocalTime} on ${snapshot.today} (${snapshot.timezone}).
Build a realistic, prioritized hourly schedule for the remaining hours of today (use 24-hour HH:mm format starting from or slightly after ${snapshot.currentLocalTime}, without overlapping existing fixed calendar events). Return 4 to 7 focused blocks connecting their real pending tasks, high-priority goals, and short recovery/water breaks.
Live Context:
${JSON.stringify({
  currentLocalTime: snapshot.currentLocalTime,
  today: snapshot.today,
  languagePreference: snapshot.languagePreference,
  tasks: snapshot.todaySummary.tasks,
  overdueTasks: snapshot.todaySummary.overdueTasks,
  routines: snapshot.todaySummary.routines,
  events: snapshot.todaySummary.events,
  goals: snapshot.goals,
})}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            focusGoal: { type: Type.STRING },
            blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  endTime: { type: Type.STRING },
                  title: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    enum: [
                      'Personal',
                      'Study',
                      'Work',
                      'Health',
                      'Exercise',
                      'Learning',
                      'Family',
                      'Skills',
                      'Projects',
                      'Other',
                    ],
                  },
                  priority: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Urgent'] },
                  reason: { type: Type.STRING },
                  actionType: { type: Type.STRING, enum: ['create_task', 'create_routine'] },
                },
                required: ['time', 'endTime', 'title', 'category', 'priority', 'reason', 'actionType'],
              },
            },
          },
          required: ['summary', 'focusGoal', 'blocks'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}') as Partial<AiDailyPlan>;
    return {
      summary: parsed.summary?.trim() || 'Prioritized schedule crafted around your active goals and open hours.',
      focusGoal: parsed.focusGoal?.trim() || (snapshot.goals[0]?.title ?? 'Daily Focus'),
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      modelUsed: model,
    };
  } catch (err) {
    console.warn('AI schedule fallback:', err);
    return {
      summary: 'Schedule fallback generated from active tasks.',
      focusGoal: snapshot.goals[0]?.title ?? 'Daily Focus',
      blocks: [],
      modelUsed: 'local-smart-rule-engine',
    };
  }
}
