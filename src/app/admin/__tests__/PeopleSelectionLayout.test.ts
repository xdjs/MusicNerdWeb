import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

// JSDOM cannot hit-test CSS grids. Keep this structural guard alongside the
// real-browser regression at 390, 832 and 1440 px (issue #1644).
const css = postcss.parse(fs.readFileSync(path.join(process.cwd(), 'src/components/community/Community.module.css'), 'utf8'));
function declarations(selector: string) {
  const result: Record<string, string> = {};
  css.walkAtRules('container', (container) => {
    if (container.params !== 'admin-panel (max-width: 900px)') return;
    container.walkRules((rule) => {
      if (!rule.selectors.includes(selector)) return;
      rule.walkDecls((decl) => { result[decl.prop] = decl.value; });
    });
  });
  return result;
}

it('keeps the people checkbox and identity in distinct grid tracks', () => {
  expect(declarations('.panel .peopleRecords tbody tr')['grid-template-columns']).toBe('minmax(0,1fr) auto');
  expect(declarations('.panel .peopleRecords td[data-column="username"]')['grid-column']).toBe('1');
  expect(declarations('.panel .peopleRecords td[data-column="select"]')['grid-column']).toBe('2');
});

it('keeps detail and empty-state cells spanning the record width', () => {
  expect(declarations('.panel .peopleRecords td')['grid-column']).toBe('1 / -1');
});
