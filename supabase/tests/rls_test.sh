#!/usr/bin/env bash
# Pruebas de acceso cruzado (Sección 12) contra un Postgres LOCAL con el shim de Supabase.
# Uso: PGURL="postgresql://postgres@localhost:5433" bash supabase/tests/rls_test.sh
# Crea la base "pt_rls_test" desde cero, aplica las migraciones y corre las pruebas.
set -u
cd "$(dirname "$0")/../.."
PGURL="${PGURL:-postgresql://postgres@localhost:5432}"
DB="pt_rls_test"
psql "$PGURL/postgres" -q -c "drop database if exists $DB" -c "create database $DB" >/dev/null 2>&1
P="psql $PGURL/$DB -q -v ON_ERROR_STOP=1"
for f in supabase/tests/shim_supabase_local.sql supabase/migrations/001_schema.sql supabase/migrations/002_rls.sql supabase/migrations/003_create_challenge.sql supabase/seed.sql; do
  $P -f "$f" >/dev/null 2>&1 || { echo "Falló al aplicar $f"; $P -f "$f"; exit 1; }
done

ANA=11111111-1111-1111-1111-111111111111      # estudiante
BETO=22222222-2222-2222-2222-222222222222     # estudiante
EMP_A=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa    # empresa A
EMP_B=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb    # empresa B
R_OPEN=c0000000-0000-0000-0000-000000000001
R_CLOSED=c0000000-0000-0000-0000-000000000002

$P >/dev/null <<SQL
insert into auth.users (id, email, raw_user_meta_data) values
 ('$ANA',  'ana@demo.mx',  '{"role":"student","display_name":"Ana"}'),
 ('$BETO', 'beto@demo.mx', '{"role":"student","display_name":"Beto"}'),
 ('$EMP_A','a@demo.mx',    '{"role":"company","display_name":"Empresa A"}'),
 ('$EMP_B','b@demo.mx',    '{"role":"company","display_name":"Empresa B"}');
insert into challenges (id, company_id, title, status) values
 ('$R_OPEN', '$EMP_A', 'Reto abierto de A', 'open'),
 ('$R_CLOSED', '$EMP_A', 'Reto cerrado de A', 'closed');
insert into challenge_skills values ('$R_OPEN','react',true), ('$R_OPEN','sql',false);
insert into applications (challenge_id, student_id, score_at_apply) values ('$R_OPEN', '$BETO', 50);
SQL

PASS=0; FAIL=0
run() { # run <uid|anon> <sql>
  local who=$1 sql=$2 role=authenticated
  [ "$who" = anon ] && role=anon && who=""
  [ "$who" = admin ] && role=postgres && who=""   # como el servicio de Auth de Supabase
  printf 'begin;\nset local role %s;\n\\o /dev/null\nselect set_config(%s, %s, true);\n\\o\n%s;\nrollback;\n' \
    "$role" "'request.jwt.claim.sub'" "'$who'" "$sql" | psql "$PGURL/$DB" -qtA -v ON_ERROR_STOP=1 2>&1
}
expect_error() { local name=$1; out=$(run "$2" "$3"); if grep -q "ERROR" <<<"$out"; then PASS=$((PASS+1)); echo "✓ $name"; else FAIL=$((FAIL+1)); echo "✗ $name  → se esperaba error, salió: $out"; fi; }
expect_value() { local name=$1 want=$4; out=$(run "$2" "$3" | tail -1); if [ "$out" = "$want" ]; then PASS=$((PASS+1)); echo "✓ $name"; else FAIL=$((FAIL+1)); echo "✗ $name  → esperado '$want', salió '$out'"; fi; }

echo "— Registro y roles"
expect_error "Registro con rol inválido es rechazado por el trigger" admin "insert into auth.users (email, raw_user_meta_data) values ('x@x.mx','{\"role\":\"admin\"}')"
expect_value "El trigger crea perfil + fila de estudiante" "$ANA" "select count(*) from students where id='$ANA'" 1
expect_error "Estudiante NO puede cambiar su rol a company" "$ANA" "update profiles set role='company' where id='$ANA'"
expect_value "Estudiante sí puede cambiar su nombre" "$ANA" "with u as (update profiles set display_name='Ana R.' where id='$ANA' returning 1) select count(*) from u" 1
expect_value "Estudiante no modifica el perfil de otro (0 filas)" "$ANA" "with u as (update students set bio='hack' where id='$BETO' returning 1) select count(*) from u" 0

