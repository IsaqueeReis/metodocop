const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

// Line 2231 replacements
code = code.replace(".toFixed(1h", ".toFixed(1))}</h3>");
code = code.replace("=> acc+h.count, 0</h3>", "=> acc+h.count, 0)}</h3>");
code = code.replace("'pt-BR'</p>", "'pt-BR')}</p>");
code = code.replace("session.durationSeconds</span>", "session.durationSeconds)}</span>");
code = code.replace(") {recentSessions.length === 0", "))} {recentSessions.length === 0");
code = code.replace(".toFixed(1/10", ".toFixed(1)}/10");
code = code.replace("); } {recentSimulados.length === 0", "); })} {recentSimulados.length === 0");

// Line 2234 replacements
code = code.replace("toggleGoal(g.id className", "toggleGoal(g.id)} className");
code = code.replace("removeGoal(g.id className", "removeGoal(g.id)} className");
code = code.replace(") {goals.length === 0", "))} {goals.length === 0");
code = code.replace("setNewGoalText(e.target.value onKeyDown={e => e.key === 'Enter' && addGoal(", "setNewGoalText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGoal()}");
code = code.replace("displaySeconds</div>", "displaySeconds)}</div>");
code = code.replace("setTimerSubject(e.target.value className", "setTimerSubject(e.target.value)} className");
code = code.replace("</option></select>", "</option>)}</select>");
code = code.replace("removeSubjectFromSchedule(dIdx, sIdx className", "removeSubjectFromSchedule(dIdx, sIdx)} className");
code = code.replace(") {dayItem.subjects.length === 0", "))} {dayItem.subjects.length === 0");
code = code.replace(")</div>", "))}</div>"); // For schedule.map


fs.writeFileSync('App.tsx', code);
console.log('Fixed App.tsx!');
