const fs = require('fs');

let c = fs.readFileSync('App.tsx', 'utf8');

// The original replacement was:
// c = c.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\);/g, '</div></div></div></div>);');
// Which replaced EVERY instance of `</div></div></div>);` with an extra `</div>`.
// We need to revert all of those.

// We will replace `</div></div></div></div>);` back to `</div></div></div>);` globally,
// EXCEPT for the very end of StudentDashboard, where it actually NEEDS an extra `</div>` because I added the background container!

// So first, revert all:
c = c.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);/g, '</div></div></div>);');

// Now, properly close the StudentDashboard container by finding the end of its return statement.
// The end of StudentDashboard is right before `const App = () => {`
// Let's find: `Comprar Material Avulso\n                    </a>\n                </div></div></div>);`
// and add the extra `</div>` just there!
c = c.replace(
    /Comprar Material Avulso\s*<\/a>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);/g,
    'Comprar Material Avulso\\n                    </a>\\n                </div></div></div></div>);'
);

// We should also verify that the JSX elements are properly balanced.
fs.writeFileSync('App.tsx', c);
