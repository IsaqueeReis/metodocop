const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf-8');

// 1. Fix line 3552 map closure
content = content.replace(/<\/div>\); \}\n<\/div>\n<\/div>\); \}\n<\/div>/g, 
                          '</div>); })}\n</div>\n</div>); })}\n</div>');

// 2. Fix line 3556 and 3558 <> closures
content = content.replace(/<\/div>\n                         <\/>\n\n                     <\/>\)}/g, 
                          '</div>\n                         </>)}\n\n                     </>)}');

// 3. Fix line 3618
content = content.replace(/<\/div>\}\n                \{activeTab === 'perfil'/g, 
                          '</div>)}\n                {activeTab === \'perfil\'');

// 4. Fix line 3750 and 3751 (The missing ')' before '</div>)}')
content = content.replace(/<\/div>\n\n                    \n<\/div>\)\}\n\n                \{activeTab === 'trilha'/g, 
                          '</div>\n\n                    )\n</div>)}\n\n                {activeTab === \'trilha\'');

// 5. Fix line 3774 and 3775 (The missing ')' before VIPStudentDashboard missoes)
content = content.replace(/<\/div>\)\}\n\n\n                \{activeTab === 'missoes'/g, 
                          '</div>)}\n\n                )\n                {activeTab === \'missoes\'');

fs.writeFileSync('App.tsx', content);
console.log('Fixed block 39 with exact string replacements');
