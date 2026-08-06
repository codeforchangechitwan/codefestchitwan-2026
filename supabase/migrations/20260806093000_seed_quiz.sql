-- Seed: a sample quiz so the Quiz & Games section works the moment the
-- database is up. Executives can edit or unpublish it from the admin panel.

do $$
declare
  target_quiz uuid;
  q uuid;
  seed jsonb := '[
    {"prompt": "Which HTTP status code means \"Too Many Requests\"?",
     "options": ["401", "418", "429", "503"], "answer": 2},
    {"prompt": "In Git, which command creates a new branch and switches to it in one step?",
     "options": ["git branch -m", "git switch -c", "git checkout --orphan", "git remote add"], "answer": 1},
    {"prompt": "What does the \"S\" in SOLID stand for?",
     "options": ["Separation of Scope", "Stateless Design", "Single Responsibility", "Strong Typing"], "answer": 2},
    {"prompt": "Which data structure gives O(1) average-case lookup by key?",
     "options": ["Linked list", "Hash table", "Binary heap", "Sorted array"], "answer": 1},
    {"prompt": "In Postgres, what does an index primarily improve?",
     "options": ["Write throughput", "Disk usage", "Read/query speed", "Backup size"], "answer": 2},
    {"prompt": "Which national park is Chitwan best known for?",
     "options": ["Sagarmatha", "Chitwan National Park", "Langtang", "Bardiya"], "answer": 1},
    {"prompt": "What does API stand for?",
     "options": ["Applied Program Interaction", "Application Programming Interface", "Automated Process Integration", "Abstract Protocol Instance"], "answer": 1},
    {"prompt": "Which of these is NOT a JavaScript primitive?",
     "options": ["symbol", "bigint", "array", "boolean"], "answer": 2},
    {"prompt": "In Big-O terms, what is binary search on a sorted array?",
     "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"], "answer": 1},
    {"prompt": "What does RLS stand for in Postgres/Supabase?",
     "options": ["Remote Login Service", "Row Level Security", "Relational Lock System", "Rapid Load Sharding"], "answer": 1}
  ]'::jsonb;
  item jsonb;
  idx integer := 0;
begin
  select id into target_quiz from public.quizzes where title = 'Codefest Warm-Up Quiz';

  if target_quiz is null then
    insert into public.quizzes (title, description, time_limit_seconds, is_published, opens_at, closes_at)
    values (
      'Codefest Warm-Up Quiz',
      'Ten quick questions on code, tooling and Chitwan. Runs during the Saturday 7:00–7:40 PM quiz slot — but you can practise any time.',
      600,
      true,
      timestamptz '2026-08-14 07:00+05:45',
      timestamptz '2026-08-16 17:00+05:45'
    )
    returning id into target_quiz;
  end if;

  -- Re-seed questions idempotently.
  delete from public.quiz_questions where quiz_id = target_quiz;

  for item in select * from jsonb_array_elements(seed)
  loop
    insert into public.quiz_questions (quiz_id, prompt, options, points, sort_order)
    values (target_quiz, item ->> 'prompt', item -> 'options', 1, idx)
    returning id into q;

    insert into public.quiz_answer_keys (question_id, correct_index)
    values (q, (item ->> 'answer')::integer);

    idx := idx + 1;
  end loop;
end
$$;
