// 실행: npm test
const test = require('node:test');
const assert = require('node:assert');
const katex = require('katex');
const { toLatex, ParseError, EXAMPLES } = require('../src/parser.js');

const cases = [
  ['루트(3+1)', '\\sqrt{3+1}'],
  ['루트[3](8)', '\\sqrt[3]{8}'],
  ['루트(3, 8)', '\\sqrt[3]{8}'],
  ['분수(1, 2)', '\\frac{1}{2}'],
  ['x제곱 + y세제곱', 'x^{2} + y^{3}'],
  ['(a+b)제곱', '(a+b)^{2}'],
  ['루트(루트(2)+1)', '\\sqrt{\\sqrt{2}+1}'],
  ['적분(0, 1, x제곱 dx)', '\\int_{0}^{1} x^{2} dx'],
  ['시그마(k=1, n, k)', '\\sum_{k=1}^{n} k'],
  ['극한(x, 0, 분수(사인(x), x))', '\\lim_{x \\to 0} \\frac{\\sin{x}}{x}'],
  ['2파이r', '2\\pi r'],
  ['30도', '30^{\\circ}'],
  ['x <= 3', 'x \\le 3'],
  ['x^(2n)', 'x^{2n}'],
  ['글자(속도) = 분수(거리, 시간)', '\\text{속도} = \\frac{\\text{거리}}{\\text{시간}}'],
  ['\\frac{1}{2} + 루트(x)', '\\frac{1}{2} + \\sqrt{x}'],
  ['행렬(1, 2; 3, 4)', '\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}'],
];

for (const [input, expected] of cases) {
  test(`변환: ${input}`, () => assert.strictEqual(toLatex(input), expected));
}

test('도움말 예시는 모두 KaTeX로 그려진다', () => {
  for (const [src] of EXAMPLES) {
    assert.doesNotThrow(() => katex.renderToString(toLatex(src), { throwOnError: true, strict: 'ignore' }), src);
  }
});

test('괄호를 안 닫으면 알려 준다', () => {
  assert.throws(() => toLatex('루트(3+1'), ParseError);
  assert.throws(() => toLatex('3+1)'), ParseError);
});

test('여러 줄은 gathered로 묶는다', () => {
  assert.strictEqual(toLatex('a+b\nc'), '\\begin{gathered} a+b \\\\ c \\end{gathered}');
});
