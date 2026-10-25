/*
 * 한글 수식 파서
 * "루트(3+1)" 같은 한국어 함수형 표현을 LaTeX로 바꿉니다.
 * 브라우저(앱 화면)와 Node(테스트) 양쪽에서 같은 파일을 씁니다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HangulMath = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── 괄호와 함께 쓰는 함수: 이름(인자1, 인자2, ...) ─────────────────────
  // 각 함수는 변환된 인자 배열을 받아 LaTeX 문자열을 돌려줍니다.
  const FUNCS = {
    '루트': (a) => a.length >= 2 ? `\\sqrt[${a[0]}]{${a[1]}}` : `\\sqrt{${a[0]}}`,
    '제곱근': (a) => a.length >= 2 ? `\\sqrt[${a[0]}]{${a[1]}}` : `\\sqrt{${a[0]}}`,
    '세제곱근': (a) => `\\sqrt[3]{${a[0]}}`,
    '분수': (a) => `\\frac{${a[0]}}{${a[1] ?? ''}}`,
    '제곱': (a) => `{${a[0]}}^{2}`,
    '세제곱': (a) => `{${a[0]}}^{3}`,
    '거듭제곱': (a) => `{${a[0]}}^{${a[1] ?? ''}}`,
    '지수': (a) => `{${a[0]}}^{${a[1] ?? ''}}`,
    '첨자': (a) => `{${a[0]}}_{${a[1] ?? ''}}`,
    '아래첨자': (a) => `{${a[0]}}_{${a[1] ?? ''}}`,
    '절댓값': (a) => `\\left|${a[0]}\\right|`,
    '절대값': (a) => `\\left|${a[0]}\\right|`,
    '가우스': (a) => `\\left[${a[0]}\\right]`,
    '적분': (a) => a.length >= 3 ? `\\int_{${a[0]}}^{${a[1]}} ${a[2]}` : `\\int ${a[0]}`,
    '시그마': (a) => a.length >= 3 ? `\\sum_{${a[0]}}^{${a[1]}} ${a[2]}` : `\\sum ${a[0]}`,
    '합': (a) => a.length >= 3 ? `\\sum_{${a[0]}}^{${a[1]}} ${a[2]}` : `\\sum ${a[0]}`,
    '곱': (a) => a.length >= 3 ? `\\prod_{${a[0]}}^{${a[1]}} ${a[2]}` : `\\prod ${a[0]}`,
    '극한': (a) => a.length >= 3 ? `\\lim_{${a[0]} \\to ${a[1]}} ${a[2]}` : `\\lim ${a[0]}`,
    '로그': (a) => a.length >= 2 ? `\\log_{${a[0]}}{${a[1]}}` : `\\log{${a[0]}}`,
    '자연로그': (a) => `\\ln{${a[0]}}`,
    '사인': (a) => `\\sin{${a[0]}}`,
    '코사인': (a) => `\\cos{${a[0]}}`,
    '탄젠트': (a) => `\\tan{${a[0]}}`,
    '벡터': (a) => `\\vec{${a[0]}}`,
    '바': (a) => `\\overline{${a[0]}}`,
    '윗줄': (a) => `\\overline{${a[0]}}`,
    '모자': (a) => `\\hat{${a[0]}}`,
    '미분': (a) => `\\frac{d${a[0]}}{d${a[1] ?? 'x'}}`,
    '편미분': (a) => `\\frac{\\partial ${a[0]}}{\\partial ${a[1] ?? 'x'}}`,
    '조합': (a) => `{}_{${a[0]}}\\mathrm{C}_{${a[1] ?? ''}}`,
    '순열': (a) => `{}_{${a[0]}}\\mathrm{P}_{${a[1] ?? ''}}`,
    '연립': (a) => `\\begin{cases} ${a.join(' \\\\ ')} \\end{cases}`,
    // 영어 별칭
    'sqrt': (a) => a.length >= 2 ? `\\sqrt[${a[0]}]{${a[1]}}` : `\\sqrt{${a[0]}}`,
    'frac': (a) => `\\frac{${a[0]}}{${a[1] ?? ''}}`,
    'abs': (a) => `\\left|${a[0]}\\right|`,
  };
  // 인자를 변환하지 않고 그대로 쓰는 함수
  const RAW_FUNCS = {
    '글자': (s) => `\\text{${s}}`,
    '텍스트': (s) => `\\text{${s}}`,
  };
  // 행렬(1, 2; 3, 4) — 세미콜론으로 줄, 쉼표로 칸 구분
  const MATRIX_FUNCS = { '행렬': 'pmatrix', '대괄호행렬': 'bmatrix', '행렬식': 'vmatrix' };

  // ── 괄호 없이 쓰는 낱말 ───────────────────────────────────────────────
  const WORDS = {
    // 그리스 문자
    '알파': '\\alpha', '베타': '\\beta', '감마': '\\gamma', '델타': '\\delta',
    '엡실론': '\\epsilon', '입실론': '\\epsilon', '제타': '\\zeta', '에타': '\\eta',
    '세타': '\\theta', '쎄타': '\\theta', '람다': '\\lambda', '뮤': '\\mu', '뉴': '\\nu',
    '크사이': '\\xi', '파이': '\\pi', '로': '\\rho', '시그마': '\\sigma', '타우': '\\tau',
    '파이값': '\\pi', '피': '\\phi', '카이': '\\chi', '프사이': '\\psi', '오메가': '\\omega',
    '대문자델타': '\\Delta', '대문자시그마': '\\Sigma', '대문자오메가': '\\Omega',
    // 연산·관계
    '더하기': '+', '빼기': '-', '곱하기': '\\times', '나누기': '\\div', '점곱': '\\cdot',
    '플마': '\\pm', '플러스마이너스': '\\pm', '마플': '\\mp',
    '이하': '\\le', '이상': '\\ge', '같지않다': '\\neq', '근사': '\\approx', '비례': '\\propto',
    '무한대': '\\infty', '화살표': '\\rightarrow', '필요충분': '\\Leftrightarrow', '그러면': '\\Rightarrow',
    '따라서': '\\therefore', '왜냐하면': '\\because',
    // 기하·집합·논리
    '각': '\\angle', '삼각형': '\\triangle', '도': '^{\\circ}', '수직': '\\perp', '평행': '\\parallel',
    '원소': '\\in', '부분집합': '\\subset', '합집합': '\\cup', '교집합': '\\cap', '공집합': '\\emptyset',
    '모든': '\\forall', '존재': '\\exists', '델': '\\nabla', '편미분기호': '\\partial',
    // 뒤에 붙이는 지수 (x제곱, (a+b)세제곱)
    '제곱': '^{2}', '세제곱': '^{3}',
  };

  const SYMBOLS = [
    ['<=', '\\le '], ['>=', '\\ge '], ['!=', '\\neq '], ['->', '\\rightarrow '],
    ['+-', '\\pm '], ['*', '\\times '], ['÷', '\\div '], ['×', '\\times '], ['·', '\\cdot '],
    ['≤', '\\le '], ['≥', '\\ge '], ['≠', '\\neq '], ['∞', '\\infty '], ['π', '\\pi '],
  ];

  const isHangul = (ch) => /[ㄱ-ㆎ가-힣]/.test(ch);
  const isLatin = (ch) => /[A-Za-z]/.test(ch);
  // 명령어 뒤에 글자가 바로 붙으면(\pix) 깨지므로 공백을 붙여 둡니다
  const cmd = (s) => (/\\[A-Za-z]+$/.test(s) ? s + ' ' : s);

  class ParseError extends Error {}

  // 위치 i의 여는 괄호에 짝이 맞는 닫는 괄호 위치
  function matchClose(s, i) {
    const open = s[i];
    const close = { '(': ')', '[': ']', '{': '}' }[open];
    let depth = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === open) depth++;
      else if (s[j] === close && --depth === 0) return j;
    }
    throw new ParseError(`'${open}' 괄호가 닫히지 않았습니다`);
  }

  // 가장 바깥 깊이에서만 구분자로 자르기
  function splitTop(s, sep) {
    const parts = [];
    let depth = 0, start = 0;
    for (let j = 0; j < s.length; j++) {
      const c = s[j];
      if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) depth--;
      else if (c === sep && depth === 0) { parts.push(s.slice(start, j)); start = j + 1; }
    }
    parts.push(s.slice(start));
    return parts;
  }

  // 한글 덩어리를 아는 낱말들로 끝까지 쪼갤 수 있으면 쪼갠 결과, 아니면 null
  function segment(run) {
    const best = new Array(run.length + 1).fill(null);
    best[0] = [];
    for (let i = 0; i < run.length; i++) {
      if (!best[i]) continue;
      for (let j = run.length; j > i; j--) {
        const w = run.slice(i, j);
        if (WORDS[w] && (!best[j] || best[j].length > best[i].length + 1)) best[j] = best[i].concat(w);
      }
    }
    return best[run.length];
  }

  function convert(s) {
    let out = '';
    let i = 0;
    while (i < s.length) {
      const ch = s[i];

      // 원래 LaTeX 명령어(\frac 등)는 그대로 통과
      if (ch === '\\') {
        let j = i + 1;
        while (j < s.length && isLatin(s[j])) j++;
        if (j === i + 1 && j < s.length) j++;
        out += s.slice(i, j);
        i = j;
        continue;
      }

      // 한글 또는 영어 단어: 함수 이름이면 괄호 인자 처리
      if (isHangul(ch) || isLatin(ch)) {
        let j = i;
        const hangul = isHangul(ch);
        while (j < s.length && (hangul ? isHangul(s[j]) : isLatin(s[j]))) j++;
        const run = s.slice(i, j);
        let k = j;
        while (k < s.length && s[k] === ' ') k++;

        // 루트[3](x) 처럼 대괄호로 차수 지정
        if ((run === '루트' || run === '제곱근') && s[k] === '[') {
          const rb = matchClose(s, k);
          let p = rb + 1;
          while (p < s.length && s[p] === ' ') p++;
          if (s[p] !== '(') throw new ParseError(`${run}[...] 뒤에 (괄호)가 필요합니다`);
          const pe = matchClose(s, p);
          out += `\\sqrt[${convert(s.slice(k + 1, rb))}]{${convert(s.slice(p + 1, pe))}}`;
          i = pe + 1;
          continue;
        }

        if (s[k] === '(' && (FUNCS[run] || RAW_FUNCS[run] || MATRIX_FUNCS[run])) {
          const e = matchClose(s, k);
          const inner = s.slice(k + 1, e);
          if (RAW_FUNCS[run]) out += RAW_FUNCS[run](inner.trim());
          else if (MATRIX_FUNCS[run]) {
            const rows = splitTop(inner, ';').map((r) => splitTop(r, ',').map((c) => convert(c).trim()).join(' & '));
            const env = MATRIX_FUNCS[run];
            out += `\\begin{${env}} ${rows.join(' \\\\ ')} \\end{${env}}`;
          } else {
            const args = splitTop(inner, ',').map((a) => convert(a).trim());
            out += FUNCS[run](args);
          }
          i = e + 1;
          continue;
        }

        if (hangul) {
          const parts = segment(run);
          out += parts ? parts.map((w) => cmd(WORDS[w])).join('') : `\\text{${run}}`;
        } else {
          out += run; // 영어 변수 x, y, abc 는 그대로
        }
        i = j;
        continue;
      }

      // ^(…), _(…) → ^{…}, _{…}
      if ((ch === '^' || ch === '_') && s[i + 1] === '(') {
        const e = matchClose(s, i + 1);
        out += `${ch}{${convert(s.slice(i + 2, e))}}`;
        i = e + 1;
        continue;
      }

      // 일반 괄호는 남기고 안쪽만 변환
      if (ch === '(' || ch === '[') {
        const e = matchClose(s, i);
        const close = s[e];
        out += ch + convert(s.slice(i + 1, e)) + close;
        i = e + 1;
        continue;
      }
      if (ch === '{') {
        const e = matchClose(s, i);
        out += '{' + convert(s.slice(i + 1, e)) + '}';
        i = e + 1;
        continue;
      }
      if (ch === ')' || ch === ']' || ch === '}') {
        throw new ParseError(`'${ch}' 앞에 여는 괄호가 없습니다`);
      }

      // 기호
      const sym = SYMBOLS.find(([k]) => s.startsWith(k, i));
      if (sym) { out += sym[1]; i += sym[0].length; continue; }

      out += ch;
      i++;
    }
    return out;
  }

  /** 여러 줄 입력을 하나의 LaTeX로. 줄이 여럿이면 gathered로 묶습니다. */
  function toLatex(input) {
    const lines = String(input).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const converted = lines.map((l) => convert(l).replace(/\s+/g, ' ').trim());
    if (converted.length <= 1) return converted[0] || '';
    return `\\begin{gathered} ${converted.join(' \\\\ ')} \\end{gathered}`;
  }

  /** 문법 도움말에 쓰는 예시 목록 */
  const EXAMPLES = [
    ['루트(3+1)', '제곱근'],
    ['루트[3](8)', 'n제곱근'],
    ['분수(1, 2)', '분수'],
    ['x제곱 + y세제곱', '제곱'],
    ['거듭제곱(e, x+1)', '지수'],
    ['첨자(a, n+1)', '아래첨자'],
    ['절댓값(x-3)', '절댓값'],
    ['적분(0, 1, x제곱 dx)', '정적분'],
    ['시그마(k=1, n, k)', '합'],
    ['극한(x, 0, 분수(사인(x), x))', '극한'],
    ['로그(2, 8)', '로그'],
    ['미분(y, x)', '미분'],
    ['조합(5, 2)', '조합'],
    ['벡터(a) 점곱 벡터(b)', '벡터'],
    ['행렬(1, 2; 3, 4)', '행렬'],
    ['연립(x+y=3, x-y=1)', '연립방정식'],
    ['2파이r', '그리스 문자'],
    ['a 플마 b, x <= 3', '기호'],
  ];

  return { toLatex, convert, ParseError, EXAMPLES, FUNCS, WORDS };
});
