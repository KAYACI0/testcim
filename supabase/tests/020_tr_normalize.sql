begin;
select plan(4);

select is(public.tr_normalize('İstanbul'), 'istanbul', 'İ (dotted capital I) folds to plain i');
select is(public.tr_normalize('ISPARTA'), 'isparta', 'I (dotless capital I) folds to dotless ı, then to i');
select is(public.tr_normalize('ığdır'), 'igdir', 'lowercase Turkish letters fold to their ascii base');
select is(public.tr_normalize('şeker'), 'seker', 'ş folds to s');

select * from finish();
rollback;