echo "— Habilidades y portafolio"
expect_value "Estudiante agrega habilidad propia" "$ANA" "with i as (insert into student_skills values ('$ANA','react',0) returning 1) select count(*) from i" 1
expect_error "Estudiante NO agrega habilidad a otro" "$ANA" "insert into student_skills values ('$BETO','react',0)"
expect_error "Empresa NO agrega habilidades de estudiante" "$EMP_A" "insert into student_skills values ('$EMP_A','react',0)"
expect_error "Habilidad fuera del catálogo es rechazada" "$ANA" "insert into student_skills values ('$ANA','cobol',0)"
expect_error "Proyecto con URL sin https es rechazado" "$ANA" "insert into portfolio_projects (student_id,title,repo_url) values ('$ANA','Mi app','http://x.com')"
expect_value "Anónimo no puede leer estudiantes (0 filas)" anon "select count(*) from students" 0

echo "— Retos"
expect_error "Estudiante NO publica retos" "$ANA" "insert into challenges (company_id,title) values ('$ANA','Reto falso')"
expect_error "Empresa B NO publica a nombre de A" "$EMP_B" "insert into challenges (company_id,title) values ('$EMP_A','Reto falso')"
expect_value "Empresa B NO modifica retos de A (0 filas)" "$EMP_B" "with u as (update challenges set title='hackeado' where id='$R_OPEN' returning 1) select count(*) from u" 0
expect_value "Empresa A cierra su reto" "$EMP_A" "with u as (update challenges set status='closed' where id='$R_OPEN' returning 1) select count(*) from u" 1
expect_error "Empresa A NO puede reasignar su reto a B" "$EMP_A" "update challenges set company_id='$EMP_B' where id='$R_OPEN'"
expect_value "Anónimo ve solo retos abiertos" anon "select count(*) from challenges" 1
expect_value "Estudiante no ve retos cerrados ajenos" "$ANA" "select count(*) from challenges where id='$R_CLOSED'" 0
expect_error "Empresa B NO agrega habilidades al reto de A" "$EMP_B" "insert into challenge_skills values ('$R_OPEN','docker',true)"

expect_value "Empresa publica reto con create_challenge (transacción)" "$EMP_B" "select create_challenge('Landing para el Buen Fin','x',5000,'2 semanas','Remoto',array['html','css'],array['javascript','css']); select count(*) from challenge_skills cs join challenges c on c.id = cs.challenge_id where c.title = 'Landing para el Buen Fin'" 3
expect_error "Estudiante NO puede usar create_challenge" "$ANA" "select create_challenge('Reto falso de Ana','x',0,null,null,array['html'],null)"
expect_error "create_challenge sin obligatorias es rechazado" "$EMP_B" "select create_challenge('Reto sin reglas','x',0,null,null,array[]::text[],array['html'])"
expect_error "create_challenge con habilidad inexistente no deja reto a medias" "$EMP_B" "select create_challenge('Reto con cobol','x',0,null,null,array['cobol'],null)"

echo "— Postulaciones"
expect_value "Estudiante se postula a reto abierto" "$ANA" "with i as (insert into applications (challenge_id,student_id,score_at_apply) values ('$R_OPEN','$ANA',75) returning 1) select count(*) from i" 1
expect_error "Postulación duplicada es rechazada" "$BETO" "insert into applications (challenge_id,student_id,score_at_apply) values ('$R_OPEN','$BETO',50)"
expect_error "Postular a reto cerrado es rechazado" "$ANA" "insert into applications (challenge_id,student_id,score_at_apply) values ('$R_CLOSED','$ANA',75)"
expect_error "Postular en nombre de otro es rechazado" "$ANA" "insert into applications (challenge_id,student_id,score_at_apply) values ('$R_OPEN','$BETO',99)"
expect_error "Empresa NO puede postularse" "$EMP_A" "insert into applications (challenge_id,student_id,score_at_apply) values ('$R_OPEN','$EMP_A',99)"
expect_value "Empresa A ve postulantes de su reto" "$EMP_A" "select count(*) from applications where challenge_id='$R_OPEN'" 1
expect_value "Empresa B NO ve postulantes de retos de A" "$EMP_B" "select count(*) from applications" 0
expect_value "Estudiante ve solo sus postulaciones" "$ANA" "select count(*) from applications" 0
expect_value "Empresa A cambia estado de postulación" "$EMP_A" "with u as (update applications set status='en_revision' where challenge_id='$R_OPEN' returning 1) select count(*) from u" 1
expect_error "Empresa A NO puede alterar el puntaje guardado" "$EMP_A" "update applications set score_at_apply=100 where challenge_id='$R_OPEN'"
expect_value "Estudiante NO cambia el estado de su postulación (0 filas)" "$BETO" "with u as (update applications set status='seleccionado' where student_id='$BETO' returning 1) select count(*) from u" 0
expect_value "Cifras públicas sin exponer filas" anon "select (public_stats()->>'students')" 2

echo
echo "Resultado: $PASS pasaron, $FAIL fallaron"
[ "$FAIL" -eq 0 ]
