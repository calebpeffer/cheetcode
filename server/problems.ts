export type Difficulty = "easy" | "medium" | "hard";

export type ProblemTestCase = {
  input: Record<string, unknown>;
  expected: unknown;
};

export type Problem = {
  id: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  example: string;
  signature: string;
  starterCode: string;
  testCases: ProblemTestCase[];
  solution: string;
};

export type PublicProblem = Omit<Problem, "solution">;

const makeProblem = (problem: Problem): Problem => problem;

export const PROBLEM_BANK: Problem[] = [
  makeProblem({
    id: "sum-two",
    title: "Sum Two Numbers",
    difficulty: "easy",
    description: "Return the sum of a and b.",
    example: "sumTwo(2, 3) -> 5",
    signature: "function sumTwo(a, b)",
    starterCode: "function sumTwo(a, b) {\n  \n}",
    testCases: [
      { input: { a: 2, b: 3 }, expected: 5 },
      { input: { a: -1, b: 1 }, expected: 0 },
      { input: { a: 10, b: 5 }, expected: 15 },
    ],
    solution: "function sumTwo(a, b) { return a + b; }",
  }),
  makeProblem({
    id: "is-even",
    title: "Is Even",
    difficulty: "easy",
    description: "Return true if n is even, false otherwise.",
    example: "isEven(4) -> true",
    signature: "function isEven(n)",
    starterCode: "function isEven(n) {\n  \n}",
    testCases: [
      { input: { n: 4 }, expected: true },
      { input: { n: 3 }, expected: false },
      { input: { n: 0 }, expected: true },
    ],
    solution: "function isEven(n) { return n % 2 === 0; }",
  }),
  makeProblem({
    id: "reverse-string",
    title: "Reverse String",
    difficulty: "easy",
    description: "Return the reversed string.",
    example: "reverseString('abc') -> 'cba'",
    signature: "function reverseString(str)",
    starterCode: "function reverseString(str) {\n  \n}",
    testCases: [
      { input: { str: "abc" }, expected: "cba" },
      { input: { str: "racecar" }, expected: "racecar" },
      { input: { str: "" }, expected: "" },
    ],
    solution:
      "function reverseString(str) { return str.split('').reverse().join(''); }",
  }),
  makeProblem({
    id: "max-of-array",
    title: "Max of Array",
    difficulty: "easy",
    description: "Return the largest number in nums.",
    example: "maxOfArray([3, 9, 2]) -> 9",
    signature: "function maxOfArray(nums)",
    starterCode: "function maxOfArray(nums) {\n  \n}",
    testCases: [
      { input: { nums: [3, 9, 2] }, expected: 9 },
      { input: { nums: [-5, -1, -2] }, expected: -1 },
      { input: { nums: [7] }, expected: 7 },
    ],
    solution: "function maxOfArray(nums) { return Math.max(...nums); }",
  }),
  makeProblem({
    id: "count-vowels",
    title: "Count Vowels",
    difficulty: "easy",
    description: "Count vowels in a lowercase string.",
    example: "countVowels('hello') -> 2",
    signature: "function countVowels(str)",
    starterCode: "function countVowels(str) {\n  \n}",
    testCases: [
      { input: { str: "hello" }, expected: 2 },
      { input: { str: "rhythm" }, expected: 0 },
      { input: { str: "aeiou" }, expected: 5 },
    ],
    solution:
      "function countVowels(str) { return [...str].filter((c) => 'aeiou'.includes(c)).length; }",
  }),
  makeProblem({
    id: "fizzbuzz",
    title: "FizzBuzz Value",
    difficulty: "medium",
    description:
      "Return 'fizz', 'buzz', 'fizzbuzz', or n as a string by divisibility.",
    example: "fizzBuzzValue(15) -> 'fizzbuzz'",
    signature: "function fizzBuzzValue(n)",
    starterCode: "function fizzBuzzValue(n) {\n  \n}",
    testCases: [
      { input: { n: 3 }, expected: "fizz" },
      { input: { n: 5 }, expected: "buzz" },
      { input: { n: 7 }, expected: "7" },
      { input: { n: 15 }, expected: "fizzbuzz" },
    ],
    solution:
      "function fizzBuzzValue(n) { if (n % 15 === 0) return 'fizzbuzz'; if (n % 3 === 0) return 'fizz'; if (n % 5 === 0) return 'buzz'; return String(n); }",
  }),
  makeProblem({
    id: "dedupe",
    title: "Remove Duplicates",
    difficulty: "medium",
    description: "Return a new array with first occurrence order preserved.",
    example: "dedupe([1,2,1,3]) -> [1,2,3]",
    signature: "function dedupe(nums)",
    starterCode: "function dedupe(nums) {\n  \n}",
    testCases: [
      { input: { nums: [1, 2, 1, 3] }, expected: [1, 2, 3] },
      { input: { nums: [] }, expected: [] },
      { input: { nums: [5, 5, 5] }, expected: [5] },
    ],
    solution: "function dedupe(nums) { return [...new Set(nums)]; }",
  }),
  makeProblem({
    id: "is-palindrome",
    title: "Is Palindrome",
    difficulty: "easy",
    description: "Return true if str reads the same forward and backward.",
    example: "isPalindrome('level') -> true",
    signature: "function isPalindrome(str)",
    starterCode: "function isPalindrome(str) {\n  \n}",
    testCases: [
      { input: { str: "level" }, expected: true },
      { input: { str: "test" }, expected: false },
      { input: { str: "a" }, expected: true },
    ],
    solution:
      "function isPalindrome(str) { return str === str.split('').reverse().join(''); }",
  }),
  makeProblem({
    id: "factorial",
    title: "Factorial",
    difficulty: "medium",
    description: "Return n! for n >= 0.",
    example: "factorial(5) -> 120",
    signature: "function factorial(n)",
    starterCode: "function factorial(n) {\n  \n}",
    testCases: [
      { input: { n: 0 }, expected: 1 },
      { input: { n: 1 }, expected: 1 },
      { input: { n: 5 }, expected: 120 },
    ],
    solution:
      "function factorial(n) { let out = 1; for (let i = 2; i <= n; i += 1) out *= i; return out; }",
  }),
  makeProblem({
    id: "chunk-array",
    title: "Chunk Array",
    difficulty: "medium",
    description: "Split nums into arrays of size chunkSize.",
    example: "chunkArray([1,2,3,4],2) -> [[1,2],[3,4]]",
    signature: "function chunkArray(nums, chunkSize)",
    starterCode: "function chunkArray(nums, chunkSize) {\n  \n}",
    testCases: [
      {
        input: { nums: [1, 2, 3, 4], chunkSize: 2 },
        expected: [
          [1, 2],
          [3, 4],
        ],
      },
      {
        input: { nums: [1, 2, 3, 4, 5], chunkSize: 2 },
        expected: [[1, 2], [3, 4], [5]],
      },
      { input: { nums: [], chunkSize: 3 }, expected: [] },
    ],
    solution:
      "function chunkArray(nums, chunkSize) { const out = []; for (let i = 0; i < nums.length; i += chunkSize) out.push(nums.slice(i, i + chunkSize)); return out; }",
  }),
  makeProblem({
    id: "two-sum-indices",
    title: "Two Sum Indices",
    difficulty: "hard",
    description: "Return indices [i, j] where nums[i] + nums[j] == target.",
    example: "twoSumIndices([2,7,11,15], 9) -> [0,1]",
    signature: "function twoSumIndices(nums, target)",
    starterCode: "function twoSumIndices(nums, target) {\n  \n}",
    testCases: [
      { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
      { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
      { input: { nums: [3, 3], target: 6 }, expected: [0, 1] },
    ],
    solution:
      "function twoSumIndices(nums, target) { const map = new Map(); for (let i = 0; i < nums.length; i += 1) { const need = target - nums[i]; if (map.has(need)) return [map.get(need), i]; map.set(nums[i], i); } return []; }",
  }),
  makeProblem({
    id: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "hard",
    description: "Merge overlapping intervals and return sorted result.",
    example: "mergeIntervals([[1,3],[2,6],[8,10]]) -> [[1,6],[8,10]]",
    signature: "function mergeIntervals(intervals)",
    starterCode: "function mergeIntervals(intervals) {\n  \n}",
    testCases: [
      {
        input: { intervals: [[1, 3], [2, 6], [8, 10], [15, 18]] },
        expected: [[1, 6], [8, 10], [15, 18]],
      },
      {
        input: { intervals: [[1, 4], [4, 5]] },
        expected: [[1, 5]],
      },
      { input: { intervals: [] }, expected: [] },
    ],
    solution:
      "function mergeIntervals(intervals) { if (!intervals.length) return []; const sorted = [...intervals].sort((a,b) => a[0] - b[0]); const out = [sorted[0].slice()]; for (let i = 1; i < sorted.length; i += 1) { const prev = out[out.length - 1]; const cur = sorted[i]; if (cur[0] <= prev[1]) prev[1] = Math.max(prev[1], cur[1]); else out.push(cur.slice()); } return out; }",
  }),
  makeProblem({
    id: "anagram",
    title: "Valid Anagram",
    difficulty: "easy",
    description: "Return true if a and b are anagrams.",
    example: "isAnagram('listen','silent') -> true",
    signature: "function isAnagram(a, b)",
    starterCode: "function isAnagram(a, b) {\n  \n}",
    testCases: [
      { input: { a: "listen", b: "silent" }, expected: true },
      { input: { a: "cat", b: "car" }, expected: false },
      { input: { a: "aabb", b: "baba" }, expected: true },
    ],
    solution:
      "function isAnagram(a, b) { if (a.length !== b.length) return false; const norm = (s) => s.split('').sort().join(''); return norm(a) === norm(b); }",
  }),
  makeProblem({
    id: "move-zeros",
    title: "Move Zeros",
    difficulty: "medium",
    description:
      "Return array where all zeros are moved to the end keeping order.",
    example: "moveZeros([0,1,0,3,12]) -> [1,3,12,0,0]",
    signature: "function moveZeros(nums)",
    starterCode: "function moveZeros(nums) {\n  \n}",
    testCases: [
      { input: { nums: [0, 1, 0, 3, 12] }, expected: [1, 3, 12, 0, 0] },
      { input: { nums: [0, 0, 0] }, expected: [0, 0, 0] },
      { input: { nums: [1, 2, 3] }, expected: [1, 2, 3] },
    ],
    solution:
      "function moveZeros(nums) { const nonZero = nums.filter((n) => n !== 0); return nonZero.concat(Array(nums.length - nonZero.length).fill(0)); }",
  }),
  makeProblem({
    id: "capitalize",
    title: "Capitalize Words",
    difficulty: "medium",
    description: "Capitalize first letter of each word.",
    example: "capitalizeWords('hello world') -> 'Hello World'",
    signature: "function capitalizeWords(str)",
    starterCode: "function capitalizeWords(str) {\n  \n}",
    testCases: [
      { input: { str: "hello world" }, expected: "Hello World" },
      { input: { str: "a b c" }, expected: "A B C" },
      { input: { str: "" }, expected: "" },
    ],
    solution:
      "function capitalizeWords(str) { return str.split(' ').map((w) => w ? w[0].toUpperCase() + w.slice(1) : '').join(' '); }",
  }),
  makeProblem({
    id: "binary-search",
    title: "Binary Search",
    difficulty: "hard",
    description: "Return index of target in sorted nums, or -1.",
    example: "binarySearch([1,3,5,7], 5) -> 2",
    signature: "function binarySearch(nums, target)",
    starterCode: "function binarySearch(nums, target) {\n  \n}",
    testCases: [
      { input: { nums: [1, 3, 5, 7], target: 5 }, expected: 2 },
      { input: { nums: [1, 3, 5, 7], target: 6 }, expected: -1 },
      { input: { nums: [], target: 1 }, expected: -1 },
    ],
    solution:
      "function binarySearch(nums, target) { let lo = 0; let hi = nums.length - 1; while (lo <= hi) { const mid = Math.floor((lo + hi) / 2); if (nums[mid] === target) return mid; if (nums[mid] < target) lo = mid + 1; else hi = mid - 1; } return -1; }",
  }),
  makeProblem({
    id: "array-intersection",
    title: "Array Intersection",
    difficulty: "easy",
    description: "Return unique values appearing in both arrays.",
    example: "arrayIntersection([1,2,2],[2,3]) -> [2]",
    signature: "function arrayIntersection(a, b)",
    starterCode: "function arrayIntersection(a, b) {\n  \n}",
    testCases: [
      { input: { a: [1, 2, 2], b: [2, 3] }, expected: [2] },
      { input: { a: [4, 5], b: [6, 7] }, expected: [] },
      { input: { a: [1, 1, 1], b: [1] }, expected: [1] },
    ],
    solution:
      "function arrayIntersection(a, b) { const s = new Set(b); return [...new Set(a.filter((n) => s.has(n)))]; }",
  }),
  makeProblem({
    id: "group-anagrams",
    title: "Group Anagrams",
    difficulty: "hard",
    description: "Group words that are anagrams.",
    example:
      "groupAnagrams(['eat','tea','tan','ate']) -> [['eat','tea','ate'],['tan']]",
    signature: "function groupAnagrams(words)",
    starterCode: "function groupAnagrams(words) {\n  \n}",
    testCases: [
      {
        input: { words: ["eat", "tea", "tan", "ate", "nat", "bat"] },
        expected: [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]],
      },
      { input: { words: [""] }, expected: [[""]] },
      { input: { words: ["a"] }, expected: [["a"]] },
    ],
    solution:
      "function groupAnagrams(words) { const map = new Map(); for (const word of words) { const key = word.split('').sort().join(''); if (!map.has(key)) map.set(key, []); map.get(key).push(word); } return [...map.values()]; }",
  }),
  makeProblem({
    id: "count-words",
    title: "Count Words",
    difficulty: "easy",
    description: "Count words separated by one or more spaces.",
    example: "countWords('a b  c') -> 3",
    signature: "function countWords(str)",
    starterCode: "function countWords(str) {\n  \n}",
    testCases: [
      { input: { str: "a b  c" }, expected: 3 },
      { input: { str: "   " }, expected: 0 },
      { input: { str: "hello" }, expected: 1 },
    ],
    solution:
      "function countWords(str) { return str.trim() === '' ? 0 : str.trim().split(/\\s+/).length; }",
  }),
  makeProblem({
    id: "rotate-array",
    title: "Rotate Array",
    difficulty: "medium",
    description: "Rotate nums right by k and return new array.",
    example: "rotateArray([1,2,3,4], 1) -> [4,1,2,3]",
    signature: "function rotateArray(nums, k)",
    starterCode: "function rotateArray(nums, k) {\n  \n}",
    testCases: [
      { input: { nums: [1, 2, 3, 4], k: 1 }, expected: [4, 1, 2, 3] },
      { input: { nums: [1, 2, 3, 4], k: 2 }, expected: [3, 4, 1, 2] },
      { input: { nums: [1], k: 10 }, expected: [1] },
    ],
    solution:
      "function rotateArray(nums, k) { if (!nums.length) return []; const s = k % nums.length; return nums.slice(-s).concat(nums.slice(0, nums.length - s)); }",
  }),
];

const DIFFICULTY_TARGET: Record<Difficulty, number> = {
  easy: 5,
  medium: 3,
  hard: 2,
};

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function stripSolution(problem: Problem): PublicProblem {
  const publicProblem = { ...problem };
  delete (publicProblem as Problem).solution;
  return publicProblem;
}

export function selectSessionProblems(): Problem[] {
  const byDifficulty: Record<Difficulty, Problem[]> = {
    easy: [],
    medium: [],
    hard: [],
  };

  for (const problem of PROBLEM_BANK) {
    byDifficulty[problem.difficulty].push(problem);
  }

  const selected: Problem[] = [];
  (Object.keys(DIFFICULTY_TARGET) as Difficulty[]).forEach((difficulty) => {
    const pool = shuffle(byDifficulty[difficulty]);
    selected.push(...pool.slice(0, DIFFICULTY_TARGET[difficulty]));
  });

  return shuffle(selected);
}

export const DIFFICULTY_BONUS: Record<Difficulty, number> = {
  easy: 0,
  medium: 50,
  hard: 100,
};
